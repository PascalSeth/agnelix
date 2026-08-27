import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"
import { getTrainingBlock } from "@/lib/ai-training"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { prompt, stepNumber, stepName } = await req.json()
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { playbookType: true }
    })

    const trainingBlock = await getTrainingBlock("EMAIL", user?.playbookType, session.user.id)

    const aiPrompt = `You are an expert cold email copywriter and sales assistant. 
The user wants to write custom guidelines or a base template for Step ${stepNumber} (named "${stepName || `Step ${stepNumber}`}") of their email outreach sequence.
Here is their instruction/prompt: "${prompt}"

${trainingBlock}

Generate a short, clear, and highly effective set of instructions or a base email template that the outreach copywriter can follow for this step.
Apply the "Pain, Proof, Plan", "Lead with Dream Client Outcome", and "Sell the Outcome, Not the Effort" principles.
Keep it extremely concise (under 250 characters or 2-3 sentences), direct, and focused on maximizing reply rates.
Do NOT output any intro, explanations, or enclosing quotes. Output only the instructions/guidelines/template text itself.`

    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: aiPrompt }],
      temperature: 0.7,
      max_tokens: 200,
      // @ts-expect-error — disable thinking for simple completions
      thinking: { type: "disabled" },
    })

    const resultText = res.choices[0]?.message?.content?.trim() || ""
    return NextResponse.json({ text: resultText })
  } catch (error: unknown) {
    console.error("AI Assist error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI Assist failed" }, { status: 500 })
  }
}
