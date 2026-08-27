import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateReportNarrative } from "@/lib/ai"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const reports = await prisma.clientReport.findMany({
    where: { userId: scopeId },
    include: { campaign: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { campaignId, periodStart, periodEnd } = body
  if (!campaignId || !periodStart || !periodEnd) {
    return NextResponse.json({ error: "campaignId, periodStart and periodEnd are required" }, { status: 400 })
  }

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId: scopeId } })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  const user = await prisma.user.findUnique({ where: { id: scopeId }, select: { playbookType: true, companyDesc: true } })

  const openRate = campaign.emailsSent > 0 ? Math.round((campaign.emailsOpened / campaign.emailsSent) * 1000) / 10 : 0
  const clickRate = campaign.emailsSent > 0 ? Math.round((campaign.emailsClicked / campaign.emailsSent) * 1000) / 10 : 0

  const metrics: Record<string, number | string> = {
    leads_contacted: campaign.totalLeads,
    emails_sent: campaign.emailsSent,
    open_rate: `${openRate}%`,
    click_rate: `${clickRate}%`,
    replies: campaign.replies,
    meetings_booked: campaign.meetings,
  }
  if (campaign.revenueAttributed) metrics.revenue_attributed = campaign.revenueAttributed

  let industry = "general business"
  if (user?.playbookType) {
    const playbook = await prisma.playbook.findUnique({ where: { type: user.playbookType } })
    if (playbook) industry = playbook.name
  }

  const periodLabel = `${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`

  const aiNarrative = await generateReportNarrative({
    campaignName: campaign.name,
    industry,
    metrics,
    periodLabel,
    clientGoal: campaign.clientGoal,
  })

  const portal = await prisma.clientPortal.findUnique({ where: { campaignId } })

  const report = await prisma.clientReport.create({
    data: {
      userId: scopeId,
      campaignId,
      portalId: portal?.id ?? null,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      metricsJson: metrics,
      aiNarrative,
      status: "DRAFT",
    },
    include: { campaign: { select: { id: true, name: true, status: true } } },
  })

  return NextResponse.json(report)
}
