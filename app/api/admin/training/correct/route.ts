import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import { distillLesson } from "@/lib/ai-teacher"
import { invalidateTrainingCache } from "@/lib/ai-training"

const SURFACES = ["EMAIL", "REPLY", "PROPOSAL", "ADVISOR"] as const

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { surface, scope, scenario, aiResponse, correction, feedback } = await req.json()
  if (!SURFACES.includes(surface)) {
    return NextResponse.json({ error: `surface must be one of: ${SURFACES.join(", ")}` }, { status: 400 })
  }
  if (typeof scenario !== "string" || !scenario.trim() || typeof aiResponse !== "string" || !aiResponse.trim()) {
    return NextResponse.json({ error: "scenario and aiResponse are required" }, { status: 400 })
  }
  const hasCorrection = typeof correction === "string" && correction.trim()
  const hasFeedback = typeof feedback === "string" && feedback.trim()
  if (!hasCorrection && !hasFeedback) {
    return NextResponse.json({ error: "Provide a corrected version, feedback, or both — the AI needs something to learn from" }, { status: 400 })
  }

  try {
    const lesson = await distillLesson({
      surface,
      scenario: scenario.trim(),
      aiResponse: aiResponse.trim(),
      correction: hasCorrection ? correction.trim() : null,
      feedback: hasFeedback ? feedback.trim() : null,
    })

    const resolvedScope = typeof scope === "string" && scope ? scope : "global"

    // The lesson becomes a live training rule immediately
    const rule = await prisma.aiTrainingRule.create({
      data: {
        scope: resolvedScope,
        surface,
        title: lesson.title,
        instruction: lesson.instruction,
        goodExample: lesson.goodExample,
        badExample: lesson.badExample,
        source: "session",
        createdBy: session.user.email ?? session.user.id,
      },
    })

    const example = await prisma.trainingExample.create({
      data: {
        surface,
        scope: resolvedScope,
        scenario: scenario.trim(),
        aiResponse: aiResponse.trim(),
        correction: hasCorrection ? correction.trim() : null,
        feedback: hasFeedback ? feedback.trim() : null,
        ruleId: rule.id,
      },
    })

    await prisma.aiTrainingRule.update({ where: { id: rule.id }, data: { sourceRef: example.id } })
    invalidateTrainingCache()

    return NextResponse.json({ lesson, rule })
  } catch (err) {
    console.error("[training/correct] failed:", err)
    return NextResponse.json({ error: "Could not distill a lesson from this correction — try adding clearer feedback" }, { status: 500 })
  }
}
