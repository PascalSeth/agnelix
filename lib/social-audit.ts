import * as cheerio from "cheerio"
import { googleSearch, type SearchResult } from "./buying-signals"

export interface SocialProfile {
  platform: string
  url: string
}

export interface SocialAudit {
  profiles: SocialProfile[]
  missingPlatforms: string[]
  mentions: SearchResult[]
  summary: string
  checkedAt: string
}

const PLATFORM_PATTERNS: Array<{ platform: string; pattern: RegExp }> = [
  { platform: "instagram", pattern: /instagram\.com\/([\w.\-]+)/i },
  { platform: "tiktok", pattern: /tiktok\.com\/@?([\w.\-]+)/i },
  { platform: "facebook", pattern: /facebook\.com\/([\w.\-]+)/i },
  { platform: "linkedin", pattern: /linkedin\.com\/(company|in)\/([\w.\-]+)/i },
  { platform: "x", pattern: /(?:twitter|x)\.com\/([\w.\-]+)/i },
  { platform: "youtube", pattern: /youtube\.com\/(@?[\w.\-]+|channel\/[\w\-]+)/i },
  { platform: "pinterest", pattern: /pinterest\.(?:com|co\.uk)\/([\w.\-]+)/i },
]

// Links like facebook.com/sharer or instagram.com/p/... are share/content URLs, not profiles
const NON_PROFILE_SEGMENTS = ["sharer", "share", "intent", "p", "reel", "posts", "watch", "hashtag", "search", "plugins"]

async function fetchHomepage(website: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const url = website.startsWith("http") ? website : `https://${website}`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
      redirect: "follow",
    })
    if (!res.ok) return ""
    return await res.text()
  } catch {
    return ""
  } finally {
    clearTimeout(timer)
  }
}

function extractProfiles(html: string): SocialProfile[] {
  const $ = cheerio.load(html)
  const found = new Map<string, string>()

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? ""
    for (const { platform, pattern } of PLATFORM_PATTERNS) {
      if (found.has(platform)) continue
      const match = href.match(pattern)
      if (!match) continue
      const firstSegment = (match[1] ?? "").toLowerCase()
      if (NON_PROFILE_SEGMENTS.includes(firstSegment)) continue
      found.set(platform, href.startsWith("http") ? href : `https:${href.startsWith("//") ? href : `//${href}`}`)
    }
  })

  return [...found.entries()].map(([platform, url]) => ({ platform, url }))
}

function buildSummary(profiles: SocialProfile[], missingPlatforms: string[], mentions: SearchResult[]): string {
  const parts: string[] = []
  if (profiles.length > 0) {
    parts.push(`Active on ${profiles.map(p => p.platform).join(", ")}.`)
  } else {
    parts.push("No social media profiles linked from their website — likely little or no active social presence.")
  }
  if (missingPlatforms.length > 0 && profiles.length > 0) {
    parts.push(`No presence found on ${missingPlatforms.join(", ")} — a content gap to reference.`)
  }
  if (mentions.length > 0) {
    parts.push(`Public mentions/reviews found: ${mentions.slice(0, 2).map(m => `"${m.snippet.slice(0, 120)}"`).join(" · ")}`)
  }
  return parts.join(" ")
}

/**
 * SMM playbook "understand the client" step: which social platforms they're on
 * (scraped from their website), which are missing, and how they're being
 * talked about publicly (Google Custom Search — only when includeMentions).
 */
export async function performSocialAudit(
  website: string,
  companyName: string,
  opts: { includeMentions?: boolean } = {}
): Promise<SocialAudit | null> {
  if (!website) return null

  const html = await fetchHomepage(website)
  if (!html && !opts.includeMentions) return null

  const profiles = html ? extractProfiles(html) : []
  // Core platforms a social media agency would pitch content for
  const corePlatforms = ["instagram", "tiktok", "facebook", "linkedin"]
  const missingPlatforms = corePlatforms.filter(p => !profiles.some(pr => pr.platform === p))

  let mentions: SearchResult[] = []
  if (opts.includeMentions && companyName) {
    mentions = await googleSearch(`"${companyName}" (reviews OR testimonial OR "customers say")`)
  }

  return {
    profiles,
    missingPlatforms,
    mentions,
    summary: buildSummary(profiles, missingPlatforms, mentions),
    checkedAt: new Date().toISOString(),
  }
}
