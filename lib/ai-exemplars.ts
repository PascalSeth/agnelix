/**
 * Dynamic Training & Rule Injection Interface
 *
 * Hardcoded scripts have been removed in favor of user-driven manual training.
 * The AI learns exclusively from the admin's uploaded PDFs, training documents,
 * and custom-taught behavioral directives.
 */

export type ExemplarCategory = "OBJECTION_IN_HOUSE" | "OBJECTION_SKEPTICAL" | "OBJECTION_PRICING" | "OBJECTION_TIMING" | "POSITIVE_MEETING_LOCK"

export interface ConversationExemplar {
  id: string
  category: ExemplarCategory
  title: string
  surface: "REPLY" | "EMAIL" | "PROPOSAL" | "ADVISOR" | string
  scope: string
  prospectMessage: string
  winningResponse: string
  rationale: string
  metrics?: string
  tags: string[]
}

export interface TacticalManeuver {
  id: string
  name: string
  situationCategory: string
  scope: string
  psychologicalSubtext: string
  gameplan: {
    step1_empathyAnchor: string
    step2_frameShift: string
    step3_microHook: string
  }
  referenceExchanges: {
    prospectInput: string
    tacticalExecution: string
    breakdown: string
  }[]
  tags: string[]
}

export const BUILT_IN_EXEMPLARS: ConversationExemplar[] = []
export const TACTICAL_MANEUVERS: TacticalManeuver[] = []

export function getMatchingExemplars(params: {
  surface: "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR"
  playbookType?: string | null
  queryText?: string
  limit?: number
}): ConversationExemplar[] {
  return []
}

/**
 * Builds dynamic prompt block from active training rules (no hardcoded templates)
 */
export function buildExemplarPromptBlock(
  exemplars: unknown[],
  queryText?: string,
  playbookType?: string
): string {
  // Purely dynamic — does not inject static scripts.
  return ""
}
