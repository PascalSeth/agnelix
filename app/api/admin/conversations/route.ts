import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"

/**
 * Superadmin Live Conversation Inspector API
 * Returns real multi-agency pending actions, approvals, rejections,
 * and replies so admins can audit output quality and 1-click patch issues.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") // "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100)

  const whereClause: { status?: "PENDING" | "APPROVED" | "REJECTED" | "AUTO_EXECUTED" } = {}
  if (status && status !== "ALL") {
    if (status === "APPROVED") {
      // @ts-expect-error in filter
      whereClause.status = { in: ["APPROVED", "AUTO_EXECUTED"] }
    } else if (status === "PENDING" || status === "REJECTED") {
      whereClause.status = status
    }
  }

  try {
    const actions = await prisma.pendingAction.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            agencyName: true,
            name: true,
            email: true,
            playbookType: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            industry: true,
            status: true,
          },
        },
        reply: {
          select: {
            id: true,
            body: true,
            fromEmail: true,
            receivedAt: true,
          },
        },
      },
    })

    const items = actions.map(a => ({
      id: a.id,
      type: a.type,
      intent: a.intent,
      status: a.status,
      confidence: a.confidence,
      draftSubject: a.draftSubject,
      draftBody: a.draftBody,
      createdAt: a.createdAt,
      executedAt: a.executedAt,
      agency: {
        id: a.user.id,
        name: a.user.agencyName || a.user.name || "Agency",
        email: a.user.email,
        playbookType: a.user.playbookType,
      },
      lead: {
        id: a.lead.id,
        name: `${a.lead.firstName || ""} ${a.lead.lastName || ""}`.trim() || "Lead",
        company: a.lead.company || "Company",
        industry: a.lead.industry || "General",
        status: a.lead.status,
      },
      prospectReply: a.reply?.body ?? null,
    }))

    return NextResponse.json({
      items,
      totalCount: items.length,
    })
  } catch (err) {
    console.error("[admin/conversations] failed:", err)
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
  }
}
