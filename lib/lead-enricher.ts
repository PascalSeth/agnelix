/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db"
import { findContacts } from "@/lib/contact-finder"
import { findLinkedInProfiles } from "@/app/api/leads/linkedin-search/route"
import { performAudit } from "@/app/api/leads/audit/route"
import { performAiResearch } from "@/app/api/leads/research/route"
import { findBuyingSignals } from "@/lib/buying-signals"
import { performSocialAudit } from "@/lib/social-audit"
import { generateEmail, generateLinkedInMessage } from "@/lib/ai"
import { performCompanyResearch } from "@/lib/research"
import { drainDueQueue } from "@/lib/scheduler"
import { determineOptimalApproach } from "@/lib/approach-selector"
import { getValidProspectFirstName } from "@/lib/name-sanitizer"

// Simple helper to parse email domain
function emailFromPlaceWebsite(website: string | null, company: string | null): string {
  if (website) {
    try {
      const hostname = new URL(website.startsWith("http") ? website : `https://${website}`).hostname
      const domain = hostname.replace(/^www\./, "")
      return `info@${domain}`
    } catch { /* skip */ }
  }
  const cleanComp = (company || "lead").toLowerCase().replace(/[^a-z0-9]/g, "")
  return `contact@${cleanComp}.com`
}

/**
 * After enriching a lead, auto-generates email drafts for all campaigns
 * the lead is enrolled in (if not already generated).
 */
async function autoDraftForLead(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return

  const enrollments = await prisma.campaignLead.findMany({
    where: { leadId },
    include: {
      campaign: {
        include: {
          sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
          user: true,
        },
      },
    },
  })

  for (const enrollment of enrollments) {
    const campaign = enrollment.campaign
    const steps = campaign.sequence.steps
    if (steps.length === 0) continue

    // Skip if emails already exist
    const existingCount = await prisma.email.count({
      where: { leadId, campaignId: campaign.id },
    })
    if (existingCount > 0) continue

    try {
      const user = campaign.user
      const approachInfo = determineOptimalApproach(lead)
      const approach = approachInfo.id

      if (!lead.recommendedApproach) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { recommendedApproach: approach },
        }).catch(() => {})
      }

      // Parse cached audit data
      let auditData: Record<string, unknown> | null = null
      if (lead.auditJson) {
        try { auditData = JSON.parse(lead.auditJson) } catch { /* ignore */ }
      }

      // Social audit summary + flagship offer + campaign goal feed the AI prompts
      let socialAuditSummary: string | null = null
      if (lead.socialAuditJson) {
        try { socialAuditSummary = (JSON.parse(lead.socialAuditJson) as { summary?: string }).summary ?? null } catch { /* ignore */ }
      }
      const flagshipOffer = user.flagshipOffer as { name: string; transformation: string; deliverable: string } | null

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

        // WAIT steps are pure delays — no email, no task
        if (step.stepType === "WAIT") continue

        // LinkedIn steps have no API integration — surface them as manual
        // "copy & send" tasks in the inbox instead of silently emailing.
        if (step.stepType === "LINKEDIN_CONNECT" || step.stepType === "LINKEDIN_MESSAGE") {
          const alreadyCreated = await prisma.pendingAction.findFirst({
            where: {
              leadId,
              type: "LINKEDIN_TASK",
              metadata: { path: ["campaignId"], equals: campaign.id },
            },
            select: { id: true },
          })
          if (alreadyCreated) continue

          const message = await generateLinkedInMessage({
            stepType: step.stepType,
            guideline: step.bodyTemplate || step.aiPrompt || "",
            senderName: user.name || "Your Name",
            senderCompany: user.agencyName || user.companyName || "Your Company",
            senderCompanyDesc: user.companyDesc || "We help businesses grow.",
            prospectFirstName: getValidProspectFirstName(lead.firstName, lead.email) || "",
            prospectCompany: lead.company || "their company",
            industry: lead.industry || "business",
            companyResearch,
            userId: user.id,
          })

          await prisma.pendingAction.create({
            data: {
              userId: user.id,
              leadId,
              type: "LINKEDIN_TASK",
              intent: "LINKEDIN_OUTREACH",
              draftSubject: step.stepType === "LINKEDIN_CONNECT"
                ? `LinkedIn connection request — ${lead.company || lead.email}`
                : `LinkedIn message — ${lead.company || lead.email}`,
              draftBody: message,
              metadata: {
                campaignId: campaign.id,
                stepNumber: step.stepNumber,
                stepType: step.stepType,
                dueAt: scheduledAt.toISOString(),
                linkedinUrl: lead.linkedinUrl,
                manualTask: true,
              },
              riskLevel: "LOW",
              confidence: "HIGH",
            },
          })
          await prisma.activity.create({
            data: {
              leadId,
              type: "LINKEDIN_TASK_GENERATED",
              note: `Step ${step.stepNumber}: LinkedIn ${step.stepType === "LINKEDIN_CONNECT" ? "connection note" : "message"} drafted — copy & send it from your inbox tasks`,
              metadata: { campaignId: campaign.id, stepNumber: step.stepNumber },
            },
          })
          continue
        }

        const generated = await generateEmail(
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
            auditData:           auditData as any,
            companyResearch,
            subjectTemplate:     step.subjectTemplate,
            bodyTemplate:        step.bodyTemplate,
            previousEmailSubject: prevSubject || null,
            previousEmailBody:   prevBody || null,
            calendarLink:        user.calendarLink,
            flagshipOffer,
            clientGoal:          campaign.clientGoal,
            socialAuditSummary,
          },
          step.stepNumber,
        )

        prevSubject = generated.subject
        prevBody = generated.body

        await prisma.email.create({
          data: {
            leadId,
            campaignId: campaign.id,
            subject:    generated.subject,
            body:       generated.body,
            aiPrompt:   `${approachInfo.label} (${approach}) — ${approachInfo.reason}`,
            stepNumber: step.stepNumber,
            status:     (campaign.autonomous && step.stepNumber === 1) ? "QUEUED" : "DRAFT",
            scheduledAt,
          },
        })
      }

      await prisma.activity.create({
        data: {
          leadId,
          type: "BATTLE_CARD_GENERATED",
          note: `AI drafts auto-generated after enrichment using "${approach}" approach${campaign.autonomous ? " — queued for sending" : " — awaiting your approval"}`,
        },
      })
    } catch (err) {
      console.error(`[Enricher] Auto-draft failed for lead ${leadId} in campaign ${campaign.id}:`, err)
    }
  }

  // Trigger queue processing so QUEUED emails go out immediately
  try {
    await drainDueQueue()
  } catch (err) {
    console.error(`[Enricher] Queue trigger failed after enriching lead ${leadId}:`, err)
  }
}

