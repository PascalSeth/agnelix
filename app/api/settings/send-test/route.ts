import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { sendEmail, resolveSmtp } from "@/lib/email"
import { getScopeId, isTeamOwner } from "@/lib/auth-helpers"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isTeamOwner(session)) return NextResponse.json({ error: "Only the team owner can manage SMTP settings" }, { status: 403 })

  const scopeId = getScopeId(session)
  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: {
      id: true,
      name: true,
      email: true,
      fromEmail: true,
      smtpPass: true,
      smtpHost: true,
      smtpPort: true,
      agencyName: true,
      agencyLogo: true,
      calendarLink: true,
    },
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const targetEmail = body.toEmail?.trim() || user.fromEmail || user.email

  if (!targetEmail) {
    return NextResponse.json({ error: "Target email address is required" }, { status: 400 })
  }

  try {
    const smtp = resolveSmtp(user)
    const result = await sendEmail(
      {
        to: targetEmail,
        from: smtp.user,
        fromName: user.agencyName || user.name || "Galien",
        replyTo: user.email,
        subject: `🚀 Galien Outbox Test: ${user.agencyName || "Outbound Engine"}`,
        body: `Hi ${user.name || "there"},\n\nThis is a live test email from your Galien Outbound Engine.\n\nYour Gmail SMTP authentication is working properly, and your emails are ready for automated prospect dispatch!\n\nBest regards,\n${user.name || "The Galien Team"}`,
        trackingId: `test-${Date.now()}`,
        agencyLogo: user.agencyLogo || undefined,
        agencyName: user.agencyName || undefined,
        calendlyLink: user.calendarLink || undefined,
      },
      smtp,
    )

    return NextResponse.json({
      ok: true,
      message: `Test email sent successfully to ${targetEmail}`,
      messageId: result.messageId,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to send test email" },
      { status: 400 },
    )
  }
}
