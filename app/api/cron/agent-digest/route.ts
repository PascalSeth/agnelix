import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendEmail, resolveSmtp } from "@/lib/email"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)

  const digests = await prisma.agentDigestLog.findMany({
    where: { day: dayStart },
    include: { user: true },
    take: 200,
  })

  let delivered = 0
  let failed = 0

  for (const digest of digests) {
    try {
      const smtp = resolveSmtp(digest.user)
      await sendEmail(
        {
          to: digest.user.email,
          from: smtp.user,
          fromName: digest.user.agencyName || digest.user.name || "Agnelix",
          replyTo: digest.user.fromEmail || smtp.user,
          subject: "Your Agnelix daily agent digest",
          body:
            `Daily digest:\n` +
            `- Actions sent: ${digest.sentCount}\n` +
            `- Meetings booked: ${digest.meetingsBookedCount}\n` +
            `- Proposals sent: ${digest.proposalsSentCount}\n` +
            `- Flagged actions: ${digest.flaggedCount}\n` +
            `${digest.summary ? `\nSummary: ${digest.summary}` : ""}`,
          trackingId: digest.id,
          agencyLogo: digest.user.agencyLogo || undefined,
          agencyName: digest.user.agencyName || undefined,
        },
        smtp
      )
      delivered++
    } catch (e) {
      console.error("Failed to send daily digest:", e)
      failed++
    }
  }

  return NextResponse.json({ processed: digests.length, delivered, failed })
}

