import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { executePendingAction } from "@/lib/agent-core"
import { getScopeId } from "@/lib/auth-helpers"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const body = await req.json()
  const { action, subject, draftBody } = body as {
    action: "approve" | "reject" | "edit"
    subject?: string
    draftBody?: string
  }

  const pendingAction = await prisma.pendingAction.findUnique({
    where: { id },
    include: {
      lead: { include: { user: true } },
    },
  })

  if (!pendingAction || pendingAction.userId !== scopeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (pendingAction.status !== "PENDING") {
    return NextResponse.json({ error: "Action already resolved" }, { status: 409 })
  }

  if (action === "reject") {
    await prisma.pendingAction.update({
      where: { id },
      data: { status: "REJECTED", executedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "edit") {
    // Refresh the timer to give the user more time based on their configured delay times
    const goal = await prisma.agentGoal.findUnique({
      where: { userId: scopeId }
    })
    const lowPriorityDelayMins = goal?.lowPriorityDelayMins ?? 2
    const highPriorityDelayMins = goal?.highPriorityDelayMins ?? 15

    const bumpMins = pendingAction.riskLevel === "HIGH" ? highPriorityDelayMins : lowPriorityDelayMins
    const bumpMs = bumpMins * 60 * 1000
    const newExpiresAt = new Date(Date.now() + bumpMs)

    await prisma.pendingAction.update({
      where: { id },
      data: {
        ...(subject !== undefined ? { draftSubject: subject } : {}),
        ...(draftBody !== undefined ? { draftBody } : {}),
        expiresAt: newExpiresAt,
      },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "approve") {
    const executed = await executePendingAction(
      {
        id: pendingAction.id,
        userId: pendingAction.userId,
        leadId: pendingAction.leadId,
        type: pendingAction.type,
        intent: pendingAction.intent,
        draftSubject: pendingAction.draftSubject,
        draftBody: pendingAction.draftBody,
        metadata: pendingAction.metadata,
        status: pendingAction.status,
        lead: pendingAction.lead,
      },
      "approve"
    )
    if (!executed.ok) {
      const error = executed.reason === "smtp_missing" ? "SMTP not configured" : "Send failed"
      return NextResponse.json({ error }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
