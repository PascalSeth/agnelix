import { prisma } from "@/lib/db"
import { sendEmail, resolveSmtp } from "@/lib/email"

type PendingActionWithLead = {
  id: string
  userId: string
  leadId: string
  type: "SEND_REPLY" | "ENROLL_NURTURE" | "UPDATE_STAGE" | "BOOK_MEETING" | "SEND_PROPOSAL"
  intent: string
  draftSubject: string | null
  draftBody: string
  metadata: unknown
  status: "PENDING" | "APPROVED" | "REJECTED" | "AUTO_EXECUTED"
  lead: {
    id: string
    email: string
    user: {
      id: string
      name: string | null
      agencyName: string | null
      agencyLogo: string | null
      fromEmail: string | null
      smtpPass: string | null
      smtpHost: string | null
      smtpPort: number | null
      calendarLink: string | null
    }
  }
}

export async function getOrCreateAgentGoal(userId: string) {
  const existing = await prisma.agentGoal.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.agentGoal.create({ data: { userId } })
}

export async function evaluateRiskPolicy(params: {
  userId: string
  intent: string
  confidence: "LOW" | "MEDIUM" | "HIGH"
  replyBody: string
}) {
  const goal = await getOrCreateAgentGoal(params.userId)
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const sentToday = await prisma.pendingAction.count({
    where: {
      userId: params.userId,
      type: "SEND_REPLY",
      status: { in: ["APPROVED", "AUTO_EXECUTED"] },
      executedAt: { gte: startOfDay },
    },
  })

  const lowerReply = params.replyBody.toLowerCase()
  const hasUnsubscribeKeyword = ["unsubscribe", "remove me", "do not contact", "stop emailing"].some((k) =>
    lowerReply.includes(k)
  )

  const confidenceRank = { LOW: 1, MEDIUM: 2, HIGH: 3 }
  const thresholdRank = confidenceRank[goal.minConfidence]
  const currentRank = confidenceRank[params.confidence]
  const confidencePass = currentRank >= thresholdRank

  const policyChecks = {
    autoSendEnabled: goal.autoSendEnabled,
    confidencePass,
    belowDailyAutoSendCap: sentToday < goal.maxAutoSendsPerDay,
    unsubscribeGuard: !hasUnsubscribeKeyword,
  }

  const allowAutoExecute = Object.values(policyChecks).every(Boolean)
  return {
    allowAutoExecute,
    riskLevel: allowAutoExecute ? "LOW" : "HIGH",
    policyChecks,
    reviewWindowMins: goal.reviewWindowMins,
    sentToday,
  } as const
}

export async function executePendingAction(action: PendingActionWithLead, mode: "approve" | "auto") {
  const now = new Date()
  if (action.status !== "PENDING") return { ok: false as const, reason: "already_resolved" }

  if (action.type === "SEND_REPLY" || action.type === "BOOK_MEETING" || action.type === "SEND_PROPOSAL") {
    const user = action.lead.user
    let smtp
    try {
      smtp = resolveSmtp(user)
    } catch {
      await prisma.pendingAction.update({
        where: { id: action.id },
        data: { status: "REJECTED", executedAt: now },
      })
      return { ok: false as const, reason: "smtp_missing" }
    }

    const emailRecord = await prisma.email.create({
      data: {
        leadId: action.leadId,
        subject: action.draftSubject ?? "Following up",
        body: action.draftBody,
        status: "SENT",
        sentAt: now,
        stepNumber: 0,
        campaignId: null,
      },
    })

    try {
      const sendResult = await sendEmail(
        {
          to: action.lead.email,
          from: smtp.user,
          fromName: user.agencyName || user.name || "Agnelix",
          replyTo: user.fromEmail || smtp.user,
          subject: action.draftSubject ?? "Following up",
          body: action.draftBody,
          trackingId: emailRecord.id,
          agencyLogo: user.agencyLogo || undefined,
          agencyName: user.agencyName || undefined,
          calendlyLink: user.calendarLink || undefined,
        },
        smtp
      )

      const nextStatus = mode === "auto" ? "AUTO_EXECUTED" : "APPROVED"
      const activityNotePrefix =
        action.type === "BOOK_MEETING"
          ? "Meeting response"
          : action.type === "SEND_PROPOSAL"
            ? "Proposal sent"
            : "Reply sent"

      await Promise.all([
        prisma.email.update({
          where: { id: emailRecord.id },
          data: { messageId: sendResult.messageId },
        }),
        prisma.pendingAction.update({
          where: { id: action.id },
          data: { status: nextStatus, executedAt: now },
        }),
        prisma.activity.create({
          data: {
            leadId: action.leadId,
            type: "EMAIL_SENT",
            note: `${activityNotePrefix}: ${action.draftSubject ?? "Following up"}`,
            metadata: { mode, pendingActionType: action.type },
          },
        }),
        prisma.agentMemory.create({
          data: {
            userId: action.userId,
            leadId: action.leadId,
            intent: action.intent,
            responseStyle: typeof action.metadata === "object" && action.metadata ? String((action.metadata as Record<string, unknown>).style ?? "") : undefined,
            ctaType: action.type,
            outcome: nextStatus,
            bookedMeeting: action.type === "BOOK_MEETING",
            score: action.type === "BOOK_MEETING" ? 1 : 0.5,
            metadata: action.metadata ?? undefined,
          },
        }),
      ])

      if (action.type === "BOOK_MEETING") {
        await prisma.lead.update({
          where: { id: action.leadId },
          data: { status: "MEETING_BOOKED" },
        })
        await prisma.activity.create({
          data: {
            leadId: action.leadId,
            type: "MEETING_BOOKED",
            note: "Booked by autonomous agent",
          },
        })
      }

      if (action.type === "SEND_PROPOSAL") {
        await prisma.lead.update({
          where: { id: action.leadId },
          data: { status: "PROPOSAL_SENT" },
        })
        await prisma.activity.create({
          data: {
            leadId: action.leadId,
            type: "PROPOSAL_GENERATED",
            note: "Proposal generated and sent by autonomous agent",
          },
        })
      }

      return { ok: true as const }
    } catch (e) {
      console.error("Failed to execute pending action send:", e)
      await prisma.email.delete({ where: { id: emailRecord.id } }).catch(() => {})
      await prisma.pendingAction.update({
        where: { id: action.id },
        data: { status: "REJECTED", executedAt: now },
      })
      return { ok: false as const, reason: "send_failed" }
    }
  }

  if (action.type === "UPDATE_STAGE") {
    await prisma.lead.update({
      where: { id: action.leadId },
      data: { status: "CONTACTED" },
    })
  }

  if (action.type === "ENROLL_NURTURE") {
    await prisma.lead.update({
      where: { id: action.leadId },
      data: { status: "CONTACTED" },
    })
  }

  const finalStatus = mode === "auto" ? "AUTO_EXECUTED" : "APPROVED"
  await prisma.pendingAction.update({
    where: { id: action.id },
    data: { status: finalStatus, executedAt: now },
  })
  await prisma.activity.create({
    data: {
      leadId: action.leadId,
      type: "STAGE_CHANGED",
      note: `Agent action executed: ${action.type}`,
      metadata: { mode },
    },
  })
  return { ok: true as const }
}

