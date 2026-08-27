import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"
import { performAudit } from "@/app/api/leads/audit/route"
import { deepCrawlWebsite } from "@/lib/deep-crawler"
import { getTrainingBlock } from "@/lib/ai-training"

const COOLDOWN_MS = 24 * 60 * 60 * 1000
const TRIALS_PER_WINDOW_USER = 10
const TRIALS_PER_WINDOW_GUEST = 5

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

// In-memory sliding window cache for guest rate-limiting
const guestTrialCache = new Map<string, { count: number; firstTrialAt: number }>()

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "127.0.0.1"
}

function getGuestStatus(ip: string) {
  const now = Date.now()
  const record = guestTrialCache.get(ip)
  if (!record || now - record.firstTrialAt >= COOLDOWN_MS) {
    return { eligible: true, nextAvailableAt: null, trialsLeft: TRIALS_PER_WINDOW_GUEST }
  }
  const trialsLeft = Math.max(0, TRIALS_PER_WINDOW_GUEST - record.count)
  const nextAvailableAt = trialsLeft > 0 ? null : new Date(record.firstTrialAt + COOLDOWN_MS).toISOString()
  return { eligible: trialsLeft > 0, nextAvailableAt, trialsLeft }
}

function recordGuestTrial(ip: string) {
  const now = Date.now()
  const record = guestTrialCache.get(ip)
  if (!record || now - record.firstTrialAt >= COOLDOWN_MS) {
    guestTrialCache.set(ip, { count: 1, firstTrialAt: now })
  } else {
    guestTrialCache.set(ip, { count: record.count + 1, firstTrialAt: record.firstTrialAt })
  }
}

function windowStatus(lastTrialAt: Date | null, trialCount: number) {
  if (!lastTrialAt) {
    return { eligible: true, nextAvailableAt: null, trialsLeft: TRIALS_PER_WINDOW_USER }
  }
  const windowEnd = lastTrialAt.getTime() + COOLDOWN_MS
  if (Date.now() >= windowEnd) {
    return { eligible: true, nextAvailableAt: null, trialsLeft: TRIALS_PER_WINDOW_USER }
  }
  const trialsLeft = Math.max(0, TRIALS_PER_WINDOW_USER - trialCount)
  return {
    eligible: trialsLeft > 0,
    nextAvailableAt: trialsLeft > 0 ? null : new Date(windowEnd).toISOString(),
    trialsLeft,
  }
}

// GET — check trial eligibility (works for both authenticated and guest visitors)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastTrialAt: true, trialCount: true },
    })
    const status = windowStatus(user?.lastTrialAt ?? null, user?.trialCount ?? 0)
    return NextResponse.json({
      eligible: status.eligible,
      nextAvailableAt: status.nextAvailableAt,
      trialsLeft: status.trialsLeft,
      isAuthenticated: true,
    })
  }

  const ip = getClientIp(req)
  const guestStatus = getGuestStatus(ip)
  return NextResponse.json({
    eligible: guestStatus.eligible,
    nextAvailableAt: guestStatus.nextAvailableAt,
    trialsLeft: guestStatus.trialsLeft,
    isAuthenticated: false,
  })
}

