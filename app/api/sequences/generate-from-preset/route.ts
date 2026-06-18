import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateSequenceFromPreset } from "@/lib/ai"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { presetName, presetDescription, stepsCount } = body

    if (!presetName || !presetDescription || !stepsCount) {
      return NextResponse.json(
        { error: "presetName, presetDescription, and stepsCount are required." },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        agencyName: true,
        companyDesc: true,
        playbookType: true,
        tone: true,
      },
    })

    const companyName = user?.agencyName || "Our Agency"
    const companyDesc = user?.companyDesc || ""
    const playbookType = user?.playbookType || "sales"
    const tone = user?.tone || "Professional"

    if (!companyDesc) {
      return NextResponse.json(
        { error: "Please configure your Agency Description in settings first so the AI has context to generate the sequence." },
        { status: 400 }
      )
    }

    const steps = await generateSequenceFromPreset({
      companyName,
      companyDesc,
      playbookType,
      tone,
      presetName,
      presetDescription,
      stepsCount: parseInt(stepsCount) || 3,
    })

    return NextResponse.json(steps)
  } catch (err) {
    console.error("Failed to generate sequence from preset via AI:", err)
    const msg = err instanceof Error ? err.message : "An error occurred while generating the sequence."
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
