import { NextRequest, NextResponse } from "next/server"
import { detectReplies } from "@/lib/imap"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const result = await detectReplies()
  return NextResponse.json({ success: true, ...result })
}
