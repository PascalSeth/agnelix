import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { sendEmailImmediately } from "@/lib/scheduler"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId, leadId } = await params

  // 1. Verify campaign ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: session.user.id },
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  // 2. Find the lowest stepNumber DRAFT email for this lead in this campaign
  const activeDraft = await prisma.email.findFirst({
    where: { leadId, campaignId, status: "DRAFT" },
    orderBy: { stepNumber: "asc" },
  })

  if (!activeDraft) {
    return NextResponse.json({ error: "No drafts found to send" }, { status: 400 })
  }

  // 3. Send immediately via SMTP
  // Update status to QUEUED first so sendEmailImmediately accepts it
  await prisma.email.update({
    where: { id: activeDraft.id },
    data: { status: "QUEUED", scheduledAt: new Date() },
  })

  const success = await sendEmailImmediately(activeDraft.id)

  if (!success) {
    return NextResponse.json(
      { error: "Failed to send email. Check your SMTP settings or email quota." },
      { status: 500 }
    )
  }

  // 4. Refetch the updated email record to return to the UI
  const updatedEmail = await prisma.email.findUnique({ where: { id: activeDraft.id } })

  return NextResponse.json({ success: true, email: updatedEmail })
}
