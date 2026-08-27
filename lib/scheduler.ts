import { prisma } from "./db"
import { sendEmail, resolveSmtp } from "./email"
import { checkEmailQuota } from "./cost-guard"

// ── Shared send logic ─────────────────────────────────────────────────────────

/**
 * Sends a single email record immediately via SMTP.
 * Updates the email to SENT, updates lead status, increments campaign counter,
 * logs an Activity record, and reschedules the next step email.
 * Returns true on success, false on failure.
 */
export async function sendEmailImmediately(emailId: string): Promise<boolean> {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      lead: { include: { user: true } },
      campaign: { include: { sequence: { include: { steps: true } } } },
    },
  })

  if (!email) return false
  const { lead } = email

  // Skip if not QUEUED
  if (email.status !== "QUEUED") return false

  // 1. Skip if the lead has opted out / already replied / booked a meeting
  if (["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED", "LOST"].includes(lead.status)) {
    console.log(`[Scheduler] Skipping email ${emailId} because lead status is ${lead.status}.`)
    await prisma.email.update({ where: { id: emailId }, data: { status: "FAILED" } })
    return false
  }

  // 2. Strict Unreplied Guard: Verify no incoming reply records exist for this lead
  const replyCount = await prisma.reply.count({ where: { leadId: lead.id } })
  if (replyCount > 0 || (lead.repliesReceivedCount && lead.repliesReceivedCount > 0)) {
    console.log(`[Scheduler] Skipping step ${email.stepNumber} for lead ${lead.id} because lead has already replied (${replyCount} replies).`)
    await prisma.email.update({ where: { id: emailId }, data: { status: "REPLIED" } })
    return false
  }

  const now = new Date()

  // 3. Step Sequence & Timeframe Enforcement for Follow-ups (Step > 1):
  if (email.stepNumber > 1 && email.campaignId) {
    const priorStep = await prisma.email.findFirst({
      where: {
        leadId: lead.id,
        campaignId: email.campaignId,
        stepNumber: email.stepNumber - 1,
      },
    })

    if (!priorStep || !["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(priorStep.status)) {
      console.log(`[Scheduler] Skipping step ${email.stepNumber} for lead ${lead.id} because prior step ${email.stepNumber - 1} is not sent yet.`)
      await prisma.email.update({
        where: { id: emailId },
        data: { status: "DRAFT" },
      })
      return false
    }

    // Ensure the delayDays timeframe has genuinely passed since previous step sentAt!
    if (priorStep.sentAt && email.campaign?.sequence?.steps) {
      const stepDef = email.campaign.sequence.steps.find((s) => s.stepNumber === email.stepNumber)
      const delayDays = stepDef?.delayDays ?? 1
      const minSendTime = new Date(new Date(priorStep.sentAt).getTime() + delayDays * 24 * 60 * 60 * 1000)
      if (now < minSendTime) {
        console.log(`[Scheduler] Step ${email.stepNumber} for lead ${lead.id} is not due yet. Scheduled for ${minSendTime.toISOString()}.`)
        await prisma.email.update({
          where: { id: emailId },
          data: { scheduledAt: minSendTime },
        })
        return false
      }
    }
  }

  // 4. Resolve SMTP credentials with graceful error handling & activity notification
  let smtp
  try {
    smtp = resolveSmtp(lead.user)
  } catch (err: any) {
    const errorReason = err?.message || "Email SMTP credentials not configured. Please add your Gmail App Password in Settings → Agency."
    console.error(`[Scheduler] SMTP config missing for user ${lead.userId}:`, errorReason)
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "FAILED",
        replySnippet: errorReason,
      },
    })
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: "NOTE_ADDED",
        note: `Dispatch failed: ${errorReason}`,
      },
    }).catch(() => {})
    return false
  }

  const canSend = await checkEmailQuota(lead.userId)
  if (!canSend) {
    console.warn(`[Scheduler] Daily email quota reached for user ${lead.userId}. Rescheduling for tomorrow.`)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(8, 0, 0, 0)
    await prisma.email.update({
      where: { id: emailId },
      data: {
        scheduledAt: tomorrow,
        replySnippet: "Daily email quota limit reached (100/day). Rescheduled for tomorrow.",
      },
    })
    return false
  }

  // 5. Atomically claim/update the email status to "SENT" to prevent concurrent double-sends
  const claimResult = await prisma.email.updateMany({
    where: { id: emailId, status: "QUEUED" },
    data: { status: "SENT", sentAt: now },
  })

  if (claimResult.count === 0) {
    return false
  }

  try {
    const result = await sendEmail(
      {
        to: lead.email,
        from: smtp.user,
        fromName: lead.user.agencyName || lead.user.name || "Galien",
        replyTo: lead.user.email,
        subject: email.subject,
        body: email.body,
        trackingId: email.id,
        agencyLogo: lead.user.agencyLogo || undefined,
        agencyName: lead.user.agencyName || undefined,
        calendlyLink: lead.user.calendarLink || undefined,
      },
      smtp,
    )

    await prisma.email.update({
      where: { id: emailId },
      data: {
        messageId: result.messageId,
        replySnippet: null,
      },
    })

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "CONTACTED" },
    })

    if (email.campaignId) {
      await prisma.campaign.update({
        where: { id: email.campaignId },
        data: { emailsSent: { increment: 1 } },
      })

      // Reschedule next-step follow-up email
      if (email.campaign?.sequence?.steps) {
        const steps = email.campaign.sequence.steps
        const nextEmail = await prisma.email.findFirst({
          where: { leadId: lead.id, campaignId: email.campaignId, stepNumber: email.stepNumber + 1 },
        })
        if (nextEmail) {
          const nextStepDef = steps.find((s) => s.stepNumber === nextEmail.stepNumber)
          const delayDays = nextStepDef?.delayDays ?? 1
          const nextScheduledAt = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000)
          await prisma.email.update({
            where: { id: nextEmail.id },
            data: {
              scheduledAt: nextScheduledAt,
              ...(email.campaign.autonomous ? { status: "QUEUED" } : {}),
            },
          })
        }
      }
    }

    // Activity log
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: "EMAIL_SENT",
        note: `Step ${email.stepNumber} sent: "${email.subject}"`,
        metadata: {
          emailId: email.id,
          stepNumber: email.stepNumber,
          campaignId: email.campaignId,
        },
      },
    })

    return true
  } catch (err: any) {
    const errorMsg = `SMTP Delivery Failed: ${err?.message || "Could not connect to SMTP server"}`
    console.error("[Scheduler] Failed to send email", emailId, err)
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "FAILED",
        replySnippet: errorMsg,
      },
    })
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: "NOTE_ADDED",
        note: errorMsg,
        metadata: { emailId, error: String(err) },
      },
    }).catch(() => {})
    return false
  }
}

