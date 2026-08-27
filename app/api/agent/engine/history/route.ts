import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

/**
 * GET /api/agent/engine/history
 *
 * Returns the last N leads from autonomous campaigns for the current user,
 * so the radar feed can be rehydrated on page refresh.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50)

  // Find autonomous campaign leads ordered by most recent enrollment
  const campaignLeads = await prisma.campaignLead.findMany({
    where: {
      campaign: {
        userId: scopeId,
        autonomous: true,
      },
    },
    orderBy: { enrolledAt: "desc" },
    take: limit,
    include: {
      campaign: {
        select: { id: true, name: true, createdAt: true },
      },
      lead: {
        select: {
          id: true,
          company: true,
          companyDesc: true,
          website: true,
          email: true,
          firstName: true,
          lastName: true,
          title: true,
          industry: true,
          icebreaker: true,
          painPoint: true,
          notes: true,
          auditJson: true,
          createdAt: true,
        },
      },
    },
  })

  // Also get the most recent autonomous campaign for context
  const lastCampaign = await prisma.campaign.findFirst({
    where: { userId: scopeId, autonomous: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      totalLeads: true,
      sequence: { select: { id: true, name: true } },
    },
  })

  // Shape into radar-compatible lead format
  const leads = campaignLeads.map(cl => {
    let sslStatus: boolean | undefined
    let speedSeconds: number | undefined
    try {
      const audit = cl.lead.auditJson ? JSON.parse(cl.lead.auditJson) : null
      if (audit) {
        sslStatus = audit.ssl
        speedSeconds = audit.speed ? Number((audit.speed / 1000).toFixed(1)) : undefined
      }
    } catch { /* skip */ }

    // Parse address from notes (saved as multiline string)
    const notes = cl.lead.notes || ""
    const addressMatch = notes.split("\n")[0] || cl.lead.companyDesc || ""

    return {
      id: cl.lead.id,
      company: cl.lead.company || "Unknown",
      formattedAddress: addressMatch,
      website: cl.lead.website,
      phone: null,
      rating: undefined,
      userRatingCount: undefined,
      contactName: [cl.lead.firstName, cl.lead.lastName].filter(Boolean).join(" ") || null,
      contactEmail: cl.lead.email,
      contactTitle: cl.lead.title || "Decision Maker",
      sslStatus,
      speedSeconds,
      painPoint: cl.lead.painPoint,
      icebreaker: cl.lead.icebreaker,
      status: `Enrolled in "${cl.campaign.name}"`,
      campaignId: cl.campaign.id,
      campaignName: cl.campaign.name,
      enrolledAt: cl.enrolledAt,
    }
  })

  return NextResponse.json({
    leads,
    lastCampaign,
    total: leads.length,
  })
}
