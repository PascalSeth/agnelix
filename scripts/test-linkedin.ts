import "dotenv/config"
import * as cheerio from "cheerio"
import OpenAI from "openai"

const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

async function searchDDG(query: string) {
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": UA, "Accept": "text/html" },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const html = await res.text()
  const $ = cheerio.load(html)
  const results: { title: string; snippet: string; url: string }[] = []
  $(".result").each((_, el) => {
    const title   = $(el).find(".result__title, .result__a").text().trim()
    const snippet = $(el).find(".result__snippet").text().trim()
    const href    = $(el).find("a.result__a, a.result__url").attr("href") ?? ""
    const url     = href.includes("duckduckgo.com/l/?")
      ? decodeURIComponent(href.split("uddg=")[1] ?? "")
      : href
    if (url.toLowerCase().includes("linkedin.com/in/") && title)
      results.push({ title, snippet, url: url.split("?")[0] })
  })
  return results.slice(0, 8)
}

async function main() {
  const company = "Bromley Plumbing"
  const city = "Bromley"
  const query = `site:linkedin.com/in/ "${company}" "${city}" (founder OR "managing director" OR CEO OR director OR owner)`

  console.log(`Searching: ${query}\n`)
  const raw = await searchDDG(query)
  console.log(`Raw results: ${raw.length}`)
  raw.forEach(r => console.log(`  - ${r.title} | ${r.url}`))

  if (raw.length === 0) {
    console.log("No results — DDG may be rate-limiting. Try from the app directly.")
    return
  }

  const input = raw.map((r, i) => `Result ${i+1}:\nTitle: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.url}`).join("\n\n")
  const res = await o.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: `You are analysing LinkedIn search results to find decision makers at "${company}".\n\n${input}\n\nReturn JSON array with: name, firstName, lastName, title, linkedinUrl, isDecisionMaker, confidence (0-100). Only include confident matches (50+). JSON only.` }],
    temperature: 0.1, max_tokens: 400,
    // @ts-ignore
    thinking: { type: "disabled" }
  })
  console.log("\nAI extraction:")
  console.log(res.choices[0]?.message?.content)
}

main()
