import nodemailer from "nodemailer"

export interface SendEmailParams {
  to: string
  from: string
  fromName: string
  replyTo: string
  subject: string
  body: string
  trackingId: string
  calendlyLink?: string
  agencyLogo?: string
  agencyName?: string
}

export interface SmtpConfig {
  user: string
  pass: string
  host?: string
  port?: number
}

/** Resolve a user's SMTP config, falling back to env vars for dev/admin use */
export function resolveSmtp(user: {
  fromEmail: string | null
  smtpPass:  string | null
  smtpHost?: string | null
  smtpPort?: number | null
}): SmtpConfig {
  const user_ = user.fromEmail ?? process.env.GMAIL_USER
  const pass_ = user.smtpPass  ?? process.env.GMAIL_APP_PASSWORD
  if (!user_ || !pass_) {
    throw new Error("Email not configured. Add your Gmail App Password in Settings → Agency.")
  }
  return {
    user: user_,
    pass: pass_,
    host: user.smtpHost ?? undefined,
    port: user.smtpPort ?? undefined,
  }
}

function buildTransporter(smtp: SmtpConfig) {
  const port = smtp.port ?? 465
  const host = smtp.host ?? "smtp.gmail.com"
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:   { user: smtp.user, pass: smtp.pass },
    tls: {
      rejectUnauthorized: false,
      servername: host,
    },
  })
}

export async function verifySmtp(smtp: SmtpConfig): Promise<void> {
  await buildTransporter(smtp).verify()
}

export async function sendEmail(params: SendEmailParams, smtp: SmtpConfig) {
  const {
    to, from, fromName, replyTo, subject, body,
    trackingId, calendlyLink, agencyLogo, agencyName,
  } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const trackingPixel = `<img src="${appUrl}/api/track/open?tid=${trackingId}" width="1" height="1" alt="" style="display:none" />`

  let htmlBody = body.replace(/\n/g, "<br>")
  if (calendlyLink) {
    const trackedLink = `${appUrl}/api/track/click?tid=${trackingId}&url=${encodeURIComponent(calendlyLink)}`
    htmlBody = htmlBody.replace(calendlyLink, trackedLink)
  }

  const logoHtml = agencyLogo
    ? `<img src="${agencyLogo}" alt="${agencyName || "Agency"}" style="max-height:40px;margin-bottom:16px" /><br>`
    : ""

  const html = `${logoHtml}${htmlBody}${trackingPixel}<br><br><small style="color:#999">Sent via Galien</small>`

  const info = await buildTransporter(smtp).sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    replyTo,
    subject,
    text: body,
    html,
    headers: { "X-Campaign-ID": trackingId },
  })

  return {
    messageId: info.messageId as string,
    accepted:  info.accepted  as string[],
    rejected:  info.rejected  as string[],
  }
}
