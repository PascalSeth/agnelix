import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"
import { performAudit } from "@/app/api/leads/audit/route"

const COOLDOWN_MS = 24 * 60 * 60 * 1000

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

function nextAvailableAt(lastTrialAt: Date | null) {
  if (!lastTrialAt) return null
  const next = new Date(lastTrialAt.getTime() + COOLDOWN_MS)
  return next.getTime() > Date.now() ? next : null
}

// GET — trial eligibility for the current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastTrialAt: true },
  })

  const next = nextAvailableAt(user?.lastTrialAt ?? null)
  return NextResponse.json({ eligible: !next, nextAvailableAt: next?.toISOString() ?? null })
}

// POST — run a live, one-time-per-24h demo audit + AI-personalized opener
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastTrialAt: true },
  })

  const next = nextAvailableAt(user?.lastTrialAt ?? null)
  if (next) {
    return NextResponse.json(
      { error: "Trial already used", nextAvailableAt: next.toISOString() },
      { status: 429 }
    )
  }

  let body: { companyName?: string; website?: string; industry?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }

  const companyName = body.companyName?.trim()
  const website = body.website?.trim()
  const industry = body.industry?.trim() || "local business"
  if (!companyName || !website) {
    return NextResponse.json({ error: "companyName and website are required" }, { status: 400 })
  }

  let audit: Awaited<ReturnType<typeof performAudit>>
  try {
    audit = await performAudit(website)
  } catch {
    return NextResponse.json({ error: "Couldn't reach that website — check the URL and try again" }, { status: 422 })
  }

  let issue = "", consequence = ""
  if (!audit.ssl) {
    issue = "the site is showing as 'Not Secure' in Chrome"
    consequence = "that warning quietly kills trust before someone even considers getting in touch"
  } else if (audit.speed > 4000) {
    issue = `the site takes ${(audit.speed / 1000).toFixed(1)} seconds to load`
    consequence = "on mobile, that's past the point where most visitors leave before the page finishes"
  } else if (audit.speed > 2500) {
    issue = `load time is around ${(audit.speed / 1000).toFixed(1)} seconds`
    consequence = "it's in the range where Google starts penalising rankings and visitors start dropping off"
  } else if (!audit.mobile) {
    issue = "the site doesn't render properly on mobile"
    consequence = "given most local searches come from phones, that's a meaningful number of visitors hitting a broken page"
  } else if (!audit.googleAnalytics && !audit.googleTagManager) {
    issue = "there's no analytics set up on the site"
    consequence = "which means there's no visibility on how many people are finding it or whether they convert"
  } else if (!audit.pixel) {
    issue = "there's no retargeting pixel installed"
    consequence = "so any ad spend reaches people once and loses them — no way to follow up with visitors who didn't convert"
  } else if (audit.noMetaDesc) {
    issue = "the site has no meta description"
    consequence = "Google writes one for you, which often looks poor in search results and hurts click-through"
  } else {
    issue = "the site is technically in good shape"
    consequence = "the opportunity is more about converting the traffic already coming in"
  }

  const prompt = `You are a senior B2B sales professional writing the opening line of a cold outreach email. Style: company-first, specific, no fluff.

Company being contacted: ${companyName}, a ${industry}.
Technical finding from a live site audit on ${website}: ${issue} — ${consequence}

Write a 2-3 sentence opener (under 65 words, British English) that references the company by name and the specific finding. Start with "I had a look at ${companyName}..." or "Looking at ${companyName}...". No exclamation marks, no markdown, plain text only. Do not pitch — just the observation.

Write the opening now:`

  let opener = ""
  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 150,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    opener = res.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") ?? ""
  } catch {
    return NextResponse.json({ error: "Generation failed — try again in a moment" }, { status: 500 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastTrialAt: new Date() },
  })

  return NextResponse.json({
    audit: {
      ssl: audit.ssl,
      speed: audit.speed,
      mobile: audit.mobile,
      googleAnalytics: audit.googleAnalytics,
      pixel: audit.pixel,
      noMetaDesc: audit.noMetaDesc,
    },
    opener,
    nextAvailableAt: new Date(Date.now() + COOLDOWN_MS).toISOString(),
  })
}
