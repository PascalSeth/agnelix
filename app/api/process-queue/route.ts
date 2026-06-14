/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { drainDueQueue } from "@/lib/scheduler"

/**
 * POST /api/process-queue
 * Manually drains all due QUEUED emails and auto-promotes expired follow-up drafts.
 * Can be called from the UI (stuck emails button) or hit directly in dev.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Reset FAILED emails for this user's leads to QUEUED so they can be retried
    const userLeads = await prisma.lead.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    })
    const leadIds = userLeads.map(l => l.id)

    if (leadIds.length > 0) {
      await prisma.email.updateMany({
        where: {
          status: "FAILED",
          leadId: { in: leadIds },
        },
        data: {
          status: "QUEUED",
          scheduledAt: new Date(),
        },
      })
    }

    const results = await drainDueQueue()
    return NextResponse.json({
      success: true,
      ...results,
      message: `Sent ${results.sent}, auto-promoted ${results.autoPromoted} follow-ups, failed ${results.failed}`,
    })
  } catch (err) {
    console.error("[Process Queue] Error:", err)
    return NextResponse.json({ error: "Queue processing failed" }, { status: 500 })
  }
}

// Also support GET for quick manual hits during dev (e.g. browser tab)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const results = await drainDueQueue()
    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error("[Process Queue GET] Error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
