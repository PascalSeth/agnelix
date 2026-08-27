import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import { distillDocument, sanitizeForPostgres } from "@/lib/ai-teacher"
import { invalidateTrainingCache } from "@/lib/ai-training"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { title, text, pdfBase64, scope, surface } = body

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const cleanTitle = sanitizeForPostgres(title)
  let content = typeof text === "string" ? text.trim() : ""

  // PDF path: client sends the file as base64; we extract the text server-side
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
      console.error("[training/ingest] PDF parse failed:", err)
      return NextResponse.json({ error: "Could not read that PDF — if it's a scanned document with no text layer, paste the text instead" }, { status: 400 })
    }
  }

  content = sanitizeForPostgres(content)

  if (!content || content.length < 100) {
    return NextResponse.json({ error: "Not enough readable text to learn from (need at least a few paragraphs)" }, { status: 400 })
  }

  const resolvedScope = typeof scope === "string" && scope ? scope : "global"
  const VALID_SURFACES = ["ALL", "EMAIL", "REPLY", "PROPOSAL", "ADVISOR"]
  const normalizedSurface = typeof surface === "string" ? surface.toUpperCase().trim() : "ALL"
  const resolvedSurface = VALID_SURFACES.includes(normalizedSurface) ? normalizedSurface : "ALL"

  try {
    const lessons = await distillDocument({ title: cleanTitle, text: content })
    if (lessons.length === 0) {
      return NextResponse.json({ error: "The AI couldn't extract actionable lessons from this material" }, { status: 422 })
    }

    const doc = await prisma.trainingDocument.create({
      data: {
        title: cleanTitle,
        content: content.slice(0, 200_000),
        scope: resolvedScope,
        surface: resolvedSurface,
        lessonsCount: lessons.length,
        createdBy: session.user.email ?? session.user.id,
      },
    })

    const rules = await prisma.$transaction(
      lessons.map(l => {
        const ruleTitle = sanitizeForPostgres(l.title)
        const ruleInstruction = sanitizeForPostgres(l.instruction)
        const ruleGood = l.goodExample ? sanitizeForPostgres(l.goodExample) : null
        const ruleBad = l.badExample ? sanitizeForPostgres(l.badExample) : null
        const sourceRef = sanitizeForPostgres(doc.title).slice(0, 255)

        return prisma.aiTrainingRule.create({
          data: {
            scope: resolvedScope,
            surface: resolvedSurface as any,
            title: ruleTitle,
            instruction: ruleInstruction,
            goodExample: ruleGood,
            badExample: ruleBad,
            source: "document",
            sourceRef,
            createdBy: session.user.email ?? session.user.id,
          },
        })
      })
    )

    invalidateTrainingCache()
    return NextResponse.json({ document: { id: doc.id, title: doc.title }, lessons, rules })
  } catch (err) {
    console.error("[training/ingest] failed:", err)
    const msg = err instanceof Error ? err.message : "Learning from the document failed — try a smaller section"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
