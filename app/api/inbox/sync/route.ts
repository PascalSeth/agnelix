import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { detectReplies } from "@/lib/imap"
import { executePendingAction } from "@/lib/agent-core"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // 1. Sync new replies from IMAP
    const syncResult = await detectReplies(session.user.id)

    // 2. Auto-execute any expired pending actions for this user (for local testing/cron parity)
    const now = new Date()
    const expiredActions = await prisma.pendingAction.findMany({
      where: {
        userId: session.user.id,
        status: "PENDING",
        expiresAt: { lte: now },
      },
      include: {
        lead: { include: { user: true } },
        reply: {
          include: {
            email: {
              include: {
                campaign: true,
              },
            },
          },
        },
      },
    })

    let executedCount = 0
    for (const action of expiredActions) {
      try {
        // Skip high risk reply actions for auto-send (matches cron behavior) unless autonomous
        const isAutonomous = action.reply?.email?.campaign?.autonomous ?? false
        if (action.type === "SEND_REPLY" && action.riskLevel === "HIGH" && !isAutonomous) {
          continue
        }
        const result = await executePendingAction(action, "auto")
        if (result.ok) {
          executedCount++
        }
      } catch (e) {
        console.error(`[Inbox Sync] Auto-execution error for action ${action.id}:`, e)
      }
    }

    return NextResponse.json({
      success: true,
      ...syncResult,
      executedCount,
    })
  } catch (err) {
    console.error("[Inbox Sync] Sync error:", err)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
