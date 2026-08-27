import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import OpenAI from "openai"
import { sanitizeForPostgres } from "@/lib/ai-teacher"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export const maxDuration = 30

/**
 * AI-Assisted Rule Generator
 * Converts a single informal user thought / instruction into a structured, high-impact Company Rule.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json().catch(() => ({}))
  const { prompt: userThought } = body

  if (!userThought || typeof userThought !== "string" || userThought.trim().length < 5) {
    return NextResponse.json({ error: "Please provide a short description of what rule you want to set." }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { agencyName: true, companyName: true, playbookType: true },
  })
  const companyName = user?.agencyName || user?.companyName || "Our Company"

  const systemPrompt = `You are a Principal AI Sales Alignment Engineer configuring a custom AI sales representative for "${companyName}".
The founder gave this informal instruction in plain English:
"${userThought.trim()}"

CORE DIRECT-RESPONSE & SALES PSYCHOLOGY DIRECTIVES (MUST ENFORCE):
When crafting this rule, instruction, and examples, you MUST strictly apply these direct-response tenets:
- **Calm Consulting Authority**: Speak with high status as an embedded peer consultant. Zero needy, desperate, or apologetic phrasing.
- **Pain, Proof, Plan**: Frame outreach/replies around acute pain, concrete proof metrics, and frictionless micro-steps.
- **Sell the Outcome, Not Effort**: Focus on tangible financial/operational transformations ($ gained, time saved, risk mitigated) rather than process steps.
- **Tactical Empathy & Value Reframe**: For objection handling, label the prospect's constraint first and pivot with value before asking for commitment.
- **Clarity Over Cleverness**: Use plain, direct, conversational language. Ban all generic buzzwords ('synergy', 'game-changer', 'cutting-edge').
- **Stack Value Before Anchoring Price**: For pricing rules, justify value before stating numbers.

YOUR TASK:
Transform the user's informal idea into a polished, high-converting company playbook rule with:
1. "title": 3-6 word punchy, professional rule title
2. "instruction": 1 crisp, imperative sentence describing the mandatory behavior the AI must follow
3. "surface": Optimal surface ("REPLY" for inbox/objections, "EMAIL" for cold outreach, "PROPOSAL" for pricing/contracts, "ADVISOR" for strategic chat, or "ALL" for universal brand voice/banned words)
4. "goodExample": Realistic snippet showing this rule executed with high consulting status and direct-response psychology
5. "badExample": Counter-example showing the common amateur mistake to avoid

Return ONLY a JSON object:
{
  "title": string,
  "instruction": string,
  "surface": "ALL" | "REPLY" | "EMAIL" | "PROPOSAL" | "ADVISOR",
  "goodExample": string,
  "badExample": string
}`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: systemPrompt }],
      temperature: 0.3,
      max_tokens: 600,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })

    const raw = res.choices[0]?.message?.content?.trim() || "{}"
    const cleanJson = raw.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleanJson)

    if (!parsed.title || !parsed.instruction) {
      throw new Error("Invalid format returned by AI")
    }

    return NextResponse.json({
      rule: {
        title: sanitizeForPostgres(parsed.title),
        instruction: sanitizeForPostgres(parsed.instruction),
        surface: ["ALL", "REPLY", "EMAIL", "PROPOSAL", "ADVISOR"].includes(parsed.surface) ? parsed.surface : "REPLY",
        goodExample: parsed.goodExample ? sanitizeForPostgres(parsed.goodExample) : null,
        badExample: parsed.badExample ? sanitizeForPostgres(parsed.badExample) : null,
        priority: 10,
      }
    })
  } catch (err: any) {
    console.error("[generate-rule] failed:", err)
    return NextResponse.json({ error: "Could not generate rule. Please try phrasing it slightly differently." }, { status: 500 })
  }
}
