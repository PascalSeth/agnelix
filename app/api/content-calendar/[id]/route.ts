import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

const STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "POSTED", "FAILED"]

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.contentCalendar.findFirst({ where: { id, userId: scopeId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.caption === "string" && body.caption.trim()) data.caption = body.caption.trim()
  if (typeof body.platform === "string") data.platform = body.platform
  if (typeof body.contentType === "string") data.contentType = body.contentType
  if (body.scheduledFor && !isNaN(Date.parse(body.scheduledFor))) data.scheduledFor = new Date(body.scheduledFor)
  if (Array.isArray(body.hashtags)) data.hashtags = body.hashtags
  if (Array.isArray(body.mediaUrls)) data.mediaUrls = body.mediaUrls
  if (typeof body.status === "string" && STATUSES.includes(body.status)) {
    data.status = body.status
    if (body.status === "APPROVED" && !existing.approvedAt) data.approvedAt = new Date()
    if (body.status === "POSTED" && !existing.postedAt) data.postedAt = new Date()
  }

  const item = await prisma.contentCalendar.update({ where: { id }, data })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const existing = await prisma.contentCalendar.findFirst({ where: { id, userId: scopeId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.contentCalendar.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
