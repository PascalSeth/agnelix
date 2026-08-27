import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import { invalidateTrainingCache } from "@/lib/ai-training"

const SURFACES = ["ALL", "EMAIL", "REPLY", "PROPOSAL", "ADVISOR"] as const
const SCOPES = ["global", "sales", "seo", "social_media", "ppc", "web_design", "finance"]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rules = await prisma.aiTrainingRule.findMany({
    orderBy: [{ scope: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
  })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { scope, surface, title, instruction, goodExample, badExample, priority } = body

  if (typeof instruction !== "string" || !instruction.trim()) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 })
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  if (scope && !SCOPES.includes(scope)) {
    return NextResponse.json({ error: `scope must be one of: ${SCOPES.join(", ")}` }, { status: 400 })
  }
  if (surface && !SURFACES.includes(surface)) {
    return NextResponse.json({ error: `surface must be one of: ${SURFACES.join(", ")}` }, { status: 400 })
  }

  const rule = await prisma.aiTrainingRule.create({
    data: {
      scope: scope || "global",
      surface: surface || "ALL",
      title: title.trim(),
      instruction: instruction.trim(),
      goodExample: typeof goodExample === "string" && goodExample.trim() ? goodExample.trim() : null,
      badExample: typeof badExample === "string" && badExample.trim() ? badExample.trim() : null,
      priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
      createdBy: session.user.email ?? session.user.id,
    },
  })

  invalidateTrainingCache()
  return NextResponse.json(rule)
}
