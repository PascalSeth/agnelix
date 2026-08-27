import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import { generateOperationalPreset } from "@/lib/ai"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scopeId = getScopeId(session)
  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: {
      agencyName: true,
      companyName: true,
      companyDesc: true,
      playbookType: true,
      tone: true,
    },
  })

  try {
    const body = await req.json()
    const {
      operationsOverview,
      targetAudience,
      primaryHook,
      preferredSteps,
      tone,
    } = body

    if (!operationsOverview || !operationsOverview.trim()) {
      return NextResponse.json(
        { error: "Please provide an overview of your agency's operations or workflow." },
        { status: 400 }
      )
    }

    const preset = await generateOperationalPreset({
      agencyName: user?.agencyName || user?.companyName || "Our Agency",
      agencyDesc: user?.companyDesc || "B2B growth agency",
      playbookType: user?.playbookType || "sales",
      operationsOverview,
      targetAudience,
      primaryHook,
      preferredSteps: preferredSteps ? parseInt(preferredSteps) : 3,
      tone: tone || user?.tone || "Direct & Consultative",
    })

    if (!preset) {
      return NextResponse.json(
        { error: "Failed to generate operational preset. Please try again with more details." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, preset })
  } catch (err) {
    console.error("[generate-operational-preset] Error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred while generating your operational preset." },
      { status: 500 }
    )
  }
}
