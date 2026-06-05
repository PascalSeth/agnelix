import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import * as cheerio from "cheerio"
import OpenAI from "openai"
import { extractCityFromAddress } from "@/lib/utils"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const DM_TITLE_WORDS = [
  "founder", "co-founder", "cofounder", "owner", "director",
  "managing director", "md", "ceo", "cto", "coo", "cfo",
  "head of", "partner", "principal", "president", "chairman",
  "proprietor", "general manager", "vp ", "vice president",
]

function isDM(title: string): boolean {
  const l = title.toLowerCase()
  return DM_TITLE_WORDS.some(t => l.includes(t))
}

export interface LinkedInDecisionMaker {
  name: string | null
  firstName: string | null
  lastName: string | null
  title: string | null
  linkedinUrl: string | null
  isDecisionMaker: boolean
  confidence: number
  source: "profile-page" | "ai-knowledge" | "ai-inferred"
}

function cleanBaseWebsiteUrl(websiteUrl: string): string {
  let base = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
  try {
    const urlObj = new URL(base)
    base = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname.replace(/\/$/, "")}`
  } catch {
    base = base.split("?")[0].split("#")[0].replace(/\/$/, "")
  }
  return base
}

// ── Step 1: Scrape company website for LinkedIn profile links ─────────────────

async function findLinkedInUrlsFromSite(websiteUrl: string, logs: string[]): Promise<string[]> {
  const base = cleanBaseWebsiteUrl(websiteUrl)
  const found = new Set<string>()
  const pages = [base, `${base}/about`, `${base}/about-us`, `${base}/team`, `${base}/our-team`, `${base}/contact`]

  logs.push(`[${new Date().toLocaleTimeString()}] Scraping company pages in parallel: ${JSON.stringify(pages)}`)

  await Promise.all(pages.map(async (url) => {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept": "text/html" },
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      })
      if (!res.ok) return
      const html = await res.text()
      const $ = cheerio.load(html)

      $('a[href*="linkedin.com/in/"]').each((_, el) => {
        const href = ($(el).attr("href") ?? "").split("?")[0].replace(/\/$/, "")
        if (href.length > 28) found.add(href)
      })

      ;(html.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-z0-9-]{5,}/gi) ?? [])
        .forEach(m => found.add(m.split("?")[0]))
    } catch { /* skip */ }
  }))

  const urls = Array.from(found).slice(0, 6)
  logs.push(`[${new Date().toLocaleTimeString()}] Extracted raw site LinkedIn URLs: ${JSON.stringify(urls)}`)
  return urls
}

// ── Step 2: Fetch LinkedIn profile page for name + title ─────────────────────
// Title tag: "Name - Title at Company | LinkedIn" — accessible without auth

async function fetchLinkedInProfile(url: string): Promise<{ name: string; title: string } | null> {
  try {
    const res = await fetch(url.startsWith("http") ? url : `https://${url}`, {
      headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-GB,en;q=0.9" },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const html = await res.text()

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ""
    const ogTitle  = html.match(/property="og:title"[^>]*content="([^"]+)"/i)?.[1]?.trim()
                  || html.match(/content="([^"]+)"[^>]*property="og:title"/i)?.[1]?.trim()
                  || ""
    const raw = (titleTag || ogTitle).replace(/\s*[|–—]\s*LinkedIn.*$/i, "").trim()
    if (!raw) return null

    const dashIdx = raw.indexOf(" - ")
    if (dashIdx < 2) return { name: raw, title: "" }

    const name  = raw.slice(0, dashIdx).trim()
    const title = raw.slice(dashIdx + 3).replace(/\s+at\s+.+$/i, "").trim()
    if (name.length < 2 || name.length > 60) return null
    return { name, title }
  } catch {
    return null
  }
}

// ── Step 3: Ask DeepSeek — training data contains LinkedIn profiles, Crunchbase,
// news articles, and company websites. For any company with public presence it
// often knows founders and LinkedIn URLs. Uses thinking mode for better accuracy.

