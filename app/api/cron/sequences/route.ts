import { NextRequest, NextResponse } from "next/server"
import { processSequenceQueue } from "@/lib/scheduler"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const results = await processSequenceQueue()
  return NextResponse.json({ success: true, ...results })
}