// Hard cap on how long enrichment for a single lead can run before we give up
// on it and move on to the next lead, so one slow lead doesn't stall the batch.
const ENRICHMENT_TIMEOUT_MS = 90_000

class EnrichmentTimeoutError extends Error {
  constructor(leadId: string, ms: number) {
    super(`Enrichment for lead ${leadId} timed out after ${ms}ms`)
    this.name = "EnrichmentTimeoutError"
  }
}

// In-memory registry of lead IDs for which enrichment has been cancelled by the user
export const cancelledEnrichments = new Set<string>()

/**
 * Checks if the enrichment for a given lead ID has been cancelled by the user.
 */
async function isEnrichmentCancelled(id: string): Promise<boolean> {
  return cancelledEnrichments.has(id)
}

function withTimeout<T>(promise: Promise<T>, ms: number, leadId: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new EnrichmentTimeoutError(leadId, ms)), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

async function enrichSingleLead(id: string, localNeighbors: boolean) {
  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) {
    console.log(`[Background Enricher] Lead ${id} not found in database. Skipping.`)
    return
  }

  // Check cancellation before step 1
  if (await isEnrichmentCancelled(id)) {
    console.log(`[Background Enricher] Lead ${id} enrichment cancelled. Aborting.`)
    return
  }

  // 1. Contact Search
  let contacts: Awaited<ReturnType<typeof findContacts>> = []
  if (lead.website) {
    try {
      contacts = await findContacts(lead.website, lead.company || "", localNeighbors, false)
    } catch (err) {
      console.error(`[Background Enricher] Contact search failed for lead ${id}:`, err)
    }
  }

  // Check cancellation before step 2
  if (await isEnrichmentCancelled(id)) {
    console.log(`[Background Enricher] Lead ${id} enrichment cancelled. Aborting.`)
    return
  }

  // 2. LinkedIn Search
  let linkedinProfiles: Awaited<ReturnType<typeof findLinkedInProfiles>> = []
  try {
    linkedinProfiles = await findLinkedInProfiles({
      companyName: lead.company || "",
      city: lead.notes || "",
      industry: lead.industry || "",
      websiteUrl: lead.website || "",
      localNeighbors,
      bypassCache: false,
    })
  } catch (err) {
    console.error(`[Background Enricher] LinkedIn search failed for lead ${id}:`, err)
  }

  // Check cancellation before step 3
  if (await isEnrichmentCancelled(id)) {
    console.log(`[Background Enricher] Lead ${id} enrichment cancelled. Aborting.`)
    return
  }

  // 3. Website Audit
  let audit: Awaited<ReturnType<typeof performAudit>> | null = null
  if (lead.website) {
    try {
      audit = await performAudit(lead.website)
    } catch (err) {
      console.error(`[Background Enricher] Website audit failed for lead ${id}:`, err)
    }
  }

  // Check cancellation before step 4
  if (await isEnrichmentCancelled(id)) {
    console.log(`[Background Enricher] Lead ${id} enrichment cancelled. Aborting.`)
    return
  }

  // 4. AI Research
  let research: Awaited<ReturnType<typeof performAiResearch>> | null = null
  try {
    research = await performAiResearch({
      websiteUrl: lead.website || "",
      businessName: lead.company || "",
      industry: lead.industry || "",
      address: lead.notes || "",
    })
  } catch (err) {
    console.error(`[Background Enricher] AI research failed for lead ${id}:`, err)
  }

  // Check cancellation before step 4b
  if (await isEnrichmentCancelled(id)) {
    console.log(`[Background Enricher] Lead ${id} enrichment cancelled. Aborting.`)
    return
  }

  // 4b. Buying Signals (news, leadership changes, hiring, funding etc.)
  let buyingSignals: Awaited<ReturnType<typeof findBuyingSignals>> | null = null
  try {
    buyingSignals = await findBuyingSignals(lead.company || "", lead.website)
  } catch (err) {
    console.error(`[Background Enricher] Buying signals search failed for lead ${id}:`, err)
  }

  // 4c. Social content audit — which platforms they're on, gaps, public mentions.
  // Mention search (extra API call) only runs for social media playbook contexts.
  let socialAudit: Awaited<ReturnType<typeof performSocialAudit>> | null = null
  if (lead.website) {
    try {
      const [owner, socialCampaignCount] = await Promise.all([
        prisma.user.findUnique({ where: { id: lead.userId }, select: { playbookType: true } }),
        prisma.campaignLead.count({
          where: { leadId: id, campaign: { playbookType: "social_media" } },
        }),
      ])
      const isSocialContext = owner?.playbookType === "social_media" || socialCampaignCount > 0
      socialAudit = await performSocialAudit(lead.website, lead.company || "", { includeMentions: isSocialContext })
    } catch (err) {
      console.error(`[Background Enricher] Social audit failed for lead ${id}:`, err)
    }
  }

  // Check cancellation before step 5 (combining and writing results)
  if (await isEnrichmentCancelled(id)) {
    console.log(`[Background Enricher] Lead ${id} enrichment cancelled. Aborting.`)
    return
  }

  // 5. Combine and calculate fields
  const bestContact = contacts.find(c => c.isDecisionMaker) ?? contacts[0]
  const email = bestContact?.email ?? lead.email ?? emailFromPlaceWebsite(lead.website, lead.company)
  const firstName = bestContact?.firstName ?? lead.firstName ?? null
  const lastName = bestContact?.lastName ?? lead.lastName ?? null
  const title = bestContact?.title ?? lead.title ?? null

  const painPoints: string[] = []
  if (audit) {
    if (!audit.ssl)             painPoints.push("No SSL certificate")
    if (audit.speed > 3000)     painPoints.push(`Slow website (${(audit.speed / 1000).toFixed(1)}s)`)
    if (!audit.pixel)           painPoints.push("No Facebook pixel")
    if (!audit.mobile)          painPoints.push("Not mobile optimised")
    if (!audit.googleAnalytics) painPoints.push("No Google Analytics")
  }

  const linkedinUrl = linkedinProfiles?.find((lp) => lp.name?.toLowerCase() === bestContact?.name?.toLowerCase())?.linkedinUrl
    || linkedinProfiles?.[0]?.linkedinUrl
    || lead.linkedinUrl
    || null

  const signalSummary = buyingSignals && buyingSignals.signals.length > 0
    ? buyingSignals.summary
    : null

  const recentNews = [
    signalSummary,
    research?.outreachAngles?.join(". ")
      || (research?.positioning ? `Positioning: ${research.positioning}` : null),
  ].filter(Boolean).join(" ") || lead.recentNews || null

  const companyDesc = research?.whatTheyDo || lead.companyDesc

  const recommendedApproachText = research?.recommendedApproach
    ? `Recommended AI Approach: ${research.recommendedApproach.label} (${research.recommendedApproach.reason})`
    : null

  const existingNotes = lead.notes || ""
  const newNotes = [
    existingNotes,
    bestContact?.name ? `Contact: ${bestContact.name}${bestContact.title ? ` (${bestContact.title})` : ""}` : null,
    recommendedApproachText,
  ].filter(Boolean).join("\n")

  const optimalApproach = determineOptimalApproach({ ...lead, auditJson: audit ? JSON.stringify(audit) : lead.auditJson, painPoint: painPoints.join(". ") })

  // Update lead
  await prisma.lead.update({
    where: { id },
    data: {
      email,
      firstName,
      lastName,
      title,
      linkedinUrl,
      recentNews,
      companyDesc,
      painPoint: painPoints.slice(0, 3).join(". ") || lead.painPoint || null,
      notes: newNotes,
      auditJson: audit ? JSON.stringify(audit) : lead.auditJson,
      contactsJson: contacts ? JSON.stringify(contacts) : lead.contactsJson,
      linkedinProfilesJson: linkedinProfiles ? JSON.stringify(linkedinProfiles) : lead.linkedinProfilesJson,
      recommendedApproach: research?.recommendedApproach?.id || optimalApproach.id,
      buyingSignalsJson: buyingSignals ? JSON.stringify(buyingSignals) : lead.buyingSignalsJson,
      signalsCheckedAt: buyingSignals ? new Date() : lead.signalsCheckedAt,
      socialAuditJson: socialAudit ? JSON.stringify(socialAudit) : lead.socialAuditJson,
    },
  })

  console.log(`[Background Enricher] Successfully enriched lead ${id} (${lead.company})`)

  // 6. Auto-generate drafts after enrichment and trigger queue
  await autoDraftForLead(id)
  console.log(`[Background Enricher] Auto-drafted emails for lead ${id}`)
}

