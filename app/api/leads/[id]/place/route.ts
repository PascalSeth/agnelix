import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) return NextResponse.json({ error: "API Key not set" }, { status: 500 })

  try {
    const lead = await prisma.lead.findUnique({
      where: { id, userId: scopeId },
      select: { googlePlaceId: true, company: true, website: true }
    })

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

    let placeId = lead.googlePlaceId

    // If no placeId, try to find it by name
    if (!placeId && lead.company) {
      const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id"
        },
        body: JSON.stringify({ textQuery: lead.company, maxResultCount: 1 })
      })
      const searchData = await searchRes.json()
      placeId = searchData.places?.[0]?.id
    }

    if (!placeId) return NextResponse.json({ error: "Could not link to Google Maps" }, { status: 404 })

    // Fetch full place details
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "id",
          "displayName",
          "formattedAddress",
          "websiteUri",
          "nationalPhoneNumber",
          "rating",
          "userRatingCount",
          "businessStatus",
          "photos",
          "reviews"
        ].join(",")
      }
    })

    if (!res.ok) throw new Error("Failed to fetch place details")
    const place = await res.json()
    return NextResponse.json(place)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}
