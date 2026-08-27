import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import { invalidateTrainingCache } from "@/lib/ai-training"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.aiTrainingRule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim()
  if (typeof body.instruction === "string" && body.instruction.trim()) data.instruction = body.instruction.trim()
  if ("goodExample" in body) data.goodExample = typeof body.goodExample === "string" && body.goodExample.trim() ? body.goodExample.trim() : null
  if ("badExample" in body) data.badExample = typeof body.badExample === "string" && body.badExample.trim() ? body.badExample.trim() : null
  if (typeof body.scope === "string") data.scope = body.scope
  if (typeof body.surface === "string") data.surface = body.surface
  if (typeof body.enabled === "boolean") data.enabled = body.enabled
  if (Number.isFinite(Number(body.priority))) data.priority = Number(body.priority)

  const rule = await prisma.aiTrainingRule.update({ where: { id }, data })
  invalidateTrainingCache()
  return NextResponse.json(rule)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.aiTrainingRule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.aiTrainingRule.delete({ where: { id } })
  invalidateTrainingCache()
  return NextResponse.json({ ok: true })
}
