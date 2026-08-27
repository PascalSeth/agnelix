import * as cheerio from "cheerio"

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

export interface CrawledPage {
  url: string
  path: string
  category: "homepage" | "services" | "pricing" | "about" | "case_studies" | "careers" | "blog" | "general"
  title: string
  headings: string[]
  bodyText: string
}

export interface DeepCrawlResult {
  url: string
  domain: string
  title: string
  metaDescription: string
  pagesCrawledCount: number
  pages: CrawledPage[]
  detectedServices: string[]
  businessType: string // e.g. "ecommerce", "saas", "agency", "restaurant", "law-firm"
  businessTypeSignals: string[] // raw signals found that led to the classification
  pricingInfo: {
    found: boolean
    currency: string | null
    priceSnippets: string[]
    tiers: string[]
  }
  techStack: string[]
  leadershipAndTeam: { name: string; title: string }[]
  caseStudiesAndProof: { clientOrTitle: string; metric: string | null }[]
  careersAndHiring: {
    isHiring: boolean
    openRoles: string[]
  }
  socialLinks: {
    linkedin?: string
    twitter?: string
    instagram?: string
    youtube?: string
    facebook?: string
    github?: string
  }
  contactDetails: {
    emails: string[]
    phones: string[]
    address?: string
  }
  schemaJsonLd: Array<Record<string, unknown>>
  fullTextDigest: string
}

// ── Smart URL Normalizer ─────────────────────────────────────────────────────

