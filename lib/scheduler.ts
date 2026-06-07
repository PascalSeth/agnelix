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

  // Skip if the lead has opted out / already replied
  if (["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED"].includes(lead.status)) {
    await prisma.email.update({ where: { id: emailId }, data: { status: "FAILED" } })
    return false
  }

  const canSend = await checkEmailQuota(lead.userId)
  if (!canSend) return false

  try {
    const smtp = resolveSmtp(lead.user)
    const result = await sendEmail(
      {
        to: lead.email,
        from: smtp.user,
        fromName: lead.user.agencyName || lead.user.name || "Agnelix",
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

    const now = new Date()

    await prisma.email.update({
      where: { id: emailId },
      data: { status: "SENT", sentAt: now, messageId: result.messageId },
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

      // Reschedule next-step email
      if (email.campaign?.sequence?.steps) {
        const steps = email.campaign.sequence.steps
        const nextEmail = await prisma.email.findFirst({
          where: { leadId: lead.id, campaignId: email.campaignId, stepNumber: email.stepNumber + 1 },
        })
        if (nextEmail) {
          const currentStepDef = steps.find((s) => s.stepNumber === email.stepNumber)
          const delayDays = currentStepDef?.delayDays ?? 1
          const nextScheduledAt = new Date(now)
          nextScheduledAt.setDate(nextScheduledAt.getDate() + delayDays)
          await prisma.email.update({
            where: { id: nextEmail.id },
            data: { scheduledAt: nextScheduledAt },
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
  } catch (err) {
    console.error("[Scheduler] Failed to send email", emailId, err)
    await prisma.email.update({ where: { id: emailId }, data: { status: "FAILED" } })
    return false
  }
}

// ── Sequence queue processor ──────────────────────────────────────────────────

// Module-level mutex — prevents concurrent runs in the same Node.js process.
// Without this, the 4-second GET poll and any manual triggers can fire simultaneously,
// opening multiple SMTP connections to the same email and causing socket errors.
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
  }
  return totals
}

async function _processQueue() {
  const now = new Date()

  // ── 1. Auto-promote expired follow-up drafts (24h safety window) ──────────
  // Step 1 initial outreach drafts are NEVER auto-promoted in manual mode —
  // only step 2+ follow-ups that passed their scheduled date by >24h.
  const expiredCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const expiredDrafts = await prisma.email.findMany({
    where: {
      status: "DRAFT",
      stepNumber: { gt: 1 },
      scheduledAt: { lte: expiredCutoff },
    },
    include: {
      campaign: { select: { autonomous: true } },
    },
  })

  for (const draft of expiredDrafts) {
    // Only auto-promote follow-ups for manual campaigns (autonomous handles its own flow)
    if (draft.campaign?.autonomous) continue
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
    })
  }

  // ── 2. Atomically claim due QUEUED emails (prevents double-processing) ──────
  // We fetch IDs first, then batch-update their scheduledAt to a future date to lock them.
  // Any concurrent runner that also queries will see the future date and skip them.
  const dueEmailIds = await prisma.email.findMany({
    where: { status: "QUEUED", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: 10, // Conservative — Gmail allows 500/day; process in small batches
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

  // Re-fetch emails that we successfully locked (some may have been grabbed by another run)
  const claimedEmails = await prisma.email.findMany({
    where: { id: { in: ids }, status: "QUEUED", scheduledAt: lockTime },
    select: { id: true },
  })

  const results = { sent: 0, skipped: 0, failed: 0, autoPromoted: expiredDrafts.length }

  for (const email of claimedEmails) {
    const success = await sendEmailImmediately(email.id)
    if (success) results.sent++
    else results.failed++

    // Small delay between sends to avoid Gmail rate limits
    if (claimedEmails.indexOf(email) < claimedEmails.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return results
}

/**
 * Reschedules the next paused campaign follow-up email to send in 3 days,
 * provided the deal is not finalized (won, lost, meeting booked, etc.).
 */
export async function rescheduleNextCampaignStep(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { status: true },
  })

  if (!lead) return

  // Do not schedule automatic follow-up if the deal is finalized or meeting is booked
  const finalizedStages = ["WON", "LOST", "NOT_INTERESTED", "BOUNCED", "MEETING_BOOKED"]
  if (finalizedStages.includes(lead.status)) {
    return
  }

  // Find the next sequence step that was paused/failed
  const nextStep = await prisma.email.findFirst({
    where: {
      leadId,
      status: "FAILED",
      campaignId: { not: null },
      stepNumber: { gt: 0 },
    },
    orderBy: { stepNumber: "asc" },
  })

  if (nextStep) {
    const threeDaysLater = new Date()
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)

    await Promise.all([
      prisma.email.update({
        where: { id: nextStep.id },
        data: { status: "QUEUED", scheduledAt: threeDaysLater },
      }),
      prisma.activity.create({
        data: {
          leadId,
          type: "STAGE_CHANGED",
          note: `Lead replied. AI rescheduled campaign follow-up Step ${nextStep.stepNumber} to send in 3 days if no response received.`,
          metadata: { emailId: nextStep.id, stepNumber: nextStep.stepNumber },
        },
      }),
    ])
  }
}
