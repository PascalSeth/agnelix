import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import * as cheerio from "cheerio"
import OpenAI from "openai"
import { extractCityFromAddress } from "@/lib/utils"
import { prisma } from "@/lib/db"

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

function cleanCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|co|ltd|limited|corporation|group|solutions|services|holding|holdings)\b/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function verifyCompanyMatch(profileTitle: string, targetCompanyName: string): boolean {
  const cleanTarget = cleanCompanyName(targetCompanyName)
  if (!cleanTarget) return true

  const cleanTitle = profileTitle.toLowerCase().replace(/[^\w\s]/g, " ")
  const targetWords = cleanTarget.split(" ").filter(w => w.length > 2)
  if (targetWords.length === 0) return true

  const brandName = targetWords[0]!
  return cleanTitle.includes(brandName)
}

// ── Step 2: Fetch LinkedIn profile page for name + title ─────────────────────
// Title tag: "Name - Title at Company | LinkedIn" — accessible without auth

async function fetchLinkedInProfile(url: string): Promise<{ name: string; title: string; rawTitle: string } | null> {
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
    if (dashIdx < 2) return { name: raw, title: "", rawTitle: raw }

    const name  = raw.slice(0, dashIdx).trim()
    const title = raw.slice(dashIdx + 3).replace(/\s+at\s+.+$/i, "").trim()
    if (name.length < 2 || name.length > 60) return null
    return { name, title, rawTitle: raw }
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
  localNeighbors?: boolean
}): Promise<LinkedInDecisionMaker[]> {
  const { companyName, city, industry, websiteUrl, websiteText, localNeighbors } = params

  try {
    const userPrompt = localNeighbors
      ? `You are a business intelligence assistant helping identify people working at a company for local marketing outreach.

Company: ${companyName}
Industry: ${industry || "business"}
Location: ${city}
${websiteUrl ? `Website: ${websiteUrl}` : ""}
${websiteText ? `Website context: ${websiteText.slice(0, 800)}` : ""}

Search your training data thoroughly for this company. Find any employees, staff, team members, workers, founders, owners, or other people associated with it. We do not care about seniority or roles, we just want to find real people working at this company.

Return every person you find. Include:
- People you're confident about (high score)
- People you think you recognise but aren't 100% sure (medium score)
- If you can't find real names, include an inferred role like "Staff" or "Team Member" with a null name (low score)

For LinkedIn URLs: include any you believe you know. If unsure, leave null — do not make them up.

Return JSON array:
[{
  "name": "Full name or null",
  "firstName": "first name or null",
  "lastName": "last name or null",
  "title": "Role/Title (e.g. Manager, Chef, Server, Agent, Representative, Owner etc)",
  "linkedinUrl": "https://linkedin.com/in/slug — only if you know it, else null",
  "score": integer from 0-100 (100 = certain from training data, 50 = fairly sure, 20 = inferred role only)
}]

Critical rules:
- Only use real names you are genuinely confident about from training data. If unsure, set name to null.
- LinkedIn URLs must be ones you actually know — do NOT guess or construct slugs. Set null if unknown.
- Always include at least one entry with the most likely title even if name is null.
- JSON only.`
      : `You are a business intelligence assistant helping identify key people at a company for B2B outreach.

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
- JSON only.`;

    const res = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{
        role: "user",
        content: userPrompt,
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

        const cleanName = p.name || null
        const parts = cleanName ? cleanName.split(/\s+/) : []
        const fName = p.firstName || parts[0] || null
        const lName = p.lastName || parts.slice(1).join(" ") || null

        return {
          name:           cleanName,
          firstName:      fName,
          lastName:       lName,
          title:          p.title || null,
          linkedinUrl:    url,
          isDecisionMaker: isDM(p.title || ""),
          confidence:     hasUrl ? conf : Math.min(conf, 30),
          source:         (hasUrl ? "ai-knowledge" : "ai-inferred") as LinkedInDecisionMaker["source"],
          _unverifiedName: cleanName,
        }
      })
  } catch {
    return []
  }
}

