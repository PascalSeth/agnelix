import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isSuperadmin } from "@/lib/auth-helpers"
import { openai } from "@/lib/ai"
import { getTrainingBlock } from "@/lib/ai-training"
import { getMatchingExemplars, buildExemplarPromptBlock } from "@/lib/ai-exemplars"
import { HUMAN_WRITING_RULES } from "@/lib/prompts"

export const maxDuration = 60

type StressScenario = {
  id: string
  category: string
  title: string
  prospectMessage: string
  prospectPersona: string
}

const PLAYBOOK_STRESS_SCENARIOS: Record<string, StressScenario[]> = {
  seo: [
    {
      id: "seo-1",
      category: "Past Burn Skepticism",
      title: "Past Agency Burn",
      prospectMessage: "We paid an SEO agency £2.5k/mo for 9 months and got zero qualified leads. SEO is dead.",
      prospectPersona: "Managing Partner at a 15-lawyer commercial litigation firm.",
    },
    {
      id: "seo-2",
      category: "In-House Objection",
      title: "Branded Search Complacency",
      prospectMessage: "We already rank #1 on Google when people search our company name, so we don't need SEO.",
      prospectPersona: "Director of Operations at an architectural glazing supplier.",
    },
    {
      id: "seo-3",
      category: "Pricing & ROI",
      title: "Immediate ROI Demand",
      prospectMessage: "How fast can you guarantee page 1 rankings? We need revenue next month.",
      prospectPersona: "Founder of a boutique e-commerce furniture brand.",
    },
    {
      id: "seo-4",
      category: "Timing Hurdle",
      title: "Q4 Launch Freeze",
      prospectMessage: "We're completely heads-down rebuilding our catalog until December. Circle back in Q1.",
      prospectPersona: "CMO at a high-growth D2C apparel company.",
    },
    {
      id: "seo-5",
      category: "Referral Forwarding",
      title: "Department Pointer",
      prospectMessage: "I don't handle our search strategy, you should email David at david@company.com.",
      prospectPersona: "Chief Technology Officer.",
    },
  ],
  social_media: [
    {
      id: "soc-1",
      category: "In-House Intern",
      title: "Office Admin Handling Posts",
      prospectMessage: "Our receptionist posts our Instagram stories and LinkedIn updates. We're all set.",
      prospectPersona: "Owner of a 3-location private dental and aesthetics group.",
    },
    {
      id: "soc-2",
      category: "B2B Skepticism",
      title: "B2B Irrelevance Hurdle",
      prospectMessage: "We sell heavy industrial manufacturing equipment. Nobody buys CNC machines from TikTok.",
      prospectPersona: "VP of Business Development at an precision engineering plant.",
    },
    {
      id: "soc-3",
      category: "Pricing Challenge",
      title: "Cheap Freelancer Comparison",
      prospectMessage: "Why would we pay £2k/mo when we can hire someone on Upwork for $300 to schedule Canva posts?",
      prospectPersona: "Founder of a luxury hospitality brand.",
    },
    {
      id: "soc-4",
      category: "Timing Hurdle",
      title: "Busy Executive",
      prospectMessage: "Too busy right now. Check back next quarter.",
      prospectPersona: "CEO of a fast-growing tech consultancy.",
    },
    {
      id: "soc-5",
      category: "Meeting Lock",
      title: "Ready to Review Concepts",
      prospectMessage: "Looks interesting. Send me some times for Thursday afternoon.",
      prospectPersona: "Head of Marketing at a fintech startup.",
    },
  ],
  ppc: [
    {
      id: "ppc-1",
      category: "Budget Wastage",
      title: "Burned Ad Budget",
      prospectMessage: "Google ads burned £4,000 of our budget last month with zero sales. We paused all campaigns.",
      prospectPersona: "Owner of a residential solar installation company.",
    },
    {
      id: "ppc-2",
      category: "High CPA Hurdle",
      title: "Unsustainable Cost Per Lead",
      prospectMessage: "Our Meta CPA is £180 and our target is £70. Can you actually fix that or are you guessing?",
      prospectPersona: "Growth Lead at a SaaS platform.",
    },
    {
      id: "ppc-3",
      category: "Agency Lock-in",
      title: "Current Retainer",
      prospectMessage: "We already have a paid media agency on retainer until November.",
      prospectPersona: "VP of Marketing at an online education provider.",
    },
    {
      id: "ppc-4",
      category: "Proof Demand",
      title: "Industry Case Study Proof",
      prospectMessage: "Everyone promises high ROAS. Send actual proof in our specific niche before I get on any call.",
      prospectPersona: "E-commerce Director at a luxury watch brand.",
    },
    {
      id: "ppc-5",
      category: "Timing Delay",
      title: "Seasonal Freeze",
      prospectMessage: "Summer is our slow season. Email us in September.",
      prospectPersona: "Managing Director at a commercial HVAC contractor.",
    },
  ],
  web_design: [
    {
      id: "web-1",
      category: "Recent Redesign",
      title: "Website Already Built",
      prospectMessage: "We paid £8k for a new site 14 months ago. We definitely don't need a new website.",
      prospectPersona: "Managing Partner at an accounting firm.",
    },
    {
      id: "web-2",
      category: "Template Comparison",
      title: "Cheap WordPress Theme",
      prospectMessage: "Why pay thousands when we can just buy a $40 theme on ThemeForest?",
      prospectPersona: "Owner of a boutique gym and fitness center.",
    },
    {
      id: "web-3",
      category: "Pricing Barrier",
      title: "Budget Constraints",
      prospectMessage: "We like your work but our budget is capped at £800.",
      prospectPersona: "Founder of a non-profit foundation.",
    },
    {
      id: "web-4",
      category: "Proof & Speed",
      title: "Mobile CRO Proof",
      prospectMessage: "Our desktop site looks fine. How do you know our mobile bounce rate is high?",
      prospectPersona: "Director of Digital at a luxury retailer.",
    },
    {
      id: "web-5",
      category: "Meeting Close",
      title: "Calendar Request",
      prospectMessage: "Sure, let's do a 15-minute screen share Friday at 11am.",
      prospectPersona: "VP of Product at a medical tech firm.",
    },
  ],
  finance: [
    {
      id: "fin-1",
      category: "Bookkeeper Complacency",
      title: "Bookkeeper vs Fractional CFO",
      prospectMessage: "We already have an in-house bookkeeper and an accountant who files our VAT and year-end.",
      prospectPersona: "Founder of a 25-person software development agency.",
    },
    {
      id: "fin-2",
      category: "Size Hurdle",
      title: "Too Small for CFO",
      prospectMessage: "We only do £1.2M turnover. We're way too small to afford a Chief Financial Officer.",
      prospectPersona: "Managing Director of a specialty logistics provider.",
    },
    {
      id: "fin-3",
      category: "Pricing & Retainer",
      title: "Advisory Rate Inquiry",
      prospectMessage: "What is your monthly retainer for fractional CFO services?",
      prospectPersona: "CEO of an e-commerce brand doing £3M GMV.",
    },
    {
      id: "fin-4",
      category: "Timing Hurdle",
      title: "Year-End Close",
      prospectMessage: "We're in the middle of our annual audit. Reach back out in 6 weeks.",
      prospectPersona: "Finance Director at a biotech startup.",
    },
    {
      id: "fin-5",
      category: "Proof Demand",
      title: "Cash Flow Model Sample",
      prospectMessage: "What does your actual 13-week cash forecast deliverable look like?",
      prospectPersona: "Founder scaling to 40 employees.",
    },
  ],
  sales: [
    {
      id: "sal-1",
      category: "In-House SDR",
      title: "Internal Sales Team",
      prospectMessage: "We already have 3 full-time SDRs doing outbound calling and emailing.",
      prospectPersona: "VP of Sales at a B2B SaaS company.",
    },
    {
      id: "sal-2",
      category: "Cold Spam Skepticism",
      title: "Cold Email Backlash",
      prospectMessage: "Cold email is completely spam. We delete all outbound emails automatically.",
      prospectPersona: "Founder & CEO at an enterprise cybersecurity consultancy.",
    },
    {
      id: "sal-3",
      category: "Pricing & Guarantees",
      title: "Pay-On-Performance Demand",
      prospectMessage: "Do you work strictly on commission / pay-per-booked-meeting?",
      prospectPersona: "Commercial Director at an IT services provider.",
    },
    {
      id: "sal-4",
      category: "Timing & Launch",
      title: "Product Launch Busy",
      prospectMessage: "We're launching our new platform next month. Ping me in November.",
      prospectPersona: "Head of Growth at a series-A fintech.",
    },
    {
      id: "sal-5",
      category: "Meeting Lock",
      title: "Thursday Meeting Agreed",
      prospectMessage: "Let's do Thursday 2pm. Send a calendar link or invite.",
      prospectPersona: "Managing Partner at a recruiting firm.",
    },
  ],
}

