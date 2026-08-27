import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.clientFinancials.findFirst({ where: { id, userId: scopeId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.clientFinancials.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
