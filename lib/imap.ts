/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * lib/imap.ts — Two-phase IMAP reply detection system
 *
 * Phase 1 — ingestReplies():
 *   Opens IMAP, fetches only NEW messages via UID delta (high-water mark),
 *   stores Reply records, cancels pending follow-ups, closes socket immediately.
 *   No AI calls — completes in < 500ms per user in steady state.
 *
 * Phase 2 — processPendingReplies():
 *   Drains replies with status=RECEIVED, generates BattleCards + fires agent.
 *   Safe to run in a separate cron invocation with bounded concurrency.
 *
 * detectReplies() — backwards-compatible wrapper (Phase 1 + Phase 2 in sequence).
 */
import { ImapFlow } from "imapflow"
import { prisma } from "./db"
import { generateBattleCard } from "./ai"
import { processReply } from "./agent"
import { decryptSecret } from "./crypto"

// ── Concurrency guards ────────────────────────────────────────────────────────

/** Prevent concurrent Phase 1 ingest per user */
const activeIngests = new Map<string, Promise<IngestResult>>()
/** Minimum ms between IMAP connects per user (Gmail connection-limit guard) */
const MIN_CONNECT_INTERVAL_MS = 30_000
const lastConnectTime = new Map<string, number>()

// Legacy compat — kept for existing callers that import activeImapSyncs / lastImapSyncTime
const activeImapSyncs = activeIngests as unknown as Map<string, Promise<{ found: number; errors: number }>>
const lastImapSyncTime = lastConnectTime
const MIN_IMAP_INTERVAL_MS = MIN_CONNECT_INTERVAL_MS

export interface IngestResult {
  ingested: number
  skipped: number
  errors: number
}

export interface ProcessResult {
  processed: number
  failed: number
}

// ── IMAP host resolver ────────────────────────────────────────────────────────

interface ImapConfig {
  host: string
  port: number
  secure: boolean
}

/**
 * Auto-resolves the correct IMAP server for a given email address.
 * Falls back to deriving host from the user's smtpHost setting for custom domains.
 */
export function resolveImapConfig(email: string, smtpHost?: string | null): ImapConfig {
  const domain = email.split("@")[1]?.toLowerCase() ?? ""

  // Gmail / Google Workspace
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return { host: "imap.gmail.com", port: 993, secure: true }
  }

  // Microsoft 365 / Outlook / Hotmail / Live / OnMicrosoft
  if (
    domain === "outlook.com" || domain === "hotmail.com" ||
    domain === "live.com" || domain === "msn.com" ||
    domain === "office365.com" || domain === "microsoft.com" ||
    domain.endsWith(".onmicrosoft.com")
  ) {
    return { host: "outlook.office365.com", port: 993, secure: true }
  }

  // Zoho Mail
  if (domain === "zoho.com" || domain === "zohomail.com") {
    return { host: "imap.zoho.com", port: 993, secure: true }
  }

  // Yahoo Mail
  if (domain === "yahoo.com" || domain === "yahoo.co.uk" || domain === "ymail.com") {
    return { host: "imap.mail.yahoo.com", port: 993, secure: true }
  }

  // Apple iCloud
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") {
    return { host: "imap.mail.me.com", port: 993, secure: true }
  }

  // Fastmail
  if (domain === "fastmail.com" || domain === "fastmail.fm" || domain === "fastmail.net") {
    return { host: "imap.fastmail.com", port: 993, secure: true }
  }

  // Custom domain — derive from user's smtpHost (replace smtp./mail. with imap.)
  if (smtpHost) {
    const imapHost = smtpHost
      .replace(/^smtp\./i, "imap.")
      .replace(/^mail\./i, "imap.")
    return { host: imapHost, port: 993, secure: true }
  }

  // Last-resort guess: imap.<domain>
  return { host: `imap.${domain}`, port: 993, secure: true }
}

// ── Email parsing helpers ─────────────────────────────────────────────────────

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

