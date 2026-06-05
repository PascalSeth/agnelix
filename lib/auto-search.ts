import { prisma } from "./db"
import { emailFromPlace } from "./utils"
import { generateAndQueueEmails } from "./campaign-sender"

interface Place {
  id: string
  displayName: { text: string }
  formattedAddress?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
}

export async function runAutoSearches(): Promise<{ searches: number; leads: number; campaigns: number }> {
  const now = new Date()
  const results = { searches: 0, leads: 0, campaigns: 0 }

  const searches = await prisma.autoSearch.findMany({
    where: {
      enabled: true,
      OR: [
        { lastRunAt: null },
        { frequency: "daily",  lastRunAt: { lte: new Date(now.getTime() - 23 * 3600 * 1000) } },
        { frequency: "weekly", lastRunAt: { lte: new Date(now.getTime() - 6 * 24 * 3600 * 1000) } },
      ],
    },
  })

  for (const search of searches) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) continue

      // Fetch businesses from Google Places
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
          textQuery: `${search.query} in ${search.location}`,
          maxResultCount: 20,
        }),
      })

      if (!res.ok) continue

      const data = await res.json()
      const places: Place[] = data.places ?? []
      if (places.length === 0) {
        await prisma.autoSearch.update({ where: { id: search.id }, data: { lastRunAt: now } })
        continue
      }

      // Filter out businesses already imported for this user
      const existingIds = await prisma.lead.findMany({
        where: { userId: search.userId, googlePlaceId: { in: places.map(p => p.id) } },
        select: { googlePlaceId: true },
      }).then(rows => new Set(rows.map(r => r.googlePlaceId)))

      const newPlaces = places.filter(p => !existingIds.has(p.id))

      if (newPlaces.length === 0) {
        await prisma.autoSearch.update({ where: { id: search.id }, data: { lastRunAt: now } })
        continue
      }

      // Create leads
      const created = await prisma.$transaction(
        newPlaces.map(p =>
          prisma.lead.create({
            data: {
              userId: search.userId,
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

      let campaignId: string

      if (search.campaignId) {
        // User pinned a specific existing campaign — always append there
        await prisma.campaignLead.createMany({
          data: created.map(l => ({ campaignId: search.campaignId!, leadId: l.id })),
          skipDuplicates: true,
        })
        await prisma.campaign.update({
          where: { id: search.campaignId },
          data: { totalLeads: { increment: created.length } },
        })
        campaignId = search.campaignId
      } else {
        // Find an existing DRAFT/ACTIVE campaign by name prefix + sequence
        const existingCampaign = await prisma.campaign.findFirst({
          where: {
            userId: search.userId,
            sequenceId: search.sequenceId,
            name: { startsWith: search.campaignName },
            status: { in: ["DRAFT", "ACTIVE"] },
          },
          orderBy: { createdAt: "desc" },
        })

        if (existingCampaign) {
          await prisma.campaignLead.createMany({
            data: created.map(l => ({ campaignId: existingCampaign.id, leadId: l.id })),
            skipDuplicates: true,
          })
          await prisma.campaign.update({
            where: { id: existingCampaign.id },
            data: { totalLeads: { increment: created.length } },
          })
          campaignId = existingCampaign.id
        } else {
          // Create a new autonomous campaign
          const label = now.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          const campaign = await prisma.campaign.create({
            data: {
              userId: search.userId,
              name: `${search.campaignName} – ${label}`,
              sequenceId: search.sequenceId,
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
          campaignId = campaign.id
          results.campaigns++
        }
      }

      // Auto-generate and queue emails for new leads
      await generateAndQueueEmails(
        campaignId,
        search.userId,
        created.map(l => l.id)
      )

      await prisma.autoSearch.update({
        where: { id: search.id },
        data: { lastRunAt: now, totalImported: { increment: created.length } },
      })

      results.searches++
      results.leads += created.length
    } catch (err) {
      console.error(`AutoSearch ${search.id} failed:`, err)
    }
  }

  return results
}
