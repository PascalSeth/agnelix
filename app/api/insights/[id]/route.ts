import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const existing = await prisma.agentInsight.findFirst({ where: { id, userId: scopeId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const insight = await prisma.agentInsight.update({
    where: { id },
    data: { dismissed: body.dismissed === undefined ? true : !!body.dismissed },
  })

  return NextResponse.json(insight)
}
