import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"
import { getScopeId } from "@/lib/auth-helpers"
import { getAgencyGuidelinesBlock } from "@/lib/ai"
import { HUMAN_WRITING_RULES } from "@/lib/prompts"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const { instruction } = await req.json()

  if (!instruction?.trim()) {
    return NextResponse.json({ error: "Instruction is required" }, { status: 400 })
  }

  // 1. Fetch email and check ownership
  const email = await prisma.email.findFirst({
    where: { id, lead: { userId: scopeId } },
    select: { id: true, subject: true, body: true, status: true }
  })

  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })
  if (email.status !== "DRAFT") return NextResponse.json({ error: "Only draft emails can be refined" }, { status: 400 })

  // 2. Pull this agency's AI config + trained lessons so a refined draft stays
  // consistent with the same rules the original draft was written under.
  const agencyGuidelines = await getAgencyGuidelinesBlock(scopeId, "EMAIL")

  // 3. Build prompt for AI refinement
  const prompt = `You are an expert sales email copywriter. The user wants you to edit/refine a cold outreach email draft.

Here is the original draft:
Subject: ${email.subject}
Body:
${email.body}

User's instruction for refinement:
"${instruction}"

Rewrite the email. Keep it professional, natural, and under 120 words. Focus on satisfying the user's instructions while keeping it conversational and high-converting. Avoid exclamation marks. Preserve placeholders like {{firstName}} or {{company}} if they were present.
${HUMAN_WRITING_RULES}${agencyGuidelines}

Return a JSON object with exactly this format:
{
  "subject": "refined subject line",
  "body": "refined email body text"
}`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_tokens: 300,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })

    const content = res.choices[0]?.message?.content ?? "{}"
    const cleanJson = content.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleanJson)

    if (!parsed.subject || !parsed.body) throw new Error("Invalid AI response")

    // 3. Save refined content to database
    const updated = await prisma.email.update({
      where: { id },
      data: {
        subject: parsed.subject,
        body: parsed.body,
        aiPrompt: `Refined by AI: ${instruction}`
      }
    })

    return NextResponse.json({ success: true, email: updated })
  } catch (err: unknown) {
    console.error("AI refinement failed:", err)
    return NextResponse.json({ error: "Refinement failed. Please try again." }, { status: 500 })
  }
}
