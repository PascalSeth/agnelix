import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import { extractCaseStudyFromRawText } from "@/lib/ai"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scopeId = getScopeId(session)
  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { agencyName: true, companyName: true, playbookType: true },
  })

  try {
    const { rawText } = await req.json()
    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "Please provide some raw notes, review, or brief text to extract." },
        { status: 400 }
      )
    }

    const extracted = await extractCaseStudyFromRawText({
      rawText: rawText.trim(),
      agencyName: user?.agencyName || user?.companyName || "Our Agency",
      playbookType: user?.playbookType || "sales",
    })

    if (!extracted) {
      return NextResponse.json(
        { error: "Could not automatically parse the case study. Please add a bit more context." },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, data: extracted })
  } catch (err) {
    console.error("[extract-case-study] Error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred during extraction." },
      { status: 500 }
    )
  }
}
