import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateDraftsForCampaign, countLeadsNeedingDrafts } from "@/lib/campaign-drafts"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: session.user.id },
    select: { id: true, autonomous: true },
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  const pending = await countLeadsNeedingDrafts(campaignId, session.user.id)
  if (pending === 0) {
    return NextResponse.json({ message: "All leads already have drafts", count: 0 })
  }

  after(async () => {
    try {
      await generateDraftsForCampaign(campaignId, session.user.id)
    } catch (err) {
      console.error("[BulkDrafts] Background error:", err)
    }
  })

  return NextResponse.json({
    success: true,
    message: `Generating drafts for ${pending} lead${pending !== 1 ? "s" : ""}`,
    count: pending,
  })
}
