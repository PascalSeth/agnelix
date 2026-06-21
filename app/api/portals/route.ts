import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const portals = await prisma.clientPortal.findMany({
    where: { userId: scopeId },
    include: { campaign: { select: { id: true, name: true, status: true, revenueAttributed: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(portals)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { campaignId, portalTemplate } = body
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 })

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId: scopeId } })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  const existing = await prisma.clientPortal.findUnique({ where: { campaignId } })
  if (existing) return NextResponse.json(existing)

  const user = await prisma.user.findUnique({ where: { id: scopeId }, select: { playbookType: true, agencyLogo: true, brandColor: true } })

  let enabledSections: string[] = ["overview", "reports", "proposals", "documents", "messages"]
  if (user?.playbookType) {
    const playbook = await prisma.playbook.findUnique({ where: { type: user.playbookType } })
    if (playbook) {
      try {
        const sections = JSON.parse(playbook.portalSections as string) as string[]
        if (Array.isArray(sections) && sections.length) enabledSections = sections
      } catch { /* keep default */ }
    }
  }

  const accessUrl = `${campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${randomBytes(3).toString("hex")}`
  const accessToken = randomBytes(24).toString("hex")

  const portal = await prisma.clientPortal.create({
    data: {
      userId: scopeId,
      campaignId,
      portalTemplate: portalTemplate || null,
      enabledSections,
      logoUrl: user?.agencyLogo || null,
      brandColor: user?.brandColor || null,
      accessUrl,
      accessToken,
    },
    include: { campaign: { select: { id: true, name: true, status: true, revenueAttributed: true } } },
  })

  const firstCampaignLead = await prisma.campaignLead.findFirst({ where: { campaignId }, select: { leadId: true } })
  if (firstCampaignLead) {
    await prisma.activity.create({
      data: {
        leadId: firstCampaignLead.leadId,
        type: "PORTAL_ACTIVATED",
        note: `Client portal created for campaign "${campaign.name}"`,
      },
    }).catch(() => {})
  }

  return NextResponse.json(portal)
}
