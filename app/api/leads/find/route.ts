import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

function cleanDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "")
  } catch {
    return url.replace(/^www\./, "").split("/")[0] || ""
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { query, location, limit = 20 } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 })

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return NextResponse.json({ error: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set" }, { status: 500 })

  const textQuery = location?.trim()
    ? `${query.trim()} in ${location.trim()}`
    : query.trim()

  let allPlaces: Record<string, unknown>[] = []
  let pageToken: string | undefined = undefined
  const placesToFetch = Math.min(60, Math.max(1, limit))

  while (allPlaces.length < placesToFetch) {
    const pageSize = Math.min(20, placesToFetch - allPlaces.length)
    const requestBody: Record<string, unknown> = {
      textQuery,
      pageSize,
    }
    if (pageToken) {
      requestBody.pageToken = pageToken
    }

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
          "places.businessStatus",
          "places.photos",
          "places.reviews",
          "nextPageToken",
        ].join(","),
      },
      body: JSON.stringify(requestBody),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Places API error:", res.status, body)
      return NextResponse.json(
        { error: `Places API returned ${res.status}. Ensure "Places API (New)" is enabled in Google Cloud Console.` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const places = data.places ?? []
    allPlaces = [...allPlaces, ...places]

    if (places.length === 0 || !data.nextPageToken) {
      break
    }
    pageToken = data.nextPageToken
  }

  const slicedPlaces = allPlaces.slice(0, placesToFetch)

  const domains = slicedPlaces
    .map((p: { websiteUri?: string }) => p.websiteUri ? cleanDomain(p.websiteUri) : null)
    .filter(Boolean) as string[]

  const cacheRecords = domains.length > 0
    ? await prisma.domainContactCache.findMany({
        where: { domain: { in: domains } },
      })
    : []

  const cacheMap = new Map(cacheRecords.map(r => [r.domain, r]))

  const enrichedPlaces = slicedPlaces.map((p: { websiteUri?: string; [key: string]: unknown }) => {
    const domain = p.websiteUri ? cleanDomain(p.websiteUri) : null
    const cached = domain ? cacheMap.get(domain) : null
    return {
      ...p,
      cachedContacts: cached?.contactsJson ? JSON.parse(cached.contactsJson) : null,
      cachedProfiles: cached?.profilesJson ? JSON.parse(cached.profilesJson) : null,
    }
  })

  return NextResponse.json(enrichedPlaces)
}
