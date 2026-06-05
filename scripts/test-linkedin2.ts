import "dotenv/config"
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

async function findLinkedInUrlsFromSite(websiteUrl: string) {
  const base = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
  const found = new Set<string>()
  const pages = [base, `${base}/about`, `${base}/about-us`, `${base}/team`]

  await Promise.all(pages.slice(0, 3).map(async (url) => {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000), redirect: "follow" })
      if (!res.ok) return
      const html = await res.text()
      const $ = cheerio.load(html)
      $('a[href*="linkedin.com/in/"]').each((_, el) => {
        const href = $(el).attr("href") ?? ""
        if (href.includes("linkedin.com/in/")) found.add(href.split("?")[0])
      })
      const matches = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-z0-9-]+/gi) ?? []
      matches.forEach(m => found.add(m.split("?")[0]))
    } catch { }
  }))
  return Array.from(found)
}

async function fetchLinkedInProfile(url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(7000) })
    if (!res.ok) return null
    const html = await res.text()
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ""
    const stripped = titleTag.replace(/\s*[|–—]\s*LinkedIn.*$/i, "").trim()
    const dashIdx = stripped.indexOf(" - ")
    if (dashIdx < 2) return { name: stripped, title: "" }
    const name = stripped.slice(0, dashIdx).trim()
    const title = stripped.slice(dashIdx + 3).replace(/\s*at .+$/i, "").trim()
    return { name, title }
  } catch { return null }
}

async function main() {
  // Test with a real website that likely has LinkedIn links
  const testSites = [
    "https://www.bromleyplumbing.co.uk",
  ]

  for (const site of testSites) {
    console.log(`\nSite: ${site}`)
    const urls = await findLinkedInUrlsFromSite(site)
    console.log(`LinkedIn URLs found: ${urls.length}`, urls)

    if (urls.length > 0) {
      const profiles = await Promise.all(urls.slice(0, 3).map(fetchLinkedInProfile))
      profiles.forEach((p, i) => console.log(`Profile ${i+1}:`, p))
    } else {
      console.log("No LinkedIn URLs on site — would fall back to SERP + AI inference")
    }
  }
}

main()
