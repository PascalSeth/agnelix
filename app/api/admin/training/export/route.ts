import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import { BUILT_IN_EXEMPLARS } from "@/lib/ai-exemplars"
import { HUMAN_WRITING_RULES } from "@/lib/prompts"

/**
 * Superadmin endpoint: Export Fine-Tuning Dataset (.jsonl)
 * Formats approved actions, winning memory entries, and few-shot exemplars
 * into standard OpenAI / DeepSeek conversational fine-tuning format.
 *
 * Query Params:
 * - split: "all" | "train" (80%) | "val" (20%)
 * - playbookType: "all" | "sales" | "seo" | "social_media" | "ppc" | "web_design" | "finance"
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const split = searchParams.get("split") || "all"
    const playbookType = searchParams.get("playbookType") || "all"

    const jsonlRows: string[] = []

    // 1. Export Curated Few-Shot Benchmarks
    const filteredExemplars = BUILT_IN_EXEMPLARS.filter(
      ex => playbookType === "all" || ex.scope === "global" || ex.scope === playbookType
    )

    for (const ex of filteredExemplars) {
      const systemPrompt = `You are a high-performing B2B sales development representative writing on behalf of a growth agency. Scope: ${ex.scope}. ${HUMAN_WRITING_RULES}`
      const userPrompt = `Prospect replied with the following message:\n"${ex.prospectMessage}"\n\nWrite the winning, human reply that handles this objection with tactical empathy.`
      const row = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "assistant", content: ex.winningResponse },
        ],
      }
      jsonlRows.push(JSON.stringify(row))
    }

    // 2. Export Approved Pending Actions (Human-Verified Winning Conversations)
    const whereClause: Record<string, unknown> = {
      status: { in: ["APPROVED", "AUTO_EXECUTED"] },
      draftBody: { not: "" },
    }
    if (playbookType !== "all") {
      whereClause.user = { playbookType }
    }

    const approvedActions = await prisma.pendingAction.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            firstName: true,
            company: true,
            industry: true,
          },
        },
        reply: {
          select: {
            body: true,
            fromEmail: true,
          },
        },
      },
      take: 300,
      orderBy: { createdAt: "desc" },
    })

    for (const act of approvedActions) {
      const prospectText = act.reply?.body || `Outreach to ${act.lead.firstName || "prospect"} at ${act.lead.company || "company"}`
      const systemPrompt = `You are a world-class B2B sales rep. Perform with high emotional intelligence, brevity, and tactical empathy.`
      const userPrompt = `Prospect context / reply:\n"${prospectText}"\n\nDraft the reply message.`
      const row = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "assistant", content: act.draftBody.trim() },
        ],
      }
      jsonlRows.push(JSON.stringify(row))
    }

    // 3. Export High-Scoring Agent Memories
    const winningMemories = await prisma.agentMemory.findMany({
      where: {
        won: true,
        notes: { not: null },
      },
      take: 100,
      orderBy: { score: "desc" },
    })

    for (const mem of winningMemories) {
      if (mem.notes && mem.notes.length > 20) {
        const row = {
          messages: [
            { role: "system", content: "You are an elite B2B sales closer." },
            { role: "user", content: `Scenario / Objection (${mem.intent}):\n${mem.notes}` },
            { role: "assistant", content: mem.notes },
          ],
        }
        jsonlRows.push(JSON.stringify(row))
      }
    }

    // 4. Handle Train / Val Split
    let finalRows = jsonlRows
    if (split === "train") {
      finalRows = jsonlRows.filter((_, i) => i % 5 !== 0) // 80%
    } else if (split === "val") {
      finalRows = jsonlRows.filter((_, i) => i % 5 === 0) // 20%
    }

    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `galien_${playbookType}_${split}_${dateStr}.jsonl`

    return new NextResponse(finalRows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "application/x-jsonlines",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("[training/export] failed:", err)
    return NextResponse.json({ error: "Failed to generate dataset" }, { status: 500 })
  }
}