export function normalizeUrl(input: string): string {
  let cleaned = input.trim()
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`
  }
  try {
    const parsed = new URL(cleaned)
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "")
  } catch {
    return cleaned
  }
}

// ── Categorize internal link paths ───────────────────────────────────────────

function categorizePath(path: string): CrawledPage["category"] {
  const p = path.toLowerCase()
  if (p === "/" || p === "") return "homepage"
  if (/(service|solution|what-we-do|offering|product|feature|capability|capabilities|work|expertise|specialit|specializ)/i.test(p)) return "services"
  if (/(pricing|plan|package|rate|cost|fee|tier|roi|quote|estimate)/i.test(p)) return "pricing"
  if (/(about|team|leadership|founder|who-we-are|our-story|management|mission|vision|values|history)/i.test(p)) return "about"
  if (/(case-stud|client|customer|portfolio|work|result|testimonial|review|success|project|showcase)/i.test(p)) return "case_studies"
  if (/(career|job|vacancy|vacancies|hiring|join-us|join-our)/i.test(p)) return "careers"
  if (/(news|press|blog|article|insight|announcement|resource|guide)/i.test(p)) return "blog"
  return "general"
}

// ── Fetch with browser headers & timeout ────────────────────────────────────

async function fetchHtml(url: string, timeoutMs = 8000): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,en-GB;q=0.8",
        "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    })

    if (!res.ok) return null
    const contentType = res.headers.get("content-type") || ""
    if (!contentType.includes("text/html") && !contentType.includes("xhtml")) return null

    const html = await res.text()
    return { html, finalUrl: res.url }
  } catch {
    return null
  }
}

// ── Main Deep Crawler ────────────────────────────────────────────────────────

export async function deepCrawlWebsite(targetUrl: string, maxPages = 8): Promise<DeepCrawlResult> {
  const normalized = normalizeUrl(targetUrl)
  let origin = ""
  try {
    origin = new URL(normalized).origin
  } catch {
    origin = normalized
  }

  const domain = origin.replace(/^https?:\/\/(www\.)?/, "")
  const pages: CrawledPage[] = []
  const discoveredLinks = new Set<string>()
  const crawledPaths = new Set<string>()
  const emails = new Set<string>()
  const phones = new Set<string>()
  const socialLinks: DeepCrawlResult["socialLinks"] = {}
  const techStack = new Set<string>()
  const schemaJsonLd: Array<Record<string, unknown>> = []
  const leadershipAndTeam: { name: string; title: string }[] = []
  const caseStudiesAndProof: { clientOrTitle: string; metric: string | null }[] = []
  const openRoles: string[] = []
  const priceSnippets: string[] = []
  let detectedCurrency: string | null = null

  // 1. Fetch Homepage
  const homeData = await fetchHtml(normalized, 10000)
  if (!homeData) {
    return createEmptyCrawlResult(normalized, domain)
  }

  const $home = cheerio.load(homeData.html)
  const homeTitle = $home("title").text().trim()
  const metaDesc =
    $home("meta[name='description']").attr("content") ||
    $home("meta[property='og:description']").attr("content") ||
    $home("meta[name='og:description']").attr("content") ||
    ""

  // Extract Tech Stack from HTML / scripts
  const rawHtml = homeData.html
  if (/wp-content|wp-includes|wordpress/i.test(rawHtml)) techStack.add("WordPress")
  if (/cdn\.shopify\.com|shopify/i.test(rawHtml)) techStack.add("Shopify")
  if (/assets\.website-files\.com|webflow/i.test(rawHtml)) techStack.add("Webflow")
  if (/__next|_next\/static/i.test(rawHtml)) techStack.add("Next.js")
  if (/react|react-dom/i.test(rawHtml)) techStack.add("React")
  if (/hubspot|hs-scripts/i.test(rawHtml)) techStack.add("HubSpot")
  if (/js\.stripe\.com/i.test(rawHtml)) techStack.add("Stripe")
  if (/klaviyo/i.test(rawHtml)) techStack.add("Klaviyo")
  if (/googletagmanager\.com|gtm\.js/i.test(rawHtml)) techStack.add("Google Tag Manager")
  if (/google-analytics\.com|gtag/i.test(rawHtml)) techStack.add("Google Analytics")
  if (/intercom/i.test(rawHtml)) techStack.add("Intercom")
  if (/salesforce|pardot/i.test(rawHtml)) techStack.add("Salesforce")
  if (/drift\.com/i.test(rawHtml)) techStack.add("Drift")
  if (/crisp\.chat/i.test(rawHtml)) techStack.add("Crisp")

  // ── Business Type Classification ─────────────────────────────────────────
  // Collect raw signals from HTML, links, schemas, and page structure
  const businessTypeSignals: string[] = []

  // Ecommerce signals
  if (/add.to.cart|add-to-cart|addtocart/i.test(rawHtml)) businessTypeSignals.push("ECOMMERCE: 'Add to Cart' button detected")
  if (/\/cart|checkout|buy.now|shop.now|\/shop|\/store|\/products?\//i.test(rawHtml)) businessTypeSignals.push("ECOMMERCE: Cart/Checkout/Shop URL detected")
  if (/cdn\.shopify\.com|shopify/i.test(rawHtml)) businessTypeSignals.push("ECOMMERCE: Shopify platform detected")
  if (/woocommerce|wc-cart/i.test(rawHtml)) businessTypeSignals.push("ECOMMERCE: WooCommerce detected")
  if (/new arrivals|best seller|trending|shop by category|free shipping|returns policy|size guide|wishlist/i.test(rawHtml)) businessTypeSignals.push("ECOMMERCE: Product catalogue language detected (New Arrivals, Best Sellers, Trending, Size Guide etc)")
  if (/product-card|product-item|product-grid|product-listing/i.test(rawHtml)) businessTypeSignals.push("ECOMMERCE: Product card/grid layout detected")
  if (/klaviyo|omnisend|mailchimp/i.test(rawHtml)) businessTypeSignals.push("ECOMMERCE: Email marketing platform common to ecommerce detected")

  // SaaS signals
  if (/start.free.trial|free.trial|sign.up.free|get.started.free|try.for.free/i.test(rawHtml)) businessTypeSignals.push("SAAS: Free trial CTA detected")
  if (/\/dashboard|\/app|\/login|\/signup|\/register/i.test(rawHtml)) businessTypeSignals.push("SAAS: App dashboard/login URL detected")
  if (/per.month|per.seat|monthly.plan|annual.plan|\/mo|\/user/i.test(rawHtml)) businessTypeSignals.push("SAAS: Subscription pricing language detected")
  if (/api.documentation|developer.docs|webhook|sdk|rest.api/i.test(rawHtml)) businessTypeSignals.push("SAAS: Developer API/SDK detected")
  if (/integration|connect.with|sync.with|zapier|slack.integration/i.test(rawHtml)) businessTypeSignals.push("SAAS: Integration ecosystem detected")

  // Agency / Service business signals
  if (/our.work|our.clients|case.stud|portfolio|let's.talk|book.a.call|book.a.meeting|discovery.call/i.test(rawHtml)) businessTypeSignals.push("AGENCY: Portfolio/case study/discovery call language detected")
  if (/digital.marketing|seo.agency|web.design.agency|branding.agency|creative.agency|marketing.agency/i.test(rawHtml)) businessTypeSignals.push("AGENCY: Agency service type detected")

  // Restaurant / Food signals
  if (/menu|order.online|table.reservation|reservation|dine.in|takeout|takeaway|delivery|food.truck/i.test(rawHtml)) businessTypeSignals.push("RESTAURANT/FOOD: Menu or ordering language detected")
  if (/opentable|resy|sevenrooms|toast.pos/i.test(rawHtml)) businessTypeSignals.push("RESTAURANT/FOOD: Restaurant tech platform detected")

  // Healthcare / Medical signals
  if (/book.appointment|schedule.appointment|patient.portal|hipaa|telehealth|consultation/i.test(rawHtml)) businessTypeSignals.push("HEALTHCARE: Medical appointment/patient language detected")
  if (/md\b|doctor|physician|clinic|dental|therapy|wellness|mental.health/i.test(rawHtml)) businessTypeSignals.push("HEALTHCARE: Medical/wellness terminology detected")

  // Law firm signals
  if (/attorney|lawyer|law.firm|legal.services|practice.area|free.consultation|contingency/i.test(rawHtml)) businessTypeSignals.push("LAW FIRM: Legal services language detected")

  // Real estate signals
  if (/property.listing|mls|homes.for.sale|buy.a.home|rent.apartment|real.estate.agent|zillow|realtor/i.test(rawHtml)) businessTypeSignals.push("REAL ESTATE: Property listing language detected")

  // Construction / Trade signals
  if (/free.estimate|get.a.quote|licensed.insured|contractor|roofing|plumbing|hvac|electrical|landscaping/i.test(rawHtml)) businessTypeSignals.push("TRADES/CONSTRUCTION: Contractor/quote language detected")

  // Determine primary business type from strongest signals
  const detectBusinessType = (): string => {
    const s = businessTypeSignals.join(" ")
    if (/ECOMMERCE/.test(s)) return "ecommerce"
    if (/SAAS/.test(s)) return "saas"
    if (/RESTAURANT/.test(s)) return "restaurant"
    if (/HEALTHCARE/.test(s)) return "healthcare"
    if (/LAW FIRM/.test(s)) return "law-firm"
    if (/REAL ESTATE/.test(s)) return "real-estate"
    if (/TRADES/.test(s)) return "trades"
    if (/AGENCY/.test(s)) return "agency"
    return "service-business"
  }
  const businessType = detectBusinessType()

  // Extract JSON-LD Schemas
  $home("script[type='application/ld+json']").each((_, el) => {
    try {
      const json = JSON.parse($home(el).text())
      if (Array.isArray(json)) schemaJsonLd.push(...json)
      else schemaJsonLd.push(json)
    } catch {}
  })

  // Extract all internal links from Homepage
  $home("a[href]").each((_, el) => {
    const href = $home(el).attr("href")?.trim()
    if (!href) return

    // Social Links
    if (/linkedin\.com\/(company|in)\//i.test(href)) socialLinks.linkedin = href
    if (/twitter\.com|x\.com\//i.test(href) && !href.includes("/intent/")) socialLinks.twitter = href
    if (/instagram\.com\//i.test(href)) socialLinks.instagram = href
    if (/youtube\.com\/(c|channel|@)/i.test(href)) socialLinks.youtube = href
    if (/facebook\.com\//i.test(href) && !href.includes("/sharer")) socialLinks.facebook = href
    if (/github\.com\//i.test(href)) socialLinks.github = href

    // Mailto / Tel
    if (href.startsWith("mailto:")) {
      const email = href.replace(/^mailto:/i, "").split("?")[0].trim()
      if (email.includes("@") && !email.endsWith(".png") && !email.endsWith(".jpg")) emails.add(email)
    }
    if (href.startsWith("tel:")) {
      const phone = href.replace(/^tel:/i, "").trim()
      if (phone.length > 5) phones.add(phone)
    }

    // Candidate Internal Link
    try {
      const resolved = new URL(href, origin)
      if (resolved.origin === origin) {
        const path = resolved.pathname.replace(/\/$/, "")
        if (
          path &&
          !path.match(/\.(pdf|jpg|jpeg|png|webp|svg|gif|zip|doc|docx|css|js|xml|json)$/i) &&
          !path.includes("#") &&
          path !== "/"
        ) {
          discoveredLinks.add(path)
        }
      }
    } catch {}
  })

  // Process Homepage text
  const cleanHome = parsePageContent($home, normalized, "/")
  pages.push(cleanHome)
  crawledPaths.add("/")

  // Prioritize discovered pages by importance for business understanding
  const categorizedLinks: Record<CrawledPage["category"], string[]> = {
    homepage: [],
    services: [],
    pricing: [],
    about: [],
    case_studies: [],
    careers: [],
    blog: [],
    general: [],
  }

  discoveredLinks.forEach(path => {
    const cat = categorizePath(path)
    categorizedLinks[cat].push(path)
  })

  const pagesToCrawl: { path: string; category: CrawledPage["category"] }[] = []
  const order: CrawledPage["category"][] = ["services", "about", "pricing", "case_studies", "blog", "general", "careers"]

  for (const cat of order) {
    for (const p of categorizedLinks[cat]) {
      if (pagesToCrawl.length < maxPages - 1 && !pagesToCrawl.some(x => x.path === p)) {
        pagesToCrawl.push({ path: p, category: cat })
      }
    }
  }

  // Fallback defaults if no internal links found
  if (pagesToCrawl.length === 0) {
    const standardFallbacks: { path: string; category: CrawledPage["category"] }[] = [
      { path: "/services", category: "services" },
      { path: "/about", category: "about" },
      { path: "/pricing", category: "pricing" },
      { path: "/what-we-do", category: "services" },
      { path: "/case-studies", category: "case_studies" },
    ]
    standardFallbacks.forEach(f => pagesToCrawl.push(f))
  }

  // 2. Fetch High-Priority Subpages in Parallel
  const crawlPromises = pagesToCrawl.slice(0, maxPages - 1).map(async item => {
    if (crawledPaths.has(item.path)) return null
    crawledPaths.add(item.path)

    const pageUrl = `${origin}${item.path}`
    const data = await fetchHtml(pageUrl, 7000)
    if (!data) return null

    const $ = cheerio.load(data.html)

    // Check for emails / phones in subpage
    $("a[href^='mailto:']").each((_, el) => {
      const email = $(el).attr("href")?.replace(/^mailto:/i, "").split("?")[0].trim()
      if (email && email.includes("@")) emails.add(email)
    })
    $("a[href^='tel:']").each((_, el) => {
      const phone = $(el).attr("href")?.replace(/^tel:/i, "").trim()
      if (phone && phone.length > 5) phones.add(phone)
    })

    // Also extract more internal links from subpages for deeper crawl
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.trim()
      if (!href) return
      try {
        const resolved = new URL(href, origin)
        if (resolved.origin === origin) {
          const path = resolved.pathname.replace(/\/$/, "")
          if (
            path && path !== "/" &&
            !path.match(/\.(pdf|jpg|jpeg|png|webp|svg|gif|zip|doc|docx|css|js|xml|json)$/i) &&
            !path.includes("#")
          ) {
            discoveredLinks.add(path)
          }
        }
      } catch {}
    })

    // Pricing & Currency Detection
    const fullText = $.text()
    if (/(£|\$|€)\s*\d+([\d,.]+)?(\/mo|\/month|\/year|\/project|k)?/i.test(fullText)) {
      if (fullText.includes("£")) detectedCurrency = "GBP (£)"
      else if (fullText.includes("$")) detectedCurrency = "USD ($)"
      else if (fullText.includes("€")) detectedCurrency = "EUR (€)"

      const priceMatches = fullText.match(/(£|\$|€)\s*\d+([\d,.]+)?(\/mo|\/month|\/yr|\/year|\s*per month|\s*setup)?/gi) || []
      priceMatches.slice(0, 6).forEach(m => priceSnippets.push(m.trim()))
    }

    // Leadership / Team members
    if (item.category === "about") {
      $(".team-member, .person, .leadership-card, [class*='team'], [class*='member'], [class*='staff']").each((_, el) => {
        const name = $(el).find("h3, h4, h5, .name, [class*='name']").first().text().trim()
        const title = $(el).find("p, .title, .role, .position, [class*='role'], [class*='title'], [class*='position']").first().text().trim()
        if (name && name.length > 2 && name.length < 50 && !leadershipAndTeam.some(t => t.name === name)) {
          leadershipAndTeam.push({ name, title: title.slice(0, 60) || "Team Member" })
        }
      })
    }

    // Case Studies & Proof
    if (item.category === "case_studies") {
      $("article, .case-study, .portfolio-item, [class*='case-study'], [class*='portfolio'], [class*='result']").each((_, el) => {
        const title = $(el).find("h2, h3, h4").first().text().trim()
        const metric = $(el).find("[class*='stat'], [class*='metric'], .number, [class*='result']").first().text().trim() || null
        if (title && title.length > 5 && !caseStudiesAndProof.some(c => c.clientOrTitle === title)) {
          caseStudiesAndProof.push({ clientOrTitle: title.slice(0, 100), metric })
        }
      })
    }

    // Careers & Hiring
    if (item.category === "careers") {
      $(".job-item, .career-item, .vacancy, [class*='job'], [class*='position'], [class*='opening']").each((_, el) => {
        const role = $(el).find("h3, h4, a").first().text().trim()
        if (role && role.length > 4 && role.length < 80 && !openRoles.includes(role)) {
          openRoles.push(role)
        }
      })
    }

    return parsePageContent($, pageUrl, item.path, item.category)
  })

  const subpageResults = await Promise.all(crawlPromises)
  subpageResults.forEach(p => {
    if (p && p.bodyText.length > 50) pages.push(p)
  })

  // Deduce Service Offerings from headings across all pages
  const allHeadings = pages.flatMap(p => p.headings)
  const detectedServices = Array.from(
    new Set(
      allHeadings.filter(h =>
        h.length > 4 && h.length < 80 &&
        !/(about us|contact|privacy policy|terms|cookie|all rights|404|copyright|follow us|subscribe|newsletter|loading|menu)/i.test(h)
      )
    )
  ).slice(0, 20)

  // Build Comprehensive LLM Digest
  const fullTextDigest = buildCrawlDigest(domain, homeTitle, metaDesc, pages, techStack, detectedServices, leadershipAndTeam, openRoles, priceSnippets, schemaJsonLd, businessType, businessTypeSignals)

  return {
    url: normalized,
    domain,
    title: homeTitle,
    metaDescription: metaDesc,
    pagesCrawledCount: pages.length,
    pages,
    detectedServices,
    businessType,
    businessTypeSignals,
    pricingInfo: {
      found: priceSnippets.length > 0,
      currency: detectedCurrency,
      priceSnippets: Array.from(new Set(priceSnippets)).slice(0, 8),
      tiers: [],
    },
    techStack: Array.from(techStack),
    leadershipAndTeam: leadershipAndTeam.slice(0, 8),
    caseStudiesAndProof: caseStudiesAndProof.slice(0, 6),
    careersAndHiring: {
      isHiring: openRoles.length > 0,
      openRoles: openRoles.slice(0, 10),
    },
    socialLinks,
    contactDetails: {
      emails: Array.from(emails).slice(0, 5),
      phones: Array.from(phones).slice(0, 5),
    },
    schemaJsonLd: schemaJsonLd.slice(0, 6),
    fullTextDigest,
  }
}

// ── Content Parser ───────────────────────────────────────────────────────────

function parsePageContent(
  $: cheerio.CheerioAPI,
  url: string,
  path: string,
  category: CrawledPage["category"] = "homepage"
): CrawledPage {
  // Remove noisy elements but keep content-rich ones
  $("script, style, noscript, svg, iframe, .cookie-banner, #cookie-law-info-bar, [class*='cookie'], [id*='cookie']").remove()

  const title = $("title").text().trim()
  const headings: string[] = []

  // Extract h1–h3 for context
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim()
    if (text.length > 2 && text.length < 160 && !headings.includes(text)) {
      headings.push(text)
    }
  })

  // Also grab h4 for services pages (often contain sub-service names)
  if (category === "services" || category === "homepage") {
    $("h4").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim()
      if (text.length > 2 && text.length < 100 && !headings.includes(text)) {
        headings.push(text)
      }
    })
  }

  // Try to get meaningful content — prefer main/article over entire body
  const mainContent = $("main, article, [role='main'], .content, #content, .page-content, .wrapper, .container, section").text()
  const bodyFallback = $("body").text()
  const rawBody = (mainContent || bodyFallback).replace(/\s+/g, " ").trim()

  return {
    url,
    path,
    category,
    title,
    headings: headings.slice(0, 20),
    bodyText: rawBody.slice(0, 5000), // Increased from 2800 to 5000 chars per page
  }
}

// ── Digest Builder for LLM Prompt ───────────────────────────────────────────

function buildCrawlDigest(
  domain: string,
  title: string,
  metaDesc: string,
  pages: CrawledPage[],
  techStack: Set<string>,
  services: string[],
  team: { name: string; title: string }[],
  roles: string[],
  prices: string[],
  schemas: Array<Record<string, unknown>>,
  businessType: string,
  businessTypeSignals: string[]
): string {
  const parts: string[] = []

  parts.push(`=== BUSINESS INTELLIGENCE REPORT FOR: ${domain} ===\n`)
  parts.push(`HOMEPAGE TITLE: ${title}`)
  if (metaDesc) parts.push(`META DESCRIPTION: ${metaDesc}`)

  // Business type classification — CRITICAL context for the AI
  parts.push(`\n** DETECTED BUSINESS TYPE: ${businessType.toUpperCase()} **`)
  if (businessTypeSignals.length > 0) {
    parts.push(`CLASSIFICATION SIGNALS:\n${businessTypeSignals.map(s => `  - ${s}`).join("\n")}`)
  } else {
    parts.push(`CLASSIFICATION SIGNALS: No strong vertical signals detected — treat as general service business`)
  }

  // JSON-LD schema — excellent signal for what a business does
  const businessSchema = schemas.find(s =>
    s["@type"] && ["LocalBusiness", "Organization", "Corporation", "ProfessionalService", "Service"].includes(String(s["@type"]))
  )
  if (businessSchema) {
    const schemaFields = ["name", "description", "slogan", "serviceType", "areaServed", "priceRange", "telephone", "address"]
    const schemaInfo = schemaFields
      .filter(f => businessSchema[f])
      .map(f => `  ${f}: ${JSON.stringify(businessSchema[f])}`)
      .join("\n")
    if (schemaInfo) parts.push(`\nSTRUCTURED BUSINESS DATA (JSON-LD):\n${schemaInfo}`)
  }

  if (techStack.size > 0) {
    parts.push(`\nTECH STACK: ${Array.from(techStack).join(", ")}`)
  }

  if (prices.length > 0) {
    parts.push(`\nPRICING SIGNALS: ${prices.join(" | ")}`)
  }

  if (team.length > 0) {
    parts.push(`\nLEADERSHIP / TEAM:\n${team.map(t => `  - ${t.name}: ${t.title}`).join("\n")}`)
  }

  if (roles.length > 0) {
    parts.push(`\nCURRENT OPEN ROLES (signals company size/growth): ${roles.join(", ")}`)
  }

  if (services.length > 0) {
    parts.push(`\nKEY HEADINGS DETECTED ACROSS SITE:\n${services.slice(0, 15).map(s => `  - ${s}`).join("\n")}`)
  }

  parts.push(`\n=== FULL MULTI-PAGE CONTENT (${pages.length} pages scraped) ===`)

  // Services and homepage first
  const priority: CrawledPage["category"][] = ["homepage", "services", "about", "pricing", "case_studies", "blog", "general", "careers"]
  const sortedPages = [...pages].sort((a, b) => priority.indexOf(a.category) - priority.indexOf(b.category))

  for (const p of sortedPages) {
    parts.push(`\n--- PAGE: ${p.path || "/"} [${p.category.toUpperCase()}] ---`)
    if (p.headings.length) {
      parts.push(`Headings: ${p.headings.join(" | ")}`)
    }
    if (p.bodyText) {
      // Use full 5000 chars for homepage & services, 3500 for others
      const limit = (p.category === "homepage" || p.category === "services") ? 5000 : 3500
      parts.push(`Content:\n${p.bodyText.slice(0, limit)}`)
    }
  }

  return parts.join("\n")
}

function createEmptyCrawlResult(url: string, domain: string): DeepCrawlResult {
  return {
    url,
    domain,
    title: "",
    metaDescription: "",
    pagesCrawledCount: 0,
    pages: [],
    detectedServices: [],
    businessType: "service-business",
    businessTypeSignals: [],
    pricingInfo: { found: false, currency: null, priceSnippets: [], tiers: [] },
    techStack: [],
    leadershipAndTeam: [],
    caseStudiesAndProof: [],
    careersAndHiring: { isHiring: false, openRoles: [] },
    socialLinks: {},
    contactDetails: { emails: [], phones: [] },
    schemaJsonLd: [],
    fullTextDigest: `Could not crawl ${url}. Domain may be offline or blocking scrapers.`,
  }
}
