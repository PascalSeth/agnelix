import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const digest = await prisma.agentDigestLog.findMany({
    where: { userId: session.user.id },
    orderBy: { day: "desc" },
    take: 14,
  })

  const memory = await prisma.agentMemory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { intent: true, responseStyle: true, score: true, bookedMeeting: true, outcome: true },
  })

  const styleScores: Record<string, number> = {}
  for (const m of memory) {
    if (!m.responseStyle) continue
    styleScores[m.responseStyle] = (styleScores[m.responseStyle] ?? 0) + m.score
  }
  const topStyle = Object.entries(styleScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return NextResponse.json({
    digest,
    learning: {
      topStyle,
      memoriesTracked: memory.length,
      meetingsSignals: memory.filter((m) => m.bookedMeeting).length,
    },
  })
}

