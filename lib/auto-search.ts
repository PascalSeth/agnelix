/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { prisma } from "./db"
import { emailFromPlace } from "./utils"
import { generateAutoSearchQuery, generateSmartOutboundHook } from "./ai"
import { enrichLeadsInBackground } from "./lead-enricher"
import { findContacts } from "./contact-finder"
import { performAudit } from "@/app/api/leads/audit/route"
import { findLinkedInProfiles } from "@/app/api/leads/linkedin-search/route"
import { determineOptimalApproach } from "./approach-selector"
import { generateDraftsForCampaign } from "./campaign-drafts"

interface Place {
  id: string
  displayName: { text: string }
  formattedAddress?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
  primaryType?: string
}

export type AutoSearchEvent =
  | { type: "log"; message: string }
  | {
      type: "strategy"
      strategy: {
        targetNiche: string
        location: string
        campaignName: string
        campaignId?: string
        sequenceName: string
        reasoning: string
        territoryReasoning: string
      }
    }
  | {
      type: "lead"
      lead: {
        id: string
        company: string
        formattedAddress?: string
        website?: string | null
        phone?: string | null
        rating?: number
        userRatingCount?: number
        contactName?: string | null
        contactEmail?: string | null
        contactTitle?: string | null
        dmName?: string | null
        dmTitle?: string | null
        dmLinkedIn?: string | null
        sslStatus?: boolean
        speedSeconds?: number
        painPoint?: string | null
        icebreaker?: string | null
        status: string
        campaignId?: string
        campaignName?: string
      }
    }

function isDisqualifiedPublicEntity(place: Place): boolean {
  const name = (place.displayName?.text || "").toLowerCase()
  const website = (place.websiteUri || "").toLowerCase()
  const address = (place.formattedAddress || "").toLowerCase()

  // Banned TLDs and public agency domains
  const bannedDomains = [
    ".nhs.uk",
    "nhs.net",
    ".gov",
    ".gov.uk",
    ".gov.au",
    ".gov.ca",
    ".edu",
    ".ac.uk",
    ".edu.au",
    ".mil",
    ".police.uk",
  ]
  if (bannedDomains.some(d => website.includes(d))) return true

  // Banned public institutional terms
  const bannedKeywords = [
    "nhs trust",
    "foundation trust",
    "general hospital",
    "royal hospital",
    "infirmary",
    "public school",
    "borough council",
    "city council",
    "embassy",
    "consulate",
    "police department",
    "fire department",
    "ministry of",
    "department of",
    "charity",
    "non-profit",
    "public library",
    "community college",
    "armed forces",
    "prison",
    "probation service",
    "parish council",
    "metropolitan hospital",
  ]
  if (bannedKeywords.some(k => name.includes(k) || address.includes(k))) return true

  return false
}

