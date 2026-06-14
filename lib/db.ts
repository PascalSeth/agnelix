import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// ── Background Poller (Offline Execution) ────────────────────────────────────
const globalForPoller = globalThis as unknown as { pollerStarted?: boolean }

if (!globalForPoller.pollerStarted) {
  globalForPoller.pollerStarted = true

  if (process.env.NODE_ENV !== "test") {
    // Start background email/reply detection and sequence/auto-actions scheduler loops
    console.log("[Background Poller] Starting background IMAP & scheduler loops...")

    // 1. Poll new replies from IMAP every 10 seconds
    setInterval(async () => {
      try {
        const { detectReplies } = await import("./imap")
        await detectReplies()
      } catch (err) {
        console.error("[Background Poller] IMAP replies poll error:", err)
      }
    }, 10000)

    // 2. Poll sequence queue sending and expired auto-actions every 10 seconds
    setInterval(async () => {
      try {
        const { processSequenceQueue } = await import("./scheduler")
        await processSequenceQueue()

        // Auto-execute any expired pending actions
        const { executePendingAction } = await import("./agent-core")
        const now = new Date()
        const expiredActions = await prisma.pendingAction.findMany({
          where: { status: "PENDING", expiresAt: { lte: now } },
          include: {
            lead: { include: { user: true } },
            reply: {
              include: {
                email: {
                  include: {
                    campaign: true,
                  },
                },
              },
            },
          },
        })

        for (const action of expiredActions) {
          try {
            const isAutonomous = action.reply?.email?.campaign?.autonomous ?? false
            if (action.type === "SEND_REPLY" && action.riskLevel === "HIGH" && !isAutonomous) {
              continue
            }
            await executePendingAction(action, "auto")
          } catch (e) {
            console.error("[Background Poller] Expired action execution error:", e)
          }
        }
      } catch (err) {
        console.error("[Background Poller] Scheduler poll error:", err)
      }
    }, 10000)
  }
}