// ── Step 4: SerpApi Web Search Fallback Engine ────────────────────────────────
// Queries SerpApi (Google Search engine) to retrieve verified LinkedIn profiles

interface SerpApiResult {
  link: string
  title: string
  snippet: string
}

interface EnrichedSerpLead {
  link: string
  name: string
  title: string
  relevance: number
}

async function fetchSerpApi(query: string, logs: string[]): Promise<SerpApiResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    logs.push(`[${new Date().toLocaleTimeString()}] Warning: SERPAPI_API_KEY is not defined in .env. Skipping SerpApi search.`)
    return []
  }

  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)
    const data = await res.json()
    
    const results: SerpApiResult[] = []
    if (Array.isArray(data.organic_results)) {
      for (const item of data.organic_results) {
        if (typeof item.link === "string" && item.link.includes("linkedin.com/in/")) {
          results.push({
            link: item.link.split("?")[0].replace(/\/$/, ""),
            title: typeof item.title === "string" ? item.title : "",
            snippet: typeof item.snippet === "string" ? item.snippet : "",
          })
        }
      }
    }
    return results
  } catch (err) {
    logs.push(`[${new Date().toLocaleTimeString()}] SerpApi error: ${err instanceof Error ? err.message : String(err)}`)
    return []
  }
}

