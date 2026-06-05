import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId, leadId } = await params

  // 1. Verify campaign ownership and load sequence steps
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: session.user.id },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } }
    }
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  // 2. Find the lowest stepNumber DRAFT email for this lead in this campaign
  const activeDraft = await prisma.email.findFirst({
    where: { leadId, campaignId, status: "DRAFT" },
    orderBy: { stepNumber: "asc" }
  })

  if (!activeDraft) {
    return NextResponse.json({ error: "No drafts found to queue" }, { status: 400 })
  }

  const now = new Date()

  // 3. Promote only the active draft to QUEUED and schedule for now
  const updated = await prisma.email.update({
    where: { id: activeDraft.id },
    data: { status: "QUEUED", scheduledAt: now }
  })

  // 4. Update lead status if it was NEW
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (lead && lead.status === "NEW") {
    // Stage update (or keep as CONTACTED since it's queued)
  }

  return NextResponse.json({ success: true, email: updated })
}
