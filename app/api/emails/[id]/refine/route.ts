import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"

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

  const { id } = await params
  const { instruction } = await req.json()

  if (!instruction?.trim()) {
    return NextResponse.json({ error: "Instruction is required" }, { status: 400 })
  }

  // 1. Fetch email and check ownership
  const email = await prisma.email.findFirst({
    where: { id, lead: { userId: session.user.id } },
    select: { id: true, subject: true, body: true, status: true }
  })

  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })
  if (email.status !== "DRAFT") return NextResponse.json({ error: "Only draft emails can be refined" }, { status: 400 })

  // 2. Build prompt for AI refinement
  const prompt = `You are an expert sales email copywriter. The user wants you to edit/refine a cold outreach email draft.

Here is the original draft:
Subject: ${email.subject}
Body:
${email.body}

User's instruction for refinement:
"${instruction}"

Rewrite the email. Keep it professional, natural, and under 120 words. Focus on satisfying the user's instructions while keeping it conversational and high-converting. Avoid exclamation marks. Preserve placeholders like {{firstName}} or {{company}} if they were present.

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
      thinking: { type: "disabled" },
    } as any)

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
  } catch (err: any) {
    console.error("AI refinement failed:", err)
    return NextResponse.json({ error: "Refinement failed. Please try again." }, { status: 500 })
  }
}
