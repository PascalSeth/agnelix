import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const proposal = await prisma.proposal.findFirst({
    where: { id, userId: session.user.id },
    include: { lead: { select: { id: true, firstName: true, lastName: true, company: true, email: true, industry: true } } },
  })
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(proposal)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.proposal.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.title !== undefined) data.title = body.title
  if (body.contentJson !== undefined) data.contentJson = body.contentJson
  if (body.executiveSummary !== undefined) data.executiveSummary = body.executiveSummary
  if (body.pricingPackages !== undefined) data.pricingPackages = body.pricingPackages
  if (body.totalValue !== undefined) data.totalValue = body.totalValue

  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === "SENT" && !existing.sentAt) data.sentAt = new Date()
    if (body.status === "VIEWED" && !existing.viewedAt) data.viewedAt = new Date()
    if (body.status === "SIGNED" && !existing.signedAt) data.signedAt = new Date()
  }

  const proposal = await prisma.proposal.update({ where: { id }, data })

  if (body.status && body.status !== existing.status) {
    const activityType =
      body.status === "SENT" ? "PROPOSAL_SENT" :
      body.status === "VIEWED" ? "PROPOSAL_VIEWED" :
      body.status === "SIGNED" ? "PROPOSAL_SIGNED" : null

    if (activityType) {
      await prisma.activity.create({
        data: { leadId: existing.leadId, type: activityType, note: `Proposal "${existing.title}" marked as ${body.status.toLowerCase()}` },
      })
    }

    if (body.status === "SENT") {
      await prisma.lead.update({ where: { id: existing.leadId }, data: { status: "PROPOSAL_SENT" } }).catch(() => {})
    }
    if (body.status === "SIGNED") {
      await prisma.lead.update({
        where: { id: existing.leadId },
        data: { status: "WON", dealValue: proposal.totalValue ?? undefined },
      }).catch(() => {})
      await prisma.activity.create({ data: { leadId: existing.leadId, type: "DEAL_WON", note: `Deal won via signed proposal "${existing.title}"` } })
    }
  }

  return NextResponse.json(proposal)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.proposal.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.proposal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
