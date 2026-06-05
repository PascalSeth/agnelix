import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const replies = await prisma.reply.findMany({
    where: { lead: { userId: session.user.id } },
    include: {
      lead: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          company: true, industry: true, status: true, battleCard: true,
          user: { select: { name: true, agencyName: true, companyName: true, companyDesc: true, tone: true } },
        },
      },
      email: {
        select: { id: true, subject: true, body: true, sentAt: true, stepNumber: true },
      },
    },
    orderBy: { receivedAt: "desc" },
    take: 50,
  })

  return NextResponse.json(replies)
}
