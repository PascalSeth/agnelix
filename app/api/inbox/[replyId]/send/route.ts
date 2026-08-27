import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { sendEmail, resolveSmtp } from "@/lib/email"
import { rescheduleNextCampaignStep } from "@/lib/email-queue"
import { checkEmailQuota } from "@/lib/cost-guard"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST(req: NextRequest, { params }: { params: Promise<{ replyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { replyId } = await params
  const { subject, body } = await req.json()

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 })
  }

  const withinQuota = await checkEmailQuota(scopeId)
  if (!withinQuota) {
    return NextResponse.json({ error: "Daily email quota reached — try again tomorrow" }, { status: 429 })
  }

  let lead: any = null
  let replyFromEmail = ""

  if (replyId.startsWith("contacted-")) {
    const leadId = replyId.replace("contacted-", "")
    lead = await prisma.lead.findFirst({
      where: { id: leadId, userId: scopeId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        user: {
          select: {
            name: true, email: true,
            fromEmail: true, smtpPass: true, smtpHost: true, smtpPort: true,
            agencyName: true, agencyLogo: true,
            calendarLink: true,
          },
        },
      },
    })
    if (lead) replyFromEmail = lead.email
  } else {
    const reply = await prisma.reply.findFirst({
      where: { id: replyId, lead: { userId: scopeId } },
      include: {
        lead: {
          select: {
            id: true, email: true, firstName: true, lastName: true,
            user: {
              select: {
                name: true, email: true,
                fromEmail: true, smtpPass: true, smtpHost: true, smtpPort: true,
                agencyName: true, agencyLogo: true,
                calendarLink: true,
              },
            },
          },
        },
      },
    })
    if (reply) {
      lead = reply.lead
      replyFromEmail = reply.fromEmail
    }
  }

  if (!lead) return NextResponse.json({ error: "Lead/Conversation not found" }, { status: 404 })

  const user = lead.user

  const emailRecord = await prisma.email.create({
    data: { leadId: lead.id, subject, body, stepNumber: 99, status: "SENT", sentAt: new Date() },
  })

  try {
    const smtp = resolveSmtp(user)
    const sendResult = await sendEmail({
      to:         lead.email,
      from:       smtp.user,
      fromName:   user.agencyName || user.name || "Galien",
      replyTo:    user.email,
      subject,
      body,
      trackingId: emailRecord.id,
      agencyLogo: user.agencyLogo || undefined,
      agencyName: user.agencyName || undefined,
      calendlyLink: user.calendarLink || undefined,
    }, smtp)

    await Promise.all([
      prisma.email.update({
        where: { id: emailRecord.id },
        data: { messageId: sendResult.messageId },
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: { status: "CONTACTED", lastContactedAt: new Date() },
      }),
      prisma.activity.create({
        data: {
          leadId: lead.id,
          type: "EMAIL_SENT",
          note: subject,
          metadata: { manual: true, replyTo: replyFromEmail },
        },
      }),
    ])

    await rescheduleNextCampaignStep(lead.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    await prisma.email.update({ where: { id: emailRecord.id }, data: { status: "FAILED" } })
    console.error("Inbox direct send error:", err)
    const msg = err instanceof Error ? err.message : "Failed to send"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
