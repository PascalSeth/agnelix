/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  // Update user's lastActiveAt timestamp to register they are actively online
  await prisma.user.update({
    where: { id: scopeId },
    data: { lastActiveAt: new Date() },
  }).catch(() => {})

  let goal = await prisma.agentGoal.findUnique({
    where: { userId: scopeId },
    include: {
      user: {
        select: {
          agencyName: true,
          companyDesc: true,
          title: true,
          tone: true,
          name: true,
          fromEmail: true,
          playbookType: true,
          lastActiveAt: true,
        },
      },
    },
  })

  if (!goal) {
    goal = await prisma.agentGoal.create({
      data: { userId: scopeId },
      include: {
        user: {
          select: {
            agencyName: true,
            companyDesc: true,
            title: true,
            tone: true,
            name: true,
            fromEmail: true,
            playbookType: true,
            lastActiveAt: true,
          },
        },
      },
    })
  }

  const last30 = new Date()
  last30.setDate(last30.getDate() - 30)
  const [sentCount, replyCount, meetingCount] = await Promise.all([
    prisma.email.count({ where: { lead: { userId: scopeId }, sentAt: { gte: last30 } } }),
    prisma.reply.count({ where: { lead: { userId: scopeId }, receivedAt: { gte: last30 } } }),
    prisma.activity.count({
      where: { lead: { userId: scopeId }, type: "MEETING_BOOKED", createdAt: { gte: last30 } },
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
  const scopeId = getScopeId(session)

  const body = (await req.json()) as Partial<{
    meetingsPerMonth: number
    replyRateTarget: number
    dailyLeadCap: number
    autoSendEnabled: boolean
    autoProspectingEnabled: boolean
    reviewWindowMins: number
    maxAutoSendsPerDay: number
    minConfidence: "LOW" | "MEDIUM" | "HIGH"
    personaConfig: any
    lowPriorityDelayMins: number
    highPriorityDelayMins: number
    autoSendOnlyWhenOffline: boolean
    criticalDelayMins: number
    questionDelayMins: number
    objectionDelayMins: number
    offlineDelayMins: number
  }>

  const data = {
    ...(typeof body.meetingsPerMonth === "number" ? { meetingsPerMonth: Math.max(1, body.meetingsPerMonth) } : {}),
    ...(typeof body.replyRateTarget === "number" ? { replyRateTarget: Math.max(1, body.replyRateTarget) } : {}),
    ...(typeof body.dailyLeadCap === "number" ? { dailyLeadCap: Math.max(5, body.dailyLeadCap) } : {}),
    ...(typeof body.autoSendEnabled === "boolean" ? { autoSendEnabled: body.autoSendEnabled } : {}),
    ...(typeof body.autoProspectingEnabled === "boolean" ? { autoProspectingEnabled: body.autoProspectingEnabled } : {}),
    ...(typeof body.reviewWindowMins === "number" ? { reviewWindowMins: Math.max(0, body.reviewWindowMins) } : {}),
    ...(typeof body.maxAutoSendsPerDay === "number" ? { maxAutoSendsPerDay: Math.max(1, body.maxAutoSendsPerDay) } : {}),
    ...(body.minConfidence ? { minConfidence: body.minConfidence } : {}),
    ...(body.personaConfig !== undefined ? { personaConfig: body.personaConfig } : {}),
    ...(typeof body.lowPriorityDelayMins === "number" ? { lowPriorityDelayMins: Math.max(0, body.lowPriorityDelayMins) } : {}),
    ...(typeof body.highPriorityDelayMins === "number" ? { highPriorityDelayMins: Math.max(0, body.highPriorityDelayMins) } : {}),
    ...(typeof body.autoSendOnlyWhenOffline === "boolean" ? { autoSendOnlyWhenOffline: body.autoSendOnlyWhenOffline } : {}),
    ...(typeof body.criticalDelayMins === "number" ? { criticalDelayMins: Math.max(0, body.criticalDelayMins) } : {}),
    ...(typeof body.questionDelayMins === "number" ? { questionDelayMins: Math.max(0, body.questionDelayMins) } : {}),
    ...(typeof body.objectionDelayMins === "number" ? { objectionDelayMins: Math.max(0, body.objectionDelayMins) } : {}),
    ...(typeof body.offlineDelayMins === "number" ? { offlineDelayMins: Math.max(0, body.offlineDelayMins) } : {}),
  }

  const updated = await prisma.agentGoal.upsert({
    where: { userId: scopeId },
    update: data,
    create: { userId: scopeId, ...data },
  })

  return NextResponse.json(updated)
}
