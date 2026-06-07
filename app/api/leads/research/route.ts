import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import OpenAI from "openai"
import * as cheerio from "cheerio"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// Exported so icebreaker route and component can import the type
export interface BusinessProfile {
  whatTheyDo: string
  specializations: string[]
  targetCustomers: string
  positioning: string
  reviewHighlights: {
    praise: string[]
    complaints: string[]
    notableQuote: string | null
  }
  contentGaps: string[]
  outreachAngles: string[]
  recommendedApproach: {
    id: "website" | "local-rank" | "competitor" | "industry" | "question" | "social-proof"
    label: string
    reason: string   // why this is the strongest angle for THIS business
  }
}

// ── Site scraper ─────────────────────────────────────────────────────────────

async function scrapeSiteContent(url: string): Promise<string> {
  const base = new URL(url.startsWith("http") ? url : `https://${url}`)
  const paths = ["", "/about", "/about-us", "/services", "/our-services", "/what-we-do"]
  const texts: string[] = []

  for (const path of paths.slice(0, 4)) {
    try {
      const res = await fetch(new URL(path, base).href, {
        headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-GB,en;q=0.9" },
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      })
      if (!res.ok) continue

      const html = await res.text()
      const $ = cheerio.load(html)
      $("script, style, nav, header, footer, noscript, svg, iframe, form").remove()

      // Extract headings first (key selling points / service names)
      const headings = $("h1, h2, h3")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(h => h.length > 3 && h.length < 120)
        .slice(0, 12)

      // Main content text
      const bodyText = ($("main, article, [role='main'], .content, #content, .page-content").text()
        || $("body").text())
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2500)

      if (headings.length > 0 || bodyText.length > 100) {
        texts.push(`[${path || "/"}]\nHeadings: ${headings.join(" | ")}\n${bodyText}`)
      }
    } catch { /* skip page */ }
  }

  return texts.join("\n\n---\n\n").slice(0, 7000)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function performAiResearch(params: {
  websiteUrl?: string
  businessName: string
  industry?: string
  address?: string
  reviews?: Array<{
    text?: { text?: string }
    rating?: number
    authorAttribution?: { displayName?: string }
  }>
}): Promise<BusinessProfile> {
  const { websiteUrl, businessName, industry, address, reviews } = params

  // 1. Scrape site in parallel with building review text
  const [siteContent] = await Promise.all([
    websiteUrl ? scrapeSiteContent(websiteUrl) : Promise.resolve(""),
  ])

  // 2. Format reviews
  const reviewLines = (reviews ?? [])
    .slice(0, 5)
    .map(r => `${r.rating ?? "?"}★ — "${(r.text?.text ?? "").slice(0, 220)}"`)
    .join("\n")

  const hasContent = siteContent.length > 100 || reviewLines.length > 0

  const prompt = `You are a B2B business intelligence analyst. Your job is to create a research brief on a business that will be used to craft personalised cold outreach.

Business: ${businessName}${industry ? `, a ${industry}` : ""} in ${address || "the UK"}

${siteContent ? `Website content:\n${siteContent}` : "No website available."}

${reviewLines ? `Google reviews:\n${reviewLines}` : "No reviews available."}

Analyse everything and return ONLY this JSON — no markdown, no explanation:
{
  "whatTheyDo": "1-2 sentences describing exactly what they do and who they serve — specific, not generic",
  "specializations": ["specific service 1", "specific service 2", "specific service 3"],
  "targetCustomers": "who specifically they serve",
  "positioning": "how they position themselves — speed, price, quality, niche, local trust etc",
  "reviewHighlights": {
    "praise": ["recurring praise theme 1", "recurring praise theme 2"],
    "complaints": ["recurring gap or complaint 1", "recurring gap or complaint 2"],
    "notableQuote": "most specific, useful snippet from a real review or null"
  },
  "contentGaps": ["something missing from their site that buyers need to know", "another gap"],
  "outreachAngles": [
    "specific angle 1 grounded in something you actually found",
    "specific angle 2 grounded in something you actually found",
    "specific angle 3 grounded in something you actually found"
  ],
  "recommendedApproach": {
    "id": "one of: website | local-rank | competitor | industry | question | social-proof",
    "label": "short display name e.g. Website Issues",
    "reason": "1-2 sentences explaining why this specific angle is the strongest for THIS business based on what you found"
  }
}

To choose the recommendedApproach:
- website: best if site has a clear technical problem (no SSL, very slow, broken mobile, no analytics)
- local-rank: best if rating is below 4.0 or review count is very low (under 20) — directly costs them calls
- competitor: best if their market positioning is unclear or they seem commoditised
- industry: best if their sector is changing and they seem unaware
- question: best if you found something genuinely puzzling or contradictory about their setup
- social-proof: best if you can relate a result that mirrors their specific situation (use their specialisations and pain points to make it relevant)

Rules:
- Be specific — reference actual things found, not platitudes
- If a field has no data use null or []
- JSON only`

  const aiRes = await openai.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: hasContent ? prompt : `${prompt}\n\nNote: Very limited data available — generate reasonable inferences based on industry and location only.` }],
    temperature: 0.3,
    max_tokens: 700,
    // @ts-expect-error — disable DeepSeek thinking for fast tasks
    thinking: { type: "disabled" },
  })

  const raw = aiRes.choices[0]?.message?.content ?? "{}"
  const profile: BusinessProfile = JSON.parse(
    raw.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim()
  )

  return profile
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const params = await req.json()
    if (!params.businessName) return NextResponse.json({ error: "businessName required" }, { status: 400 })

    const profile = await performAiResearch(params)
    return NextResponse.json({ profile })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown"
    console.error("Research error:", msg)
    return NextResponse.json({ error: "Research failed" }, { status: 500 })
  }
}
