import { schedule } from "@netlify/functions"

/**
 * Netlify Scheduled Function — IMAP reply detection (every minute).
 * Hits /api/cron/replies which runs Phase 1 (fast IMAP delta-sync ingest)
 * then Phase 2 (AI BattleCard + agent processing) in a single invocation.
 *
 * Netlify supports per-minute schedules; Vercel Hobby is hourly-only (use this as fallback).
 * For Vercel Pro deployments, vercel.json cron handles this every 5 minutes.
 */
const cronHandler = async () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-site.netlify.app"
  const cronSecret = process.env.CRON_SECRET || ""

  try {
    const res = await fetch(`${appUrl}/api/cron/replies`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    })
    console.log(`[cron-replies] Response: ${res.status}`)
    return { statusCode: res.status }
  } catch (err) {
    console.error("[cron-replies] Error:", err)
    return { statusCode: 500 }
  }
}

export const handler = schedule("* * * * *", cronHandler)

