import { prisma } from "./db"
import { generateEmail } from "./ai"
import { checkEmailQuota } from "./cost-guard"
import { performCompanyResearch } from "./research"

/**
 * Generates AI emails and queues them for a campaign.
 * Pass leadIds to only process specific leads (e.g. newly added ones).
 * Without leadIds, processes all enrolled leads.
 */
export async function generateAndQueueEmails(
  campaignId: string,
  userId: string,
  leadIds?: string[],
  customEmails?: { leadId: string; stepNumber: number; subject: string; body: string }[]
): Promise<{ queued: number }> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      campaignLeads: {
        include: { lead: true },
        ...(leadIds?.length ? { where: { leadId: { in: leadIds } } } : {}),
      },
      user: true,
    },
  })

  if (!campaign || campaign.campaignLeads.length === 0) return { queued: 0 }

  const canSend = await checkEmailQuota(userId)
  if (!canSend) return { queued: 0 }

  const user = campaign.user
  const steps = campaign.sequence.steps
  const now = new Date()
  let queued = 0

  for (const cl of campaign.campaignLeads) {
    const lead = cl.lead

    // Skip leads that have already replied, booked, or opted out
    if (["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED"].includes(lead.status)) continue

    // Promote existing DRAFT emails to QUEUED if launching autonomous campaign
    const drafts = await prisma.email.findMany({
      where: { leadId: lead.id, campaignId, status: "DRAFT" },
      orderBy: { stepNumber: "asc" },
    })

    if (drafts.length > 0) {
      if (campaign.autonomous) {
        for (const email of drafts) {
          const scheduledAt = new Date(now)
          if (email.stepNumber > 1) {
            let daysOffset = 0
            for (let i = 1; i < email.stepNumber; i++) daysOffset += steps[i - 1]?.delayDays ?? 1
            scheduledAt.setDate(scheduledAt.getDate() + daysOffset)
          }
          await prisma.email.update({
            where: { id: email.id },
            data: { status: "QUEUED", scheduledAt },
          })
        }
        queued += drafts.length
      }
      continue
    }

    // Skip if emails already generated for this lead in this campaign
    const existing = await prisma.email.count({ where: { leadId: lead.id, campaignId } })
    if (existing > 0) continue

    // Perform extensive company research
    const companyResearch = await performCompanyResearch(
      lead.company || lead.email.split("@")[0],
      lead.website,
      user.agencyName || user.companyName || "our agency",
      user.companyDesc || ""
    )

    let prevSubject = ""
    let prevBody = ""

    for (const step of steps) {
      const scheduledAt = new Date(now)
      if (step.stepNumber > 1) {
        let daysOffset = 0
        for (let i = 1; i < step.stepNumber; i++) daysOffset += steps[i - 1].delayDays
        scheduledAt.setDate(scheduledAt.getDate() + daysOffset)
      }

      const customEmail = customEmails?.find(e => e.leadId === lead.id && e.stepNumber === step.stepNumber)
      
      let subject = ""
      let body = ""
      let promptStr = ""
      
      if (customEmail) {
        subject = customEmail.subject
        body = customEmail.body
        promptStr = "Customized by user in preview"
        prevSubject = customEmail.subject
        prevBody = customEmail.body
      } else {
        const generated = await generateEmail(
          {
            senderName:        user.name || "Your Name",
            senderTitle:       user.title || "Marketing Consultant",
            senderCompany:     user.agencyName || user.companyName || "Your Company",
            senderCompanyDesc: user.companyDesc || "We help businesses grow.",
            prospectFirstName: lead.firstName || lead.email.split("@")[0],
            prospectLastName:  lead.lastName || "",
            prospectTitle:     lead.title || "Decision Maker",
            prospectCompany:   lead.company || "their company",
            prospectCompanyDesc: lead.companyDesc || "",
            industry:          lead.industry || "business",
            recentNews:        lead.recentNews || "",
            painPoint:         lead.painPoint || "",
            tone:              user.tone || "Professional",
            companyResearch,
            subjectTemplate:   step.subjectTemplate,
            bodyTemplate:      step.bodyTemplate,
            previousEmailSubject: prevSubject || null,
            previousEmailBody: prevBody || null,
            calendarLink:      user.calendarLink
          },
          step.stepNumber
        )
        subject = generated.subject
        body = generated.body
        promptStr = generated.prompt
        prevSubject = generated.subject
        prevBody = generated.body
      }

      const createdEmail = await prisma.email.create({
        data: {
          leadId: lead.id,
          campaignId,
          subject,
          body,
          aiPrompt: promptStr,
          stepNumber: step.stepNumber,
          status: campaign.autonomous ? "QUEUED" : "DRAFT",
          scheduledAt,
        },
      })

      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: "EMAIL_SENT",
          note: subject,
          metadata: { emailId: createdEmail.id, stepNumber: step.stepNumber, campaignId, scheduledAt: scheduledAt.toISOString() },
        },
      })

      if (campaign.autonomous) {
        queued++
      }
    }
  }

  if (queued > 0 || !campaign.autonomous) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "ACTIVE",
        launchedAt: campaign.launchedAt ?? now,
        totalLeads: campaign.campaignLeads.length,
      },
    })
  }

  return { queued }
}
