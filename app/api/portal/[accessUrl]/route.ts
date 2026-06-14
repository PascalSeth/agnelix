import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ accessUrl: string }> }) {
  const { accessUrl } = await params
  const token = req.nextUrl.searchParams.get("token")

  const portal = await prisma.clientPortal.findUnique({
    where: { accessUrl },
    include: {
      user: { select: { agencyName: true, agencyLogo: true, brandColor: true, domain: true } },
      campaign: {
        select: {
          id: true, name: true, status: true, totalLeads: true, emailsSent: true,
          emailsOpened: true, emailsClicked: true, replies: true, meetings: true, revenueAttributed: true,
        },
      },
      documents: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" } },
      reports: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!portal || !portal.isActive || portal.accessToken !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const proposals = await prisma.proposal.findMany({
    where: { campaignId: portal.campaignId },
    select: { id: true, title: true, status: true, totalValue: true, currency: true, createdAt: true, sentAt: true, signedAt: true },
    orderBy: { createdAt: "desc" },
  })

  await prisma.clientPortal.update({
    where: { id: portal.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  })

  const firstCampaignLead = await prisma.campaignLead.findFirst({ where: { campaignId: portal.campaignId }, select: { leadId: true } })
  if (firstCampaignLead) {
    await prisma.activity.create({
      data: { leadId: firstCampaignLead.leadId, type: "PORTAL_VIEWED", note: `Client viewed portal for "${portal.campaign.name}"` },
    }).catch(() => {})
  }

  return NextResponse.json({
    agency: portal.user,
    campaign: portal.campaign,
    enabledSections: portal.enabledSections,
    customSections: portal.customSections,
    logoUrl: portal.logoUrl,
    brandColor: portal.brandColor,
    documents: portal.documents,
    messages: portal.messages,
    reports: portal.reports,
    proposals,
  })
}
