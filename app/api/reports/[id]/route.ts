import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const report = await prisma.clientReport.findFirst({
    where: { id, userId: scopeId },
    include: { campaign: { select: { id: true, name: true, status: true } } },
  })
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(report)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.clientReport.findFirst({ where: { id, userId: scopeId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ["aiNarrative", "metricsJson", "reportTemplate"]) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  if (body.status && body.status !== existing.status) {
    data.status = body.status
    if (body.status === "SENT") data.sentAt = new Date()
  }

  const report = await prisma.clientReport.update({ where: { id }, data })

  if (body.status === "SENT" && existing.status !== "SENT") {
    const firstCampaignLead = await prisma.campaignLead.findFirst({ where: { campaignId: existing.campaignId }, select: { leadId: true } })
    if (firstCampaignLead) {
      await prisma.activity.create({
        data: { leadId: firstCampaignLead.leadId, type: "REPORT_SENT", note: `Client report sent for campaign` },
      }).catch(() => {})
    }
  }

  return NextResponse.json(report)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.clientReport.findFirst({ where: { id, userId: scopeId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.clientReport.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
