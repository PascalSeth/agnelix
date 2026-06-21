import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const lead = await prisma.lead.findFirst({ where: { id, userId: scopeId }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const notes = await prisma.note.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" } })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const lead = await prisma.lead.findFirst({ where: { id, userId: scopeId }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  if (!body.content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } })

  const note = await prisma.note.create({
    data: { leadId: id, content: body.content.trim(), createdBy: user?.name || "You" },
  })

  return NextResponse.json(note)
}
