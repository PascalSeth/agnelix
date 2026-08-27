#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * scripts/imap-daemon.ts — Real-Time IMAP IDLE Push Daemon
 *
 * Maintains persistent IMAP connections (one per active user) and uses the
 * IMAP IDLE command to receive instant server-push notifications when new
 * email arrives — eliminating the 5-minute polling lag of serverless crons.
 *
 * Architecture:
 *   1. On startup, loads all users with SMTP credentials from the DB.
 *   2. Opens an IMAP IDLE connection per user.
 *   3. On "exists" event (new email arrived): runs Phase 1 ingest + Phase 2 AI.
 *   4. Reconnects with exponential backoff on disconnect / error.
 *   5. Graceful shutdown on SIGTERM / SIGINT (used by PM2, Docker, etc.).
 *
 * Usage:
 *   npx tsx scripts/imap-daemon.ts
 *
 * With PM2 (recommended for production):
 *   pm2 start --interpreter=tsx scripts/imap-daemon.ts --name imap-daemon
 *   pm2 save && pm2 startup
 */

import "dotenv/config"
import { ImapFlow } from "imapflow"
import { prisma } from "../lib/db"
import { ingestReplies, processPendingReplies, resolveImapConfig } from "../lib/imap"
import { decryptSecret } from "../lib/crypto"

// ── Config ────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS   = 5 * 60 * 1000  // re-check for new users every 5 min
const MAX_BACKOFF_MS     = 5 * 60 * 1000  // max reconnect wait: 5 minutes
const INITIAL_BACKOFF_MS = 5_000          // first reconnect after 5 seconds
const AI_BATCH_SIZE      = 3             // max replies to AI-process per IDLE event
const IDLE_TIMEOUT_MS    = 20 * 60 * 1000 // IMAP IDLE max is 29 min; we renew at 20 min

// ── State ─────────────────────────────────────────────────────────────────────

interface ConnectionState {
  userId: string
  email: string
  client: ImapFlow | null
  idleHandle: any | null
  backoffMs: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
  isShuttingDown: boolean
  lastIdleAt: number
  idleRenewTimer: ReturnType<typeof setTimeout> | null
}

const connections = new Map<string, ConnectionState>()
let isShuttingDown = false

// ── IDLE connection manager ───────────────────────────────────────────────────

async function loadUsers(): Promise<{ id: string; email: string; pass: string; smtpHost: string | null }[]> {
  const users = await prisma.user.findMany({
    where: { fromEmail: { not: null }, smtpPass: { not: null } },
    select: { id: true, fromEmail: true, smtpPass: true, smtpHost: true },
  })

  const out = []
  for (const u of users) {
    try {
      out.push({ id: u.id, email: u.fromEmail!, pass: decryptSecret(u.smtpPass!), smtpHost: u.smtpHost })
    } catch (e) {
      console.warn(`[Daemon] Failed to decrypt password for ${u.fromEmail}:`, e)
    }
  }

  // Env-var fallback for dev
  if (out.length === 0 && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    out.push({ id: "env", email: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD, smtpHost: null })
  }

  return out
}

async function connectIdle(state: ConnectionState, pass: string, smtpHost: string | null) {
  if (state.isShuttingDown || isShuttingDown) return

  const imapConfig = resolveImapConfig(state.email, smtpHost)
  console.log(`[Daemon] Connecting ${state.email} → ${imapConfig.host}:${imapConfig.port}`)

  const client = new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.secure,
    auth: { user: state.email, pass },
    logger: false,
    socketTimeout: 30_000,
  })
  state.client = client

  // ── Event handlers ──────────────────────────────────────────────────────────

  client.on("error", (e: Error) => {
    if (!state.isShuttingDown && !isShuttingDown) {
      console.error(`[Daemon] IMAP error for ${state.email}:`, e.message)
      scheduleReconnect(state, pass, smtpHost)
    }
  })

  client.on("close", () => {
    if (!state.isShuttingDown && !isShuttingDown) {
      console.log(`[Daemon] Connection closed for ${state.email}, reconnecting...`)
      scheduleReconnect(state, pass, smtpHost)
    }
  })

  try {
    await client.connect()
    console.log(`[Daemon] Connected: ${state.email}`)
    state.backoffMs = INITIAL_BACKOFF_MS // reset backoff on success

    await startIdle(state, pass, smtpHost)
  } catch (e: any) {
    console.error(`[Daemon] Connection failed for ${state.email}:`, e.message)
    scheduleReconnect(state, pass, smtpHost)
  }
}

