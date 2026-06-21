import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId, canManageTeam } from "@/lib/auth-helpers"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canManageTeam(session)) {
    return NextResponse.json({ error: "Only the team owner or a manager can revoke invites" }, { status: 403 })
  }

  const { id } = await params
  const scopeId = getScopeId(session)

  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { id },
    })

    if (!invite || invite.ownerId !== scopeId) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    await prisma.teamInvite.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
