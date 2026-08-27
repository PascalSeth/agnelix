import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import OpenAI from "openai"
import { getTrainingBlock } from "@/lib/ai-training"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export const maxDuration = 60

type DemoMessage = { role: "galien" | "agency" | "user"; text: string }

export async function POST(req: NextRequest) {
  // Allow both authenticated users and guests testing the live demo
  await auth().catch(() => null)

  let body: {
    companyName?: string
    website?: string
    overview?: {
      whatTheyDo?: string
      whatTheyOffer?: string[]
      targetMarket?: string
      positioning?: string
      strategicAngles?: {
        idealProspects?: string[]
        personalizedHook?: string
        howGalienHelps?: string[]
      }
      sampleOpeningPitch?: string
    }
    conversation?: DemoMessage[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const companyName = body.companyName?.trim()
  const website = body.website?.trim()
  if (!companyName || !website) {
    return NextResponse.json({ error: "Missing company context" }, { status: 400 })
  }

  const overview = body.overview
  const conversation: DemoMessage[] = Array.isArray(body.conversation)
    ? body.conversation.filter(
        (m: DemoMessage) =>
          (m?.role === "galien" || m?.role === "agency" || m?.role === "user") && typeof m?.text === "string"
      )
    : []

  if (conversation.length === 0) {
    return NextResponse.json({ error: "Conversation is empty" }, { status: 400 })
  }

  const transcript = conversation
    .map(m => `${m.role === "user" ? "USER" : "GALIEN"}:\n${m.text}`)
    .join("\n---\n")

  // Fetch trained directives for objection handling and sales advisory
  const [advisorTraining, replyTraining] = await Promise.all([
    getTrainingBlock("ADVISOR", "sales", null),
    getTrainingBlock("REPLY", "sales", null),
  ])

  const prompt = `You are Galien, an elite Autonomous AI Sales Development Representative (SDR) and outbound growth strategist.

You are currently talking live with the founder or leader of "${companyName}" (${website}).
They are trying out Galien to see how you can automate their outbound sales, find new clients, write non-templated high-converting emails, and book qualified meetings on their calendar.

COMPANY GROUND TRUTH (Synthesized from real research):
- Business: ${companyName}
- Website: ${website}
${overview?.whatTheyDo ? `- What They Do: ${overview.whatTheyDo}` : ""}
${overview?.whatTheyOffer?.length ? `- Core Offerings: ${overview.whatTheyOffer.join(", ")}` : ""}
${overview?.targetMarket ? `- Target Market / ICP: ${overview.targetMarket}` : ""}
${overview?.positioning ? `- Market Positioning: ${overview.positioning}` : ""}
${overview?.strategicAngles?.idealProspects?.length ? `- Target Prospect Niches: ${overview.strategicAngles.idealProspects.join("; ")}` : ""}
${overview?.strategicAngles?.personalizedHook ? `- Key Outreach Hook: ${overview.strategicAngles.personalizedHook}` : ""}

YOUR PRODUCT CAPABILITIES AS GALIEN:
1. Automated Lead Finding: You scour the web, Google Maps, verified business databases, and registries to find verified decision-maker emails (founders, GMs, CEOs, directors) with 98%+ deliverability.
2. Bespoke AI Copywriting: You research each target individually (auditing their site, reviews, tech stack, and pain points) and write 100% human-sounding emails with zero generic templates or spam triggers.
3. 24/7 Autonomous Inbox Management & Objection Handling: When prospects reply ("What is your pricing?", "We already have a vendor", "Send more info", "Are you available Thursday?"), you respond within minutes using trained objection-handling playbooks to convert skepticism into booked calls.
4. Direct Calendar Booking: You sync with Google Calendar & Outlook to lock in confirmed meetings. You find the leads, write the pitches, and follow up — the user just shows up to the discovery meetings.

${advisorTraining}
${replyTraining}

CONVERSATION TRANSCRIPT SO FAR:
${transcript}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Answer the user's latest question directly, with sharp intellect, warmth, and consultative authority.
2. Incorporate specific details about "${companyName}", their actual services (${overview?.whatTheyOffer?.join(", ") || "their offerings"}), and their target buyers (${overview?.targetMarket || "their clients"}).
3. If they ask for an example email, write a compelling, concise 50-word cold pitch specifically selling their service to their ideal buyer following the "Pain, Proof, Plan" and "Lead with Dream Outcome" principles.
4. If they ask how you handle objections ("no budget", "in-house team", "already have an agency", "bad timing"), demonstrate the exact psychological maneuvers (Mirror Their Glare, Replace Excuse with Skill Gap, Name the Real Objection, Pivot From Commodity to Category, Emotional 'If All' Close).
5. Keep your responses punchy, concise, readable (use short paragraphs or bullet points if explaining steps), and inspiring.
6. Naturally convey why creating an account and launching their 7-day free trial on Galien will transform their client pipeline.

Respond as Galien now:`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_tokens: 900,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })

    const text = res.choices[0]?.message?.content?.trim()
    if (!text) return NextResponse.json({ error: "Generation failed — try again" }, { status: 500 })
    return NextResponse.json({ text })
  } catch (err) {
    console.error("Try Galien Chat Error:", err)
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 })
  }
}