async function startIdle(state: ConnectionState, pass: string, smtpHost: string | null) {
  const client = state.client
  if (!client || state.isShuttingDown) return

  try {
    const lock = await client.getMailboxLock("INBOX")

    try {
      console.log(`[Daemon] Entering IDLE for ${state.email}`)
      state.lastIdleAt = Date.now()

      // Schedule IDLE renewal (IMAP IDLE must be renewed every < 29 minutes)
      if (state.idleRenewTimer) clearTimeout(state.idleRenewTimer)
      state.idleRenewTimer = setTimeout(async () => {
        if (state.isShuttingDown || isShuttingDown) return
        console.log(`[Daemon] Renewing IDLE for ${state.email}`)
        try {
          if (state.idleHandle) await state.idleHandle.stop()
        } catch { /* ignore */ }
        await startIdle(state, pass, smtpHost)
      }, IDLE_TIMEOUT_MS)

      // Start IMAP IDLE — idleNotify fires on any mailbox change (new mail, seen, etc.)
      await client.idle()

    } finally {
      lock.release()
    }
  } catch (e: any) {
    console.error(`[Daemon] IDLE error for ${state.email}:`, e.message)
    scheduleReconnect(state, pass, smtpHost)
    return
  }

  // IDLE returned (new data available) — run Phase 1 + Phase 2
  console.log(`[Daemon] IDLE triggered for ${state.email} — running ingest...`)
  try {
    const ingest = await ingestReplies(state.userId === "env" ? undefined : state.userId)
    if (ingest.ingested > 0 || ingest.errors > 0) {
      console.log(`[Daemon] ${state.email} — Phase 1: ${ingest.ingested} ingested, ${ingest.skipped} skipped, ${ingest.errors} errors`)
    }

    if (ingest.ingested > 0) {
      const proc = await processPendingReplies(AI_BATCH_SIZE)
      console.log(`[Daemon] ${state.email} — Phase 2: ${proc.processed} processed, ${proc.failed} failed`)
    }
  } catch (e) {
    console.error(`[Daemon] Ingest error for ${state.email}:`, e)
  }

  // Re-enter IDLE after processing (unless shutting down)
  if (!state.isShuttingDown && !isShuttingDown) {
    await startIdle(state, pass, smtpHost)
  }
}

function scheduleReconnect(state: ConnectionState, pass: string, smtpHost: string | null) {
  if (state.isShuttingDown || isShuttingDown) return
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
  if (state.idleRenewTimer) clearTimeout(state.idleRenewTimer)

  // Close stale client
  try { state.client?.close() } catch { /* ignore */ }
  state.client = null
  state.idleHandle = null

  console.log(`[Daemon] Reconnecting ${state.email} in ${state.backoffMs / 1000}s...`)
  state.reconnectTimer = setTimeout(() => {
    if (!state.isShuttingDown && !isShuttingDown) {
      connectIdle(state, pass, smtpHost)
    }
  }, state.backoffMs)

  // Exponential backoff with jitter, capped at MAX_BACKOFF_MS
  state.backoffMs = Math.min(state.backoffMs * 2 + Math.random() * 1000, MAX_BACKOFF_MS)
}

// ── Lifecycle management ──────────────────────────────────────────────────────

async function syncUsers() {
  if (isShuttingDown) return
  const users = await loadUsers()

  // Start connections for new users
  for (const u of users) {
    if (!connections.has(u.id)) {
      const state: ConnectionState = {
        userId: u.id,
        email: u.email,
        client: null,
        idleHandle: null,
        backoffMs: INITIAL_BACKOFF_MS,
        reconnectTimer: null,
        isShuttingDown: false,
        lastIdleAt: 0,
        idleRenewTimer: null,
      }
      connections.set(u.id, state)
      connectIdle(state, u.pass, u.smtpHost)
    }
  }

  // Stop connections for users no longer in DB
  const activeIds = new Set(users.map(u => u.id))
  for (const [id, state] of connections) {
    if (!activeIds.has(id)) {
      console.log(`[Daemon] User ${state.email} removed — disconnecting`)
      state.isShuttingDown = true
      if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
      if (state.idleRenewTimer) clearTimeout(state.idleRenewTimer)
      try { state.client?.close() } catch { /* ignore */ }
      connections.delete(id)
    }
  }
}

async function shutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`\n[Daemon] Received ${signal} — graceful shutdown...`)

  for (const [, state] of connections) {
    state.isShuttingDown = true
    if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
    if (state.idleRenewTimer) clearTimeout(state.idleRenewTimer)
    try { await state.client?.logout() } catch { try { state.client?.close() } catch { /* ignore */ } }
  }

  console.log("[Daemon] Shutdown complete.")
  process.exit(0)
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

async function main() {
  console.log("[Daemon] IMAP IDLE Daemon starting...")

  // Initial load
  await syncUsers()
  console.log(`[Daemon] Monitoring ${connections.size} account(s). Press Ctrl+C to stop.`)

  // Periodically sync new/removed users from DB
  setInterval(syncUsers, POLL_INTERVAL_MS)

  // Graceful shutdown handlers
  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT",  () => shutdown("SIGINT"))
  process.on("uncaughtException", (e) => {
    console.error("[Daemon] Uncaught exception:", e)
    // Don't exit — let individual connection error handlers recover
  })
  process.on("unhandledRejection", (reason) => {
    console.error("[Daemon] Unhandled rejection:", reason)
  })
}

main().catch(e => {
  console.error("[Daemon] Fatal startup error:", e)
  process.exit(1)
})