async function askDeepSeek(params: {
  companyName: string
  city: string
  industry: string
  websiteUrl?: string | null
  websiteText?: string
}): Promise<LinkedInDecisionMaker[]> {
  const { companyName, city, industry, websiteUrl, websiteText } = params

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{
        role: "user",
        content: `You are a business intelligence assistant helping identify key people at a company for B2B outreach.

Company: ${companyName}
Industry: ${industry || "business"}
Location: ${city}
${websiteUrl ? `Website: ${websiteUrl}` : ""}
${websiteText ? `Website context: ${websiteText.slice(0, 800)}` : ""}

Search your training data thoroughly for this company. Find any founders, owners, CEOs, directors, co-founders, managing directors, partners, or other senior people associated with it.

Return every person you find. Include:
- People you're confident about (high score)
- People you think you recognise but aren't 100% sure (medium score)
- If you can't find real names, include an inferred role like "Owner" or "Founder" with a null name (low score)

For LinkedIn URLs: include any you believe you know. If unsure, leave null — do not make them up.

Return JSON array:
[{
  "name": "Full name or null",
  "firstName": "first name or null",
  "lastName": "last name or null",
  "title": "Founder / CEO / Owner / Director etc",
  "linkedinUrl": "https://linkedin.com/in/slug — only if you know it, else null",
  "score": integer from 0-100 (100 = certain from training data, 50 = fairly sure, 20 = inferred role only)
}]

Critical rules:
- Only use real names you are genuinely confident about from training data. If unsure, set name to null.
- LinkedIn URLs must be ones you actually know — do NOT guess or construct slugs. Set null if unknown.
- Always include at least one entry with the most likely title even if name is null.
JSON only.`,
      }],
      temperature: 0.1,
      max_tokens: 8000,
      // @ts-expect-error — DeepSeek thinking mode for better recall
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })

    const raw = res.choices[0]?.message?.content ?? "[]"
    const clean = raw.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((p: { title?: string | null; name?: string | null }) => p.title || p.name)
      .map((p: {
        name?: string | null; firstName?: string | null; lastName?: string | null
        title?: string | null; linkedinUrl?: string | null; score?: number; confidence?: number
      }) => {
        let raw = typeof p.score === "number" ? p.score
                : typeof p.confidence === "number" ? p.confidence
                : 30
        if (raw > 0 && raw <= 1) raw = Math.round(raw * 100)  // normalize 0–1 → 0–100
        const conf = Math.min(100, Math.max(0, Math.round(raw)))

        // IMPORTANT: Do NOT trust AI-provided names unless we can verify via LinkedIn.
        // Names without a LinkedIn URL to validate against may be hallucinated.
        const hasUrl = !!(p.linkedinUrl && p.linkedinUrl.includes("linkedin.com/in/"))
        const url    = hasUrl ? (p.linkedinUrl as string) : null

        return {
          name:           null,           // will be filled after URL verification
          firstName:      null,
          lastName:       null,
          title:          p.title || null,
          linkedinUrl:    url,
          isDecisionMaker: isDM(p.title || ""),
          confidence:     hasUrl ? conf : Math.min(conf, 30),
          source:         (hasUrl ? "ai-knowledge" : "ai-inferred") as LinkedInDecisionMaker["source"],
          _unverifiedName: p.name || null,  // kept internally for verification step only
        }
      })
  } catch {
    return []
  }
}

// ── Step 4: Scraping Web Search Fallback Engine ────────────────────────────────
// Scraping DuckDuckGo / Bing Search results directly — no API keys required

