import { NextRequest, NextResponse } from "next/server"
import { runAutoSearches } from "@/lib/auto-search"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const result = await runAutoSearches()
  return NextResponse.json({ success: true, ...result })
}
