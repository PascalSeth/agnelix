import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const goal =
    (await prisma.agentGoal.findUnique({ where: { userId: session.user.id } })) ||
    (await prisma.agentGoal.create({ data: { userId: session.user.id } }))

  const last30 = new Date()
  last30.setDate(last30.getDate() - 30)
  const [sentCount, replyCount, meetingCount] = await Promise.all([
    prisma.email.count({ where: { lead: { userId: session.user.id }, sentAt: { gte: last30 } } }),
    prisma.reply.count({ where: { lead: { userId: session.user.id }, receivedAt: { gte: last30 } } }),
    prisma.activity.count({
      where: { lead: { userId: session.user.id }, type: "MEETING_BOOKED", createdAt: { gte: last30 } },
    }),
  ])

  const observedReplyRate = sentCount > 0 ? (replyCount / sentCount) * 100 : 0
  const meetingConversion = replyCount > 0 ? (meetingCount / replyCount) * 100 : 12
  const estimatedRepliesNeeded = Math.ceil((goal.meetingsPerMonth / Math.max(meetingConversion, 1)) * 100)
  const estimatedSendsNeeded = Math.ceil((estimatedRepliesNeeded / Math.max(goal.replyRateTarget, 1)) * 100)
  const suggestedDailyLeadTarget = Math.ceil(estimatedSendsNeeded / 30)

  return NextResponse.json({
    ...goal,
    planner: {
      observedReplyRate: Number(observedReplyRate.toFixed(1)),
      meetingConversion: Number(meetingConversion.toFixed(1)),
      estimatedSendsNeeded,
      suggestedDailyLeadTarget,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json()) as Partial<{
    meetingsPerMonth: number
    replyRateTarget: number
    dailyLeadCap: number
    autoSendEnabled: boolean
    reviewWindowMins: number
    maxAutoSendsPerDay: number
    minConfidence: "LOW" | "MEDIUM" | "HIGH"
  }>

  const data = {
    ...(typeof body.meetingsPerMonth === "number" ? { meetingsPerMonth: Math.max(1, body.meetingsPerMonth) } : {}),
    ...(typeof body.replyRateTarget === "number" ? { replyRateTarget: Math.max(1, body.replyRateTarget) } : {}),
    ...(typeof body.dailyLeadCap === "number" ? { dailyLeadCap: Math.max(5, body.dailyLeadCap) } : {}),
    ...(typeof body.autoSendEnabled === "boolean" ? { autoSendEnabled: body.autoSendEnabled } : {}),
    ...(typeof body.reviewWindowMins === "number" ? { reviewWindowMins: Math.max(5, body.reviewWindowMins) } : {}),
    ...(typeof body.maxAutoSendsPerDay === "number" ? { maxAutoSendsPerDay: Math.max(1, body.maxAutoSendsPerDay) } : {}),
    ...(body.minConfidence ? { minConfidence: body.minConfidence } : {}),
  }

  const updated = await prisma.agentGoal.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  })

  return NextResponse.json(updated)
}

