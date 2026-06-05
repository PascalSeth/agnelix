import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { executePendingAction } from "@/lib/agent-core"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)

  const expired = await prisma.pendingAction.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: now },
    },
    include: {
      lead: { include: { user: true } },
    },
    take: 50,
  })

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const action of expired) {
    try {
      if (action.type === "SEND_REPLY" && action.riskLevel === "HIGH") {
        skipped++
        continue
      }
      const result = await executePendingAction(action, "auto")
      if (result.ok && action.type === "SEND_REPLY") sent++
      else if (result.ok) skipped++
      else failed++
    } catch (e) {
      console.error(`Cron agent error for action ${action.id}:`, e)
      failed++
    }
  }

  const usersWithActivity = await prisma.pendingAction.findMany({
    where: { executedAt: { gte: dayStart } },
    select: { userId: true },
    distinct: ["userId"],
  })

  for (const { userId } of usersWithActivity) {
    const [approvedCount, autoCount, rejectedCount, meetingCount, proposalCount] = await Promise.all([
      prisma.pendingAction.count({ where: { userId, executedAt: { gte: dayStart }, status: "APPROVED" } }),
      prisma.pendingAction.count({ where: { userId, executedAt: { gte: dayStart }, status: "AUTO_EXECUTED" } }),
      prisma.pendingAction.count({ where: { userId, executedAt: { gte: dayStart }, status: "REJECTED" } }),
      prisma.pendingAction.count({ where: { userId, executedAt: { gte: dayStart }, type: "BOOK_MEETING", status: { in: ["APPROVED", "AUTO_EXECUTED"] } } }),
      prisma.pendingAction.count({ where: { userId, executedAt: { gte: dayStart }, type: "SEND_PROPOSAL", status: { in: ["APPROVED", "AUTO_EXECUTED"] } } }),
    ])
    const flaggedCount = await prisma.pendingAction.count({
      where: { userId, status: "PENDING", riskLevel: "HIGH" },
    })
    const anomalies = {
      rejectionSpike: rejectedCount >= 5,
      highRiskBacklog: flaggedCount >= 5,
    }

    await prisma.agentDigestLog.upsert({
      where: { userId_day: { userId, day: dayStart } },
      update: {
        sentCount: approvedCount + autoCount,
        approvedCount,
        rejectedCount,
        meetingsBookedCount: meetingCount,
        proposalsSentCount: proposalCount,
        flaggedCount,
        anomalies,
        summary: `Agent executed ${approvedCount + autoCount} actions, booked ${meetingCount} meetings, sent ${proposalCount} proposals.`,
      },
      create: {
        userId,
        day: dayStart,
        sentCount: approvedCount + autoCount,
        approvedCount,
        rejectedCount,
        meetingsBookedCount: meetingCount,
        proposalsSentCount: proposalCount,
        flaggedCount,
        anomalies,
        summary: `Agent executed ${approvedCount + autoCount} actions, booked ${meetingCount} meetings, sent ${proposalCount} proposals.`,
      },
    })
  }

  return NextResponse.json({ processed: expired.length, sent, skipped, failed, digests: usersWithActivity.length })
}