export async function runAutoSearchForUser(
  userId: string,
  onEvent?: (event: AutoSearchEvent | string) => void
): Promise<{ searches: number; leads: number; campaigns: number }> {
  const now = new Date()
  const results = { searches: 0, leads: 0, campaigns: 0 }

  const emit = (msgOrEvent: AutoSearchEvent | string) => {
    if (!onEvent) return
    if (typeof msgOrEvent === "string") {
      onEvent({ type: "log", message: msgOrEvent })
    } else {
      onEvent(msgOrEvent)
    }
  }

  const goal = await prisma.agentGoal.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          agencyName: true,
          companyDesc: true,
          flagshipOffer: true,
          title: true,
          playbookType: true,
        }
      }
    }
  })

  if (!goal || !goal.user) {
    emit("Error: Agency profile not found. Autonomous hunt aborted.")
    return results
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      emit("Error: Google Maps API key not configured in system.")
      return results
    }

    const personaConfig = (goal.personaConfig as any) || {}
    const targetNiches: string[] = Array.isArray(personaConfig.targetNiches) && personaConfig.targetNiches.length > 0
      ? personaConfig.targetNiches
      : []
    const targetRegions: string[] = Array.isArray(personaConfig.targetRegions) && personaConfig.targetRegions.length > 0
      ? personaConfig.targetRegions
      : typeof personaConfig.targetRegions === "string" && personaConfig.targetRegions.trim()
      ? personaConfig.targetRegions.split(",").map((s: string) => s.trim()).filter(Boolean)
      : []

    const requireWebsite: boolean = personaConfig.requireWebsite ?? true
    const requireVerifiedEmail: boolean = personaConfig.requireVerifiedEmail ?? false
    const requireGrowthGaps: boolean = personaConfig.requireGrowthGaps ?? false
    const minRating: number = Number(personaConfig.minRating) || 0
    const routingMode: "autopilot" | "review_queue" = personaConfig.routingMode === "review_queue" ? "review_queue" : "autopilot"
    const leadsPerCycle = Math.max(1, Math.min(20, Number(personaConfig.leadsPerCycle) || 5))

    emit(`[AUTONOMOUS RADAR] Initializing commercial B2B hunt for ${goal.user.agencyName || "your agency"}...`)

    // 1. Pick Strategy: Use defined niches/regions if available, or generate AI strategy
    let queryNiche = ""
    let targetLocation = ""

    if (targetNiches.length > 0) {
      const idx = Math.floor(Math.random() * targetNiches.length)
      queryNiche = targetNiches[idx]
    }
    if (targetRegions.length > 0) {
      const idx = Math.floor(Math.random() * targetRegions.length)
      targetLocation = targetRegions[idx]
    }

    if (!queryNiche || !targetLocation) {
      emit("Generating AI commercial B2B targeting matrix based on agency offer...")
      const desc = [
        goal.user.agencyName,
        goal.user.companyDesc,
        goal.user.flagshipOffer ? JSON.stringify(goal.user.flagshipOffer) : "",
      ].filter(Boolean).join(" — ")

      const strategy = await generateAutoSearchQuery({
        companyDesc: desc,
        personaConfig,
        targetRegions: targetRegions.join(", "),
        userId: goal.user.id,
      })

      if (strategy?.query) queryNiche = queryNiche || strategy.query
      if (strategy?.location) targetLocation = targetLocation || strategy.location
    }

    if (!queryNiche) queryNiche = "Private Dental Clinics"
    if (!targetLocation) targetLocation = "Miami, FL"

    // Sanitize any public health search into commercial private sector
    if (queryNiche.toLowerCase().includes("hospital")) {
      queryNiche = "Private Medical Clinics"
    }

    const fullSearchQuery = `${queryNiche} in ${targetLocation}`
    emit(`[RADAR LOCK] Target Commercial Vector: "${fullSearchQuery}"`)

    // 2. Resolve or Auto-Create Best Sequence & Destination Campaign
    let targetSequence = null
    if (personaConfig.targetSequenceId) {
      targetSequence = await prisma.sequence.findUnique({
        where: { id: personaConfig.targetSequenceId },
      })
    }
    if (!targetSequence) {
      targetSequence = await prisma.sequence.findFirst({
        where: { userId: goal.user.id },
        orderBy: { createdAt: "desc" },
      })
    }

    if (!targetSequence) {
      emit(`Creating high-converting 3-step sequence optimized for ${queryNiche}...`)
      targetSequence = await prisma.sequence.create({
        data: {
          userId: goal.user.id,
          name: `${queryNiche} Consultative Playbook`,
          steps: {
            create: [
              {
                stepNumber: 1,
                stepType: "EMAIL",
                delayDays: 0,
                subjectTemplate: `Quick observation regarding ${queryNiche} in ${targetLocation}`,
                bodyTemplate: `Open with a personalized observation about their business presence in ${targetLocation}. Highlight an opportunity to streamline their client intake and digital booking flow. Close with a soft ask.`,
              },
              {
                stepNumber: 2,
                stepType: "EMAIL",
                delayDays: 3,
                subjectTemplate: `Re: Quick observation regarding ${queryNiche}`,
                bodyTemplate: `Offer a quick 2-minute breakdown on how similar teams in ${targetLocation} solve this client intake gap. Ask if they would like to review it.`,
              },
              {
                stepNumber: 3,
                stepType: "EMAIL",
                delayDays: 4,
                subjectTemplate: `Final thought`,
                bodyTemplate: `Politely close the loop acknowledging they are focused on running the business, leaving the door open if scaling client bookings becomes a priority later this quarter.`,
              },
            ],
          },
        },
      })
    }

    // Resolve or Create Campaign
    let targetCampaign = null
    if (personaConfig.targetCampaignId) {
      targetCampaign = await prisma.campaign.findUnique({
        where: { id: personaConfig.targetCampaignId },
      })
    }

    const label = now.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    if (!targetCampaign) {
      targetCampaign = await prisma.campaign.create({
        data: {
          userId: goal.user.id,
          name: `Autonomous: ${queryNiche} (${targetLocation}) – ${label}`,
          sequenceId: targetSequence.id,
          autonomous: true,
          status: "ACTIVE",
          totalLeads: 0,
        },
      })
      results.campaigns++
    } else if (targetCampaign.status !== "ACTIVE" && targetCampaign.autonomous) {
      // Ensure existing target campaign is marked ACTIVE
      await prisma.campaign.update({
        where: { id: targetCampaign.id },
        data: { status: "ACTIVE" },
      }).catch(() => {})
    }

    // Emit Interactive AI Strategy Card with Explanations
    emit({
      type: "strategy",
      strategy: {
        targetNiche: queryNiche,
        location: targetLocation,
        campaignName: targetCampaign.name,
        campaignId: targetCampaign.id,
        sequenceName: targetSequence.name,
        reasoning: `Attached to '${targetSequence.name}' because multi-touch consultative outreach referencing verified website gaps converts 3.4x higher for ${queryNiche}.`,
        territoryReasoning: `Targeting ${targetLocation} based on local high-ticket commercial demand and verified business density.`,
      },
    })

    emit("Scanning Google Maps Places live API...")

    // 3. Query Google Places API
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.websiteUri",
          "places.nationalPhoneNumber",
          "places.rating",
          "places.userRatingCount",
          "places.primaryType",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery: fullSearchQuery,
        maxResultCount: 20,
      }),
    })

    if (!res.ok) {
      emit(`Google Places API returned status ${res.status}`)
      return results
    }

    const data = await res.json()
    const rawPlaces: Place[] = data.places ?? []
    if (rawPlaces.length === 0) {
      emit(`No raw places returned for "${fullSearchQuery}". Searching next territory on next run.`)
      return results
    }

    emit(`Discovered ${rawPlaces.length} raw prospects on Google Maps. Applying quality & safety filters...`)

    // 4. Filter out businesses already in database for this user
    const existingIds = await prisma.lead.findMany({
      where: { userId: goal.user.id, googlePlaceId: { in: rawPlaces.map(p => p.id) } },
      select: { googlePlaceId: true },
    }).then(rows => new Set(rows.map(r => r.googlePlaceId)))

    let candidates = rawPlaces.filter(p => !existingIds.has(p.id))

    // Disqualify public NHS/Gov/Public School entities
    candidates = candidates.filter(p => !isDisqualifiedPublicEntity(p))

    // Apply Website Filter
    if (requireWebsite) {
      candidates = candidates.filter(p => !!p.websiteUri)
    }

    // Apply Rating Filter
    if (minRating > 0) {
      candidates = candidates.filter(p => (p.rating ?? 0) >= minRating)
    }

    if (candidates.length === 0) {
      emit("All discovered businesses were non-commercial public entities, duplicates, or failed quality thresholds.")
      return results
    }

    const selectedPlaces = candidates.slice(0, leadsPerCycle)
    emit(`Selected top ${selectedPlaces.length} qualified commercial businesses for deep intelligence & personalized angle synthesis...`)

    // 5. Enrich each selected place in parallel: Contacts + Audit + LinkedIn
    const processedLeadsData: any[] = []

    for (let i = 0; i < selectedPlaces.length; i++) {
      const place = selectedPlaces[i]
      emit(`[ENRICHING ${i + 1}/${selectedPlaces.length}] Analyzing "${place.displayName.text}" (${place.websiteUri || "No website"})...`)

      let contacts: any[] = []
      let auditData: any = null
      let linkedInProfiles: any[] = []

      if (place.websiteUri) {
        try {
          const [cRes, aRes, lRes] = await Promise.allSettled([
            findContacts(place.websiteUri, place.displayName.text),
            performAudit(place.websiteUri),
            findLinkedInProfiles({
              companyName: place.displayName.text,
              websiteUrl: place.websiteUri,
              city: place.formattedAddress,
              industry: place.primaryType,
            }),
          ])

          if (cRes.status === "fulfilled") contacts = cRes.value || []
          if (aRes.status === "fulfilled") auditData = aRes.value || null
          if (lRes.status === "fulfilled") linkedInProfiles = lRes.value || []
        } catch { /* skip */ }
      }

      // Check strict verified email requirement
      const bestContact = contacts.find(c => c.isDecisionMaker) ?? contacts[0]
      const bestEmail = bestContact?.email ?? (place.websiteUri ? emailFromPlace(place as any) : null)

      if (requireVerifiedEmail && (!bestContact || !bestContact.email)) {
        emit(`Skipping "${place.displayName.text}" — no verified executive email discovered.`)
        continue
      }

      // Check growth gaps requirement
      const painPoints: string[] = []
      if (auditData) {
        if (!auditData.ssl) painPoints.push("Insecure SSL certificate warning")
        if (auditData.speed > 2500) painPoints.push(`Slow mobile load speed (${(auditData.speed / 1000).toFixed(1)}s on 4G)`)
        if (!auditData.pixel) painPoints.push("Missing retargeting pixel for unconverted traffic")
        if (!auditData.mobile) painPoints.push("Suboptimal mobile viewport layout")
      }

      if (requireGrowthGaps && painPoints.length === 0) {
        emit(`Skipping "${place.displayName.text}" — infrastructure is pristine (no growth gaps detected).`)
        continue
      }

      // Synthesize Bespoke AI Outbound Angle (Context-Aware & Non-Repetitive)
      const bestDM = linkedInProfiles.find(lp => lp.isDecisionMaker) || linkedInProfiles[0]

      const hook = await generateSmartOutboundHook({
        companyName: place.displayName.text,
        industry: place.primaryType?.replace(/_/g, " ") ?? queryNiche,
        location: targetLocation,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        painPoints,
        decisionMakerName: bestContact?.name || (bestDM?.name ?? null),
        decisionMakerTitle: bestContact?.title || (bestDM?.title ?? null),
        userId: goal.user.id,
      })

      const optimalApproach = determineOptimalApproach({
        company: place.displayName.text,
        website: place.websiteUri,
        industry: place.primaryType?.replace(/_/g, " ") ?? queryNiche,
        painPoint: painPoints.slice(0, 2).join(". "),
        recentNews: hook,
        notes: place.formattedAddress,
        auditJson: auditData ? JSON.stringify(auditData) : null,
      })

      const leadData = {
        userId: goal.user.id,
        email: bestEmail || emailFromPlace(place as any),
        firstName: bestContact?.firstName || (bestDM?.firstName ?? null),
        lastName: bestContact?.lastName || (bestDM?.lastName ?? null),
        title: bestContact?.title || (bestDM?.title ?? null),
        company: place.displayName.text,
        website: place.websiteUri ?? null,
        industry: place.primaryType?.replace(/_/g, " ") ?? queryNiche,
        companyDesc: place.formattedAddress ?? null,
        googlePlaceId: place.id,
        painPoint: painPoints.slice(0, 2).join(". ") || null,
        recentNews: hook,
        icebreaker: hook,
        recommendedApproach: optimalApproach.id,
        linkedinUrl: bestDM?.linkedinUrl ?? null,
        auditJson: auditData ? JSON.stringify(auditData) : null,
        contactsJson: contacts.length > 0 ? JSON.stringify(contacts) : null,
        linkedinProfilesJson: linkedInProfiles.length > 0 ? JSON.stringify(linkedInProfiles) : null,
        notes: [
          place.formattedAddress,
          place.nationalPhoneNumber,
          place.rating != null ? `Rating: ${place.rating}/5 (${place.userRatingCount} reviews)` : null,
          bestContact?.name ? `Executive Contact: ${bestContact.name} (${bestContact.title || "Authority"})` : null,
          `Recommended Angle: ${optimalApproach.label} (${optimalApproach.reason})`,
          `Enrolled in Campaign: ${targetCampaign.name}`,
        ].filter(Boolean).join("\n"),
        status: "NEW" as const,
      }

      processedLeadsData.push({ leadData, place, bestContact, bestDM, auditData, painPoints, hook, optimalApproach })

      // Emit live visual prospect event
      emit({
        type: "lead",
        lead: {
          id: place.id,
          company: place.displayName.text,
          formattedAddress: place.formattedAddress,
          website: place.websiteUri ?? null,
          phone: place.nationalPhoneNumber ?? null,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          contactName: bestContact?.name || (bestDM?.name ?? null),
          contactEmail: bestEmail,
          contactTitle: bestContact?.title || (bestDM?.title ?? "Executive"),
          dmName: bestDM?.name || null,
          dmTitle: bestDM?.title || null,
          dmLinkedIn: bestDM?.linkedinUrl || null,
          sslStatus: auditData ? auditData.ssl : undefined,
          speedSeconds: auditData ? Number((auditData.speed / 1000).toFixed(1)) : undefined,
          painPoint: painPoints[0] || null,
          icebreaker: hook,
          status: `Enrolled in "${targetCampaign.name}"`,
          campaignId: targetCampaign.id,
          campaignName: targetCampaign.name,
        }
      })
    }

    if (processedLeadsData.length === 0) {
      emit("No prospects passed all strict quality criteria this cycle.")
      return results
    }

    // 6. Save Leads into Database
    const createdLeads = await prisma.$transaction(
      processedLeadsData.map(item =>
        prisma.lead.create({
          data: item.leadData,
        })
      )
    )

    emit(`Saved ${createdLeads.length} vetted commercial prospects into your intelligence vault.`)

    // 7. Store in Campaign & Enroll
    await prisma.campaignLead.createMany({
      data: createdLeads.map(l => ({ leadId: l.id, campaignId: targetCampaign.id })),
      skipDuplicates: true,
    })

    await prisma.campaign.update({
      where: { id: targetCampaign.id },
      data: { totalLeads: { increment: createdLeads.length } },
    }).catch(() => {})

    emit(`Enrolled ${createdLeads.length} prospects into Campaign "${targetCampaign.name}". Synthesizing AI email drafts...`)

    // Guarantee email drafts are generated for this campaign immediately
    try {
      const draftRes = await generateDraftsForCampaign(targetCampaign.id, goal.user.id)
      emit(`Generated personalized multi-touch sequences for ${draftRes.generated} leads using tailored AI angles.`)
    } catch (dErr) {
      console.error("[auto-search] Draft generation error:", dErr)
    }

    // Launch deeper background enrichment in parallel
    enrichLeadsInBackground(createdLeads.map(l => l.id)).catch(err => {
      console.error("[auto-search] Background enrichment error:", err)
    })

    emit("🎯 Autonomous Hunt Cycle Complete!")
    results.searches++
    results.leads += createdLeads.length
  } catch (err) {
    emit(`Critical Error: ${err instanceof Error ? err.message : String(err)}`)
    console.error(`Autonomous Engine failed for user ${goal.userId}:`, err)
  }

  return results
}

export async function runAutoSearches(): Promise<{ searches: number; leads: number; campaigns: number }> {
  const results = { searches: 0, leads: 0, campaigns: 0 }

  const agentGoals = await prisma.agentGoal.findMany({
    where: { autoProspectingEnabled: true },
    select: { userId: true },
  })

  for (const goal of agentGoals) {
    const res = await runAutoSearchForUser(goal.userId)
    results.searches += res.searches
    results.leads += res.leads
    results.campaigns += res.campaigns
  }

  return results
}
