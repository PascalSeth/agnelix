import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import OpenAI from "openai"
import { sanitizeForPostgres } from "@/lib/ai-teacher"
import { invalidateTrainingCache } from "@/lib/ai-training"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export const maxDuration = 120

/**
 * Company SOP & PDF Document Ingestion
 * Extracts actionable, high-priority company procedures from raw text notes or PDF manuals.
 * Scoped strictly to the company (userId: scopeId).
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  let body: { title?: string; text?: string; pdfBase64?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { title, pdfBase64 } = body
  let content = typeof body.text === "string" ? body.text.trim() : ""

  // PDF Extraction Path
  if (!content && typeof pdfBase64 === "string" && pdfBase64) {
    try {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "")
      const buffer = Buffer.from(cleanBase64, "base64")
      if (buffer.length > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "PDF too large — 50MB max" }, { status: 400 })
      }
      const { extractPdfText } = await import("@/lib/pdf-reader")
      content = await extractPdfText(buffer)
    } catch (err) {
      console.error("[agent/training/ingest-sop] PDF parse failed:", err)
      return NextResponse.json({
        error: "Could not read that PDF — if it's a scanned document with no text layer, paste the text directly."
      }, { status: 400 })
    }
  }

  content = sanitizeForPostgres(content)

  if (!content || content.length < 25) {
    return NextResponse.json({ error: "Please provide a valid PDF or at least a few sentences describing your company procedures." }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { agencyName: true, companyName: true, playbookType: true },
  })
  const companyName = user?.agencyName || user?.companyName || "Our Company"
  const playbookType = user?.playbookType || "sales"
  const docTitle = title?.trim() || "Company Playbook SOP"

  const prompt = `You are a Principal AI Sales Alignment Engineer configuring a custom AI sales representative for "${companyName}".
The company founder/manager provided their internal company procedures, sales manual, pricing sheet, objection handling scripts, or onboarding PDF below.

DOCUMENT TITLE: "${docTitle}"
RAW COMPANY DOCUMENT CONTENT:
"""
${content.slice(0, 35000)}
"""

CORE DIRECT-RESPONSE & SALES PSYCHOLOGY DIRECTIVES (MUST ENFORCE):
When extracting and structuring these rules, instructions, and examples, you MUST enforce:
- **Calm Consulting Authority**: High-status phrasing. Never needy, desperate, or apologetic.
- **Pain, Proof, Plan**: Frame communication around acute client pain, hard proof metrics, and frictionless micro-steps.
- **Sell Outcomes Over Effort**: Emphasize concrete financial/operational outcomes ($ gained, CAC lowered) rather than software features or labor.
- **Tactical Empathy & Value Reframe**: In objection rules, label constraints and pivot with value before asking for commitment.
- **Clarity Over Cleverness**: Direct, conversational, insider English. Ban all generic buzzwords ('synergy', 'game-changing', 'cutting-edge').
- **Stack Value Before Price**: For pricing/retainer rules, state value stacks before quotes.

YOUR TASK:
Extract 2 to 8 high-impact, actionable, permanent company rules that the AI must follow on behalf of ${companyName}.
Each rule must be concrete, unambiguous, and include a realistic high-converting example (how to write it) and an anti-pattern example (what rookie mistake to avoid).

Surfaces to categorize each rule into:
- "REPLY" — If it relates to answering prospect replies, handling objections, pricing pushback, or scheduling.
- "EMAIL" — If it relates to cold outreach hooks, opening lines, lead qualification, or follow-ups.
- "PROPOSAL" — If it relates to pricing packages, minimum retainers, deliverables, contracts, or guarantees.
- "ADVISOR" — If it relates to internal strategic advice or client targeting.
- "ALL" — If it relates to general brand voice, banned words, or universal policies.

Return ONLY a valid JSON array matching this exact format:
[
  {
    "title": "<3-7 word clear punchy title>",
    "instruction": "<one imperative behavioral sentence the AI must follow strictly>",
    "goodExample": "<realistic concrete snippet showing the procedure executed properly>",
    "badExample": "<realistic counter-example showing what to avoid>",
    "surface": "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR" | "ALL"
  }
]`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3500,
      // @ts-expect-error
      thinking: { type: "enabled" },
      reasoning_effort: "medium",
    })

    const raw = res.choices[0]?.message?.content?.trim() || "[]"
    const cleanJson = raw.replace(/```json|```/g, "").trim()
    const extracted = JSON.parse(cleanJson)

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return NextResponse.json({ error: "Could not extract clear rules from the provided material." }, { status: 422 })
    }

    const createdRules = []
    for (const item of extracted) {
      if (!item.title || !item.instruction) continue
      const rule = await prisma.aiTrainingRule.create({
        data: {
          userId: scopeId,
          scope: playbookType,
          surface: (["EMAIL", "REPLY", "PROPOSAL", "ADVISOR", "ALL"].includes(item.surface) ? item.surface : "ALL") as any,
          title: sanitizeForPostgres(item.title.trim()),
          instruction: sanitizeForPostgres(item.instruction.trim()),
          goodExample: item.goodExample ? sanitizeForPostgres(item.goodExample.trim()) : null,
          badExample: item.badExample ? sanitizeForPostgres(item.badExample.trim()) : null,
          priority: 10, // Higher priority so company-specific procedures override general platform defaults
          source: "document",
          sourceRef: sanitizeForPostgres(docTitle).slice(0, 255),
          createdBy: session.user.email ?? session.user.id,
        },
      })
      createdRules.push(rule)
    }

    invalidateTrainingCache()
    return NextResponse.json({ rules: createdRules, count: createdRules.length, documentTitle: docTitle })
  } catch (err) {
    console.error("[agent/training/ingest-sop] failed:", err)
    return NextResponse.json({ error: "Failed to process document. Please try again." }, { status: 500 })
  }
}
