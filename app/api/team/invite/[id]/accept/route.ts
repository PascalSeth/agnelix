import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: token } = await params

  try {
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { owner: true },
    })

    if (!invite) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json({ error: `This invitation has already been ${invite.status.toLowerCase()}` }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      await prisma.teamInvite.update({
        where: { token },
        data: { status: "EXPIRED" },
      })
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
    }

    if (session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({ error: "This invitation was sent to a different email address. Sign in with that account to accept it." }, { status: 403 })
    }

    if (session.user.teamOwnerId) {
      return NextResponse.json({ error: "You already belong to a team" }, { status: 400 })
    }

    const existingMembers = await prisma.user.count({ where: { teamOwnerId: session.user.id } })
    if (existingMembers > 0) {
      return NextResponse.json({ error: "You already manage your own team and can't join another" }, { status: 400 })
    }

    // Set the user's teamOwnerId
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { teamOwnerId: invite.ownerId },
      }),
      prisma.teamInvite.update({
        where: { token },
        data: { status: "ACCEPTED" },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
