import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import { generateAIRebuttal } from "@/lib/ai"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { agencyName: true, companyName: true, playbookType: true },
  })

  try {
    const { objection, prospectContext } = await req.json()
    if (!objection || !objection.trim()) {
      return NextResponse.json({ error: "Please enter an objection to counter." }, { status: 400 })
    }

    const rebuttal = await generateAIRebuttal({
      objection: objection.trim(),
      prospectContext: prospectContext?.trim(),
      agencyName: user?.agencyName || user?.companyName || "Our Agency",
      playbookType: user?.playbookType || "sales",
    })

    if (!rebuttal) {
      return NextResponse.json({ error: "Could not generate rebuttal script." }, { status: 500 })
    }

    return NextResponse.json({ success: true, rebuttal })
  } catch (err) {
    console.error("[ai-rebuttal] Error:", err)
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 })
  }
}
