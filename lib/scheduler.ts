import { prisma } from "./db"
import { sendEmail, resolveSmtp } from "./email"
import { checkEmailQuota } from "./cost-guard"

export async function processSequenceQueue() {
  const now = new Date()

  const dueEmails = await prisma.email.findMany({
    where: {
      status: "QUEUED",
      scheduledAt: { lte: now },
    },
    include: {
      lead: {
        include: {
          user: true,
        },
      },
      campaign: true,
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  })

  const results = { sent: 0, skipped: 0, failed: 0 }

  for (const email of dueEmails) {
    const { lead } = email

    // Stop if lead replied, unsubscribed, or is not interested
    if (
      lead.status === "REPLIED" ||
      lead.status === "MEETING_BOOKED" ||
      lead.status === "NOT_INTERESTED" ||
      lead.status === "BOUNCED"
    ) {
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "FAILED" },
      })
      results.skipped++
      continue
    }

    const canSend = await checkEmailQuota(lead.userId)
    if (!canSend) {
      results.skipped++
      continue
    }

    try {
      const smtp = resolveSmtp(lead.user)
      const result = await sendEmail({
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
      }, smtp)

      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          messageId: result.messageId,
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

        // Find the next step email for this lead in this campaign
        const nextEmail = await prisma.email.findFirst({
          where: {
            leadId: lead.id,
            campaignId: email.campaignId,
            stepNumber: email.stepNumber + 1,
          },
        })

        if (nextEmail) {
          const campaignWithSequence = await prisma.campaign.findUnique({
            where: { id: email.campaignId },
            include: { sequence: { include: { steps: true } } },
          })
          if (campaignWithSequence?.sequence?.steps) {
            const steps = campaignWithSequence.sequence.steps
            const currentStepDef = steps.find(s => s.stepNumber === email.stepNumber)
            const delayDays = currentStepDef?.delayDays ?? 1
            const newScheduledAt = new Date()
            newScheduledAt.setDate(newScheduledAt.getDate() + delayDays)

            await prisma.email.update({
              where: { id: nextEmail.id },
              data: { scheduledAt: newScheduledAt },
            })
          }
        }
      }

      results.sent++
    } catch (err) {
      console.error("Failed to send email", email.id, err)
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "FAILED" },
      })
      results.failed++
    }
  }

  return results
}
