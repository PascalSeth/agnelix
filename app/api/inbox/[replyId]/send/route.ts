import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { sendEmail, resolveSmtp } from "@/lib/email"
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

  if (!reply) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const lead = reply.lead
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
      prisma.activity.create({
        data: {
          leadId: lead.id,
          type: "EMAIL_SENT",
          note: subject,
          metadata: { manual: true, replyTo: reply.fromEmail },
        },
      }),
    ])

    const { rescheduleNextCampaignStep } = await import("@/lib/scheduler")
    await rescheduleNextCampaignStep(lead.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    await prisma.email.update({ where: { id: emailRecord.id }, data: { status: "FAILED" } })
    console.error("Reply send error:", err)
    const msg = err instanceof Error ? err.message : "Failed to send"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
