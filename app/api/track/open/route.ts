import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
)

export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get("tid")

  if (trackingId) {
    const email = await prisma.email.findUnique({ where: { id: trackingId } })

    if (email) {
      const lead = await prisma.lead.findUnique({ where: { id: email.leadId } })

      await Promise.all([
        prisma.email.update({
          where: { id: trackingId },
          data: {
            openedAt: email.openedAt ?? new Date(),
            status: email.status === "SENT" || email.status === "DELIVERED" ? "OPENED" : email.status,
            openCount: { increment: 1 },
          },
        }),
        prisma.trackingEvent.create({
          data: {
            eventType: "open",
            emailId: trackingId,
            leadEmail: lead?.email ?? "unknown",
            ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
            userAgent: req.headers.get("user-agent") ?? "unknown",
          },
        }),
        email.campaignId
          ? prisma.campaign.update({
              where: { id: email.campaignId },
              data: { emailsOpened: { increment: 1 } },
            })
          : Promise.resolve(),
      ])
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
