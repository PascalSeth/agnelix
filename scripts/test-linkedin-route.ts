import "dotenv/config"
// Simulate exactly what the route does

import * as cheerio from "cheerio"
import OpenAI from "openai"

const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

async function findLinkedInUrlsFromSite(url: string): Promise<string[]> {
  const base = url.startsWith("http") ? url : `https://${url}`
  const found = new Set<string>()
  const pages = [base, `${base}/about`, `${base}/team`, `${base}/about-us`]
  await Promise.all(pages.slice(0, 3).map(async (u) => {
    try {
      const res = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000), redirect: "follow" })
      if (!res.ok) return
      const html = await res.text()
      const $ = cheerio.load(html)
      $('a[href*="linkedin.com/in/"]').each((_, el) => {
        const href = ($(el).attr("href") ?? "").split("?")[0].replace(/\/$/, "")
        if (href.length > 28) found.add(href)
      })
      ;(html.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-z0-9-]{5,}/gi) ?? []).forEach(m => found.add(m.split("?")[0]))
    } catch {}
  }))
  return Array.from(found).slice(0, 5)
}

async function fetchProfile(url: string): Promise<{ name: string; title: string } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const html = await res.text()
    const raw = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").replace(/\s*[|–—]\s*LinkedIn.*$/i, "").trim()
    if (!raw || !raw.includes(" - ")) return null
    const dashIdx = raw.indexOf(" - ")
    return { name: raw.slice(0, dashIdx).trim(), title: raw.slice(dashIdx + 3).replace(/\s+at\s+.+$/i, "").trim() }
  } catch { return null }
}

async function test(companyName: string, city: string, industry: string, websiteUrl?: string) {
  console.log(`\n=== ${companyName} (${city}) ===`)

  // Step 1: site scrape
  const siteUrls = websiteUrl ? await findLinkedInUrlsFromSite(websiteUrl) : []
  console.log(`  Site LinkedIn URLs found: ${siteUrls.length}`, siteUrls.slice(0, 2))

  // Step 2: fetch profiles from site URLs
  for (const url of siteUrls) {
    const info = await fetchProfile(url)
    console.log(`  Profile page: ${info?.name ?? "no name"} | ${info?.title ?? "no title"} | ${url}`)
  }

  // Step 3: AI - only show title (names require URL verification)
  console.log("  AI inferred titles (names stripped unless URL verified):")
  const r = await o.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{
      role: "user",
      content: `Find founders, owners, CEOs, directors of: ${companyName} (${industry}, ${city}).${websiteUrl ? ` Website: ${websiteUrl}` : ""}
Return JSON: [{ title, linkedinUrl }] — title always required, linkedinUrl only if you genuinely know it.
JSON only.`
    }],
    temperature: 0.1, max_tokens: 2000,
    // @ts-ignore
    thinking: { type: "enabled" }, reasoning_effort: "high"
  })
  try {
    const parsed = JSON.parse((r.choices[0]?.message?.content ?? "[]").replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim())
    for (const p of parsed) {
      // If URL given, fetch and verify
      if (p.linkedinUrl?.includes("linkedin.com/in/")) {
        const verified = await fetchProfile(p.linkedinUrl)
        if (verified) {
          console.log(`  ✓ Verified: ${verified.name} | ${verified.title} | ${p.linkedinUrl}`)
        } else {
          console.log(`  ✗ URL unverifiable: ${p.linkedinUrl} — showing title only: ${p.title}`)
        }
      } else {
        console.log(`  → Inferred title: ${p.title} (no URL to verify name)`)
      }
    }
  } catch { console.log("  Parse error") }
}

async function main() {
  await test("Social Media 55", "Montreal", "digital marketing agency", "https://socialmedia55.com")
  await test("The Influence Agency", "Toronto", "influencer marketing", "https://theinfluenceagency.com")
  await test("Bromley Plumbing", "Bromley", "plumbing")
}
main()
