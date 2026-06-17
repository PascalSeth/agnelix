import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get("tid")
  const url = req.nextUrl.searchParams.get("url")

  if (!url) return NextResponse.redirect("/")

  if (trackingId) {
    const email = await prisma.email.findUnique({ where: { id: trackingId } })

    if (email) {
      const lead = await prisma.lead.findUnique({ where: { id: email.leadId } })

      await Promise.all([
        prisma.email.update({
          where: { id: trackingId },
          data: {
            clickedAt: email.clickedAt ?? new Date(),
            status: "CLICKED",
            clickCount: { increment: 1 },
          },
        }),
        prisma.trackingEvent.create({
          data: {
            eventType: "click",
            emailId: trackingId,
            leadEmail: lead?.email ?? "unknown",
            ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
            userAgent: req.headers.get("user-agent") ?? "unknown",
          },
        }),
        email.campaignId
          ? prisma.campaign.update({
              where: { id: email.campaignId },
              data: { emailsClicked: { increment: 1 } },
            })
          : Promise.resolve(),
      ])
    }
  }

  let redirectUrl = "/"
  try {
    const decodedUrl = decodeURIComponent(url)
    if (decodedUrl.startsWith("/")) {
      redirectUrl = new URL(decodedUrl, req.nextUrl.origin).toString()
    } else {
      const hasProtocol = decodedUrl.startsWith("http://") || decodedUrl.startsWith("https://")
      const fullUrl = hasProtocol ? decodedUrl : `https://${decodedUrl}`
      const parsed = new URL(fullUrl)
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        redirectUrl = parsed.toString()
      }
    }
  } catch (e) {
    console.error("Failed to parse redirect URL:", e)
  }

  return NextResponse.redirect(redirectUrl)
}
