/**
 * Training Integration Layer
 *
 * Ensures training rules flow through ALL AI generation surfaces as playbook-specific skills.
 * Not general knowledge — specific to the workspace/playbook the user is running.
 *
 * When admin teaches a lesson at /admin → it becomes live skill in:
 * - Email generation (step 1, 2, 3)
 * - Reply drafting (objection handling)
 * - Proposal generation (closing pitch)
 * - AI advisor (strategic recommendations)
 * All scoped to the active playbook type (Sales OS, Social OS, SEO OS, etc.)
 */

import { prisma } from "./db"
import { getTrainingBlock, type TrainingSurface, invalidateTrainingCache } from "./ai-training"
import { getWorkspace } from "./workspaces"

/**
 * Get playbook-specific training for a given surface and workspace
 * This is called during AI generation to inject live training rules
 */
export async function getPlaybookTraining(
  surface: TrainingSurface,
  playbookType?: string | null
): Promise<string> {
  // getTrainingBlock already handles scope resolution:
  // - Loads "global" rules (apply everywhere)
  // - Loads rules scoped to this playbookType (Sales OS-specific, etc.)
  // - Filters by surface (EMAIL, REPLY, PROPOSAL, ADVISOR)
  // - Returns a formatted directive block
  return await getTrainingBlock(surface, playbookType)
}

/**
 * When admin creates/modifies a training rule, invalidate cache so it takes effect immediately
 * across all AI generation surfaces
 */
export function applyTrainingImmediately(): void {
  invalidateTrainingCache()
}

/**
 * Track which playbook-specific skills are most effective
 * Helps admins understand which training rules actually improve results
 */
export async function getPlaybookTrainingMetrics(playbookType?: string | null) {
  const rules = await prisma.aiTrainingRule.findMany({
    where: {
      enabled: true,
      scope: playbookType ? { in: ["global", playbookType] } : "global",
    },
    select: {
      id: true,
      instruction: true,
      surface: true,
      scope: true,
      priority: true,
      source: true,
      createdAt: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  })

  const byWorkspace = {
    playbook: playbookType || "global",
    workspace: playbookType ? getWorkspace(playbookType) : null,
    totalRules: rules.length,
    bySource: {
      manual: rules.filter(r => r.source === "manual").length,
      session: rules.filter(r => r.source === "session").length,
      document: rules.filter(r => r.source === "document").length,
    },
    bySurface: {
      EMAIL: rules.filter(r => r.surface === "EMAIL" || r.surface === "ALL").length,
      REPLY: rules.filter(r => r.surface === "REPLY" || r.surface === "ALL").length,
      PROPOSAL: rules.filter(r => r.surface === "PROPOSAL" || r.surface === "ALL").length,
      ADVISOR: rules.filter(r => r.surface === "ADVISOR" || r.surface === "ALL").length,
    },
    byPriority: {
      HIGH: rules.filter(r => r.priority >= 10).length,
      MEDIUM: rules.filter(r => r.priority >= 5 && r.priority < 10).length,
      LOW: rules.filter(r => r.priority < 5).length,
    },
    rules: rules.map(r => ({
      id: r.id,
      instruction: r.instruction,
      surface: r.surface,
      scope: r.scope,
      priority: r.priority,
      source: r.source,
      createdAt: r.createdAt,
    })),
  }

  return byWorkspace
}

/**
 * Verify training is active for a playbook
 * Called at startup or when admin enables/disables playbooks
 */
export async function verifyPlaybookTrainingActive(playbookType: string): Promise<{
  active: boolean
  ruleCount: number
  surfaces: string[]
}> {
  const rules = await prisma.aiTrainingRule.findMany({
    where: {
      enabled: true,
      scope: { in: ["global", playbookType] },
    },
    select: {
      surface: true,
    },
  })

  const surfaces = [...new Set(rules.map(r => r.surface as string))]

  return {
    active: rules.length > 0,
    ruleCount: rules.length,
    surfaces,
  }
}

/**
 * When switching playbooks, ensure training is ready
 * Validates that the playbook has training rules if expected
 */
export async function ensurePlaybookTrainingReady(playbookType: string): Promise<void> {
  const status = await verifyPlaybookTrainingActive(playbookType)
  if (!status.active) {
    console.warn(`[Training] Playbook "${playbookType}" has no training rules. AI will use defaults.`)
  } else {
    console.log(
      `[Training] Playbook "${playbookType}" has ${status.ruleCount} active rules across surfaces: ${status.surfaces.join(", ")}`
    )
  }
}

/**
 * Export training metrics for reporting
 * Shows which skills are trained across all playbooks
 */
export async function getAllPlaybooksTrainingReport() {
  const allRules = await prisma.aiTrainingRule.findMany({
    where: { enabled: true },
    select: {
      id: true,
      scope: true,
      surface: true,
      instruction: true,
      source: true,
    },
  })

  const byScope = allRules.reduce(
    (acc, rule) => {
      const scope = rule.scope || "global"
      if (!acc[scope]) {
        acc[scope] = {
          scope,
          ruleCount: 0,
          surfaces: new Set<string>(),
          instructions: [],
        }
      }
      acc[scope].ruleCount++
      acc[scope].surfaces.add(rule.surface)
      acc[scope].instructions.push(rule.instruction)
      return acc
    },
    {} as Record<string, { scope: string; ruleCount: number; surfaces: Set<string>; instructions: string[] }>
  )

  return Object.values(byScope).map(entry => ({
    scope: entry.scope,
    ruleCount: entry.ruleCount,
    surfaces: Array.from(entry.surfaces),
    skills: entry.instructions,
  }))
}
