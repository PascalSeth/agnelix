import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const body = await req.json()

  const search = await prisma.autoSearch.findUnique({ where: { id } })
  if (!search || search.userId !== scopeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.autoSearch.update({
    where: { id },
    data: {
      ...(typeof body.enabled === "boolean" && { enabled: body.enabled }),
      ...(body.frequency && { frequency: body.frequency }),
      ...(body.campaignName && { campaignName: body.campaignName }),
      ...(body.query && { query: body.query }),
      ...(body.location && { location: body.location }),
      ...(body.sequenceId && { sequenceId: body.sequenceId }),
      ...(body.campaignId && { campaignId: body.campaignId }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  await prisma.autoSearch.deleteMany({ where: { id, userId: scopeId } })
  return NextResponse.json({ deleted: true })
}
