import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId, canManageTeam, isTeamOwner } from "@/lib/auth-helpers"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canManageTeam(session)) {
    return NextResponse.json({ error: "Only the team owner or a manager can remove team members" }, { status: 403 })
  }

  const { id } = await params
  const scopeId = getScopeId(session)

  try {
    const member = await prisma.user.findUnique({
      where: { id },
    })

    if (!member || member.teamOwnerId !== scopeId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (member.role === "MANAGER" && !isTeamOwner(session)) {
      return NextResponse.json({ error: "Only the team owner can remove a manager" }, { status: 403 })
    }

    await prisma.user.update({
      where: { id },
      data: { teamOwnerId: null, role: "USER" },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only the owner can promote/demote managers, to prevent privilege escalation chains
  if (!isTeamOwner(session)) {
    return NextResponse.json({ error: "Only the team owner can change member roles" }, { status: 403 })
  }

  const { id } = await params
  const scopeId = getScopeId(session)

  try {
    const { role } = await req.json()
    if (role !== "USER" && role !== "MANAGER") {
      return NextResponse.json({ error: "role must be USER or MANAGER" }, { status: 400 })
    }

    const member = await prisma.user.findUnique({ where: { id } })
    if (!member || member.teamOwnerId !== scopeId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true },
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
