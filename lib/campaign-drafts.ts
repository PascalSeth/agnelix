import { prisma } from "./db"
import { generateEmail } from "./ai"
import { performCompanyResearch } from "./research"
import { drainDueQueue } from "./scheduler"
import { determineOptimalApproach } from "./approach-selector"
import { getValidProspectFirstName } from "./name-sanitizer"
import { LeadStatus } from "@/app/generated/prisma/client"

const SKIP_STATUSES: LeadStatus[] = ["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED"]

/**
 * Generates AI email drafts for all eligible leads in a campaign that don't have emails yet.
 * Dynamically determines the optimal outreach angle for each lead rather than using a static default.
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
  if (!campaign || !campaign.sequence) return { generated: 0, skipped: 0 }

  const user = campaign.user
  const steps = campaign.sequence.steps
  if (steps.length === 0) return { generated: 0, skipped: 0 }
  
  const autonomous = campaign.autonomous
  let generated = 0
  let skipped = 0

  // 1. If autonomous, promote any existing Step 1 DRAFT emails to QUEUED
  if (autonomous) {
    const existingDrafts = await prisma.email.findMany({
      where: {
        campaignId,
        status: "DRAFT",
        stepNumber: 1,
        lead: { status: { notIn: SKIP_STATUSES } },
      },
      select: { id: true, leadId: true, subject: true },
    })

    if (existingDrafts.length > 0) {
      await prisma.email.updateMany({
        where: { id: { in: existingDrafts.map(d => d.id) } },
        data: { status: "QUEUED", scheduledAt: new Date() },
      })
      generated += existingDrafts.length
    }
  }

  for (const cl of campaign.campaignLeads) {
    const lead = cl.lead
    if (SKIP_STATUSES.includes(lead.status as LeadStatus)) { skipped++; continue }

    const existingCount = await prisma.email.count({ where: { leadId: lead.id, campaignId } })
    if (existingCount > 0) { skipped++; continue }

    try {
      let auditData: Parameters<typeof generateEmail>[0]["auditData"] = null
      if (lead.auditJson) {
        try { auditData = JSON.parse(lead.auditJson) } catch { /* ignore */ }
      }

      // Dynamically determine the best angle specifically for this lead
      const approachInfo = determineOptimalApproach(lead)
      const approach = approachInfo.id

      // Persist chosen approach on lead if not already set
      if (!lead.recommendedApproach) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { recommendedApproach: approach },
        }).catch(() => {})
      }

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
            prospectFirstName:   getValidProspectFirstName(lead.firstName, lead.email) || "",
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
            flagshipOffer:       user.flagshipOffer as any,
            clientGoal:          campaign.clientGoal,
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
            aiPrompt:   `${approachInfo.label} (${approach}) — ${approachInfo.reason}`,
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
          note:   `AI sequence drafted with ${approachInfo.label} angle (${approachInfo.reason})${autonomous ? " and queued for sending" : " — ready for review"}`,
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
