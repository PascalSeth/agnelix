import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      campaignLeads: { include: { lead: { include: { emails: { orderBy: { stepNumber: "asc" } } } } } },
    },
  })

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(campaign)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const campaign = await prisma.campaign.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(body.status    !== undefined && { status:    body.status }),
      ...(body.name      !== undefined && { name:      body.name }),
      ...(body.autonomous !== undefined && { autonomous: body.autonomous }),
    },
  })

  return NextResponse.json({ updated: campaign.count })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Verify ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Find all leads enrolled in this campaign
  const enrolledLeadIds = await prisma.campaignLead
    .findMany({ where: { campaignId: id }, select: { leadId: true } })
    .then((rows) => rows.map((r) => r.leadId))

  // Of those, find leads also enrolled in OTHER campaigns (keep them)
  const sharedLeadIds = await prisma.campaignLead
    .findMany({
      where: { leadId: { in: enrolledLeadIds }, campaignId: { not: id } },
      select: { leadId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.leadId)))

  // Only delete leads that belong exclusively to this campaign
  const exclusiveLeadIds = enrolledLeadIds.filter((lid) => !sharedLeadIds.has(lid))

  await prisma.$transaction([
    // Delete exclusive leads — cascades their emails + campaign_lead rows
    prisma.lead.deleteMany({
      where: { id: { in: exclusiveLeadIds }, userId: session.user.id },
    }),
    // Delete the campaign — cascades remaining campaign_lead rows
    prisma.campaign.deleteMany({ where: { id, userId: session.user.id } }),
  ])

  return NextResponse.json({ deleted: true, leadsDeleted: exclusiveLeadIds.length })
}
