import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.caseStudy.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ["clientName", "industry", "nicheTags", "challenge", "solution", "results", "testimonialQuote", "metrics", "aiSummary"]) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (body.incrementUsage) {
    data.usageCount = { increment: 1 }
  }

  const caseStudy = await prisma.caseStudy.update({ where: { id }, data })
  return NextResponse.json(caseStudy)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.caseStudy.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.caseStudy.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
