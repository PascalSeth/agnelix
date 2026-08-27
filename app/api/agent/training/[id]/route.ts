import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import { invalidateTrainingCache } from "@/lib/ai-training"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.aiTrainingRule.findUnique({ where: { id } })
  if (!existing || existing.userId !== scopeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.enabled === "boolean") data.enabled = body.enabled
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim()
  if (typeof body.instruction === "string" && body.instruction.trim()) data.instruction = body.instruction.trim()

  const rule = await prisma.aiTrainingRule.update({ where: { id }, data })
  invalidateTrainingCache()
  return NextResponse.json(rule)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.aiTrainingRule.findUnique({ where: { id } })
  if (!existing || existing.userId !== scopeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.aiTrainingRule.delete({ where: { id } })
  invalidateTrainingCache()
  return NextResponse.json({ ok: true })
}
