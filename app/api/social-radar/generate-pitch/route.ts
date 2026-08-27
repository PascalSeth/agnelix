import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import { generateSocialOutreachPitch } from "@/lib/ai"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scopeId = getScopeId(session)

  try {
    const body = await req.json()
    const { postTitle, postBody, author, platform = "REDDIT", subreddit } = body

    if (!postTitle) {
      return NextResponse.json({ error: "postTitle is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: scopeId },
      select: {
        agencyName: true,
        companyName: true,
        companyDesc: true,
        flagshipOffer: true,
        calendarLink: true,
      },
    })

    const agencyName = user?.agencyName || user?.companyName || "Galien Transportation Services"
    const companyDesc = user?.companyDesc || "Licensed premium private transportation, airport shuttle, luxury sprinter, and chauffeur services with guaranteed on-time pickup and flat pricing."

    const pitch = await generateSocialOutreachPitch({
      postTitle,
      postBody: postBody || "",
      author: author || "traveler",
      platform,
      subreddit: subreddit || undefined,
      agencyName,
      companyDesc,
      flagshipOffer: user?.flagshipOffer,
      calendarOrQuoteLink: user?.calendarLink || null,
    })

    return NextResponse.json({
      success: true,
      pitch,
    })
  } catch (error: any) {
    console.error("Social pitch generation error:", error)
    return NextResponse.json({ error: "Failed to generate pitch" }, { status: 500 })
  }
}
