import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { buildMission } from "@/lib/mission"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { playbookType: true },
  })

  const mission = await buildMission(scopeId, user?.playbookType)
  return NextResponse.json(mission)
}
