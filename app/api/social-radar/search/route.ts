import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { scanRedditForIntent } from "@/lib/social-intent-scanner"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { query, subreddit, timeframe = "month", limit = 25 } = body

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query keyword is required" }, { status: 400 })
    }

    const results = await scanRedditForIntent({
      query,
      subreddit: subreddit || undefined,
      timeframe,
      limit,
    })

    return NextResponse.json({
      success: true,
      query,
      subreddit: subreddit || "all",
      total: results.length,
      results,
    })
  } catch (error: any) {
    console.error("Social radar search error:", error)
    return NextResponse.json({ error: "Failed to perform social search" }, { status: 500 })
  }
}
