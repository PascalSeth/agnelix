import { prisma } from "./db"
import { generateEmail } from "./ai"
import { performCompanyResearch } from "./research"
import { drainDueQueue } from "./scheduler"

const SKIP_STATUSES = ["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED"]

/**
 * Generates AI email drafts for all eligible leads in a campaign that don't have emails yet.
 * When autonomous, emails are QUEUED and the send queue is drained afterward.
 */
export async function generateDraftsForCampaign(
  campaignId: string,
  userId: string,
): Promise<{ generated: number; skipped: number }> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      user: true,
      campaignLeads: { include: { lead: true } },
    },
  })
  if (!campaign) return { generated: 0, skipped: 0 }

  const user = campaign.user
  const steps = campaign.sequence.steps
  const autonomous = campaign.autonomous
  let generated = 0
  let skipped = 0

  for (const cl of campaign.campaignLeads) {
    const lead = cl.lead
    if (SKIP_STATUSES.includes(lead.status)) { skipped++; continue }

    const existingCount = await prisma.email.count({ where: { leadId: lead.id, campaignId } })
    if (existingCount > 0) { skipped++; continue }

    try {
      let auditData: Parameters<typeof generateEmail>[0]["auditData"] = null
      if (lead.auditJson) {
        try { auditData = JSON.parse(lead.auditJson) } catch { /* ignore */ }
      }

      const approach = lead.recommendedApproach || "website"
      const companyResearch = await performCompanyResearch(
        lead.company || lead.email.split("@")[0],
        lead.website,
        user.agencyName || user.companyName || "our agency",
        user.companyDesc || "",
      )

      const now = new Date()
      let prevSubject = ""
      let prevBody = ""

      for (const step of steps) {
        const scheduledAt = new Date(now)
        if (step.stepNumber > 1) {
          let daysOffset = 0
          for (let i = 1; i < step.stepNumber; i++) daysOffset += steps[i - 1]?.delayDays ?? 1
          scheduledAt.setDate(scheduledAt.getDate() + daysOffset)
        }

        const result = await generateEmail(
          {
            userId:              user.id,
            senderName:          user.name || "Your Name",
            senderTitle:         user.title || "Marketing Consultant",
            senderCompany:       user.agencyName || user.companyName || "Your Company",
            senderCompanyDesc:   user.companyDesc || "We help businesses grow.",
            prospectFirstName:   lead.firstName || lead.email.split("@")[0],
            prospectLastName:    lead.lastName || "",
            prospectTitle:       lead.title || "Decision Maker",
            prospectCompany:     lead.company || "their company",
            prospectCompanyDesc: lead.companyDesc || "",
            industry:            lead.industry || "business",
            recentNews:          lead.recentNews || "",
            painPoint:           lead.painPoint || "",
            tone:                user.tone || "Professional",
            approach,
            auditData,
            companyResearch,
            subjectTemplate:     step.subjectTemplate,
            bodyTemplate:        step.bodyTemplate,
            previousEmailSubject: prevSubject || null,
            previousEmailBody:   prevBody || null,
            calendarLink:        user.calendarLink,
          },
          step.stepNumber,
        )

        prevSubject = result.subject
        prevBody = result.body

        await prisma.email.create({
          data: {
            leadId:     lead.id,
            campaignId,
            subject:    result.subject,
            body:       result.body,
            aiPrompt:   `${approach} approach`,
            stepNumber: step.stepNumber,
            status:     (autonomous && step.stepNumber === 1) ? "QUEUED" : "DRAFT",
            scheduledAt,
          },
        })
      }

      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type:   "BATTLE_CARD_GENERATED",
          note:   `AI drafts generated${autonomous ? " and queued for sending" : " — ready for review"}`,
        },
      })

      generated++
      await new Promise(r => setTimeout(r, 600))
    } catch (err) {
      console.error(`[CampaignDrafts] Failed for lead ${lead.id}:`, err)
      skipped++
    }
  }

  if (autonomous && generated > 0) {
    try { await drainDueQueue() } catch (err) {
      console.error("[CampaignDrafts] Queue drain error:", err)
    }
  }

  return { generated, skipped }
}

/** Count leads enrolled in a campaign that have no emails yet. */
export async function countLeadsNeedingDrafts(campaignId: string, userId: string): Promise<number> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: { campaignLeads: { include: { lead: { include: { emails: { where: { campaignId }, select: { id: true } } } } } } },
  })
  if (!campaign) return 0
  return campaign.campaignLeads.filter(cl =>
    !SKIP_STATUSES.includes(cl.lead.status) && cl.lead.emails.length === 0
  ).length
}
