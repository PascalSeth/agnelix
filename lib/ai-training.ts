import { prisma } from "./db"

// AI training layer. Two kinds of rules are fetched here and injected as a
// directive block into AI prompts:
//  - Platform rules (userId null) — authored at /admin by a superadmin, scoped
//    to "global" or a playbook type (sales, smm, seo, etc.), apply across the platform.
//  - Agency rules (userId set) — taught by a company itself from its AI
//    Settings page, apply only to that company's own generations.
// Surface resolution: ALL + the specific surface. Cached in-memory for 60s so
// hot paths (email drafting, reply handling, live chat) don't add a query per generation.

export type TrainingSurface = "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR"

interface CacheEntry {
  block: string
  expires: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

export async function getTrainingBlock(
  surface: TrainingSurface,
  playbookType?: string | null,
  userId?: string | null
): Promise<string> {
  const resolvedPlaybook = playbookType || "sales"
  const key = `${surface}:${resolvedPlaybook}:${userId ?? "-"}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.block

  let block = ""
  try {
    // Include both 'global' and 'sales' scopes by default (plus custom playbook if specified)
    const validScopes = Array.from(
      new Set(["global", "sales", ...(playbookType ? [playbookType] : [])])
    )

    const rules = await prisma.aiTrainingRule.findMany({
      where: {
        enabled: true,
        surface: { in: ["ALL", surface] },
        OR: userId
          ? [{ userId: null, scope: { in: validScopes } }, { userId }]
          : [{ userId: null, scope: { in: validScopes } }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 60,
    })

    if (rules.length > 0) {
      const format = (list: typeof rules) =>
        list
          .map((r, i) => {
            let s = `${i + 1}. [${r.title.toUpperCase()}]\n   DIRECTIVE: ${r.instruction.trim()}`
            if (r.goodExample?.trim()) {
              s += `\n   ✓ HIGH-CONVERTING EXAMPLE:\n     ${r.goodExample.trim().replace(/\n/g, "\n     ")}`
            }
            if (r.badExample?.trim()) {
              s += `\n   ✕ ANTI-PATTERN TO AVOID:\n     ${r.badExample.trim().replace(/\n/g, "\n     ")}`
            }
            return s
          })
          .join("\n\n")

      const platformRules = rules.filter(r => !r.userId)
      const agencyRules = rules.filter(r => r.userId)
      const parts: string[] = []

      if (agencyRules.length > 0) {
        parts.push(
          `[MANDATORY COMPANY PROCEDURES & INTERNAL PLAYBOOK — HIGHEST PRIORITY / OVERRIDES ALL DEFAULTS]:\n` +
          `CRITICAL DIRECTIVE: You represent this specific company. The following internal procedures, brand voice requirements, objection counter-scripts, qualification rules, and pricing policies were taught specifically by this company.\n` +
          `You MUST execute these rules as strict, non-negotiable law. If any company rule below differs from or modifies standard platform rules or general advice, the company rule OVERRIDES it completely:\n\n` +
          format(agencyRules)
        )
      }

      if (platformRules.length > 0) {
        parts.push(
          `[PLATFORM BASELINE DIRECTIVES & GENERAL DIRECT-RESPONSE FOUNDATIONS]:\n` +
          `Follow these proven direct-response foundations unless explicitly modified or overridden by the company procedures above:\n\n` +
          format(platformRules)
        )
      }

      block = `\n${parts.join("\n\n")}\n`
    }
  } catch (err) {
    // Training must never break generation — fail open with no block
    console.error("[ai-training] Failed to load training rules:", err)
  }

  cache.set(key, { block, expires: Date.now() + CACHE_TTL_MS })
  return block
}

/** Drop the cache so admin edits or new training rules apply immediately. */
export function invalidateTrainingCache() {
  cache.clear()
}
