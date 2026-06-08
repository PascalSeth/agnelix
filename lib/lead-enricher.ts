import { prisma } from "@/lib/db"
import { findContacts } from "@/lib/contact-finder"
import { findLinkedInProfiles } from "@/app/api/leads/linkedin-search/route"
import { performAudit } from "@/app/api/leads/audit/route"
import { performAiResearch } from "@/app/api/leads/research/route"
import { generateEmail } from "@/lib/ai"
import { performCompanyResearch } from "@/lib/research"
import { drainDueQueue } from "@/lib/scheduler"

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
      const approach = lead.recommendedApproach || "competitor"

      // Parse cached audit data
      let auditData: Record<string, unknown> | null = null
      if (lead.auditJson) {
        try { auditData = JSON.parse(lead.auditJson) } catch { /* ignore */ }
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

        const generated = await generateEmail(
          {
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
            auditData:           auditData as any,
            companyResearch,
            subjectTemplate:     step.subjectTemplate,
            bodyTemplate:        step.bodyTemplate,
            previousEmailSubject: prevSubject || null,
            previousEmailBody:   prevBody || null,
            calendarLink:        user.calendarLink,
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
            aiPrompt:   `${approach} approach (auto-drafted after enrichment)`,
            stepNumber: step.stepNumber,
            status:     campaign.autonomous ? "QUEUED" : "DRAFT",
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

export async function enrichLeadsInBackground(leadIds: string[], localNeighbors = false) {
  console.log(`[Background Enricher] Starting background enrichment for ${leadIds.length} leads...`)

  for (let i = 0; i < leadIds.length; i++) {
    const id = leadIds[i]
    try {
      console.log(`[Background Enricher] [${i + 1}/${leadIds.length}] Processing lead ${id}...`)
      const lead = await prisma.lead.findUnique({ where: { id } })
      if (!lead) {
        console.log(`[Background Enricher] Lead ${id} not found in database. Skipping.`)
        continue
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

      // 3. Website Audit
      let audit: Awaited<ReturnType<typeof performAudit>> | null = null
      if (lead.website) {
        try {
          audit = await performAudit(lead.website)
        } catch (err) {
          console.error(`[Background Enricher] Website audit failed for lead ${id}:`, err)
        }
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

      const recentNews = research?.outreachAngles?.join(". ")
        || (research?.positioning ? `Positioning: ${research.positioning}` : null)
        || lead.recentNews
        || null

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
          recommendedApproach: research?.recommendedApproach?.id || lead.recommendedApproach,
        },
      })

      console.log(`[Background Enricher] Successfully enriched lead ${id} (${lead.company})`)

      // 6. Auto-generate drafts after enrichment and trigger queue
      await autoDraftForLead(id)
      console.log(`[Background Enricher] Auto-drafted emails for lead ${id}`)
    } catch (err) {
      console.error(`[Background Enricher] Failed to enrich lead ${id}:`, err)
    }

    // Cooling delay between leads
    if (i + 1 < leadIds.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log(`[Background Enricher] Finished background enrichment for ${leadIds.length} leads.`)
}
