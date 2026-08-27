import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export interface BuyingSignal {
  type: "leadership_change" | "hiring" | "funding" | "expansion" | "tech_change" | "news"
  headline: string
  detail: string
  date: string | null
  source: string | null
}

export interface BuyingSignals {
  signals: BuyingSignal[]
  summary: string
  urgency: "high" | "medium" | "low"
  checkedAt: string
}

export interface SearchResult {
  title: string
  snippet: string
  link: string
}

export async function googleSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || ""
  const cx = process.env.GOOGLE_SEARCH_CX || ""
  if (!apiKey || !cx) return []

  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const items = data.items || []
    return items.map((item: { title: string; snippet: string; link: string }) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
    }))
  } catch (err) {
    console.error("Buying signals search failed:", err)
    return []
  }
}

/**
 * Searches for recent news, leadership changes, hiring activity, and funding
 * events for a company so the agency knows the right "why now" angle and
 * timing to use when reaching out.
 */
export async function findBuyingSignals(
  companyName: string,
  website?: string | null
): Promise<BuyingSignals | null> {
  if (!companyName) return null

  const domainHint = website ? ` ${website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}` : ""

  const [leadershipResults, growthResults] = await Promise.all([
    googleSearch(`"${companyName}"${domainHint} (hires OR appoints OR "joins as" OR "new director" OR "new head of" OR promoted OR "steps down")`),
    googleSearch(`"${companyName}"${domainHint} (funding OR raises OR acquires OR acquisition OR launches OR expands OR "is hiring" OR vacancy)`),
  ])

  const allResults = [...leadershipResults, ...growthResults]
  if (allResults.length === 0) {
    return {
      signals: [],
      summary: "No recent public news, hiring, or leadership signals found for this company.",
      urgency: "low",
      checkedAt: new Date().toISOString(),
    }
  }

  const resultsText = allResults
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.link}`)
    .join("\n")

  const prompt = `You are a B2B sales intelligence analyst. Below are raw search results about the company "${companyName}". Extract genuine "buying signal" events — things that indicate this company may be ready to buy services NOW (new leadership who often re-evaluate vendors, hiring sprees that signal growth/budget, funding/expansion that signals new budget, tech changes, notable news).

Ignore irrelevant results (wrong company, generic directory listings, unrelated businesses with similar names).

SEARCH RESULTS:
${resultsText}

Return ONLY this JSON — no markdown, no explanation:
{
  "signals": [
    {
      "type": "one of: leadership_change | hiring | funding | expansion | tech_change | news",
      "headline": "short headline, e.g. 'Appointed new Head of Marketing'",
      "detail": "1-2 sentences with specifics (names, dates, numbers if available)",
      "date": "approximate date if mentioned, else null",
      "source": "the result link this came from, else null"
    }
  ],
  "summary": "1-2 sentence 'why now' summary an agency could use to time and angle their outreach. If nothing relevant was found, say so plainly.",
  "urgency": "high | medium | low — how strong is the case for reaching out now based on these signals"
}

Rules:
- Only include signals genuinely supported by the search results above
- If no results are relevant, return an empty "signals" array, urgency "low", and an honest summary
- JSON only`

  try {
    const aiRes = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 700,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })

    const raw = aiRes.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(raw.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim())

    return {
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      summary: parsed.summary || "No clear buying signals identified.",
      urgency: ["high", "medium", "low"].includes(parsed.urgency) ? parsed.urgency : "low",
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error("Buying signals synthesis failed:", err)
    return null
  }
}
