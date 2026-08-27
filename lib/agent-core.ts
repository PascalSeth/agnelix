import { prisma } from "@/lib/db"
import { sendEmail, resolveSmtp } from "@/lib/email"
import { rescheduleNextCampaignStep } from "@/lib/email-queue"
import { checkEmailQuota } from "@/lib/cost-guard"

type PendingActionWithLead = {
  id: string
  userId: string
  leadId: string
  type: "SEND_REPLY" | "ENROLL_NURTURE" | "UPDATE_STAGE" | "BOOK_MEETING" | "SEND_PROPOSAL" | "GENERATE_CASE_STUDY" | "LINKEDIN_TASK"
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
  
  // 1. Atomically claim/update the action to prevent concurrent double-executions
  const finalStatus = mode === "auto" ? "AUTO_EXECUTED" : "APPROVED"
  const claimResult = await prisma.pendingAction.updateMany({
    where: { id: action.id, status: "PENDING" },
    data: { status: finalStatus, executedAt: now },
  })

  if (claimResult.count === 0) {
    return { ok: false as const, reason: "already_resolved" }
  }

  if (action.type === "SEND_REPLY" || action.type === "BOOK_MEETING" || action.type === "SEND_PROPOSAL") {
    const user = action.lead.user

    const withinQuota = await checkEmailQuota(action.userId)
    if (!withinQuota) {
      // Release the claim so the action can be retried once quota resets
      await prisma.pendingAction.update({
        where: { id: action.id },
        data: { status: "PENDING", executedAt: null },
      })
      return { ok: false as const, reason: "quota_exceeded" }
    }

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

    if (!action.draftBody || !action.draftBody.trim()) {
      console.warn(`[executePendingAction] Skipping action ${action.id} because draftBody is empty`)
      await prisma.pendingAction.update({
        where: { id: action.id },
        data: { status: "REJECTED", executedAt: now },
      })
      return { ok: false as const, reason: "empty_body" }
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
          fromName: user.agencyName || user.name || "Galien",
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
            outcome: finalStatus,
            bookedMeeting: action.type === "BOOK_MEETING",
            score: action.type === "BOOK_MEETING" ? 1 : 0.5,
            metadata: action.metadata ?? undefined,
          },
        }),
      ])

      await rescheduleNextCampaignStep(action.leadId)

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
    // Actually enroll the lead in a nurture sequence instead of only flipping status.
    // Preference order: a sequence named "nurture" → the default sequence → any sequence.
    const sequence =
      (await prisma.sequence.findFirst({
        where: { userId: action.userId, name: { contains: "nurture", mode: "insensitive" } },
      })) ??
      (await prisma.sequence.findFirst({ where: { userId: action.userId, isDefault: true } })) ??
      (await prisma.sequence.findFirst({ where: { userId: action.userId } }))

    if (!sequence) {
      await prisma.activity.create({
        data: {
          leadId: action.leadId,
          type: "NOTE_ADDED",
          note: "Agent tried to enroll this lead in a nurture sequence, but no sequences exist yet. Create one under Sequences.",
        },
      })
    } else {
      let campaign = await prisma.campaign.findFirst({
        where: { userId: action.userId, name: "Nurture (Agent)" },
      })
      if (!campaign) {
        campaign = await prisma.campaign.create({
          data: {
            userId: action.userId,
            name: "Nurture (Agent)",
            sequenceId: sequence.id,
            status: "ACTIVE",
            launchedAt: now,
          },
        })
      }

      const existingEnrollment = await prisma.campaignLead.findUnique({
        where: { campaignId_leadId: { campaignId: campaign.id, leadId: action.leadId } },
      })
      if (!existingEnrollment) {
        await prisma.campaignLead.create({
          data: { campaignId: campaign.id, leadId: action.leadId },
        })
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { totalLeads: { increment: 1 } },
        })
        await prisma.activity.create({
          data: {
            leadId: action.leadId,
            type: "NOTE_ADDED",
            note: `Enrolled in nurture campaign "${campaign.name}" (sequence: ${sequence.name}) by autonomous agent`,
            metadata: { campaignId: campaign.id, sequenceId: sequence.id, mode },
          },
        })
      }
    }

    await prisma.lead.update({
      where: { id: action.leadId },
      data: { status: "CONTACTED" },
    })
  }

  if (action.type === "GENERATE_CASE_STUDY") {
    // Attach the most relevant case study from the user's library to this lead.
    const lead = await prisma.lead.findUnique({
      where: { id: action.leadId },
      select: { industry: true },
    })
    const caseStudy =
      (lead?.industry
        ? await prisma.caseStudy.findFirst({
            where: { userId: action.userId, industry: { contains: lead.industry, mode: "insensitive" } },
            orderBy: { usageCount: "desc" },
          })
        : null) ??
      (await prisma.caseStudy.findFirst({
        where: { userId: action.userId },
        orderBy: { usageCount: "desc" },
      }))

    if (caseStudy) {
      await prisma.caseStudy.update({
        where: { id: caseStudy.id },
        data: { usageCount: { increment: 1 } },
      })
      await prisma.activity.create({
        data: {
          leadId: action.leadId,
          type: "CASE_STUDY_ATTACHED",
          note: `Case study "${caseStudy.clientName} — ${caseStudy.industry}" attached by autonomous agent`,
          metadata: { caseStudyId: caseStudy.id, mode },
        },
      })
    } else {
      await prisma.activity.create({
        data: {
          leadId: action.leadId,
          type: "NOTE_ADDED",
          note: "Agent wanted to attach a case study, but your library is empty. Add one under Case Studies.",
        },
      })
    }
  }

  if (action.type === "LINKEDIN_TASK") {
    // Manual task — approving means the user has sent the message on LinkedIn themselves.
    await prisma.activity.create({
      data: {
        leadId: action.leadId,
        type: "NOTE_ADDED",
        note: `LinkedIn task completed: ${action.draftSubject ?? "message sent manually"}`,
        metadata: { mode, pendingActionType: action.type },
      },
    })
  }

  // Status already updated atomically at the start of execution
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