// ── Sequence queue processor ──────────────────────────────────────────────────

// Module-level mutex — prevents concurrent runs in the same Node.js process.
let _isRunning = false

export async function processSequenceQueue() {
  if (_isRunning) {
    console.log("[Scheduler] Already running — skipping concurrent invocation")
    return { sent: 0, skipped: 1, failed: 0, autoPromoted: 0 }
  }
  _isRunning = true

  try {
    return await _processQueue()
  } finally {
    _isRunning = false
  }
}

/** Process all due emails now — loops until the queue is empty or maxRounds hit. */
export async function drainDueQueue(maxRounds = 20) {
  const totals = { sent: 0, failed: 0, autoPromoted: 0, rounds: 0 }
  for (let i = 0; i < maxRounds; i++) {
    const r = await processSequenceQueue()
    totals.sent += r.sent
    totals.failed += r.failed
    totals.autoPromoted += r.autoPromoted
    totals.rounds++
    if (r.sent === 0 && r.failed === 0 && r.skipped === 0) break
    if (r.sent === 0 && r.failed === 0) break

    // Pause between rounds to avoid bursts of SMTP sends triggering rate limits
    if (i + 1 < maxRounds) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  return totals
}

async function _processQueue() {
  const now = new Date()

  // ── 0. Failsafe Lock Recovery ─────────────────────────────────────────────
  // Automatically unlock any QUEUED emails whose lock timestamp has expired (> 2 mins old)
  const lockCutoff = new Date(now.getTime() - 2 * 60 * 1000)
  await prisma.email.updateMany({
    where: {
      status: "QUEUED",
      scheduledAt: { gt: now, lte: new Date(now.getTime() + 10 * 60 * 1000) },
      updatedAt: { lte: lockCutoff },
    },
    data: { scheduledAt: now },
  }).catch(() => {})

  // ── 1. Auto-promote expired follow-up drafts (24h safety window) ──────────
  const expiredCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const expiredDrafts = await prisma.email.findMany({
    where: {
      status: "DRAFT",
      stepNumber: { gt: 1 },
      scheduledAt: { lte: expiredCutoff },
      OR: [
        { campaign: { status: "ACTIVE" } },
        { campaign: { autonomous: true } },
      ],
    },
    include: {
      campaign: { select: { autonomous: true } },
    },
  })

  for (const draft of expiredDrafts) {
    if (draft.campaign?.autonomous) continue

    const lead = await prisma.lead.findUnique({
      where: { id: draft.leadId },
      select: { status: true },
    })
    if (lead && ["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED", "LOST"].includes(lead.status)) {
      await prisma.email.update({ where: { id: draft.id }, data: { status: "REPLIED" } })
      continue
    }
    const replyCount = await prisma.reply.count({ where: { leadId: draft.leadId } })
    if (replyCount > 0) {
      await prisma.email.update({ where: { id: draft.id }, data: { status: "REPLIED" } })
      continue
    }

    await prisma.email.update({
      where: { id: draft.id },
      data: { status: "QUEUED", scheduledAt: now },
    })
    await prisma.activity.create({
      data: {
        leadId: draft.leadId,
        type: "EMAIL_SENT",
        note: `Step ${draft.stepNumber} follow-up auto-promoted to queue (24h review window expired)`,
        metadata: { emailId: draft.id, stepNumber: draft.stepNumber, autoPromoted: true },
      },
    }).catch(() => {})
  }

  // ── 2. Atomically claim due QUEUED emails ────────────────────────────────
  const dueEmailIds = await prisma.email.findMany({
    where: {
      status: "QUEUED",
      scheduledAt: { lte: now },
      OR: [
        { campaignId: null },
        { campaign: { status: "ACTIVE" } },
        { campaign: { autonomous: true } },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
    select: { id: true },
  })

  if (dueEmailIds.length === 0) {
    return { sent: 0, skipped: 0, failed: 0, autoPromoted: expiredDrafts.length }
  }

  // Claim emails atomically by setting scheduledAt to 5 minutes in the future
  const ids = dueEmailIds.map(e => e.id)
  const lockTime = new Date(now.getTime() + 5 * 60 * 1000)
  await prisma.email.updateMany({
    where: { id: { in: ids }, status: "QUEUED", scheduledAt: { lte: now } },
    data: { scheduledAt: lockTime },
  })

  // Re-fetch emails that we successfully locked
  const claimedEmails = await prisma.email.findMany({
    where: { id: { in: ids }, status: "QUEUED", scheduledAt: lockTime },
    select: { id: true },
  })

  const results = { sent: 0, skipped: 0, failed: 0, autoPromoted: expiredDrafts.length }

  for (const email of claimedEmails) {
    const success = await sendEmailImmediately(email.id)
    if (success) results.sent++
    else results.failed++

    if (claimedEmails.indexOf(email) < claimedEmails.length - 1) {
      await new Promise(r => setTimeout(r, 2500))
    }
  }

  return results
}

// Moved to lib/email-queue.ts to break the agent-core ↔ scheduler circular dependency.
// Re-exported here so existing importers keep working.
export { rescheduleNextCampaignStep } from "./email-queue"
