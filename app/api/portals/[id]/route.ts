import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.clientPortal.findFirst({ where: { id, userId: scopeId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ["isActive", "enabledSections", "customSections", "logoUrl", "brandColor", "customDomain", "portalTemplate"]) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const portal = await prisma.clientPortal.update({ where: { id }, data })
  return NextResponse.json(portal)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.clientPortal.findFirst({ where: { id, userId: scopeId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.clientPortal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
