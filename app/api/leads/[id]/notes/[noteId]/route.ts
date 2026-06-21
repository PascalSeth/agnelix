import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id, noteId } = await params
  const lead = await prisma.lead.findFirst({ where: { id, userId: scopeId }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.note.deleteMany({ where: { id: noteId, leadId: id } })
  return NextResponse.json({ ok: true })
}