export async function ingestReplies(userId?: string): Promise<IngestResult> {
  const syncKey = userId ?? "global"

  // Prevent duplicate concurrent ingest for same user
  const existing = activeIngests.get(syncKey)
  if (existing) return existing

  // Rate-limit: minimum 30s between connects per user (Gmail connection-limit guard)
  const lastTime = lastConnectTime.get(syncKey) ?? 0
  if (Date.now() - lastTime < MIN_CONNECT_INTERVAL_MS) {
    return { ingested: 0, skipped: 0, errors: 0 }
  }

  const promise = _runIngest(userId)
  activeIngests.set(syncKey, promise)
  try {
    return await promise
  } finally {
    activeIngests.delete(syncKey)
  }
}

async function _runIngest(userId?: string): Promise<IngestResult> {
  const whereClause: Record<string, unknown> = {
    fromEmail: { not: null },
    smtpPass: { not: null },
  }
  if (userId) whereClause.id = userId

  const users = await prisma.user.findMany({
    where: whereClause,
    select: { id: true, fromEmail: true, smtpPass: true, smtpHost: true, imapLastUid: true },
  })

  // Env-var fallback for dev / admin use
  const targets: { userId: string; user: string; pass: string; smtpHost?: string | null; lastUid: number | null }[] =
    users.map(u => ({
      userId: u.id,
      user: u.fromEmail!,
      pass: decryptSecret(u.smtpPass!),
      smtpHost: u.smtpHost,
      lastUid: u.imapLastUid,
    }))

  if (targets.length === 0 && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    targets.push({
      userId: userId ?? "",
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
      smtpHost: null,
      lastUid: null,
    })
  }

  let ingested = 0
  let skipped = 0
  let errors = 0

  for (const target of targets) {
    const syncKey = target.userId || "global"
    lastConnectTime.set(syncKey, Date.now())

    const imapConfig = resolveImapConfig(target.user, target.smtpHost)
    const client = new ImapFlow({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: imapConfig.secure,
      auth: { user: target.user, pass: target.pass },
      logger: false,
      socketTimeout: 15_000,
    })

    let highestUid = target.lastUid ?? 0

    try {
      await client.connect()
      const lock = await client.getMailboxLock("INBOX")

      try {
        // UID delta: only fetch messages newer than our last processed UID.
        // On first run (lastUid = null / 0), fall back to scanning the last 48 hours.
        const searchCriteria: any =
          target.lastUid && target.lastUid > 0
            ? { uid: `${target.lastUid + 1}:*` }
            : { since: new Date(Date.now() - 48 * 60 * 60 * 1000) }

        for await (const msg of client.fetch(searchCriteria, {
          headers: true,
          envelope: true,
          bodyParts: ["text"],
          uid: true,
        })) {
          try {
            // Track highest UID for high-water mark update
            const uid = (msg as any).uid as number | undefined
            if (uid && uid > highestUid) highestUid = uid

            const headersStr = Buffer.isBuffer(msg.headers) ? msg.headers.toString() : String(msg.headers ?? "")
            const inReplyTo = getHeaderValue(headersStr, "in-reply-to")
            const references = getHeaderValue(headersStr, "references")
            const combined = `${inReplyTo} ${references}`

            const ids = Array.from(combined.matchAll(/<([^>]+)>/g)).map(m => m[1])
            const fromEmailAddress = msg.envelope?.from?.[0]?.address?.toLowerCase()?.trim()

            let sentEmail = null

            // Match by In-Reply-To / References headers first (most reliable)
            if (ids.length > 0) {
              sentEmail = await prisma.email.findFirst({
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
            }

            // Fallback: match by sender email (handles rewritten / missing Message-IDs)
            if (!sentEmail && fromEmailAddress) {
              sentEmail = await prisma.email.findFirst({
                where: {
                  lead: {
                    email: { equals: fromEmailAddress, mode: "insensitive" },
                    ...(target.userId ? { userId: target.userId } : {}),
                  },
                  status: { notIn: ["REPLIED", "FAILED"] },
                },
                orderBy: { sentAt: "desc" },
                include: {
                  lead: {
                    include: {
                      campaignLeads: { select: { campaignId: true } },
                      user: { select: { name: true, agencyName: true, companyName: true, companyDesc: true, tone: true } },
                    },
                  },
                },
              })
            }

            if (!sentEmail) { skipped++; continue }

            const lead = sentEmail.lead
            const campaignIds = lead.campaignLeads.map(cl => cl.campaignId)

            // Extract reply body (best-effort)
            let replyBody = ""
            try {
              const textPart = (msg.bodyParts as any)?.get?.("text")
              if (textPart) {
                const rawBody = Buffer.isBuffer(textPart) ? textPart.toString("utf8") : String(textPart)
                replyBody = cleanReplyBody(rawBody).slice(0, 2000)
              }
            } catch { /* body extraction is optional */ }

            const fromEmail = msg.envelope?.from?.[0]?.address ?? lead.email
            const replySubject = msg.envelope?.subject ?? `Re: ${sentEmail.subject}`

            // Idempotency check — skip if we already have this reply
            const existingReply = await prisma.reply.findFirst({
              where: {
                OR: [
                  { emailId: sentEmail.id },
                  { leadId: lead.id, body: replyBody || "(reply body not captured)" },
                ],
              },
            })
            if (existingReply) { skipped++; continue }

            // ── Phase 1 DB writes (no AI calls here) ─────────────────────────

            // 1. Atomically claim the sent email to prevent concurrent double-processing
            const claimed = await prisma.email.updateMany({
              where: { id: sentEmail.id, status: { notIn: ["REPLIED", "FAILED"] } },
              data: { status: "REPLIED", repliedAt: new Date(), replySnippet: replyBody.slice(0, 300) },
            })
            if (claimed.count === 0) { skipped++; continue }

            // 2. Create Reply record with status RECEIVED (Phase 2 will pick this up for AI)
            const newReply = await prisma.reply.create({
              data: {
                leadId: lead.id,
                emailId: sentEmail.id,
                fromEmail,
                subject: replySubject,
                body: replyBody || "(reply body not captured)",
                receivedAt: msg.envelope?.date ?? new Date(),
                status: "RECEIVED",
              },
            })

            // 3. Cancel all remaining queued / draft follow-ups immediately
            await prisma.email.deleteMany({
              where: { leadId: lead.id, status: { in: ["QUEUED", "DRAFT"] } },
            })

            // 4. Update lead + campaign counters + activity log
            await Promise.all([
              prisma.lead.update({
                where: { id: lead.id },
                data: { status: "REPLIED" },
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
                  metadata: { fromEmail, snippet: replyBody.slice(0, 150), replyId: newReply.id },
                },
              }),
            ])

            ingested++
          } catch (e) {
            console.error("[IMAP Phase1] Error processing message:", e)
            errors++
          }
        }
      } finally {
        lock.release()
      }

      // Update UID high-water mark after successful scan
      if (target.userId && highestUid > (target.lastUid ?? 0)) {
        await prisma.user.update({
          where: { id: target.userId },
          data: { imapLastUid: highestUid, imapLastSyncAt: new Date() },
        })
      }
    } catch (e: any) {
      if (
        e?.response?.includes("Too many simultaneous connections") ||
        e?.message?.includes("Too many simultaneous connections")
      ) {
        console.warn(`[IMAP Throttle] Gmail connection limit for ${target.user} — backing off 60s`)
        lastConnectTime.set(syncKey, Date.now() + 30_000)
      } else {
        console.error(`[IMAP Phase1] Connection error for ${target.user} (${imapConfig.host}):`, e)
      }
      errors++
    } finally {
      // Always close socket — Phase 2 AI work happens entirely outside this block
      try {
        await Promise.race([
          client.logout(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("logout timeout")), 2_500)),
        ])
      } catch {
        try { client.close() } catch { /* ignore */ }
      }
    }
  }

  return { ingested, skipped, errors }
}

