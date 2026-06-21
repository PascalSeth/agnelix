import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateReplyDraft } from "@/lib/ai"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { prospectName, prospectCompany, messageBody, intent } = body

  if (!prospectName || !messageBody) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Fetch the user's agent goal and core info
  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    include: { agentGoal: true }
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const styleMap: Record<string, string> = {
    INTERESTED: "DIRECT",
    QUESTION: "VALUE-FIRST",
    OBJECTION: "SOFT",
    UNSUBSCRIBE: "SOFT",
    NOT_NOW: "SOFT",
  }
  const responseStyle = styleMap[intent ?? "INTERESTED"] ?? "DIRECT"

  const start = Date.now()

  try {
    const draft = await generateReplyDraft({
      leadName: prospectName,
      company: prospectCompany || "their company",
      replyBody: messageBody,
      originalEmailBody: "(Assume this is a cold email outreach)",
      senderName: user.name ?? "Your Name",
      senderTitle: user.title,
      senderCompany: user.agencyName ?? user.companyName ?? "Your Company",
      senderService: user.companyDesc ?? "our services",
      tone: user.tone ?? "Professional",
      responseStyle,
      calendarLink: user.calendarLink,
      personaConfig: user.agentGoal?.personaConfig,
    })

    const latencyMs = Date.now() - start

    return NextResponse.json({ draft, latencyMs })
  } catch (error) {
    console.error("Simulation error:", error)
    return NextResponse.json({ error: "Failed to generate simulation" }, { status: 500 })
  }
}
