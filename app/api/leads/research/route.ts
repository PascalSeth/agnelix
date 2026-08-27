import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import OpenAI from "openai"
import { deepCrawlWebsite, DeepCrawlResult } from "@/lib/deep-crawler"
import { getTrainingBlock } from "@/lib/ai-training"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export interface PublicAnnouncement {
  headline: string
  detail: string
  date: string | null
  type: "launch" | "hiring" | "expansion" | "partnership" | "rebrand" | "event" | "roadmap"
  sourceUrl: string | null
}

export interface BusinessProfile {
  whatTheyDo: string
  specializations: string[]
  targetCustomers: string
  pricingTier: string // "Budget / Accessible", "Mid-Market", "High-End / Boutique", "Enterprise"
  positioning: string
  
  // Real Customer Reviews & Friction Analysis
  reviewHighlights: {
    overallSentiment: "Overwhelmingly Positive" | "Mixed / Polarized" | "Friction-Heavy" | "Limited Reviews"
    rating: number | null
    totalReviews: number | null
    praise: string[]
    complaints: string[]
    recurringFrictionPoint: string | null
    notableQuote: string | null
  }

  // Public Roadmap & Upcoming Moves ("What they have made publicly known they are coming to do")
  publicRoadmap: {
    upcomingInitiatives: string[] // e.g. "Hiring 3 senior engineers for European rollout", "Announced Q4 portal redesign"
    announcements: PublicAnnouncement[]
    hiringSignals: string[]
    growthTrajectory: "Rapid Expansion" | "Steady / Established" | "Transitioning / Rebranding" | "Early Stage"
  }

  // Technical & Infrastructure Signals
  technicalProfile?: {
    techStack: string[]
    detectedPricing: string[]
    leadership: { name: string; title: string }[]
    socials: Record<string, string>
    contactEmails: string[]
    contactPhones: string[]
  }

  // Actionable Angles Grounded in Reality
  contentGaps: string[]
  whyNowTrigger: string // The exact real-world observation linking their public plan or review gap to outreach
  outreachAngles: string[]
  recommendedApproach: {
    id: "website" | "local-rank" | "competitor" | "industry" | "question" | "social-proof" | "roadmap" | "review-friction"
    label: string
    reason: string
  }
}

// ── Google Search for Public Announcements & Roadmap ──────────────────────────

