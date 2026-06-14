import { prisma } from "./db"
import { generateEmail } from "./ai"
import { checkEmailQuota } from "./cost-guard"
import { performCompanyResearch } from "./research"
import { generateDraftsForCampaign } from "./campaign-drafts"
import { drainDueQueue } from "./scheduler"
import { enrichLeadsInBackground } from "./lead-enricher"

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
): Promise<{ queued: number; error?: string }> {
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

  if (!campaign || campaign.campaignLeads.length === 0) {
    return { queued: 0, error: "No leads in campaign" }
  }

  const canSend = await checkEmailQuota(userId)
  if (!canSend) return { queued: 0, error: "Daily email quota reached" }

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
        // Promote only the lowest step number draft to QUEUED. Keep others as DRAFT.
        const lowestStep = drafts[0].stepNumber
        for (const email of drafts) {
          if (email.stepNumber === lowestStep) {
            await prisma.email.update({
              where: { id: email.id },
              data: { status: "QUEUED", scheduledAt: now },
            })
            queued++
          } else {
            // Ensure follow-ups are DRAFT status until the prior step is sent
            await prisma.email.update({
              where: { id: email.id },
              data: { status: "DRAFT" },
            })
          }
        }
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
            userId:            user.id,
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
          status: (campaign.autonomous && step.stepNumber === 1) ? "QUEUED" : "DRAFT",
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
        if (step.stepNumber === 1) queued++
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

/**
 * Main campaign launch and autopilot execution pipeline.
 * Triggers background enrichment for unenriched leads (if autonomous/autopilot),
 * generates drafts, promotes Step 1 to QUEUED, and drains the sending queue.
 */
export async function runLaunchPipeline(
  campaignId: string,
  userId: string,
  customEmails?: { leadId: string; stepNumber: number; subject: string; body: string }[]
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignLeads: {
        include: { lead: true }
      }
    }
  })
  if (!campaign) return

  // 1. If autonomous/autopilot, trigger background enrichment for NEW leads that have not been enriched
  if (campaign.autonomous) {
    const unenrichedLeadIds = campaign.campaignLeads
      .filter(cl => cl.lead.status === "NEW" && cl.lead.contactsJson === null)
      .map(cl => cl.lead.id)

    if (unenrichedLeadIds.length > 0) {
      console.log(`[Launch Autopilot] Triggering background enrichment for ${unenrichedLeadIds.length} unenriched leads.`)
      enrichLeadsInBackground(unenrichedLeadIds).catch(err => {
        console.error("[Launch Autopilot] Background enrichment error:", err)
      })
    }
  }

  // 2. Process already-enriched leads and custom overrides
  await generateAndQueueEmails(campaignId, userId, undefined, customEmails)
  
  // 3. Generate drafts for remaining leads
  await generateDraftsForCampaign(campaignId, userId)
  
  // 4. Drain the SMTP queue
  await drainDueQueue()
}
