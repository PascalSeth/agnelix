import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const insights = await prisma.agentInsight.findMany({
    where: { userId: scopeId, dismissed: false },
    include: { lead: { select: { id: true, company: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(insights)
}
