import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const searches = await prisma.autoSearch.findMany({
    where: { userId: session.user.id },
    include: {
      sequence: { select: { name: true } },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(searches)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { query, location, sequenceId, campaignName, campaignId, frequency } = await req.json()

  if (!query?.trim() || !location?.trim() || !sequenceId) {
    return NextResponse.json({ error: "query, location, and sequenceId are required" }, { status: 400 })
  }
  if (!campaignId && !campaignName?.trim()) {
    return NextResponse.json({ error: "Provide either a campaignId or a campaignName" }, { status: 400 })
  }

  const search = await prisma.autoSearch.create({
    data: {
      userId: session.user.id,
      query: query.trim(),
      location: location.trim(),
      sequenceId,
      campaignName: campaignId ? "" : campaignName.trim(),
      campaignId: campaignId ?? null,
      frequency: frequency ?? "daily",
    },
    include: {
      sequence: { select: { name: true } },
      campaign: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(search)
}
