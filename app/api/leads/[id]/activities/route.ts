import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const lead = await prisma.lead.findFirst({ where: { id, userId: session.user.id }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const activities = await prisma.activity.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(activities)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { note } = await req.json()

  const lead = await prisma.lead.findFirst({ where: { id, userId: session.user.id }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const activity = await prisma.activity.create({
    data: { leadId: id, type: "NOTE_ADDED", note: note?.trim() || "" },
  })

  return NextResponse.json(activity)
}