export async function enrichLeadsInBackground(leadIds: string[], localNeighbors = false) {
  console.log(`[Background Enricher] Starting background enrichment for ${leadIds.length} leads...`)

  for (let i = 0; i < leadIds.length; i++) {
    const id = leadIds[i]
    try {
      console.log(`[Background Enricher] [${i + 1}/${leadIds.length}] Processing lead ${id}...`)

      // Check if cancelled before starting
      if (await isEnrichmentCancelled(id)) {
        console.log(`[Background Enricher] Lead ${id} was cancelled before starting. Skipping.`)
        // Clean up in-memory registry if present
        cancelledEnrichments.delete(id)
        continue
      }

      await withTimeout(enrichSingleLead(id, localNeighbors), ENRICHMENT_TIMEOUT_MS, id)
    } catch (err) {
      if (err instanceof EnrichmentTimeoutError) {
        console.warn(`[Background Enricher] ${err.message} — skipping to next lead.`)
        await prisma.activity.create({
          data: {
            leadId: id,
            type: "NOTE_ADDED",
            note: `Enrichment took longer than ${ENRICHMENT_TIMEOUT_MS / 1000}s and was skipped — some research may be incomplete. You can re-run enrichment from the lead's Intel tab.`,
          },
        }).catch(() => {})
      } else {
        console.error(`[Background Enricher] Failed to enrich lead ${id}:`, err)
      }
    } finally {
      // Always ensure we clean up the in-memory cancellation set
      cancelledEnrichments.delete(id)
    }

    // Cooling delay between leads
    if (i + 1 < leadIds.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log(`[Background Enricher] Finished background enrichment for ${leadIds.length} leads.`)
}
