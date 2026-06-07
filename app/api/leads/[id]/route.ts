import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const lead = await prisma.lead.findFirst({
    where: { id, userId: session.user.id },
    include: { emails: { orderBy: { createdAt: "asc" } } },
  })

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(lead)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Fetch current state before update to detect status transitions
  const existing = body.status
    ? await prisma.lead.findFirst({
        where: { id, userId: session.user.id },
        select: { status: true, campaignLeads: { select: { campaignId: true } } },
      })
    : null

  const lead = await prisma.lead.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.firstName !== undefined && { firstName: body.firstName }),
      ...(body.lastName !== undefined && { lastName: body.lastName }),
      ...(body.contactsJson !== undefined && { contactsJson: body.contactsJson }),
      ...(body.auditJson !== undefined && { auditJson: body.auditJson }),
      ...(body.linkedinProfilesJson !== undefined && { linkedinProfilesJson: body.linkedinProfilesJson }),
      ...(body.recommendedApproach !== undefined && { recommendedApproach: body.recommendedApproach }),
    },
  })

  // Propagate status change → campaign reply/meeting counters
  if (body.status && existing && existing.status !== body.status) {
    const campaignIds = existing.campaignLeads.map((cl) => cl.campaignId)
    if (campaignIds.length > 0) {
      const ops: Promise<unknown>[] = []

      // Decrement counter for old status
      if (existing.status === "REPLIED")
        ops.push(prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { replies: { decrement: 1 } } }))
      else if (existing.status === "MEETING_BOOKED")
        ops.push(prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { meetings: { decrement: 1 } } }))

      // Increment counter for new status
      if (body.status === "REPLIED")
        ops.push(prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { replies: { increment: 1 } } }))
      else if (body.status === "MEETING_BOOKED")
        ops.push(prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { meetings: { increment: 1 } } }))

      if (ops.length) await Promise.all(ops)
    }
  }

  return NextResponse.json({ updated: lead.count })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const lead = await prisma.lead.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        campaignLeads: { select: { campaignId: true } },
      },
    })

    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const campaignIds = lead.campaignLeads.map(cl => cl.campaignId)

    await prisma.$transaction(async (tx) => {
      await tx.lead.delete({ where: { id: lead.id } })

      if (campaignIds.length > 0) {
        for (const campaignId of campaignIds) {
          const actualCount = await tx.campaignLead.count({ where: { campaignId } })
          await tx.campaign.update({
            where: { id: campaignId },
            data: { totalLeads: actualCount },
          })
        }
      }
    })

    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error("Delete error:", err)
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 })
  }
}
