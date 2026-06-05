import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"
import type { BusinessProfile } from "@/app/api/leads/research/route"

const TONE_GUIDE: Record<string, string> = {
  "Professional":  "professional and measured — authoritative without being stiff, polished without being corporate",
  "Friendly":      "warm and conversational — approachable and personable, like someone the reader would enjoy hearing from",
  "Direct":        "concise and straight to the point — no pleasantries, no filler, just substance; respects their time",
  "Consultative":  "curious and advisory — frames observations as questions or insights, sounds like a trusted peer not a salesperson",
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export type Approach =
  | "website"
  | "local-rank"
  | "competitor"
  | "industry"
  | "question"
  | "social-proof"

interface AuditData {
  ssl: boolean; speed: number; pixel: boolean; mobile: boolean
  googleAnalytics: boolean; googleTagManager: boolean
  wordpress: boolean; shopify: boolean; hasChat: boolean
  noH1: boolean; noMetaDesc: boolean
}

interface RequestBody {
  approach?: Approach
  businessName?: string
  address?: string
  industry?: string | null
  rating?: number | null
  reviewCount?: number | null
  auditData?: AuditData | null
  decisionMakerFirstName?: string | null
  businessProfile?: BusinessProfile | null
  includeSenderCompany?: boolean
}

// ── Shared persona ────────────────────────────────────────────────────────────

function buildPersona(
  sender: { company: string; desc: string } | null,
  tone: string,
): string {
  const toneDesc   = TONE_GUIDE[tone] ?? TONE_GUIDE["Professional"]
  const senderLine = sender?.company
    ? `\nThe sender's company is "${sender.company}"${sender.desc ? ` — ${sender.desc}` : ""}. If instructed to include it, weave it in naturally at the end as a brief, unpushy closing line — NOT a pitch.`
    : ""

  return `You are a senior B2B sales professional writing cold outreach to UK business owners. Your emails consistently get replied to because they feel like they came from a real person who genuinely researched the business.

You are writing the OPENING of a cold email. Style: company-first. Reference the company by name — not the person. The opener reads like someone who looked up the business and has something specific to say about it.

Tone: ${toneDesc}

Format: 2–3 sentences. Under 65 words. British English.

Rules:
- Start with "I've been looking at [Company]..." or "I had a look at [Company]..." or "Looking at [Company]..." — always reference the company name
- Show you've done real research — reference something specific you found
- Do NOT say: "I hope this", "I wanted to reach out", "I came across", "I noticed that", "I saw your website"
- Do NOT pitch in the opening
- No exclamation marks
- Plain text only — no markdown, no asterisks${senderLine}`
}

function profileCtx(p: BusinessProfile | null | undefined): string {
  if (!p) return ""
  const lines: string[] = []
  if (p.whatTheyDo)                      lines.push(`What they do: ${p.whatTheyDo}`)
  if (p.positioning)                     lines.push(`How they position: ${p.positioning}`)
  if (p.specializations?.length)         lines.push(`Specialisations: ${p.specializations.join(", ")}`)
  if (p.reviewHighlights?.praise?.length)   lines.push(`Customers praise: ${p.reviewHighlights.praise.join("; ")}`)
  if (p.reviewHighlights?.complaints?.length) lines.push(`Frustrations/gaps: ${p.reviewHighlights.complaints.join("; ")}`)
  if (p.reviewHighlights?.notableQuote)  lines.push(`Notable customer quote: "${p.reviewHighlights.notableQuote}"`)
  if (p.contentGaps?.length)             lines.push(`Content gaps: ${p.contentGaps.join("; ")}`)
  if (p.outreachAngles?.length)          lines.push(`Research angles: ${p.outreachAngles.join(" | ")}`)
  return lines.length ? `\nResearch on this business:\n${lines.map(l => `  - ${l}`).join("\n")}` : ""
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildPrompt(
  approach: Approach,
  body: RequestBody,
  sender: { company: string; desc: string } | null,
  tone: string,
): string | null {
  const {
    businessName = "this business",
    address = "the UK",
    industry = "local business",
    rating, reviewCount, auditData,
    decisionMakerFirstName,
    businessProfile,
  } = body

  const city    = address.split(",").slice(-2).join(",").trim()
  const persona = buildPersona(sender, tone)
  const senderLine = sender?.company
    ? `\nIf including sender company: end with a natural, one-sentence mention of ${sender.company}${sender.desc ? ` (${sender.desc})` : ""} — brief, unpushy, connects to why you're reaching out.`
    : ""
  const nm   = decisionMakerFirstName ? ` Recipient first name (use sparingly if at all): ${decisionMakerFirstName}.` : ""
  const ctx  = `Company being contacted: ${businessName}, a ${industry} in ${city}.${nm}`
  const prof = profileCtx(businessProfile)

  // ── Website ─────────────────────────────────────────────────────────────────
  if (approach === "website") {
    if (!auditData) return null

    let issue = "", consequence = ""
    if (!auditData.ssl) {
      issue = "the site is showing as 'Not Secure' in Chrome"
      consequence = "for a service where someone needs to trust you quickly, that warning is a credibility problem before they've read a word"
    } else if (auditData.speed > 4000) {
      issue = `the site takes ${(auditData.speed / 1000).toFixed(1)} seconds to load`
      consequence = "on mobile — which is where most local searches happen — that's past the point where most people leave"
    } else if (auditData.speed > 2500) {
      issue = `load time is around ${(auditData.speed / 1000).toFixed(1)} seconds`
      consequence = "it's in the range where Google starts penalising rankings and visitors start leaving before the page finishes"
    } else if (!auditData.mobile) {
      issue = "the site doesn't render properly on mobile"
      consequence = "given that the majority of local searches come from phones, that's a meaningful number of potential customers hitting a broken page"
    } else if (!auditData.googleAnalytics && !auditData.googleTagManager) {
      issue = "there's no analytics set up on the site"
      consequence = "which means there's no visibility on how many people are finding the site, where they're coming from, or whether they're converting"
    } else if (!auditData.pixel) {
      issue = "there's no retargeting pixel"
      consequence = "so any ad spend they run is reaching people once and then losing them — no way to follow up with visitors who didn't convert"
    } else if (auditData.noMetaDesc) {
      issue = "the site has no meta description"
      consequence = "Google writes it for them based on whatever text it finds, which often looks poor in search results and hurts click-through"
    } else {
      issue = "the site is technically sound"
      consequence = "the opportunity is more about converting the traffic they're already getting"
    }

    return `${persona}

${ctx}${prof}${senderLine}

Technical finding: ${issue} — ${consequence}

Write the opening of a cold email to this business. Reference the specific technical issue and its business consequence. Use the research to make it specific to what this business does — not a generic website critique. The tone should be direct and informed, like someone who looked them up and has something worth saying.

Strong examples of the QUALITY and TONE you're aiming for (don't copy these — write something original):
- "Had a look at the ${businessName} site before sending this — the 'Not Secure' warning in Chrome is the kind of thing that quietly kills trust before someone even considers picking up the phone, which matters a lot for a service like yours where credibility is the first barrier."
- "The load time on your site is sitting at around 5 seconds on mobile — for a business where most enquiries start with someone searching on their phone, that's the point where you lose them before they've had a chance to see what you do."
- "There's no analytics on the site at the moment, which means you're running blind on how many people are finding you online and leaving without getting in touch — hard to know what's working if you can't see the numbers."

Write the opening now:`
  }

  // ── Local rank ───────────────────────────────────────────────────────────────
  if (approach === "local-rank") {
    if (!rating && !reviewCount) return null

    let obs = ""
    if (rating && rating < 3.8)
      obs = `the ${rating}-star rating sits below the 4.0 mark — in local search, that's often the threshold where potential customers stop and second-guess themselves before clicking`
    else if (reviewCount && reviewCount < 15)
      obs = `with ${reviewCount} Google reviews, the profile is thin — new customers looking for social proof don't have much to go on, which creates friction before they even get in touch`
    else if (rating && reviewCount)
      obs = `${rating} stars across ${reviewCount} reviews — solid, but in competitive local search that positioning leaves some room to move up the pack`
    else
      obs = `the Google presence is limited for the area — there's clear room to improve visibility`

    return `${persona}

${ctx}${prof}${senderLine}

Google presence observation: ${obs}

Write the opening of a cold email. Reference their Google presence in a way that frames it as a business observation — not a criticism. Use the research to connect it to what they actually do and who their customers are, so it feels specific to them. The tone should be that of someone who understands what drives enquiries for this type of business.

Strong examples of the QUALITY and TONE you're aiming for (don't copy these — write something original):
- "I was looking at how ${businessName} is showing up in ${city} and the review profile caught my attention — ${reviewCount} reviews at ${rating} stars is a reasonable foundation, but it's the kind of profile where a few more recent ones would make a meaningful difference to how often you get the call over a competitor."
- "Your rating puts you just under the 4-star threshold, which from what I've seen in local search tends to be where a portion of potential customers pause — not enough to write off, but enough to lose the click when there's a 4.2 nearby."

Write the opening now:`
  }

  // ── Competitor ───────────────────────────────────────────────────────────────
  if (approach === "competitor") {
    return `${persona}

${ctx}${prof}${senderLine}

Write the opening of a cold email that references a pattern you've observed among similar businesses or competitors in their market. Use the research to make it specific — their type of work, their customers, their positioning. The observation should create genuine curiosity: they want to know what the pattern is. Sound like someone with actual visibility into this sector, not someone making it up.

Strong examples of the QUALITY and TONE you're aiming for (don't copy these — write something original):
- "I've been looking at how ${industry}s in ${city} are generating enquiries online, and there's a fairly consistent pattern between the ones picking up the most work and the ones that aren't — it usually comes down to one or two things that are easy to spot from the outside."
- "Most ${industry} businesses in ${city} are still relying almost entirely on referrals for new work — the ones that have moved past that tend to have solved a specific part of the pipeline that the rest haven't, and it shows up pretty clearly in how they're ranking."
- "Looking at the ${industry} market in ${city}, the businesses consistently at the top of local search share a few things in common — and looking at ${businessName}, there are a couple of those things that aren't quite there yet."

Write the opening now:`
  }

  // ── Industry shift ────────────────────────────────────────────────────────────
  if (approach === "industry") {
    return `${persona}

${ctx}${prof}${senderLine}

Write the opening of a cold email referencing a genuine, observable shift happening in how ${industry} businesses in the UK get customers. Use the research to make it specific to their situation — their customers, their specialisations, their market. Should feel like an insight from someone tracking this sector closely, not a vague "things are changing" statement.

Do NOT invent specific legislation, regulations, or statistics.

Strong examples of the QUALITY and TONE you're aiming for (don't copy these — write something original):
- "The way people find a ${industry} in ${city} has shifted significantly in the past couple of years — search and reviews are now doing a job that used to belong almost entirely to word of mouth, and the businesses that have noticed earliest are pulling ahead in ways that are hard to close the gap on later."
- "Referrals are still important for most ${industry}s, but the proportion of new work coming through online search has grown enough that the businesses not set up to capture it are quietly losing ground — it doesn't show up immediately, but it compounds."
- "The enquiry patterns most ${industry}s in ${city} relied on three or four years ago are behaving differently now — the businesses that have adapted tend to share a few things in common that are visible from the outside."

Write the opening now:`
  }

  // ── Question ──────────────────────────────────────────────────────────────────
  if (approach === "question") {
    return `${persona}

${ctx}${prof}${senderLine}

Write the opening of a cold email that starts with or leads to a sharp, relevant question. Use the research to make it specific — reference their type of work, their positioning, their customers. The question should be the kind of thing a well-prepared consultant would ask: it shows you've done your research, makes them think, and creates a natural reason to reply. Don't make it feel like a survey.

Strong examples of the QUALITY and TONE you're aiming for (don't copy these — write something original):
- "I was looking at ${businessName} before sending this, and I'd be curious to know — when someone searches for a ${industry} in ${city} on their phone right now, where are you typically coming up, and is most of the new work still coming through referrals or has online been picking up?"
- "Quick question before I say more — how are most of your new customers finding you at the moment? I ask because there's usually a clear gap between how a business thinks they're getting found and what's actually driving the calls."

Write the opening now:`
  }

  // ── Social proof ──────────────────────────────────────────────────────────────
  if (approach === "social-proof") {
    return `${persona}

${ctx}${prof}${senderLine}

Write the opening of a cold email that references a result from a similar business. Use the research to make the result directly relevant to THIS business — their type of work, their specific situation, the frustrations their customers mention. The result should sound specific and credible (use realistic numbers). Tone: matter-of-fact, mentioned in passing. Don't make it the centrepiece — it's just context for why you're reaching out.

Strong examples of the QUALITY and TONE you're aiming for (don't copy these — write something original):
- "I've been working with a handful of ${industry}s in the region on generating more consistent work online — one of them, similar size to ${businessName}, added about £4,500 a month in booked work within three months, mostly by fixing two things in how they were showing up in local search. Wanted to see if the same issues applied here."
- "One of the ${industry}s we work with in a comparable market to ${city} went from 9 to 71 Google reviews in about four months, which moved them from page 2 into the Maps pack and roughly doubled their inbound enquiries — the method was fairly straightforward and I thought it might be relevant given what I could see about ${businessName}."
- "A ${industry} we worked with last year was in a similar position to what I can see for ${businessName} — good reputation locally but not converting it into consistent online enquiries. Six months later they'd added £3,800 a month in recurring work. Happy to share the detail if it sounds relevant."

Write the opening now:`
  }

  return null
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: RequestBody
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }

  if (!body.businessName) return NextResponse.json({ error: "businessName required" }, { status: 400 })

  // Fetch user profile for tone + optional sender company
  let sender: { company: string; desc: string } | null = null
  let tone = "Professional"

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyName: true, companyName: true, companyDesc: true, tone: true },
    })
    if (user?.tone)  tone   = user.tone
    if (body.includeSenderCompany) {
      const company = user?.agencyName || user?.companyName || ""
      const desc    = user?.companyDesc || ""
      if (company) sender = { company, desc }
    }
  } catch { /* DB unavailable — use defaults */ }

  const approach: Approach = body.approach ?? "website"
  const prompt = buildPrompt(approach, body, sender, tone)

  if (!prompt) {
    const hints: Record<Approach, string> = {
      "website":      "Run the site audit first.",
      "local-rank":   "No Google rating data for this business.",
      "competitor":   "Generation failed.",
      "industry":     "Generation failed.",
      "question":     "Generation failed.",
      "social-proof": "Generation failed.",
    }
    return NextResponse.json({ error: hints[approach] }, { status: 422 })
  }

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 150,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const opener = res.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") ?? ""
    return NextResponse.json({ icebreaker: opener })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("Icebreaker error:", msg)
    return NextResponse.json({ error: "Generation failed" }, { status: 500 })
  }
}
