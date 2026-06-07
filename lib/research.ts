import OpenAI from "openai"
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

/**
 * Performs real-time search & scraping to build a detailed company dossier.
 */
export async function performCompanyResearch(
  companyName: string,
  websiteUrl: string | null,
  senderCompany?: string,
  senderCompanyDesc?: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || ""
  const cx = process.env.GOOGLE_SEARCH_CX || ""
  
  let websiteText = ""
  let searchSnippets = ""

  // 1. Fetch website text if website is available
  if (websiteUrl) {
    try {
      const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      const res = await fetch(url, {
        method: "GET",
        headers: { 
          "User-Agent": UA,
          "Accept-Language": "en-GB,en;q=0.9" 
        },
        signal: AbortSignal.timeout(6000),
        redirect: "follow",
      })
      if (res.ok) {
        const html = await res.text()
        const $ = cheerio.load(html)
        
        // Remove interactive elements
        $("script, style, svg, iframe, noscript, nav, footer, header").remove()
        
        const title = $("title").text().trim()
        const metaDesc = $("meta[name='description']").attr("content") ?? ""
        
        // Grab headings
        const headings: string[] = []
        $("h1, h2, h3").each((_, el) => {
          const t = $(el).text().trim()
          if (t && t.length > 5 && !headings.includes(t)) headings.push(t)
        })
        
        // Grab paragraph snippets
        const paras: string[] = []
        $("p").each((_, el) => {
          const t = $(el).text().trim().replace(/\s+/g, " ")
          if (t && t.length > 20 && !paras.includes(t)) paras.push(t)
        })
        
        websiteText = `
TITLE: ${title}
DESCRIPTION: ${metaDesc}
HEADINGS: ${headings.slice(0, 8).join(" | ")}
TEXT CONTENT: ${paras.slice(0, 5).join("\n")}
        `.trim()
      }
    } catch (err) {
      console.error("Website fetch during research failed:", err)
    }
  }

  // 2. Perform Google Search for company details
  if (apiKey && cx && companyName) {
    try {
      const query = `"${companyName}" business value proposition services about`
      const searchRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(6000) }
      )
      if (searchRes.ok) {
        const data = await searchRes.json()
        const items = data.items || []
        const snippets = items.slice(0, 4).map((item: { title: string; snippet: string }) => `- ${item.title}: ${item.snippet}`).join("\n")
        searchSnippets = `GOOGLE SEARCH RESULTS:\n${snippets}`
      }
    } catch (err) {
      console.error("Google search during research failed:", err)
    }
  }

  // 3. If no search results and no website text, return fallback
  if (!websiteText && !searchSnippets) {
    return "No additional online presence or search profile found for this company."
  }

  // 4. Call DeepSeek to summarize into a clean dossier
  try {
    const openai = new OpenAI({
      apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
      baseURL: "https://api.deepseek.com",
    })

    const prompt = `You are a B2B sales researcher. Analyze the raw web crawler and search results for the company "${companyName}".
Synthesize a concise, high-impact research dossier that will help our agency ("${senderCompany || "our agency"}") pitch them.

OUR AGENCY DESCRIPTION:
${senderCompanyDesc || "We offer digital marketing and growth services."}

RAW DATA FOUND FOR PROSPECT:
${websiteText ? `[WEBSITE DATA]\n${websiteText}` : ""}
${searchSnippets ? `[SEARCH DATA]\n${searchSnippets}` : ""}

Return a brief, structured synthesis covering:
1. What they sell / Core value proposition.
2. Who their target customers are.
3. Specific gaps or angles where our agency's services (${senderCompanyDesc || "marketing"}) could help them grow.

Keep the response under 150 words total, bullet-pointed.`

    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 250,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })

    return response.choices[0]?.message?.content || "Company research summary unavailable."
  } catch (err) {
    console.error("AI research summarization failed:", err)
    return `Company name: ${companyName}. Website: ${websiteUrl}. (Failed to process raw text)`
  }
}
