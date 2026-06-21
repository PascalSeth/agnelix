import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const replies = await prisma.reply.findMany({
    where: { lead: { userId: scopeId } },
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
    take: 200,
  })

  // Deduplicate by leadId to keep only the latest reply for each lead
  const uniqueRepliesMap = new Map<string, typeof replies[number]>()
  for (const reply of replies) {
    if (!uniqueRepliesMap.has(reply.leadId)) {
      uniqueRepliesMap.set(reply.leadId, reply)
    }
  }
  const uniqueReplies = Array.from(uniqueRepliesMap.values()).slice(0, 50)

  return NextResponse.json(uniqueReplies)
}