// ── Phase 2: AI Processing Queue ──────────────────────────────────────────────

/**
 * Drains the Reply queue (status = RECEIVED), generating BattleCards and
 * firing the AI agent for each reply. Safe to call repeatedly — idempotent
 * via status transition RECEIVED → DRAFTED.
 *
 * @param batchSize  Max replies to process per invocation (default: 5)
 */
export async function processPendingReplies(batchSize = 5): Promise<ProcessResult> {
  const pending = await prisma.reply.findMany({
    where: { status: "RECEIVED" },
    orderBy: { receivedAt: "asc" },
    take: batchSize,
    include: {
      lead: {
        include: {
          user: { select: { name: true, agencyName: true, companyName: true, companyDesc: true, tone: true } },
        },
      },
      email: { select: { subject: true, body: true } },
    },
  })

  let processed = 0
  let failed = 0

  for (const reply of pending) {
    try {
      // Claim this reply atomically — prevents duplicate processing if two workers run
      const claimed = await prisma.reply.updateMany({
        where: { id: reply.id, status: "RECEIVED" },
        data: { status: "DRAFTED" },
      })
      if (claimed.count === 0) continue

      const lead = reply.lead

      // Generate BattleCard (non-fatal if it fails)
      let battleCardJson: string | null = null
      try {
        const card = await generateBattleCard({
          leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
          company: lead.company || "their company",
          industry: lead.industry || "business",
          website: lead.website,
          painPoint: lead.painPoint,
          recentNews: lead.recentNews,
          originalEmailSubject: reply.email?.subject ?? "",
          originalEmailBody: reply.email?.body ?? "",
          replyBody: reply.body,
          senderName: lead.user.name || "Your Name",
          senderCompany: lead.user.agencyName || lead.user.companyName || "Your Company",
          senderService: lead.user.companyDesc || "our services",
        })
        battleCardJson = JSON.stringify(card)
      } catch (e) {
        console.warn("[IMAP Phase2] BattleCard generation failed (non-fatal):", e)
      }

      await Promise.all([
        battleCardJson
          ? prisma.lead.update({ where: { id: lead.id }, data: { battleCard: battleCardJson } })
          : Promise.resolve(),
        battleCardJson
          ? prisma.activity.create({
              data: {
                leadId: lead.id,
                type: "BATTLE_CARD_GENERATED",
                note: "Battle card auto-generated from reply",
              },
            })
          : Promise.resolve(),
      ])

      // Fire AI agent (generates PendingAction for review or autonomous send)
      processReply(reply.id).catch(e => console.error("[IMAP Phase2] processReply error:", e))

      processed++
    } catch (e) {
      console.error(`[IMAP Phase2] Failed to process reply ${reply.id}:`, e)
      failed++
    }
  }

  return { processed, failed }
}

// ── Backwards-compat wrapper ──────────────────────────────────────────────────

/**
 * detectReplies — original public API, kept for backwards compatibility.
 * Runs Phase 1 (ingest) then Phase 2 (AI processing) in sequence.
 * Used by scripts/test-imap-detect.ts, scripts/backfill-replies.ts.
 */
export async function detectReplies(userId?: string): Promise<{ found: number; errors: number }> {
  const { ingested, errors: e1 } = await ingestReplies(userId)
  const { processed, failed } = await processPendingReplies(10)
  return { found: ingested + processed, errors: e1 + failed }
}

// Silence "unused" warnings for legacy re-exports kept for type safety
void (activeImapSyncs as unknown)
void (lastImapSyncTime as unknown)
void (MIN_IMAP_INTERVAL_MS as unknown)

