import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const campaigns = await prisma.campaign.findMany({
    where: { userId: scopeId },
    include: { sequence: { include: { steps: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(campaigns)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { name, sequenceId, leadIds, autonomous, playbookType, clientGoal } = body

  if (!name || !sequenceId) {
    return NextResponse.json({ error: "name and sequenceId are required" }, { status: 400 })
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId: scopeId,
      name,
      sequenceId,
      autonomous: !!autonomous,
      playbookType: typeof playbookType === "string" && playbookType ? playbookType : undefined,
      clientGoal: typeof clientGoal === "string" && clientGoal ? clientGoal : undefined,
      totalLeads: leadIds?.length || 0,
      campaignLeads: leadIds?.length
        ? { createMany: { data: (leadIds as string[]).map(leadId => ({ leadId })), skipDuplicates: true } }
        : undefined,
    },
    include: { sequence: { include: { steps: true } } },
  })

  return NextResponse.json(campaign)
}
