import { prisma } from "./db"

/**
 * Reschedules the next paused campaign follow-up email to send in 3 days,
 * provided the deal is not finalized (won, lost, meeting booked, etc.).
 *
 * Lives here (not in scheduler.ts) so both scheduler.ts and agent-core.ts can
 * import it without a circular dependency.
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
