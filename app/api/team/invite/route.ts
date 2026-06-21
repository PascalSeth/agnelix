import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId, canManageTeam } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scopeId = getScopeId(session)

  try {
    const owner = await prisma.user.findUnique({
      where: { id: scopeId },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    })

    const members = await prisma.user.findMany({
      where: { teamOwnerId: scopeId },
      select: { id: true, name: true, email: true, image: true, createdAt: true, role: true },
    })

    const invites = await prisma.teamInvite.findMany({
      where: { ownerId: scopeId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      owner,
      members,
      invites,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Owner or Manager can invite new members
  if (!canManageTeam(session)) {
    return NextResponse.json({ error: "Only the team owner or a manager can invite members" }, { status: 403 })
  }

  const scopeId = getScopeId(session)

  try {
    const { email } = await req.json()
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
    }

    const targetEmail = email.trim().toLowerCase()

    // Check if the user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    })

    if (existingUser && existingUser.teamOwnerId === scopeId) {
      return NextResponse.json({ error: "User is already a member of this team" }, { status: 400 })
    }

    // Check if there is already a pending invite
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        ownerId: scopeId,
        email: targetEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvite) {
      return NextResponse.json({
        error: "A pending invite already exists for this email",
        invite: existingInvite,
      }, { status: 400 })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.teamInvite.create({
      data: {
        ownerId: scopeId,
        email: targetEmail,
        expiresAt,
      },
    })

    const origin = req.nextUrl.origin
    const inviteUrl = `${origin}/invite/${invite.token}`

    return NextResponse.json({ invite, inviteUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
