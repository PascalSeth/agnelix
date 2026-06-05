import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId } = await params

  // 1. Verify campaign ownership and load sequence steps
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: session.user.id },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } }
    }
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  // 2. Find all DRAFT emails in this campaign
  const drafts = await prisma.email.findMany({
    where: { campaignId, status: "DRAFT" },
    orderBy: { stepNumber: "asc" }
  })

  if (drafts.length === 0) {
    return NextResponse.json({ error: "No drafts found to queue" }, { status: 400 })
  }

  const now = new Date()

  // 3. Select only the lowest step number draft for each lead
  const activeDraftsByLead = new Map<string, typeof drafts[0]>()
  for (const email of drafts) {
    if (!activeDraftsByLead.has(email.leadId)) {
      activeDraftsByLead.set(email.leadId, email)
    }
  }

  const updatedEmails = []
  for (const email of activeDraftsByLead.values()) {
    const updated = await prisma.email.update({
      where: { id: email.id },
      data: { status: "QUEUED", scheduledAt: now }
    })
    updatedEmails.push(updated)
  }

  // 4. Ensure campaign is set to ACTIVE status if it wasn't already
  if (campaign.status !== "ACTIVE") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "ACTIVE", launchedAt: campaign.launchedAt ?? now }
    })
  }

  return NextResponse.json({ success: true, count: updatedEmails.length, emails: updatedEmails })
}