async function fetchSearchPage(query: string): Promise<string> {
  const endpoints = [
    { name: "ddg", url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}` },
    { name: "bing", url: `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10` },
  ]

  const results = await Promise.allSettled(
    endpoints.map(async (ep) => {
      const res = await fetch(ep.url, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)
      const items: string[] = []

      if (ep.name === "ddg") {
        $(".result").each((_, el) => {
          const title = $(el).find(".result__title, .result__a").text().trim()
          const snippet = $(el).find(".result__snippet").text().trim()
          const href = $(el).find("a.result__a").attr("href") || ""
          const url = href.includes("uddg=")
            ? decodeURIComponent((href.split("uddg=")[1] || "").split("&")[0])
            : href
          if (url && title) {
            items.push(`[DuckDuckGo Result]\nTitle: ${title}\nURL: ${url}\nSnippet: ${snippet}`)
          }
        })
      } else {
        $(".b_algo").each((_, el) => {
          const title = $(el).find("h2").text().trim()
          const snippet = $(el).find(".b_caption p, .b_snippet").first().text().trim()
          const href = $(el).find("h2 a").attr("href") || ""
          if (href && title) {
            items.push(`[Bing Result]\nTitle: ${title}\nURL: ${href}\nSnippet: ${snippet}`)
          }
        })
      }
      return items
    })
  )

  const combinedItems: string[] = []
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      combinedItems.push(...r.value)
    }
  }

  return combinedItems.join("\n\n")
}

async function webSearchLinkedInFallback(
  companyName: string,
  city: string,
  logs: string[]
): Promise<LinkedInDecisionMaker[]> {
  const cleanCity = extractCityFromAddress(city)
  const queries = [
    `${companyName} ${cleanCity} linkedin`.replace(/\s+/g, " ").trim(),
    `${companyName} founder CEO owner linkedin`.replace(/\s+/g, " ").trim(),
    `${companyName} employees team linkedin`.replace(/\s+/g, " ").trim(),
  ]

  logs.push(`[${new Date().toLocaleTimeString()}] Executing parallel scraping fallback queries: ${JSON.stringify(queries)}`)

  try {
    const searchResultsArray = await Promise.all(
      queries.map(q => fetchSearchPage(q))
    )
    const rawResults = searchResultsArray.filter(Boolean).join("\n\n")
    logs.push(`[${new Date().toLocaleTimeString()}] Fallback search results retrieved: ${rawResults.length} characters.`)
    if (!rawResults) return []

    const profiles: LinkedInDecisionMaker[] = []
    const seenUrls = new Set<string>()

    const matches = rawResults.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-z0-9-]+/gi) ?? []
    logs.push(`[${new Date().toLocaleTimeString()}] Parsing search snippets for LinkedIn urls. Found ${matches.length} matches.`)

    for (const m of matches) {
      const profileUrl = m.split("?")[0].replace(/\/$/, "")
      if (seenUrls.has(profileUrl)) continue
      seenUrls.add(profileUrl)

      // Fetch profile page for verification
      const verified = await fetchLinkedInProfile(profileUrl)

      // Guess name from URL slug as fallback
      let guessedName: string | null = null
      const slug = profileUrl.split("/in/")[1]
      if (slug) {
        guessedName = slug
          .split("-")
          .filter(part => !/^\d+$/.test(part))
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      }

      const name  = verified?.name  || guessedName || null
      const title = verified?.title || "Decision Maker"

      const parts = (name || "").split(/\s+/)
      profiles.push({
        name,
        firstName:      parts[0] || null,
        lastName:       parts.slice(1).join(" ") || null,
        title,
        linkedinUrl:    profileUrl,
        isDecisionMaker: isDM(title || ""),
        confidence:     verified ? (isDM(title || "") ? 92 : 75) : (isDM(title || "") ? 60 : 40),
        source:         "profile-page",
      })
    }

    return profiles
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logs.push(`[${new Date().toLocaleTimeString()}] Fallback search error: ${msg}`)
    return []
  }
}


// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const logs: string[] = []
  logs.push(`[${new Date().toLocaleTimeString()}] Starting search logic...`)

  try {
    const { companyName, city, industry, websiteUrl, websiteText } = await req.json()
    if (!companyName) return NextResponse.json({ error: "companyName required" }, { status: 400 })

    const cleanCity = extractCityFromAddress(city)
    logs.push(`[${new Date().toLocaleTimeString()}] Search details - Company: "${companyName}", Clean City: "${cleanCity}"`)

    // Run site scraping and AI query in parallel
    logs.push(`[${new Date().toLocaleTimeString()}] Performing parallel domain scan and DeepSeek AI analysis...`)
    const [siteUrls, aiResults] = await Promise.all([
      websiteUrl ? findLinkedInUrlsFromSite(websiteUrl, logs) : Promise.resolve([]),
      askDeepSeek({ companyName, city: cleanCity, industry: industry ?? "", websiteUrl, websiteText }),
    ])

    logs.push(`[${new Date().toLocaleTimeString()}] Website scrape found ${siteUrls.length} LinkedIn URLs. DeepSeek returned ${aiResults.length} profile hypotheses.`)

    // Fetch LinkedIn profile pages for any site URLs found
    const siteProfiles: LinkedInDecisionMaker[] = []
    if (siteUrls.length > 0) {
      logs.push(`[${new Date().toLocaleTimeString()}] Fetching and parsing site-sourced profile pages...`)
      const fetched = await Promise.all(siteUrls.map(fetchLinkedInProfile))
      for (let i = 0; i < siteUrls.length; i++) {
        const info  = fetched[i]
        const url   = siteUrls[i]
        const parts = (info?.name || "").split(/\s+/)
        siteProfiles.push({
          name:           info?.name || null,
          firstName:      parts[0] || null,
          lastName:       parts.slice(1).join(" ") || null,
          title:          info?.title || null,
          linkedinUrl:    url,
          isDecisionMaker: isDM(info?.title || ""),
          confidence:     info?.name ? (isDM(info.title || "") ? 90 : 72) : 55,
          source:         "profile-page",
        })
      }
    }

    // Verify AI LinkedIn URLs
    type AiResultWithHint = LinkedInDecisionMaker & { _unverifiedName?: string | null }
    logs.push(`[${new Date().toLocaleTimeString()}] Verifying AI-returned profile links...`)
    const verifiedAiResults: LinkedInDecisionMaker[] = await Promise.all(
      (aiResults as AiResultWithHint[]).map(async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _unverifiedName, ...clean } = p

        if (!p.linkedinUrl) return clean

        const verified = await fetchLinkedInProfile(p.linkedinUrl)
        if (!verified) {
          return { ...clean, confidence: 38 }
        }

        const parts = verified.name.split(/\s+/)
        return {
          ...clean,
          name:      verified.name,
          firstName: parts[0] || null,
          lastName:  parts.slice(1).join(" ") || null,
          title:     verified.title || p.title,
          confidence: isDM(verified.title) ? 88 : 70,
          source:    "profile-page" as const,
        }
      })
    )

    // Merge
    const seen  = new Set<string>()
    const final: LinkedInDecisionMaker[] = []

    function add(p: LinkedInDecisionMaker) {
      const key = p.linkedinUrl || p.name?.toLowerCase() || String(Math.random())
      if (seen.has(key)) return
      seen.add(key)
      final.push(p)
    }

    for (const p of siteProfiles) add(p)
    for (const p of verifiedAiResults) {
      if (p.linkedinUrl && seen.has(p.linkedinUrl)) continue
      if (p.name && siteProfiles.some(s => s.name?.toLowerCase() === p.name?.toLowerCase())) continue
      add(p)
    }

    // Check if we need fallback search
    const hasVerifiedNames = final.some(p => p.name !== null && p.confidence >= 70)
    if (!hasVerifiedNames) {
      logs.push(`[${new Date().toLocaleTimeString()}] No verified profiles found. Invoking free web search (DuckDuckGo/Bing)...`)
      
      const webResults = await webSearchLinkedInFallback(companyName, city ?? "", logs)

      for (const p of webResults) {
        if (p.linkedinUrl && seen.has(p.linkedinUrl)) continue
        add(p)
      }
    }

    const sorted = final
      .sort((a, b) => {
        if (a.isDecisionMaker !== b.isDecisionMaker) return a.isDecisionMaker ? -1 : 1
        return b.confidence - a.confidence
      })
      .slice(0, 8)

    logs.push(`[${new Date().toLocaleTimeString()}] Search completed. Found ${sorted.length} verified/inferred profiles.`)
    return NextResponse.json({ profiles: sorted, logs })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logs.push(`[${new Date().toLocaleTimeString()}] Fatal search route error: ${msg}`)
    return NextResponse.json({ profiles: [], logs })
  }
}