async function enrichSerpResultsWithDeepSeek(
  companyName: string,
  city: string,
  serpResults: SerpApiResult[],
  localNeighbors?: boolean,
): Promise<EnrichedSerpLead[]> {
  if (serpResults.length === 0) return []

  const formattedResults = serpResults.map((r, i) => `[Result #${i+1}]
URL: ${r.link}
Title: ${r.title}
Snippet: ${r.snippet}`).join("\n\n")

  const systemPrompt = `You are a lead generation assistant. Analyze Google search results for employees at a target company and extract structured info.
  
Target Company: ${companyName}
Target Location: ${city}
Mode: ${localNeighbors ? "B2C / Local staff outreach (any employees, workers, staff are relevant)" : "B2B Outreach (decision makers like founders, owners, CEOs are highly relevant)"}

For each search result, extract:
1. "link": The exact URL from the result
2. "name": The clean full name of the person (do not include titles, degrees like PhD, or company names in the name field)
3. "title": The actual job title/role of the person
4. "relevance": A score from 0-100 indicating how likely this person is a real employee at the target company (100 = certain, 50 = possible/inferred, 0 = completely irrelevant/wrong company)

Return ONLY a JSON object with a single key "results" containing the array of objects:
{
  "results": [
    {
      "link": "url",
      "name": "Full Name",
      "title": "Job Title",
      "relevance": number
    }
  ]
}`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are the search results:\n\n${formattedResults}` }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })

    const raw = res.choices[0]?.message?.content ?? "{}"
    const clean = raw.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(clean)
    
    let array: EnrichedSerpLead[] = []
    if (Array.isArray(parsed)) {
      array = parsed
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.results)) {
        array = parsed.results
      } else if (Array.isArray(parsed.leads)) {
        array = parsed.leads
      }
    }
    return array
  } catch {
    return []
  }
}

function parseLinkedInTitle(rawTitle: string): { name: string; title: string; company: string } {
  const clean = rawTitle.replace(/\s*[|–—-]\s*LinkedIn.*$/i, "").trim()
  const parts = clean.split(/\s*[-–—|]\s*/).map(p => p.trim())
  
  const name = (parts[0] || "").replace(/\.\.\.$/, "").trim()
  let title = ""
  let company = ""
  
  if (parts.length >= 3) {
    title = parts[1] || ""
    company = parts[2] || ""
  } else if (parts.length === 2) {
    const secondPart = parts[1] || ""
    if (secondPart.toLowerCase().includes("at ")) {
      const atParts = secondPart.split(/\s+at\s+/i)
      title = atParts[0] || ""
      company = atParts[1] || ""
    } else {
      title = secondPart
    }
  }
  
  return { name, title, company }
}

async function webSearchLinkedInFallback(
  companyName: string,
  city: string,
  logs: string[],
  localNeighbors?: boolean,
): Promise<LinkedInDecisionMaker[]> {
  const cleanCity = extractCityFromAddress(city)
  const cleanCompany = companyName.replace(/[^\w\s]/g, "").trim()
  const queries = localNeighbors
    ? [
        `site:linkedin.com/in/ "${cleanCompany}" "${cleanCity}"`,
        `site:linkedin.com/in/ "${cleanCompany}" staff OR team OR employees`,
        `site:linkedin.com/in/ ${cleanCompany} ${cleanCity} employees`,
      ]
    : [
        `site:linkedin.com/in/ "${cleanCompany}" "${cleanCity}"`,
        `site:linkedin.com/in/ "${cleanCompany}" founder OR CEO OR owner`,
        `site:linkedin.com/in/ ${cleanCompany} ${cleanCity} founder CEO`,
      ]

  logs.push(`[${new Date().toLocaleTimeString()}] Executing parallel SerpApi queries: ${JSON.stringify(queries)}`)

  try {
    const searchResultsArray = await Promise.all(
      queries.map(q => fetchSerpApi(q, logs))
    )
    const allResults = searchResultsArray.flat()
    logs.push(`[${new Date().toLocaleTimeString()}] SerpApi returned ${allResults.length} potential profiles.`)
    if (allResults.length === 0) return []

    const seenUrls = new Set<string>()
    const scrapedProfiles: LinkedInDecisionMaker[] = []
    const unverifiedResults: SerpApiResult[] = []

    const uniqueResults = allResults.filter(item => {
      if (seenUrls.has(item.link)) return false
      seenUrls.add(item.link)
      return true
    })

    logs.push(`[${new Date().toLocaleTimeString()}] Fetching profile pages concurrently for ${uniqueResults.length} unique profiles...`)

    const fetchedProfiles = await Promise.all(
      uniqueResults.map(async (item) => {
        const verified = await fetchLinkedInProfile(item.link)
        return { item, verified }
      })
    )

    for (const { item, verified } of fetchedProfiles) {
      if (verified) {
        // Verify company name match
        if (!verifyCompanyMatch(verified.rawTitle, companyName)) {
          logs.push(`[${new Date().toLocaleTimeString()}] Discarded search profile "${verified.name}" - Company mismatch ("${verified.rawTitle}" vs "${companyName}")`)
          continue
        }

        const name  = verified.name
        const title = verified.title || (localNeighbors ? "Staff / Employee" : "Decision Maker")
        const parts = name.split(/\s+/)

        scrapedProfiles.push({
          name,
          firstName:      parts[0] || null,
          lastName:       parts.slice(1).join(" ") || null,
          title,
          linkedinUrl:    item.link,
          isDecisionMaker: isDM(title || ""),
          confidence:     localNeighbors || isDM(title || "") ? 92 : 75,
          source:         "profile-page",
        })
      } else {
        // Keep for batch DeepSeek enrichment
        unverifiedResults.push(item)
      }
    }

    const finalProfiles = [...scrapedProfiles]

    if (unverifiedResults.length > 0) {
      logs.push(`[${new Date().toLocaleTimeString()}] Querying DeepSeek to enrich ${unverifiedResults.length} unverified search results in batch...`)
      const enriched = await enrichSerpResultsWithDeepSeek(companyName, cleanCity, unverifiedResults, localNeighbors)
      logs.push(`[${new Date().toLocaleTimeString()}] DeepSeek returned ${enriched.length} enriched results.`)

      const enrichedLinks = new Set<string>()

      for (const e of enriched) {
        if (!e.name || e.relevance < 45) {
          logs.push(`[${new Date().toLocaleTimeString()}] Discarded unverified profile "${e.name || "Unknown"}" (relevance: ${e.relevance || 0})`)
          continue
        }

        // Double check company match using our local checker for safety
        const rawTitleForVerify = `${e.name} - ${e.title} - ${companyName}`
        if (!verifyCompanyMatch(rawTitleForVerify, companyName)) {
          logs.push(`[${new Date().toLocaleTimeString()}] Discarded enriched profile "${e.name}" - Local company mismatch check failed`)
          continue
        }

        enrichedLinks.add(e.link)
        const parts = e.name.split(/\s+/)
        const title = e.title || (localNeighbors ? "Staff / Employee" : "Decision Maker")
        
        finalProfiles.push({
          name:           e.name,
          firstName:      parts[0] || null,
          lastName:       parts.slice(1).join(" ") || null,
          title,
          linkedinUrl:    e.link,
          isDecisionMaker: isDM(title || ""),
          confidence:     localNeighbors || isDM(title || "") ? 85 : 68,
          source:         "profile-page",
        })
      }

      // If DeepSeek enrichment completely failed or skipped some, fall back to local parsing
      const failedToEnrich = unverifiedResults.filter(r => !enrichedLinks.has(r.link))
      if (failedToEnrich.length > 0) {
        logs.push(`[${new Date().toLocaleTimeString()}] Local parser fallback for ${failedToEnrich.length} results...`)
        for (const item of failedToEnrich) {
          const parsed = parseLinkedInTitle(item.title)
          if (!parsed.name) continue

          if (!verifyCompanyMatch(item.title, companyName)) continue

          const parts = parsed.name.split(/\s+/)
          const title = parsed.title || (localNeighbors ? "Staff / Employee" : "Decision Maker")
          
          finalProfiles.push({
            name:           parsed.name,
            firstName:      parts[0] || null,
            lastName:       parts.slice(1).join(" ") || null,
            title,
            linkedinUrl:    item.link,
            isDecisionMaker: isDM(title || ""),
            confidence:     localNeighbors || isDM(title || "") ? 82 : 65,
            source:         "profile-page",
          })
        }
      }
    }

    return finalProfiles
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logs.push(`[${new Date().toLocaleTimeString()}] Fallback search error: ${msg}`)
    return []
  }
}


function getDomain(url: string): string {
  let clean = url.toLowerCase().trim()
  clean = clean.replace(/^https?:\/\//, "")
  clean = clean.replace(/^www\./, "")
  return clean.split("/")[0]?.split("?")[0] || ""
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function findLinkedInProfiles(params: {
  companyName: string
  city?: string
  industry?: string
  websiteUrl?: string
  websiteText?: string
  localNeighbors?: boolean
  bypassCache?: boolean
}, logs: string[] = []): Promise<LinkedInDecisionMaker[]> {
  const { companyName, city, industry, websiteUrl, websiteText, localNeighbors, bypassCache } = params
  const domain = websiteUrl ? getDomain(websiteUrl) : null

  // 1. Cache Check
  if (domain && !bypassCache) {
    try {
      const cached = await prisma.domainContactCache.findUnique({
        where: { domain }
      })
      if (cached?.profilesJson) {
        const ageInMs = Date.now() - cached.updatedAt.getTime()
        if (ageInMs < 14 * 24 * 60 * 60 * 1000) {
          logs.push(`[${new Date().toLocaleTimeString()}] Resolving LinkedIn profiles from database cache for domain "${domain}".`)
          return JSON.parse(cached.profilesJson) as LinkedInDecisionMaker[]
        }
      }
    } catch (err) {
      console.error("Cache read error in linkedin-search:", err)
    }
  }

  const cleanCity = extractCityFromAddress(city)
  logs.push(`[${new Date().toLocaleTimeString()}] Search details - Company: "${companyName}", Clean City: "${cleanCity}"`)

  // Run site scraping and AI query in parallel
  logs.push(`[${new Date().toLocaleTimeString()}] Performing parallel domain scan and AI analysis...`)
  const [siteUrls, aiResults] = await Promise.all([
    websiteUrl ? findLinkedInUrlsFromSite(websiteUrl, logs) : Promise.resolve([]),
    askDeepSeek({ companyName, city: cleanCity, industry: industry ?? "", websiteUrl, websiteText, localNeighbors }),
  ])

  logs.push(`[${new Date().toLocaleTimeString()}] Website scrape found ${siteUrls.length} LinkedIn URLs. AI returned ${aiResults.length} profile hypotheses.`)

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
        confidence:     info?.name ? (localNeighbors || isDM(info.title || "") ? 90 : 72) : 55,
        source:         "profile-page",
      })
    }
  }

  // Verify AI LinkedIn URLs
  type AiResultWithHint = LinkedInDecisionMaker & { _unverifiedName?: string | null }
  logs.push(`[${new Date().toLocaleTimeString()}] Verifying AI-returned profile links...`)
  const verifiedAiResultsRaw = await Promise.all(
    (aiResults as AiResultWithHint[]).map(async (p) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _unverifiedName, ...clean } = p

      if (!p.linkedinUrl) return clean

      const verified = await fetchLinkedInProfile(p.linkedinUrl)
      if (!verified) {
        return { ...clean, confidence: 38 }
      }

      // Verify company name match
      if (!verifyCompanyMatch(verified.rawTitle, companyName)) {
        logs.push(`[${new Date().toLocaleTimeString()}] Discarded AI profile "${verified.name}" - Company mismatch ("${verified.rawTitle}" vs "${companyName}")`)
        return null
      }

      const parts = verified.name.split(/\s+/)
      return {
        ...clean,
        name:      verified.name,
        firstName: parts[0] || null,
        lastName:  parts.slice(1).join(" ") || null,
        title:     verified.title || p.title,
        confidence: localNeighbors || isDM(verified.title) ? 88 : 70,
        source:    "profile-page" as const,
      }
    })
  )
  const verifiedAiResults = verifiedAiResultsRaw.filter(Boolean) as LinkedInDecisionMaker[]

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
    
    const webResults = await webSearchLinkedInFallback(companyName, city ?? "", logs, localNeighbors)

    for (const p of webResults) {
      if (p.linkedinUrl && seen.has(p.linkedinUrl)) continue
      add(p)
    }
  }

  const sorted = final
    .sort((a, b) => {
      if (!localNeighbors) {
        if (a.isDecisionMaker !== b.isDecisionMaker) return a.isDecisionMaker ? -1 : 1
      }
      return b.confidence - a.confidence
    })
    .slice(0, 8)

  // Save to database cache
  if (domain && sorted.length > 0) {
    try {
      await prisma.domainContactCache.upsert({
        where: { domain },
        update: { profilesJson: JSON.stringify(sorted) },
        create: { domain, profilesJson: JSON.stringify(sorted) },
      })
      logs.push(`[${new Date().toLocaleTimeString()}] Saved verified LinkedIn profiles to database cache.`)
    } catch (err) {
      console.error("Cache write error in linkedin-search:", err)
    }
  }

  logs.push(`[${new Date().toLocaleTimeString()}] Search completed. Found ${sorted.length} verified/inferred profiles.`)
  return sorted
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const logs: string[] = []
  logs.push(`[${new Date().toLocaleTimeString()}] Starting search logic...`)

  try {
    const params = await req.json()
    if (!params.companyName) return NextResponse.json({ error: "companyName required" }, { status: 400 })

    const sorted = await findLinkedInProfiles(params, logs)
    return NextResponse.json({ profiles: sorted, logs })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logs.push(`[${new Date().toLocaleTimeString()}] Fatal search route error: ${msg}`)
    return NextResponse.json({ profiles: [], logs })
  }
}
