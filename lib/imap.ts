import { ImapFlow } from "imapflow"
import { prisma } from "./db"
import { generateBattleCard } from "./ai"
import { processReply } from "./agent"

export async function detectReplies(): Promise<{ found: number; errors: number }> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) return { found: 0, errors: 0 }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  })

  let found = 0
  let errors = 0

  try {
    await client.connect()
    const lock = await client.getMailboxLock("INBOX")

    try {
      const since = new Date(Date.now() - 25 * 60 * 60 * 1000)

      for await (const msg of client.fetch({ since }, { headers: true, envelope: true, bodyParts: ["text"] })) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hdrs = msg.headers as any
          const inReplyTo = hdrs?.get?.("in-reply-to") ?? ""
          const references  = hdrs?.get?.("references") ?? ""
          const combined    = `${inReplyTo} ${references}`

          const ids = Array.from(combined.matchAll(/<([^>]+)>/g)).map(m => m[1])
          if (ids.length === 0) continue

          const sentEmail = await prisma.email.findFirst({
            where: {
              messageId: { in: ids.map(id => `<${id}>`) },
              status: { notIn: ["REPLIED", "FAILED"] },
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textPart = (msg.bodyParts as any)?.get?.("text")
            if (textPart) {
              replyBody = Buffer.isBuffer(textPart) ? textPart.toString("utf8") : String(textPart)
              // Strip quoted content (lines starting with >)
              replyBody = replyBody
                .split("\n")
                .filter(line => !line.startsWith(">") && !line.startsWith("On ") )
                .join("\n")
                .trim()
                .slice(0, 2000)
            }
          } catch { /* body extraction optional */ }

          const fromEmail = msg.envelope?.from?.[0]?.address ?? lead.email
          const replySubject = msg.envelope?.subject ?? `Re: ${sentEmail.subject}`

          // Generate battle card via AI
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

          // Create the reply record first so we have its ID for the agent
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

          await Promise.all([
            // Mark sent email as replied
            prisma.email.update({
              where: { id: sentEmail.id },
              data: { status: "REPLIED", repliedAt: new Date(), replySnippet: replyBody.slice(0, 300) },
            }),
            // Update lead status + store battle card
            prisma.lead.update({
              where: { id: lead.id },
              data: {
                status: "REPLIED",
                ...(battleCardJson ? { battleCard: battleCardJson } : {}),
              },
            }),
            // Cancel remaining queued follow-ups
            prisma.email.updateMany({
              where: { leadId: lead.id, status: "QUEUED" },
              data: { status: "FAILED" },
            }),
            // Increment campaign reply counter
            campaignIds.length > 0
              ? prisma.campaign.updateMany({
                  where: { id: { in: campaignIds } },
                  data: { replies: { increment: 1 } },
                })
              : Promise.resolve(),
            // Log activity
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

          // Fire agent processing asynchronously — errors here must not block reply storage
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
    console.error("IMAP connection error:", e)
    errors++
  } finally {
    try { await client.logout() } catch {}
  }

  return { found, errors }
}
