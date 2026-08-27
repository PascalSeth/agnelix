import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

const PLATFORMS = ["instagram", "tiktok", "linkedin", "x", "facebook", "pinterest"]
const CONTENT_TYPES = ["post", "story", "reel", "carousel", "short"]
const STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "POSTED", "FAILED"] as const
type ContentStatusValue = (typeof STATUSES)[number]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month") // "YYYY-MM"
  const platform = searchParams.get("platform")

  const where: Record<string, unknown> = { userId: scopeId }
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number)
    where.scheduledFor = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    }
  }
  if (platform && PLATFORMS.includes(platform)) where.platform = platform

  const items = await prisma.contentCalendar.findMany({
    where,
    orderBy: { scheduledFor: "asc" },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { platform, scheduledFor, contentType, caption, hashtags, mediaUrls, campaignId, status } = body

  if (!platform || !PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `platform must be one of: ${PLATFORMS.join(", ")}` }, { status: 400 })
  }
  if (!contentType || !CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: `contentType must be one of: ${CONTENT_TYPES.join(", ")}` }, { status: 400 })
  }
  if (!scheduledFor || isNaN(Date.parse(scheduledFor))) {
    return NextResponse.json({ error: "scheduledFor must be a valid date" }, { status: 400 })
  }
  if (typeof caption !== "string" || !caption.trim()) {
    return NextResponse.json({ error: "caption is required" }, { status: 400 })
  }

  const item = await prisma.contentCalendar.create({
    data: {
      userId: scopeId,
      platform,
      scheduledFor: new Date(scheduledFor),
      contentType,
      caption: caption.trim(),
      hashtags: Array.isArray(hashtags) ? hashtags : undefined,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : undefined,
      campaignId: typeof campaignId === "string" && campaignId ? campaignId : undefined,
      status: STATUSES.includes(status) ? (status as ContentStatusValue) : undefined,
    },
  })

  return NextResponse.json(item)
}
