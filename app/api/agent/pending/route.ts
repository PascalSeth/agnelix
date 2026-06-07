import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const actions = await prisma.pendingAction.findMany({
      where: { userId: session.user.id, status: "PENDING" },
      orderBy: { expiresAt: "asc" },
      include: {
        lead: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, company: true, status: true,
          },
        },
        reply: {
          select: {
            id: true, body: true, subject: true,
            receivedAt: true, fromEmail: true,
            email: {
              select: {
                campaign: {
                  select: {
                    id: true,
                    name: true,
                    autonomous: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    return NextResponse.json(actions)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