async function searchPublicAnnouncementsAndNews(businessName: string, domain?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || ""
  const cx = process.env.GOOGLE_SEARCH_CX || ""
  if (!apiKey || !cx || !businessName) return ""

  const domainFilter = domain ? ` ${domain.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}` : ""

  try {
    const query = `"${businessName}"${domainFilter} (announces OR launching OR "coming soon" OR expands OR "new location" OR hiring OR "plans to" OR "unveils" OR "partners with" OR roadmap OR news OR press)`
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`,
      { signal: AbortSignal.timeout(5500) }
    )
    if (!res.ok) return ""
    const data = await res.json()
    const items = data.items || []
    return items
      .map((item: { title: string; snippet: string; link: string }) => `- ${item.title}: ${item.snippet} (${item.link})`)
      .join("\n")
  } catch {
    return ""
  }
}

// ── Main Deep AI Research Engine ─────────────────────────────────────────────

export async function performAiResearch(params: {
  websiteUrl?: string
  businessName: string
  industry?: string
  address?: string
  rating?: number
  userRatingCount?: number
  userId?: string
  reviews?: Array<{
    text?: { text?: string }
    rating?: number
    authorAttribution?: { displayName?: string }
  }>
}): Promise<BusinessProfile> {
  const { websiteUrl, businessName, industry, address, rating, userRatingCount, reviews, userId } = params

  // 1. Deep Multi-Page Crawl, Public News Search & Training Directives in Parallel
  const [crawlResult, publicNews, trainingBlock]: [DeepCrawlResult | null, string, string] = await Promise.all([
    websiteUrl ? deepCrawlWebsite(websiteUrl, 8) : Promise.resolve(null),
    searchPublicAnnouncementsAndNews(businessName, websiteUrl),
    userId ? getTrainingBlock("EMAIL", null, userId) : Promise.resolve(""),
  ])

  // 2. Format Reviews
  const reviewLines = (reviews ?? [])
    .slice(0, 10)
    .map(r => `${r.rating ?? "?"}★ [${r.authorAttribution?.displayName || "Customer"}]: "${(r.text?.text ?? "").slice(0, 300)}"`)
    .join("\n")

  // 3. Business type context from crawler
  const businessType = crawlResult?.businessType || "service-business"
  const businessTypeSignals = crawlResult?.businessTypeSignals || []

  const businessTypeGuidance: Record<string, string> = {
    ecommerce: "This is an ECOMMERCE business. Focus on their product catalogue, product categories, target buyers, average order value signals, and B2B wholesale/partnership opportunities.",
    saas: "This is a SaaS/Software business. Focus on their features, target user segment, pricing tiers, integrations, and which companies or job roles would benefit most from the tool.",
    restaurant: "This is a RESTAURANT or FOOD business. Focus on cuisine, dining experience, catering/delivery, and any B2B food/event partnership angles.",
    healthcare: "This is a HEALTHCARE or WELLNESS business. Focus on medical specialties, patient profile, referral partnerships, and insurance/B2B angles.",
    "law-firm": "This is a LAW FIRM. Focus on practice areas, typical client types, and case types they handle.",
    "real-estate": "This is a REAL ESTATE business. Focus on property types, geographic markets, buyer/seller profiles.",
    trades: "This is a TRADES/CONSTRUCTION business. Focus on the specific trade, service area, commercial vs residential split, and licensing signals.",
    agency: "This is a MARKETING or CREATIVE AGENCY. Focus on service specialties, client types served, and specific results/case studies shown.",
    "service-business": "This is a professional service business. Describe exactly what services they provide based on the website content.",
  }
  const typeGuide = businessTypeGuidance[businessType] || businessTypeGuidance["service-business"]

  const prompt = `You are a world-class B2B sales intelligence investigator. Analyze REAL data scraped from the web for this company. Be precise, specific, and factual — use ONLY the data provided. Do NOT invent or generalize.
${trainingBlock ? `\nAGENCY DIRECTIVES & ANGLE RULES:\n${trainingBlock}\nEnsure all outreachAngles, contentGaps, and recommendedApproach strictly reflect and execute these agency directives.\n` : ""}
TARGET COMPANY: "${businessName}"
INDUSTRY: ${industry || "Not specified"}
LOCATION: ${address || "Unknown"}
OVERALL RATING: ${rating ? `${rating}★ (${userRatingCount || 0} reviews)` : "Not listed"}

DETECTED BUSINESS TYPE: ${businessType.toUpperCase()}
BUSINESS TYPE CONTEXT: ${typeGuide}
${businessTypeSignals.length > 0 ? `DETECTION SIGNALS: ${businessTypeSignals.join(" | ")}` : ""}

DEEP MULTI-PAGE WEBSITE CRAWL (${crawlResult?.pagesCrawledCount || 0} pages scraped):
${crawlResult ? crawlResult.fullTextDigest : "No website available."}

PUBLIC ANNOUNCEMENTS, PRESS & ROADMAP SIGNALS:
${publicNews ? publicNews : "No recent public press articles found."}

CUSTOMER REVIEWS & FEEDBACK:
${reviewLines ? reviewLines : "No review text available."}

ANALYZE THE DATA AND RETURN ONLY THIS VALID JSON (no markdown, no code fences, no conversational text):
{
  "whatTheyDo": "1-2 precise sentences describing exactly what this company does and who they serve, using their own language from the website.",
  "specializations": ["specific service or product niche 1", "specific niche 2", "specific niche 3"],
  "targetCustomers": "Precise ideal customer profile derived from the website content, reviews, and industry signals. Be specific — NOT generic (e.g. 'Mid-sized hotel chains needing linen supply contracts' not just 'businesses').",
  "pricingTier": "One of: Budget / Accessible | Mid-Market | High-End / Boutique | Enterprise",
  "positioning": "How they specifically differentiate in their market based on what the website actually says (e.g. speed guarantee, local authority, certifications, technology, niche focus).",
  "reviewHighlights": {
    "overallSentiment": "One of: Overwhelmingly Positive | Mixed / Polarized | Friction-Heavy | Limited Reviews",
    "rating": ${rating || "null"},
    "totalReviews": ${userRatingCount || "null"},
    "praise": ["specific theme customers rave about 1", "specific praise theme 2"],
    "complaints": ["specific recurring complaint or operational gap 1", "specific complaint 2"],
    "recurringFrictionPoint": "1 sentence on their biggest recurring customer friction (e.g. slow response, outdated booking system) or null",
    "notableQuote": "Most revealing snippet from a real review illustrating quality or a flaw, or null"
  },
  "publicRoadmap": {
    "upcomingInitiatives": [
      "Specific public move or expansion announced (e.g. Hiring 3 SDRs for Q4 outbound, Launching new eCommerce collection, Opening Manchester hub)",
      "Another public initiative found"
    ],
    "announcements": [
      {
        "headline": "Short announcement headline",
        "detail": "1-2 sentences on what they stated publicly",
        "date": "Approximate date if found, else null",
        "type": "one of: launch | hiring | expansion | partnership | rebrand | event | roadmap",
        "sourceUrl": "URL if available, else null"
      }
    ],
    "hiringSignals": ["Key roles they are actively recruiting for"],
    "growthTrajectory": "One of: Rapid Expansion | Steady / Established | Transitioning / Rebranding | Early Stage"
  },
  "contentGaps": ["Critical information missing from their website that buyers need to make a decision"],
  "whyNowTrigger": "The sharpest 1-sentence 'Why Now' hook tying their recent move, hiring signal, roadmap, or customer friction to a reason for reaching out today.",
  "outreachAngles": [
    "Angle 1: Grounded in their upcoming roadmap or public announcement",
    "Angle 2: Grounded in a specific review praise/complaint theme",
    "Angle 3: Grounded in an operational gap on their website"
  ],
  "recommendedApproach": {
    "id": "one of: roadmap | review-friction | website | local-rank | competitor | industry | question | social-proof",
    "label": "Short approach title",
    "reason": "1-2 sentences explaining why this angle is highest-leverage for THIS specific company right now."
  }
}`

  try {
    const aiRes = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [
        {
          role: "system",
          content: "You are a precise B2B intelligence analyst. You extract factual business intelligence from real website data and reviews. You ALWAYS respond with only valid JSON — no markdown, no code fences, no preamble. You never hallucinate or generalize beyond what the data shows."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 2800,
      temperature: 0.2,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })

    const raw = aiRes.choices[0]?.message?.content ?? "{}"
    const cleanJson = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    const profile: BusinessProfile = JSON.parse(cleanJson)

    // Merge crawl infrastructure metadata if available
    if (crawlResult) {
      profile.technicalProfile = {
        techStack: crawlResult.techStack,
        detectedPricing: crawlResult.pricingInfo.priceSnippets,
        leadership: crawlResult.leadershipAndTeam,
        socials: Object.fromEntries(Object.entries(crawlResult.socialLinks).filter(([, v]) => !!v)) as Record<string, string>,
        contactEmails: crawlResult.contactDetails.emails,
        contactPhones: crawlResult.contactDetails.phones,
      }
      // If hiring roles detected on /careers, enrich roadmap hiringSignals
      if (crawlResult.careersAndHiring.openRoles.length > 0) {
        profile.publicRoadmap.hiringSignals = Array.from(
          new Set([...profile.publicRoadmap.hiringSignals, ...crawlResult.careersAndHiring.openRoles])
        )
      }
    }

    return profile
  } catch (err) {
    console.error("[performAiResearch] DeepSeek pro failed, falling back to flash:", err)
    try {
      const fallback = await openai.chat.completions.create({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        // @ts-expect-error
        thinking: { type: "disabled" },
      })
      const raw = fallback.choices[0]?.message?.content ?? "{}"
      const cleanJson = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
      const profile: BusinessProfile = JSON.parse(cleanJson)
      if (crawlResult) {
        profile.technicalProfile = {
          techStack: crawlResult.techStack,
          detectedPricing: crawlResult.pricingInfo.priceSnippets,
          leadership: crawlResult.leadershipAndTeam,
          socials: Object.fromEntries(Object.entries(crawlResult.socialLinks).filter(([, v]) => !!v)) as Record<string, string>,
          contactEmails: crawlResult.contactDetails.emails,
          contactPhones: crawlResult.contactDetails.phones,
        }
      }
      return profile
    } catch {
      return {
        whatTheyDo: `${businessName} operates in ${industry || "their local market"}.`,
        specializations: crawlResult?.detectedServices || [],
        targetCustomers: "Local and commercial clients",
        pricingTier: "Mid-Market",
        positioning: "Established provider",
        reviewHighlights: {
          overallSentiment: "Overwhelmingly Positive",
          rating: rating || null,
          totalReviews: userRatingCount || null,
          praise: [],
          complaints: [],
          recurringFrictionPoint: null,
          notableQuote: null,
        },
        publicRoadmap: {
          upcomingInitiatives: [],
          announcements: [],
          hiringSignals: crawlResult?.careersAndHiring.openRoles || [],
          growthTrajectory: "Steady / Established",
        },
        technicalProfile: crawlResult
          ? {
              techStack: crawlResult.techStack,
              detectedPricing: crawlResult.pricingInfo.priceSnippets,
              leadership: crawlResult.leadershipAndTeam,
              socials: Object.fromEntries(Object.entries(crawlResult.socialLinks).filter(([, v]) => !!v)) as Record<string, string>,
              contactEmails: crawlResult.contactDetails.emails,
              contactPhones: crawlResult.contactDetails.phones,
            }
          : undefined,
        contentGaps: [],
        whyNowTrigger: `Reaching out to discuss scaling pipeline for ${businessName}.`,
        outreachAngles: [`Direct exploration of ${industry || "market"} opportunities.`],
        recommendedApproach: {
          id: "industry",
          label: "Industry Opportunity",
          reason: "Standard industry engagement angle based on current market signals.",
        },
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const params = await req.json()
    if (!params.businessName) return NextResponse.json({ error: "businessName required" }, { status: 400 })

    const profile = await performAiResearch({ ...params, userId: session.user.id })
    return NextResponse.json({ profile, ...profile })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown"
    console.error("Research error:", msg)
    return NextResponse.json({ error: "Research failed" }, { status: 500 })
  }
}
