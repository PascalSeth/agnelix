import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { isSuperadmin } from "@/lib/auth-helpers"
import { simulateResponse } from "@/lib/ai-teacher"

const SURFACES = ["EMAIL", "REPLY", "PROPOSAL", "ADVISOR"] as const

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { surface, scope, scenario } = await req.json()
  if (!SURFACES.includes(surface)) {
    return NextResponse.json({ error: `surface must be one of: ${SURFACES.join(", ")}` }, { status: 400 })
  }
  if (typeof scenario !== "string" || !scenario.trim()) {
    return NextResponse.json({ error: "scenario is required" }, { status: 400 })
  }

  try {
    const response = await simulateResponse({
      surface,
      scope: typeof scope === "string" && scope ? scope : "global",
      scenario: scenario.trim(),
    })
    return NextResponse.json({ response })
  } catch (err) {
    console.error("[training/simulate] failed:", err)
    return NextResponse.json({ error: "Simulation failed — check the AI API key and try again" }, { status: 500 })
  }
}
