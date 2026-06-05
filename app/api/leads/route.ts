import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status")
  const q = searchParams.get("q")

  const leads = await prisma.lead.findMany({
    where: {
      userId: session.user.id,
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return NextResponse.json(leads)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Support three formats:
  //   [lead, ...]                          — plain array (CSV upload)
  //   { leads: [...], campaignId }         — add to existing campaign
  //   { leads: [...], newCampaign: { name, sequenceId } }  — create campaign then add
  const isWrapped = !Array.isArray(body) && (body.leads || body.campaignId || body.newCampaign)
  const leadsData: Record<string, string>[] = isWrapped
    ? (body.leads ?? [])
    : Array.isArray(body) ? body : [body]
  const campaignId: string | undefined = isWrapped ? body.campaignId : undefined
  const newCampaign: { name: string; sequenceId: string } | undefined = isWrapped ? body.newCampaign : undefined

  const created = await prisma.$transaction(
    leadsData.map((lead) =>
      prisma.lead.create({
        data: {
          userId: session.user.id,
          email: lead.email.toLowerCase().trim(),
          firstName: lead.firstName || null,
          lastName: lead.lastName || null,
          title: lead.title || null,
          company: lead.company || null,
          companyDesc: lead.companyDesc || null,
          industry: lead.industry || null,
          website: lead.website || null,
          googlePlaceId: lead.googlePlaceId || null,
          notes: lead.notes || null,
        },
      })
    )
  )

  let finalCampaignId: string | undefined = campaignId

  if (newCampaign?.name && newCampaign?.sequenceId && created.length > 0) {
    const campaign = await prisma.campaign.create({
      data: {
        userId: session.user.id,
        name: newCampaign.name.trim(),
        sequenceId: newCampaign.sequenceId,
        totalLeads: created.length,
        campaignLeads: {
          createMany: {
            data: created.map((l) => ({ leadId: l.id })),
            skipDuplicates: true,
          },
        },
      },
    })
    finalCampaignId = campaign.id
  } else if (campaignId && created.length > 0) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: session.user.id },
      select: { id: true },
    })
    if (campaign) {
      await prisma.campaignLead.createMany({
        data: created.map((l) => ({ campaignId, leadId: l.id })),
        skipDuplicates: true,
      })
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { totalLeads: { increment: created.length } },
      })
    }
  }

  return NextResponse.json({ count: created.length, ids: created.map((l) => l.id), campaignId: finalCampaignId })
}
