import { NextRequest, NextResponse } from "next/server"
import { ingestReplies, processPendingReplies } from "@/lib/imap"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Vercel Pro: 60s max; Hobby: 10s (Phase 1 alone still fits)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Phase 1: Fast IMAP ingest — open socket, delta-sync new messages, close socket
  // Completes in < 500ms per user in steady state (UID delta, no AI calls)
  const ingest = await ingestReplies()

  // Phase 2: Drain AI queue — generate BattleCards + fire agent for RECEIVED replies
  // Bounded to 5 replies per invocation to stay within timeout budget
  const process_ = await processPendingReplies(5)

  return NextResponse.json({
    success: true,
    phase1: { ingested: ingest.ingested, skipped: ingest.skipped, errors: ingest.errors },
    phase2: { processed: process_.processed, failed: process_.failed },
  })
}

