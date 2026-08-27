import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import { simulateAgencyTurn, simulateProspectTurn, type SparMessage } from "@/lib/ai-teacher"

export const maxDuration = 60

// One turn per request: the client drives the loop so the UI can render the
// conversation live and the admin can stop it at any point.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { scope, prospect, attitude, conversation } = await req.json()

  if (typeof prospect !== "string" || !prospect.trim()) {
    return NextResponse.json({ error: "Describe the prospect first" }, { status: 400 })
  }
  const convo: SparMessage[] = Array.isArray(conversation)
    ? conversation.filter(
        (m: SparMessage) => (m?.role === "agency" || m?.role === "prospect") && typeof m?.text === "string"
      )
    : []
  const resolvedScope = typeof scope === "string" && scope ? scope : "global"

  try {
    const last = convo[convo.length - 1]

    // Whose turn: empty → agency opens; after agency → prospect; after prospect → agency
    if (!last || last.role === "prospect") {
      // Pull the workspace's real objection handlers so the sim tests the full skill
      let objectionHandlers: string | null = null
      if (resolvedScope !== "global") {
        const playbook = await prisma.playbook.findUnique({
          where: { type: resolvedScope },
          select: { objectionHandlers: true },
        })
        if (playbook?.objectionHandlers) {
          try {
            const handlers = (typeof playbook.objectionHandlers === "string"
              ? JSON.parse(playbook.objectionHandlers)
              : playbook.objectionHandlers) as Array<{ objection: string; response: string }>
            if (Array.isArray(handlers) && handlers.length > 0) {
              objectionHandlers = handlers
                .map(h => `- "${h.objection}" → ${h.response}`)
                .join("\n")
            }
          } catch { /* ignore malformed handlers */ }
        }
      }

      const text = await simulateAgencyTurn({
        scope: resolvedScope,
        prospect: prospect.trim(),
        conversation: convo,
        objectionHandlers,
      })
      return NextResponse.json({ role: "agency", text, outcome: "continue" })
    }

    const { text, outcome } = await simulateProspectTurn({
      prospect: prospect.trim(),
      attitude: typeof attitude === "string" ? attitude : "skeptical",
      conversation: convo,
    })
    return NextResponse.json({ role: "prospect", text, outcome })
  } catch (err) {
    console.error("[training/spar] turn failed:", err)
    return NextResponse.json({ error: "Simulation turn failed — try again" }, { status: 500 })
  }
}
