import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { drainDueQueue } from "@/lib/scheduler"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id: campaignId } = await params

  // 1. Verify campaign ownership and load sequence steps
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: scopeId },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
    },
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  // 2. Find all DRAFT and FAILED emails in this campaign
  const drafts = await prisma.email.findMany({
    where: {
      campaignId,
      status: { in: ["DRAFT", "FAILED"] },
    },
    orderBy: { stepNumber: "asc" },
  })

  if (drafts.length === 0) {
    return NextResponse.json({ error: "No drafts or failed emails found to queue" }, { status: 400 })
  }

  const now = new Date()

  // 3. Select only the lowest step number draft for each lead
  const activeDraftsByLead = new Map<string, typeof drafts[0]>()
  for (const email of drafts) {
    if (!activeDraftsByLead.has(email.leadId)) {
      activeDraftsByLead.set(email.leadId, email)
    }
  }

  // 4. Promote active drafts to QUEUED and schedule for now
  const updatedEmails = []
  for (const email of activeDraftsByLead.values()) {
    const updated = await prisma.email.update({
      where: { id: email.id },
      data: { status: "QUEUED", scheduledAt: now },
    })
    updatedEmails.push(updated)
  }

  // 5. Ensure campaign is ACTIVE
  if (campaign.status !== "ACTIVE") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "ACTIVE", launchedAt: campaign.launchedAt ?? now },
    })
  }

  // 6. Trigger SMTP sends in the background immediately — no cron needed
  after(async () => {
    try {
      await drainDueQueue()
    } catch (err) {
      console.error("[Queue All] Background send error:", err)
    }
  })

  return NextResponse.json({ success: true, count: updatedEmails.length, emails: updatedEmails })
}