// Evaluates an AI response against strict B2B conversation standards
function evaluateResponse(text: string, scenario: StressScenario): {
  score: number
  brevityPass: boolean
  tacticalEmpathyPass: boolean
  noBuzzwordsPass: boolean
  frictionlessCtaPass: boolean
  wordCount: number
  critique: string
  recommendedPatch?: string
} {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const lower = text.toLowerCase()

  if (wordCount === 0) {
    return {
      score: 30,
      brevityPass: false,
      tacticalEmpathyPass: false,
      noBuzzwordsPass: true,
      frictionlessCtaPass: false,
      wordCount: 0,
      critique: "Empty generation returned by model.",
      recommendedPatch: "Ensure prompt token limits allow sufficient generation room.",
    }
  }

  // 1. Brevity Check (Under 110 words ideal, hard cap 130)
  const brevityPass = wordCount > 0 && wordCount <= 115

  // 2. Anti-AI Buzzwords
  const banned = ["delve", "streamline", "synergy", "game-changer", "unleash", "elevate", "revolutionary", "hope this finds you well", "wanted to reach out"]
  const foundBanned = banned.filter(b => lower.includes(b))
  const noBuzzwordsPass = foundBanned.length === 0

  // 3. Tactical Empathy (Validates constraint in first 25 words)
  const first25 = words.slice(0, 25).join(" ").toLowerCase()
  const empathyIndicators = [
    "makes sense", "hear that", "totally fair", "fair enough", "got it", "agree",
    "painful", "healthy skepticism", "definitely", "understand", "great", "underwrite",
    "having", "appreciate", "essential", "right call", "sounds like", "not looking to",
    "totally understand", "completely agree", "you're right", "valid point", "direct answer",
    "at £", "our monthly", "we focus", "totally get it"
  ]
  const tacticalEmpathyPass = empathyIndicators.some(ind => first25.includes(ind))

  // 4. Low-friction CTA Check
  const highFriction = ["30-minute call", "jump on a 30 min", "schedule a demo", "hop on a quick 45", "hop on a call for an hour"]
  const hasHighFriction = highFriction.some(h => lower.includes(h))
  const frictionlessCtaPass = !hasHighFriction && (
    lower.includes("?") || lower.includes("link") || lower.includes("invite") || lower.includes("talk soon") || lower.includes("send it over") || lower.includes("copy") || lower.includes("let me know")
  )

  let score = 100
  const critiques: string[] = []

  if (!brevityPass) {
    score -= 20
    critiques.push(`Exceeded brevity target (${wordCount} words, target <= 110).`)
  }
  if (!noBuzzwordsPass) {
    score -= 25
    critiques.push(`Contained corporate/AI buzzwords: "${foundBanned.join('", "')}".`)
  }
  if (!tacticalEmpathyPass) {
    score -= 20
    critiques.push("Did not validate/label the prospect's constraint in the first sentence.")
  }
  if (!frictionlessCtaPass) {
    score -= 20
    critiques.push("CTA is high-friction or missing a clean binary hook.")
  }

  const critique = critiques.length ? critiques.join(" ") : "Elite cadence, concise, high tactical empathy."
  let recommendedPatch: string | undefined
  if (score < 80) {
    recommendedPatch = `Enforce rule: In ${scenario.category} scenarios, keep reply under 80 words and open with: "${empathyIndicators[0]}..."`
  }

  return {
    score: Math.max(30, score),
    brevityPass,
    tacticalEmpathyPass,
    noBuzzwordsPass,
    frictionlessCtaPass,
    wordCount,
    critique,
    recommendedPatch,
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !isSuperadmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { playbookType = "sales" } = await req.json().catch(() => ({}))
    const scenarios = PLAYBOOK_STRESS_SCENARIOS[playbookType] || PLAYBOOK_STRESS_SCENARIOS.sales

    const trainingBlock = await getTrainingBlock("REPLY", playbookType, null)

    // Execute 5 scenarios in parallel
    const testPromises = scenarios.map(async scenario => {
      const matchingExemplars = getMatchingExemplars({
        surface: "REPLY",
        playbookType,
        queryText: scenario.prospectMessage,
        limit: 2,
      })
      const exemplarBlock = buildExemplarPromptBlock(matchingExemplars)

      const prompt = `You are an elite B2B sales closer writing a reply to a prospect.
PROSPECT PERSONA: ${scenario.prospectPersona}
THEIR EXACT MESSAGE: "${scenario.prospectMessage}"

${exemplarBlock}${trainingBlock}${HUMAN_WRITING_RULES}

Write the reply now. Hard cap 100 words.`

      let output = ""
      try {
        const response = await openai.chat.completions.create({
          model: "deepseek-v4-pro",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          // @ts-expect-error — DeepSeek parameter
          thinking: { type: "disabled" },
        })
        output = response.choices[0]?.message?.content?.trim() || ""
      } catch {
        // Fallback to flash
        try {
          const fallback = await openai.chat.completions.create({
            model: "deepseek-v4-flash",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
            // @ts-expect-error
            thinking: { type: "disabled" },
          })
          output = fallback.choices[0]?.message?.content?.trim() || ""
        } catch {
          output = ""
        }
      }

      const evalResult = evaluateResponse(output, scenario)

      return {
        id: scenario.id,
        title: scenario.title,
        category: scenario.category,
        prospectMessage: scenario.prospectMessage,
        prospectPersona: scenario.prospectPersona,
        aiResponse: output,
        ...evalResult,
      }
    })

    const results = await Promise.all(testPromises)
    const compositeResilience = Math.round(
      results.reduce((acc, r) => acc + r.score, 0) / results.length
    )

    return NextResponse.json({
      playbookType,
      compositeResilience,
      testsPassed: results.filter(r => r.score >= 80).length,
      totalTests: results.length,
      results,
    })
  } catch (error) {
    console.error("[StressTest API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stress test failed" },
      { status: 500 }
    )
  }
}
