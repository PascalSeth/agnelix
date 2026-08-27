import * as cheerio from "cheerio"

const PAGES = ["/", "/about", "/services", "/pricing"]
const FETCH_TIMEOUT_MS = 8000
const MAX_TOTAL_CHARS = 6000

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
      redirect: "follow",
    })
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return ""
    const html = await res.text()
    const $ = cheerio.load(html)
    $("script, style, noscript, svg, nav, footer, iframe").remove()
    const title = $("title").text().trim()
    const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? ""
    const bodyText = $("body").text().replace(/\s+/g, " ").trim()
    return [title, metaDesc, bodyText].filter(Boolean).join("\n").slice(0, 3000)
  } catch {
    return ""
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Scrapes a competitor's key pages and returns condensed plain text for the
 * AI comparison engine. Best-effort — returns "" if the site is unreachable.
 */
export async function scrapeCompetitorSite(website: string): Promise<string> {
  let base: URL
  try {
    base = new URL(website.startsWith("http") ? website : `https://${website}`)
  } catch {
    return ""
  }

  const chunks: string[] = []
  for (const path of PAGES) {
    const text = await fetchPageText(new URL(path, base.origin).toString())
    if (text) chunks.push(`--- ${path} ---\n${text}`)
    if (chunks.join("\n\n").length >= MAX_TOTAL_CHARS) break
  }
  return chunks.join("\n\n").slice(0, MAX_TOTAL_CHARS)
}
