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

  const { id: campaignId } = await params

  // Verify ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: scopeId },
    select: { id: true },
  })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Fetch all activities for leads enrolled in this campaign
  const activities = await prisma.activity.findMany({
    where: {
      lead: {
        campaignLeads: { some: { campaignId } },
      },
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, email: true, company: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(activities)
}
