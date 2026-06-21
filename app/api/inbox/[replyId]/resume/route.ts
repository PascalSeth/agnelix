import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST(req: NextRequest, { params }: { params: Promise<{ replyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { replyId } = await params

  // Find the pending action for this reply
  const pendingAction = await prisma.pendingAction.findFirst({
    where: { replyId, lead: { userId: scopeId } }
  })

  if (!pendingAction) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Resume autopilot: Calculate a new timer based on risk level
  const goal = await prisma.agentGoal.findUnique({
    where: { userId: scopeId }
  })
  const lowPriorityDelayMins = goal?.lowPriorityDelayMins ?? 2
  const highPriorityDelayMins = goal?.highPriorityDelayMins ?? 15

  const isHighPriority = pendingAction.riskLevel === "HIGH"
  let randomDelayMs = 0
  if (isHighPriority) {
    if (highPriorityDelayMins > 0) {
      const maxMins = highPriorityDelayMins
      const minMins = Math.max(0, maxMins - 5)
      randomDelayMs = (Math.random() * (maxMins - minMins) + minMins) * 60 * 1000
    }
  } else {
    if (lowPriorityDelayMins > 0) {
      const maxMins = lowPriorityDelayMins
      const minMins = Math.max(0, maxMins - 1)
      randomDelayMs = (Math.random() * (maxMins - minMins) + minMins) * 60 * 1000
    }
  }
  
  const expiresAt = new Date(Date.now() + randomDelayMs)

  await prisma.pendingAction.update({
    where: { id: pendingAction.id },
    data: { expiresAt }
  })

  return NextResponse.json({ success: true, expiresAt })
}