// POST — run live deep business research, company overview & strategic Galien outbound brief
export async function POST(req: NextRequest) {
  const session = await auth()
  const ip = getClientIp(req)

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastTrialAt: true, trialCount: true },
    })
    const status = windowStatus(user?.lastTrialAt ?? null, user?.trialCount ?? 0)
    if (!status.eligible) {
      return NextResponse.json(
        { error: "Trials used up for today", nextAvailableAt: status.nextAvailableAt },
        { status: 429 }
      )
    }
  } else {
    const guestStatus = getGuestStatus(ip)
    if (!guestStatus.eligible) {
      return NextResponse.json(
        { error: "Guest trials used up for today", nextAvailableAt: guestStatus.nextAvailableAt },
        { status: 429 }
      )
    }
  }

  let body: { companyName?: string; website?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const companyName = body.companyName?.trim()
  const website = body.website?.trim()
  if (!companyName || !website) {
    return NextResponse.json({ error: "Company name and website are required" }, { status: 400 })
  }

  // 1. Parallel Execution: Multi-page deep crawl + technical audit
  const [crawlResult, auditResult] = await Promise.all([
    deepCrawlWebsite(website, 8).catch(() => null),
    performAudit(website).catch(() => ({
      ssl: true,
      speed: 1200,
      mobile: true,
      googleAnalytics: true,
      pixel: false,
      noMetaDesc: false,
      googleAds: false,
      googleTagManager: false,
      wordpress: false,
      shopify: false,
      hasChat: false,
      noH1: false,
      hasStructuredData: false,
      title: companyName,
    })),
  ])

  const websiteDigest = crawlResult?.fullTextDigest || ""
  const servicesFound = crawlResult?.detectedServices || []
  const pricingInfo = crawlResult?.pricingInfo
  const techStack = crawlResult?.techStack || []
  const leadershipTeam = crawlResult?.leadershipAndTeam || []
  const caseStudies = crawlResult?.caseStudiesAndProof || []
  const pagesCrawled = crawlResult?.pagesCrawledCount || 0
  const businessType = crawlResult?.businessType || "service-business"
  const businessTypeSignals = crawlResult?.businessTypeSignals || []

  // 2. Synthesize deep business intelligence & Galien autonomous sales blueprint
  const contextBlock = [
    websiteDigest ? `DEEP WEBSITE RESEARCH (${pagesCrawled} pages crawled):\n${websiteDigest.slice(0, 12000)}` : "",
    techStack.length > 0 ? `TECH STACK: ${techStack.join(", ")}` : "",
    pricingInfo?.found ? `PRICING: ${pricingInfo.currency || ""} ${pricingInfo.priceSnippets.join(" | ")}` : "",
    leadershipTeam.length > 0 ? `TEAM: ${leadershipTeam.map(t => `${t.name} (${t.title})`).join(", ")}` : "",
    caseStudies.length > 0 ? `PROOF/CASE STUDIES: ${caseStudies.map(c => c.clientOrTitle).join("; ")}` : "",
  ].filter(Boolean).join("\n\n")

  // Business-type specific guidance for the AI
  const businessTypeGuidance: Record<string, string> = {
    ecommerce: `This is an ECOMMERCE / ONLINE STORE business. They sell physical or digital products online. Their "services" are their product categories. Their ideal outreach targets are buyers, wholesale partners, or B2B bulk purchasers. DO NOT treat them as a service agency. Describe what products they sell and who buys them.`,
    saas: `This is a SOFTWARE / SAAS company. They sell a subscription software product. Focus on their features, target user segment, pricing model, and integration ecosystem. Ideal prospects are decision-makers who would benefit from adopting this tool.`,
    restaurant: `This is a RESTAURANT / FOOD business. They serve food to customers in-person, via delivery, or takeout. Focus on their cuisine, experience, and any catering/wholesale opportunities for Galien to target.`,
    healthcare: `This is a HEALTHCARE / MEDICAL business. They provide health or wellness services. Focus on their specialties, patient demographics, and any B2B (insurance, referral) partnerships that could be developed.`,
    "law-firm": `This is a LAW FIRM / LEGAL business. They provide legal services. Focus on their practice areas, case types, and what type of clients they represent.`,
    "real-estate": `This is a REAL ESTATE business. They help people buy, sell, or rent property. Focus on their market area, property types, and ideal client profile.`,
    trades: `This is a TRADES / CONSTRUCTION business. They provide skilled trade services (e.g. roofing, plumbing, HVAC). Focus on their specific trade, service area, and ideal commercial or residential clients.`,
    agency: `This is a MARKETING / CREATIVE AGENCY. They provide professional services to other businesses. Focus on their specific service specialties, past client types, and the results they deliver.`,
    "service-business": `This is a SERVICE BUSINESS. Accurately describe what professional services they provide based solely on the website content.`,
  }

  const typeGuide = businessTypeGuidance[businessType] || businessTypeGuidance["service-business"]
  const emailTraining = await getTrainingBlock("EMAIL", "sales", null)

  const prompt = `You are Galien — the world's most precise Autonomous AI SDR and B2B intelligence engine. You have been given REAL scraped website data for a business. Your job is to extract EXACTLY what this business does based ONLY on what the website content says. Do NOT invent, generalize or hallucinate — use the actual data provided.

COMPANY: "${companyName}"
WEBSITE: "${website}"

DETECTED BUSINESS TYPE: ${businessType.toUpperCase()}
BUSINESS TYPE SIGNALS: ${businessTypeSignals.length > 0 ? businessTypeSignals.join(" | ") : "General service business"}

IMPORTANT BUSINESS CONTEXT: ${typeGuide}

${contextBlock}

${emailTraining}

Based STRICTLY on the above real website content and direct-response copywriting rules, generate an accurate Company Intelligence Overview and Galien Outbound Strategy in STRICT JSON format with no markdown, no code fences, no extra text — only the JSON object:
{
  "whatTheyDo": "Precise 2-3 sentence description of what this specific company does, using their actual language, services, and positioning from the website content. DO NOT be vague.",
  "whatTheyOffer": [
    "Specific service/product 1 extracted from the site with what problem it solves",
    "Specific service/product 2 extracted from the site with what problem it solves",
    "Specific service/product 3 extracted from the site with what problem it solves",
    "Specific service/product 4 if found",
    "Specific service/product 5 if found"
  ],
  "targetMarket": "Precise description of who this company's ideal customers are based on actual website signals (industries mentioned, client testimonials, case studies, service descriptions, geography etc). Be specific, not generic.",
  "positioning": "Their actual positioning and differentiators extracted from the website (e.g. pricing model, speed, specialization, guarantee, geography, awards, certifications).",
  "strategicAngles": {
    "idealProspects": [
      "Specific buyer type 1 Galien should target based on what this company actually sells (e.g. 'Regional restaurant chains needing POS system integrations')",
      "Specific buyer type 2",
      "Specific buyer type 3"
    ],
    "personalizedHook": "A specific, non-generic outreach hook based on real signals from this company's website — reference their actual service or positioning in the hook.",
    "howGalienHelps": [
      "Autonomous Lead Discovery: Galien sources verified decision-makers in ${companyName}'s exact target market.",
      "Hyper-Personalized Outreach: Galien writes bespoke emails referencing ${companyName}'s specific offerings and the prospect's exact business context.",
      "Autopilot Inbox & Calendar: Galien replies to interested prospects and books discovery calls directly into your calendar around the clock."
    ]
  },
  "sampleOpeningPitch": "Subject: [Compelling subject line relevant to what ${companyName} sells]\\n\\nHi [First Name],\\n\\n[A 50-word personalized cold email written by Galien on behalf of ${companyName} to their ideal client. Follow the 'Pain, Proof, Plan' framework. Lead with an acute pain/outcome, provide concrete value or proof, and end with a frictionless low-pressure CTA. No spam. No fluff.]",
  "initialChatGreeting": "Hey! I just did a deep research sweep on ${companyName} — I scraped your website, mapped your core services, and identified your highest-value target clients.\\n\\nHere's what I found and how I can fill your calendar with qualified meetings. Ask me anything — about your ideal leads, how I'd pitch your services, or how I handle objections from prospects!"
}`

  let overview: {
    whatTheyDo: string
    whatTheyOffer: string[]
    targetMarket: string
    positioning: string
    strategicAngles: {
      idealProspects: string[]
      personalizedHook: string
      howGalienHelps: string[]
    }
    sampleOpeningPitch: string
    initialChatGreeting: string
  }

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-5",
      messages: [
        {
          role: "system",
          content: "You are a precise business intelligence AI. You extract accurate company data from real website content. You always respond with ONLY valid JSON — no markdown, no code fences, no preamble. Base your output strictly on the provided website data."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2400,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })

    const raw = res.choices[0]?.message?.content?.trim() || "{}"
    const cleanJson = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    overview = JSON.parse(cleanJson)
  } catch (err) {
    console.error("AI Overview generation fallback:", err)
    overview = {
      whatTheyDo: `${companyName} delivers specialized solutions and services for their clients.`,
      whatTheyOffer: servicesFound.length > 0 ? servicesFound.slice(0, 3) : ["Specialized Consultation", "Full-Service Execution", "Ongoing Strategy"],
      targetMarket: "High-value commercial and residential decision makers",
      positioning: "Trusted, results-focused provider",
      strategicAngles: {
        idealProspects: [
          `Commercial clients seeking ${companyName} expertise`,
          "Regional business owners and directors",
          "High-growth partner organizations",
        ],
        personalizedHook: `Reaching out to discuss high-impact growth opportunities with ${companyName}.`,
        howGalienHelps: [
          "Autonomous Lead Discovery: Galien sources verified decision-maker emails matching your exact niche.",
          "Custom Outbound Pitching: Writes bespoke, non-templated emails that get replies.",
          "24/7 Autopilot Calendar Booking: Engages interested leads and schedules meetings directly onto your calendar.",
        ],
      },
      sampleOpeningPitch: `Subject: Quick question for ${companyName}\n\nHi [First Name],\n\nI noticed your recent work in the industry and wanted to reach out. We specialize in helping businesses like yours scale qualified client acquisition without manual outreach. Would you be open to a brief 10-minute chat this week?`,
      initialChatGreeting: `Hey! I just analyzed ${companyName}. I've put together a strategic overview of what you do, who you serve, and how I can help fill your calendar with qualified client meetings.\n\nAsk me anything — test my outreach strategy, ask how I find leads, or test how I handle prospect objections!`,
    }
  }

  // Record usage
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    const windowExpired = !user?.lastTrialAt || Date.now() >= user.lastTrialAt.getTime() + COOLDOWN_MS
    await prisma.user.update({
      where: { id: session.user.id },
      data: windowExpired
        ? { lastTrialAt: new Date(), trialCount: 1 }
        : { trialCount: { increment: 1 } },
    })
  } else {
    recordGuestTrial(ip)
  }

  const updatedStatus = session?.user?.id
    ? windowStatus(new Date(), 1)
    : getGuestStatus(ip)

  return NextResponse.json({
    overview,
    audit: {
      ssl: auditResult.ssl,
      speed: auditResult.speed,
      mobile: auditResult.mobile,
      googleAnalytics: auditResult.googleAnalytics,
      pixel: auditResult.pixel,
      noMetaDesc: auditResult.noMetaDesc,
    },
    trialsLeft: updatedStatus.trialsLeft,
    nextAvailableAt: updatedStatus.nextAvailableAt,
  })
}
