import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import { simulateResponse, type AgencyProfile } from "@/lib/ai-teacher"

const SURFACES = ["EMAIL", "REPLY", "PROPOSAL", "ADVISOR"] as const

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { surface, scenario } = await req.json()
  if (!SURFACES.includes(surface)) {
    return NextResponse.json({ error: `surface must be one of: ${SURFACES.join(", ")}` }, { status: 400 })
  }
  if (typeof scenario !== "string" || !scenario.trim()) {
    return NextResponse.json({ error: "scenario is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: {
      name: true,
      title: true,
      agencyName: true,
      companyName: true,
      companyDesc: true,
      tone: true,
      playbookType: true,
      agentGoal: { select: { personaConfig: true } },
    },
  })

  let objectionHandlers: unknown = null
  if (user?.playbookType) {
    const playbook = await prisma.playbook.findUnique({ where: { type: user.playbookType }, select: { objectionHandlers: true } })
    objectionHandlers = playbook?.objectionHandlers ?? null
  }

  try {
    const response = await simulateResponse({
      surface,
      scope: user?.playbookType || "global",
      scenario: scenario.trim(),
      userId: scopeId,
      agencyProfile: {
        senderName: user?.name,
        senderTitle: user?.title,
        senderCompany: user?.agencyName || user?.companyName,
        senderService: user?.companyDesc,
        tone: user?.tone,
        personaConfig: (user?.agentGoal?.personaConfig as AgencyProfile["personaConfig"]) ?? null,
        objectionHandlers,
      },
    })
    return NextResponse.json({ response })
  } catch (err) {
    console.error("[agent/training/simulate] failed:", err)
    return NextResponse.json({ error: "Simulation failed — check the AI API key and try again" }, { status: 500 })
  }
}
