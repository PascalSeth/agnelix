/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImapFlow } from "imapflow"
import { prisma } from "./db"
import { generateBattleCard } from "./ai"
import { processReply } from "./agent"

function getHeaderValue(headersStr: string, name: string): string {
  const lines = headersStr.split(/\r?\n/)
  let value = ""
  let found = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.toLowerCase().startsWith(`${name.toLowerCase()}:`)) {
      value = line.slice(name.length + 1).trim()
      found = true
    } else if (found) {
      if (/^\s/.test(line)) {
        value += " " + line.trim()
      } else {
        break
      }
    }
  }
  return value
}

function decodeQuotedPrintable(str: string): string {
  let result = str.replace(/=\r?\n/g, "")
  result = result.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })
  try {
    const bytes = []
    for (let i = 0; i < result.length; i++) {
      bytes.push(result.charCodeAt(i))
    }
    return Buffer.from(bytes).toString("utf8")
  } catch {
    return result
  }
}

function cleanHtmlReply(html: string): string {
  const quoteMarkers = [
    '<div class="gmail_quote',
    '<div class="gmail_attr',
    '<blockquote',
    '<div id="appendonsend"',
    'id="divRplyFwdMsg"',
    '<hr'
  ]

  let cleanHtml = html
  let lowestIndex = -1

  for (const marker of quoteMarkers) {
    const idx = cleanHtml.indexOf(marker)
    if (idx !== -1 && (lowestIndex === -1 || idx < lowestIndex)) {
      lowestIndex = idx
    }
  }

  if (lowestIndex !== -1) {
    cleanHtml = cleanHtml.slice(0, lowestIndex)
  }

  const text = cleanHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")

  return text.split("\n").map(l => l.trim()).filter(Boolean).join("\n").trim()
}

function extractHtmlPart(raw: string): string | null {
  if (!raw.includes("Content-Type:")) {
    return null
  }

  const lines = raw.split(/\r?\n/)
  let boundary = ""
  for (const line of lines) {
    if (line.startsWith("--") && line.length > 10) {
      boundary = line.trim()
      break
    }
  }

  if (!boundary) return null

  const parts = raw.split(boundary)
  for (const part of parts) {
    if (part.toLowerCase().includes("content-type: text/html")) {
      const match = part.match(/\r?\n\r?\n([\s\S]*)/i)
      if (match) {
        return match[1].trim()
      }
    }
  }
  return null
}

function cleanReplyBody(raw: string): string {
  const htmlPart = extractHtmlPart(raw)
  if (htmlPart) {
    const decodedHtml = decodeQuotedPrintable(htmlPart)
    const cleanedHtmlText = cleanHtmlReply(decodedHtml)
    if (cleanedHtmlText) return cleanedHtmlText
  }

  if (!raw.includes("Content-Type:")) {
    return raw.trim()
  }

  const lines = raw.split(/\r?\n/)
  let boundary = ""
  for (const line of lines) {
    if (line.startsWith("--") && line.length > 10) {
      boundary = line.trim()
      break
    }
  }

  if (!boundary) return raw.trim()

  const parts = raw.split(boundary)
  for (const part of parts) {
    if (part.toLowerCase().includes("content-type: text/plain")) {
      const match = part.match(/\r?\n\r?\n([\s\S]*)/i)
      if (match) {
        const text = decodeQuotedPrintable(match[1].trim())
        return text
          .split("\n")
          .filter(line => {
            const l = line.trim()
            return !l.startsWith(">") && !l.startsWith("On ") && !l.startsWith("wrote:")
          })
          .join("\n")
          .trim()
      }
    }
  }

  return raw.trim()
}

