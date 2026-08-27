import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import {
  groupPagesIntoReadingSteps,
  distillSection,
  synthesizeMasterDirectives,
  sanitizeForPostgres,
  type ReadingStep,
} from "@/lib/ai-teacher"
import { invalidateTrainingCache } from "@/lib/ai-training"

export const maxDuration = 300 // 5 min for full book reading

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  }

  const body = await req.json()
  const { title, text, pdfBase64, scope, surface } = body

  if (typeof title !== "string" || !title.trim()) {
    return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 })
  }

  const cleanTitle = sanitizeForPostgres(title)
  const resolvedScope = typeof scope === "string" && scope ? scope : "global"
  const VALID_SURFACES = ["ALL", "EMAIL", "REPLY", "PROPOSAL", "ADVISOR"]
  const normalizedSurface = typeof surface === "string" ? surface.toUpperCase().trim() : "ALL"
  const resolvedSurface = VALID_SURFACES.includes(normalizedSurface) ? normalizedSurface : "ALL"

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: Record<string, unknown>) {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch { /* stream closed */ }
      }

      try {
        let pages: Array<{ pageNum: number; text: string }> = []
        let rawCombinedText = typeof text === "string" ? text.trim() : ""

        // ── PASS 1: PDF Extraction & Macro Blueprint ──────────────────────────
        if (typeof pdfBase64 === "string" && pdfBase64.trim().length > 50) {
          send("status", { message: "Pass 1: Extracting text layers and analyzing document structure..." })
          const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "")
          const buffer = Buffer.from(cleanBase64, "base64")
          if (buffer.length > 50 * 1024 * 1024) {
            send("error", { message: "PDF exceeds 50MB limit" })
            controller.close()
            return
          }
          const { extractPdfPages } = await import("@/lib/pdf-reader")
          pages = await extractPdfPages(buffer)
          rawCombinedText = pages.map(p => p.text).join("\n\n")
        } else if (rawCombinedText) {
          const { paginateText } = await import("@/lib/pdf-reader")
          pages = paginateText(rawCombinedText, 2200)
        }

        rawCombinedText = sanitizeForPostgres(rawCombinedText)

        if (!rawCombinedText || rawCombinedText.length < 100 || pages.length === 0) {
          send("error", { message: "Not enough readable text found in document" })
          controller.close()
          return
        }

        const readingSteps: ReadingStep[] = groupPagesIntoReadingSteps(pages, 6)
        const totalPages = pages[pages.length - 1]?.pageNum || pages.length

        send("doc_init", {
          title: cleanTitle,
          totalPages,
          totalSteps: readingSteps.length,
          message: `Blueprint Ready: ${totalPages} pages across ${readingSteps.length} reading sections. Beginning deep learning...`,
        })

        // Create Master Training Document in Database
        const doc = await prisma.trainingDocument.create({
          data: {
            title: cleanTitle,
            content: rawCombinedText.slice(0, 200_000),
            scope: resolvedScope,
            surface: resolvedSurface,
            lessonsCount: 0,
            createdBy: session.user.email ?? session.user.id,
          },
        })

        send("doc_created", { id: doc.id, title: doc.title })

        const rawLessonsAccumulator: Array<{
          title: string
          instruction: string
          goodExample?: string | null
          badExample?: string | null
          sourceRef?: string
        }> = []

        // ── PASS 2: Sequential Chapter-by-Chapter Reading ─────────────────────
        for (let i = 0; i < readingSteps.length; i++) {
          const step = readingSteps[i]
          const percent = Math.round(((i) / (readingSteps.length + 1)) * 100)

          send("step_start", {
            stepIndex: step.stepIndex,
            totalSteps: readingSteps.length,
            startPage: step.startPage,
            endPage: step.endPage,
            totalPages,
            title: step.title,
            excerpt: step.excerpt,
            percent,
            status: `Reading Pages ${step.startPage}–${step.endPage}: "${step.title}"`,
          })

          send("step_thinking", {
            stepIndex: step.stepIndex,
            message: `Analyzing pages ${step.startPage}–${step.endPage} for behavioral persuasion & messaging directives...`,
          })

          const rawLessons = await distillSection({
            bookTitle: cleanTitle,
            sectionTitle: `Pages ${step.startPage}–${step.endPage} (${step.title})`,
            text: step.content,
          })

          for (const l of rawLessons) {
            const item = {
              title: sanitizeForPostgres(l.title),
              instruction: sanitizeForPostgres(l.instruction),
              goodExample: l.goodExample ? sanitizeForPostgres(l.goodExample) : null,
              badExample: l.badExample ? sanitizeForPostgres(l.badExample) : null,
              sourceRef: sanitizeForPostgres(`Pages ${step.startPage}–${step.endPage}: ${step.title}`),
            }
            rawLessonsAccumulator.push(item)

            send("raw_lesson_found", {
              lesson: item,
              sourcePage: `Pages ${step.startPage}–${step.endPage}`,
              stepIndex: step.stepIndex,
              totalSteps: readingSteps.length,
              rawLessonsCount: rawLessonsAccumulator.length,
            })
          }

          send("step_done", {
            stepIndex: step.stepIndex,
            totalSteps: readingSteps.length,
            percent: Math.round(((i + 1) / (readingSteps.length + 1)) * 100),
            lessonsInStep: rawLessons.length,
          })
        }

        // ── PASS 3: Master Synthesis, Deduplication & Surface Classification ──
        send("synthesis_start", {
          percent: 92,
          message: `Pass 3: Synthesizing & deduplicating ${rawLessonsAccumulator.length} insights into high-impact master playbook directives...`,
        })

        const masterDirectives = await synthesizeMasterDirectives({
          bookTitle: cleanTitle,
          rawLessons: rawLessonsAccumulator,
          defaultSurface: resolvedSurface,
        })

        // Persist Master Directives into Database
        const savedRules = []
        for (const md of masterDirectives) {
          try {
            const rule = await prisma.aiTrainingRule.create({
              data: {
                scope: resolvedScope,
                surface: md.surface as never,
                title: md.title,
                instruction: md.instruction,
                goodExample: md.goodExample,
                badExample: md.badExample,
                source: "document",
                sourceRef: sanitizeForPostgres(`${doc.title} — ${md.sourceRef}`).slice(0, 255),
                createdBy: session.user.email ?? session.user.id,
              },
            })
            savedRules.push(rule)
          } catch (err) {
            console.error("[ingest/stream] Master rule save error:", err)
          }
        }

        // Finalize Training Document
        await prisma.trainingDocument.update({
          where: { id: doc.id },
          data: { lessonsCount: savedRules.length },
        })

        invalidateTrainingCache()

        send("complete", {
          docId: doc.id,
          docTitle: doc.title,
          totalPages,
          totalSteps: readingSteps.length,
          totalLessons: savedRules.length,
          directives: masterDirectives,
          rules: savedRules,
        })
      } catch (err) {
        console.error("[ingest/stream] Stream error:", err)
        send("error", {
          message: err instanceof Error ? err.message : "Document ingestion failed",
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  })
}
