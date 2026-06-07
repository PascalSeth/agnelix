import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { drainDueQueue } from "@/lib/scheduler"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      campaignLeads: {
        include: {
          lead: {
            include: {
              emails: { orderBy: { stepNumber: "asc" } },
              activities: { orderBy: { createdAt: "desc" }, take: 20 },
            },
          },
        },
      },
    },
  })

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Dynamic queue trigger — fires after response is sent.
  // This is the local-testing cron workaround: every time the UI polls the
  // campaign (every 4 s), any QUEUED or expired-draft emails are processed.
  after(async () => {
    try {
      await drainDueQueue()
    } catch (err) {
      console.error("[Campaign GET] Background queue error:", err)
    }
  })

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
      ...(body.status     !== undefined && { status:     body.status }),
      ...(body.name       !== undefined && { name:       body.name }),
      ...(body.autonomous !== undefined && { autonomous: body.autonomous }),
    },
  })

  return NextResponse.json({ updated: campaign.count })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const enrolledLeadIds = await prisma.campaignLead
    .findMany({ where: { campaignId: id }, select: { leadId: true } })
    .then((rows) => rows.map((r) => r.leadId))

  const sharedLeadIds = await prisma.campaignLead
    .findMany({
      where: { leadId: { in: enrolledLeadIds }, campaignId: { not: id } },
      select: { leadId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.leadId)))

  const exclusiveLeadIds = enrolledLeadIds.filter((lid) => !sharedLeadIds.has(lid))

  await prisma.$transaction([
    prisma.lead.deleteMany({ where: { id: { in: exclusiveLeadIds }, userId: session.user.id } }),
    prisma.campaign.deleteMany({ where: { id, userId: session.user.id } }),
  ])

  return NextResponse.json({ deleted: true, leadsDeleted: exclusiveLeadIds.length })
}