export async function detectReplies(userId?: string): Promise<{ found: number; errors: number }> {
  const whereClause: Record<string, unknown> = {
    fromEmail: { not: null },
    smtpPass: { not: null },
  }
  if (userId) {
    whereClause.id = userId
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      fromEmail: true,
      smtpPass: true,
    },
  })

   
  const targets: { userId: string; user: string; pass: string }[] = users.map(u => ({
    userId: u.id,
    user: u.fromEmail!,
    pass: u.smtpPass!,
  }))

  if (targets.length === 0 && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    targets.push({
      userId: userId || "",
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    })
  }

  let found = 0
  let errors = 0

  for (const target of targets) {
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: target.user, pass: target.pass },
      logger: false,
    })

    try {
      await client.connect()
      const lock = await client.getMailboxLock("INBOX")

      try {
        const since = new Date(Date.now() - 25 * 60 * 60 * 1000)

        for await (const msg of client.fetch({ since }, { headers: true, envelope: true, bodyParts: ["text"] })) {
          try {
            const headersStr = Buffer.isBuffer(msg.headers) ? msg.headers.toString() : String(msg.headers || "")
            const inReplyTo = getHeaderValue(headersStr, "in-reply-to")
            const references = getHeaderValue(headersStr, "references")
            const combined = `${inReplyTo} ${references}`

            const ids = Array.from(combined.matchAll(/<([^>]+)>/g)).map(m => m[1])
            if (ids.length === 0) continue

            const sentEmail = await prisma.email.findFirst({
              where: {
                messageId: { in: ids.map(id => `<${id}>`) },
                status: { notIn: ["REPLIED", "FAILED"] },
                ...(target.userId ? { lead: { userId: target.userId } } : {}),
              },
              include: {
                lead: {
                  include: {
                    campaignLeads: { select: { campaignId: true } },
                    user: { select: { name: true, agencyName: true, companyName: true, companyDesc: true, tone: true } },
                  },
                },
              },
            })

            if (!sentEmail) continue

            const lead = sentEmail.lead
            const campaignIds = lead.campaignLeads.map(cl => cl.campaignId)

            // Extract reply body from IMAP message
            let replyBody = ""
            try {
              const textPart = (msg.bodyParts as any)?.get?.("text")
              if (textPart) {
                const rawBody = Buffer.isBuffer(textPart) ? textPart.toString("utf8") : String(textPart)
                replyBody = cleanReplyBody(rawBody).slice(0, 2000)
              }
            } catch { /* body extraction optional */ }

            const fromEmail = msg.envelope?.from?.[0]?.address ?? lead.email
            const replySubject = msg.envelope?.subject ?? `Re: ${sentEmail.subject}`

            // 1. Double check if we already have a reply for this sent email (concurrency lock)
            const existingReply = await prisma.reply.findFirst({
              where: { emailId: sentEmail.id },
            })
            if (existingReply) continue

            // 2. Mark sent email as REPLIED immediately to lock it
            await prisma.email.update({
              where: { id: sentEmail.id },
              data: { status: "REPLIED", repliedAt: new Date(), replySnippet: replyBody.slice(0, 300) },
            })

            // 3. Create the reply record immediately
            const newReply = await prisma.reply.create({
              data: {
                leadId: lead.id,
                emailId: sentEmail.id,
                fromEmail,
                subject: replySubject,
                body: replyBody || "(reply body not captured)",
                receivedAt: msg.envelope?.date ?? new Date(),
              },
            })

            // 4. Generate battle card via AI (slow call)
            let battleCardJson: string | null = null
            try {
              const card = await generateBattleCard({
                leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
                company: lead.company || "their company",
                industry: lead.industry || "business",
                website: lead.website,
                painPoint: lead.painPoint,
                recentNews: lead.recentNews,
                originalEmailSubject: sentEmail.subject,
                originalEmailBody: sentEmail.body,
                replyBody: replyBody || "(reply body not captured)",
                senderName: lead.user.name || "Your Name",
                senderCompany: lead.user.agencyName || lead.user.companyName || "Your Company",
                senderService: lead.user.companyDesc || "our services",
              })
              battleCardJson = JSON.stringify(card)
            } catch { /* battle card generation optional */ }

            // 5. Update lead status + store battle card + run remaining updates
            await Promise.all([
              prisma.lead.update({
                where: { id: lead.id },
                data: {
                  status: "REPLIED",
                  ...(battleCardJson ? { battleCard: battleCardJson } : {}),
                },
              }),
              // Lead replied — cancel any remaining unsent sequence templates
              prisma.email.deleteMany({
                where: { leadId: lead.id, status: { in: ["QUEUED", "DRAFT"] } },
              }),
              campaignIds.length > 0
                ? prisma.campaign.updateMany({
                    where: { id: { in: campaignIds } },
                    data: { replies: { increment: 1 } },
                  })
                : Promise.resolve(),
              prisma.activity.create({
                data: {
                  leadId: lead.id,
                  type: "REPLY_RECEIVED",
                  note: replySubject,
                  metadata: { fromEmail, snippet: replyBody.slice(0, 150) },
                },
              }),
              ...(battleCardJson ? [prisma.activity.create({
                data: {
                  leadId: lead.id,
                  type: "BATTLE_CARD_GENERATED",
                  note: "Battle card auto-generated from reply",
                },
              })] : []),
            ])

            // Fire agent processing asynchronously
            processReply(newReply.id).catch(e => console.error("Agent processReply error:", e))

            found++
          } catch (e) {
            console.error("Error processing reply message:", e)
            errors++
          }
        }
      } finally {
        lock.release()
      }
    } catch (e) {
      console.error(`IMAP connection error for ${target.user}:`, e)
      errors++
    } finally {
      try { await client.logout() } catch {}
    }
  }

  return { found, errors }
}
