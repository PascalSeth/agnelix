import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { suggestTargeting } from "@/lib/ai"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        agencyName: true,
        companyDesc: true,
        playbookType: true,
      },
    })

    const playbookType = user?.playbookType || "sales"
    const companyName = user?.agencyName || "Our Agency"
    const companyDesc = user?.companyDesc || ""

    if (!companyDesc) {
      return NextResponse.json(
        { error: "Please configure your Agency Description in Settings first so the AI has context." },
        { status: 400 }
      )
    }

    const suggested = await suggestTargeting({
      companyName,
      companyDesc,
      playbookType,
    })

    return NextResponse.json(suggested)
  } catch (err) {
    console.error("Failed to suggest targeting via AI:", err)
    const msg = err instanceof Error ? err.message : "An error occurred."
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
