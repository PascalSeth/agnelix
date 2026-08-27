import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import { invalidateTrainingCache } from "@/lib/ai-training"

const SURFACES = ["ALL", "EMAIL", "REPLY", "PROPOSAL", "ADVISOR"] as const

// Agency self-training: every rule here is owned by this company (userId set)
// and only ever applies to this company's own generations.

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const rules = await prisma.aiTrainingRule.findMany({
    where: { userId: scopeId },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { surface, title, instruction, goodExample, badExample, priority } = body

  if (typeof instruction !== "string" || !instruction.trim()) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 })
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  if (surface && !SURFACES.includes(surface)) {
    return NextResponse.json({ error: `surface must be one of: ${SURFACES.join(", ")}` }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { playbookType: true },
  })

  const rule = await prisma.aiTrainingRule.create({
    data: {
      userId: scopeId,
      scope: user?.playbookType || "sales",
      surface: surface || "ALL",
      title: title.trim(),
      instruction: instruction.trim(),
      goodExample: typeof goodExample === "string" && goodExample.trim() ? goodExample.trim() : null,
      badExample: typeof badExample === "string" && badExample.trim() ? badExample.trim() : null,
      priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
      source: "manual",
      createdBy: session.user.email ?? session.user.id,
    },
  })

  invalidateTrainingCache()
  return NextResponse.json(rule)
}
