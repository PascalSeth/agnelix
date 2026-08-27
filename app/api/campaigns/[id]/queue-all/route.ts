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

  // 2. Find all DRAFT and FAILED emails in this campaign for eligible unreplied leads
  const drafts = await prisma.email.findMany({
    where: {
      campaignId,
      status: { in: ["DRAFT", "FAILED"] },
      lead: {
        status: { notIn: ["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED"] },
      },
    },
    orderBy: { stepNumber: "asc" },
  })

  if (drafts.length === 0) {
    return NextResponse.json({ error: "No eligible drafts found to queue" }, { status: 400 })
  }

  const now = new Date()

  // 3. Promote Step 1 (Day 1) messages to QUEUED for immediate send.
  // Follow-up messages (Step > 1) remain scheduled for their future timeframe (now + delayDays)
  // and will only send if the prospect has not replied when that date arrives.
  const updatedEmails = []
  for (const email of drafts) {
    if (email.stepNumber === 1) {
      const updated = await prisma.email.update({
        where: { id: email.id },
        data: { status: "QUEUED", scheduledAt: now },
      })
      updatedEmails.push(updated)
    } else {
      let daysOffset = 0
      const stepsUpToCurrent = campaign.sequence.steps.filter(s => s.stepNumber < email.stepNumber)
      for (const step of stepsUpToCurrent) {
        daysOffset += step.delayDays
      }
      const scheduledAt = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000)

      const updated = await prisma.email.update({
        where: { id: email.id },
        data: {
          status: campaign.autonomous ? "QUEUED" : "DRAFT",
          scheduledAt,
        },
      })
      updatedEmails.push(updated)
    }
  }

  // 4. Ensure campaign is ACTIVE
  if (campaign.status !== "ACTIVE") {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "ACTIVE", launchedAt: campaign.launchedAt ?? now },
    })
  }

  // 5. Trigger immediate SMTP send of Day 1 messages in the background
  after(async () => {
    try {
      await drainDueQueue()
    } catch (err) {
      console.error("[Queue All] Background send error:", err)
    }
  })

  return NextResponse.json({
    success: true,
    dayOneCount: updatedEmails.filter(e => e.stepNumber === 1).length,
    totalCount: updatedEmails.length,
    emails: updatedEmails,
  })
}
