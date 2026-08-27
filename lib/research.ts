import OpenAI from "openai"
import { deepCrawlWebsite } from "@/lib/deep-crawler"

/**
 * Performs real-time deep multi-page crawl & search to build a detailed company dossier.
 */
export async function performCompanyResearch(
  companyName: string,
  websiteUrl: string | null,
  senderCompany?: string,
  senderCompanyDesc?: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || ""
  const cx = process.env.GOOGLE_SEARCH_CX || ""

  let searchSnippets = ""

  // 1. Deep Multi-Page Crawl
  const [crawlResult, googleSearchResults] = await Promise.all([
    websiteUrl ? deepCrawlWebsite(websiteUrl, 5) : Promise.resolve(null),
    apiKey && cx && companyName
      ? fetch(
          `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(
            `"${companyName}" business value proposition services about`
          )}`,
          { signal: AbortSignal.timeout(6000) }
        )
          .then(r => (r.ok ? (r.json() as Promise<{ items?: { title: string; snippet: string }[] }>) : {}))
          .then(data => {
            const items = ("items" in data && Array.isArray(data.items)) ? data.items : []
            return items
              .slice(0, 4)
              .map((item: { title: string; snippet: string }) => `- ${item.title}: ${item.snippet}`)
              .join("\n")
          })
          .catch(() => "")
      : Promise.resolve(""),
  ])

  if (googleSearchResults) {
    searchSnippets = `GOOGLE SEARCH RESULTS:\n${googleSearchResults}`
  }

  // If no search results and no crawl text, return fallback
  if ((!crawlResult || crawlResult.pagesCrawledCount === 0) && !searchSnippets) {
    return "No online presence or search profile found for this company."
  }

  // Call DeepSeek to summarize into a high-converting intelligence dossier
  try {
    const openai = new OpenAI({
      apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
      baseURL: "https://api.deepseek.com",
    })

    const prompt = `You are an elite B2B sales intelligence investigator. Analyze the raw multi-page crawler and search results for "${companyName}".
Synthesize a concise, high-impact research dossier that will help our agency ("${senderCompany || "our agency"}") pitch them.

OUR AGENCY DESCRIPTION:
${senderCompanyDesc || "We offer digital marketing and growth services."}

RAW DATA FOUND FOR PROSPECT:
${crawlResult ? `[DEEP MULTI-PAGE CRAWLER DATA]\n${crawlResult.fullTextDigest}` : ""}
${searchSnippets ? `[SEARCH DATA]\n${searchSnippets}` : ""}

Return a brief, structured synthesis covering:
1. Core Commercial Offering & Who They Serve (ICP)
2. Location & Geographic Market (Explicitly identify where they and their customers are based e.g. Ghana, Nigeria, Africa, Europe, US, UK, Global; do NOT invent or default to UK/US if not stated)
3. Pricing Tier & Market Positioning
4. Tech Stack & Infrastructure
5. Specific Revenue / Pipeline Gaps where our agency's services (${senderCompanyDesc || "growth services"}) could immediately unlock revenue for them.

Keep the response under 175 words total, bullet-pointed and dense with factual observations.`

    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 350,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })

    return response.choices[0]?.message?.content || "Company research summary unavailable."
  } catch (err) {
    console.error("AI research summarization failed:", err)
    return `Company name: ${companyName}. Website: ${websiteUrl}. (Failed to process raw text)`
  }
}

/**
 * Deep-scrapes an agency's own website across multiple pages and asks the AI to write a short
 * first-person description of what they do, for use as onboarding companyDesc.
 */
export async function generateAgencyDescriptionFromUrl(websiteUrl: string): Promise<string> {
  const crawlResult = await deepCrawlWebsite(websiteUrl, 4)

  if (!crawlResult || crawlResult.pagesCrawledCount === 0) {
    throw new Error("Couldn't read that website — try pasting a description instead.")
  }

  const openai = new OpenAI({
    apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
    baseURL: "https://api.deepseek.com",
  })

  const prompt = `You are helping a marketing/sales agency describe what they do, for use as context that powers their AI-written cold emails.

Based on the content scraped across their website below, write a concise first-person-plural description (2-4 sentences, starting with "We") covering:
1. What services they offer
2. Who their typical clients are
3. The results/value they deliver

MULTI-PAGE CRAWL DATA:
${crawlResult.fullTextDigest}

Return ONLY the description text, no preamble or quotes.`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 220,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    return response.choices[0]?.message?.content?.trim() || ""
  } catch (err) {
    console.error("AI agency description generation failed:", err)
    throw new Error("Couldn't generate a description right now — try again or write it yourself.")
  }
}
