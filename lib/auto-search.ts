/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { prisma } from "./db"
import { emailFromPlace } from "./utils"
import { generateAutoSearchQuery } from "./ai"
import { enrichLeadsInBackground } from "./lead-enricher"

interface Place {
  id: string
  displayName: { text: string }
  formattedAddress?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
}

export async function runAutoSearchForUser(
  userId: string,
  onProgress?: (msg: string) => void
): Promise<{ searches: number; leads: number; campaigns: number }> {
  const now = new Date()
  const results = { searches: 0, leads: 0, campaigns: 0 }

  const goal = await prisma.agentGoal.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, companyDesc: true } }
    }
  })

  if (!goal || !goal.user?.companyDesc) {
    onProgress?.("Error: Agency profile or description not found. Engine aborted.")
    return results
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      onProgress?.("Error: Google Maps API key not configured.")
      return results
    }

    const personaConfig = goal.personaConfig as any || {}
    
    onProgress?.(`Analyzing agency profile: "${goal.user.companyDesc.slice(0, 50)}..."`)
    
    // 1. Generate an AI strategy for this run
    const strategy = await generateAutoSearchQuery({
      companyDesc: goal.user.companyDesc,
      personaConfig: personaConfig,
      targetRegions: personaConfig.targetRegions,
    })

    if (!strategy?.query || !strategy?.location) {
      onProgress?.("Failed to generate a valid Maps query strategy.")
      return results
    }

    onProgress?.(`Generated strategy: "${strategy.query} in ${strategy.location}"`)
    onProgress?.("Querying Google Places API...")

    // 2. Fetch businesses from Google Places
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id", "places.displayName", "places.formattedAddress",
          "places.websiteUri", "places.nationalPhoneNumber",
          "places.rating", "places.userRatingCount",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery: `${strategy.query} in ${strategy.location}`,
        maxResultCount: 20,
      }),
    })

    if (!res.ok) {
      onProgress?.(`Google Places API returned status ${res.status}`)
      return results
    }

    const data = await res.json()
    const places: Place[] = data.places ?? []
    if (places.length === 0) {
      onProgress?.("No places found for this query.")
      return results
    }

    onProgress?.(`Found ${places.length} businesses. Filtering out existing leads...`)

    // 3. Filter out businesses already imported for this user
    const existingIds = await prisma.lead.findMany({
      where: { userId: goal.user.id, googlePlaceId: { in: places.map(p => p.id) } },
      select: { googlePlaceId: true },
    }).then(rows => new Set(rows.map(r => r.googlePlaceId)))

    const newPlaces = places.filter(p => !existingIds.has(p.id))
    if (newPlaces.length === 0) {
      onProgress?.("All found businesses were already in your database. Mission accomplished.")
      return results
    }

    const leadsPerCycle = Math.max(1, Math.min(20, Number(personaConfig.leadsPerCycle) || 1))
    const selectedPlaces = newPlaces.slice(0, leadsPerCycle)

    onProgress?.(`Found ${newPlaces.length} new leads. Processing ${selectedPlaces.length} this cycle (limit: ${leadsPerCycle})...`)

    // 4. Create leads
    const created = await prisma.$transaction(
      selectedPlaces.map(p =>
        prisma.lead.create({
          data: {
            userId: goal.user!.id,
            email: emailFromPlace(p),
            company: p.displayName.text,
            website: p.websiteUri ?? null,
            companyDesc: p.formattedAddress ?? null,
            googlePlaceId: p.id,
            notes: [
              p.formattedAddress,
              p.nationalPhoneNumber,
              p.rating != null ? `Rating: ${p.rating}/5 (${p.userRatingCount} reviews)` : null,
            ].filter(Boolean).join("\n"),
          },
        })
      )
    )

    // 5. Get default sequence
    const sequence = await prisma.sequence.findFirst({
      where: { userId: goal.user.id },
      orderBy: { createdAt: "desc" }
    })

    if (!sequence) {
      onProgress?.("Warning: No active email sequence found. Leads imported, but campaign not created.")
      return results
    }

    // 6. Create a new autonomous campaign
    const label = now.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const campaignName = `${strategy.query} in ${strategy.location}`

    onProgress?.(`Creating Campaign "${campaignName} – ${label}" and attaching sequence...`)

    const campaign = await prisma.campaign.create({
      data: {
        userId: goal.user.id,
        name: `${campaignName} – ${label}`,
        sequenceId: sequence.id,
        autonomous: true,
        totalLeads: created.length,
        campaignLeads: {
          createMany: {
            data: created.map(l => ({ leadId: l.id })),
            skipDuplicates: true,
          },
        },
      },
    })

    results.campaigns++

    onProgress?.(`Campaign created. Enriching ${created.length} new leads and drafting personalized emails in the background...`)

    // 7. Enrich leads and auto-generate emails
    enrichLeadsInBackground(created.map(l => l.id)).catch(err => {
      console.error(`Background enrichment failed for auto-search:`, err)
    })

    onProgress?.("All leads processed and queued! Autonomous Engine run complete.")

    results.searches++
    results.leads += created.length
  } catch (err) {
    onProgress?.(`Critical Error: ${err instanceof Error ? err.message : String(err)}`)
    console.error(`Autonomous Engine failed for user ${goal.userId}:`, err)
  }

  return results
}

export async function runAutoSearches(): Promise<{ searches: number; leads: number; campaigns: number }> {
  const results = { searches: 0, leads: 0, campaigns: 0 }

  // Find all users who have the autonomous engine enabled
  const agentGoals = await prisma.agentGoal.findMany({
    where: { autoProspectingEnabled: true },
    select: { userId: true }
  })

  for (const goal of agentGoals) {
    const res = await runAutoSearchForUser(goal.userId)
    results.searches += res.searches
    results.leads += res.leads
    results.campaigns += res.campaigns
  }

  return results
}
