import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { searchParams } = new URL(req.url)
  const leadId = searchParams.get("leadId")

  const where: Record<string, unknown> = { userId: scopeId }
  if (leadId) where.leadId = leadId

  const records = await prisma.clientFinancials.findMany({
    where,
    include: { lead: { select: { id: true, company: true, email: true, status: true } } },
    orderBy: { period: "desc" },
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { leadId, period, revenue, costs, burnRate, runway, currency, notes } = body

  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 })
  }
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: scopeId }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  if (!period || isNaN(Date.parse(period))) {
    return NextResponse.json({ error: "period must be a valid date" }, { status: 400 })
  }
  const revenueNum = Number(revenue)
  const costsNum = Number(costs)
  if (!isFinite(revenueNum) || !isFinite(costsNum)) {
    return NextResponse.json({ error: "revenue and costs must be numbers" }, { status: 400 })
  }

  // Normalise period to the first day of the month
  const p = new Date(period)
  const normalizedPeriod = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), 1))
  const grossMargin = revenueNum > 0 ? ((revenueNum - costsNum) / revenueNum) * 100 : 0

  const record = await prisma.clientFinancials.upsert({
    where: { leadId_period: { leadId, period: normalizedPeriod } },
    update: {
      revenue: revenueNum,
      costs: costsNum,
      grossMargin,
      burnRate: burnRate != null && isFinite(Number(burnRate)) ? Number(burnRate) : null,
      runway: runway != null && isFinite(Number(runway)) ? Math.round(Number(runway)) : null,
      currency: (typeof currency === "string" && currency ? currency : undefined) as any,
      notes: typeof notes === "string" ? notes : undefined,
    },
    create: {
      userId: scopeId,
      leadId,
      period: normalizedPeriod,
      revenue: revenueNum,
      costs: costsNum,
      grossMargin,
      burnRate: burnRate != null && isFinite(Number(burnRate)) ? Number(burnRate) : null,
      runway: runway != null && isFinite(Number(runway)) ? Math.round(Number(runway)) : null,
      currency: (typeof currency === "string" && currency ? currency : "USD") as any,
      notes: typeof notes === "string" ? notes : undefined,
    },
  })

  return NextResponse.json(record)
}
