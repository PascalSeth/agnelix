/**
 * Inbox interaction helpers:
 * - Track which questions have been asked to prevent duplicates
 * - Generate contextual follow-up logic
 * - Prevent duplicate sends on timer expiry
 */

import { prisma } from "./db"

export interface AskedQuestion {
  id: string
  question: string
  askedAt: Date
  userAnswer?: string
  respondedAt?: Date
  autoSentAt?: Date
}

/**
 * Get questions already asked to this lead in recent interactions
 * Returns last 5 asked questions to prevent repetition
 */
export async function getRecentlyAskedQuestions(leadId: string): Promise<AskedQuestion[]> {
  const recentQuestions = await prisma.activity.findMany({
    where: {
      leadId,
      type: "NOTE_ADDED",
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return recentQuestions
    .filter(a => a.note?.includes("[AI_QUESTION]"))
    .map((a, i) => ({
      id: a.id,
      question: a.note?.replace("[AI_QUESTION]", "").trim() || "",
      askedAt: a.createdAt,
      userAnswer: undefined,
      respondedAt: undefined,
      autoSentAt: undefined,
    }))
}

/**
 * Record that a question was asked to a lead
 */
export async function recordQuestionAsked(
  leadId: string,
  question: string,
  context: string
): Promise<void> {
  await prisma.activity.create({
    data: {
      leadId,
      type: "NOTE_ADDED",
      note: `[AI_QUESTION] ${question}\nContext: ${context}`,
    },
  })
}

/**
 * Check if a pending action already exists for this reply
 * to prevent duplicate sends when timer expires
 */
export async function hasDuplicatePendingAction(replyId: string, leadId: string): Promise<boolean> {
  const existing = await prisma.pendingAction.findFirst({
    where: {
      replyId,
      leadId,
      status: { in: ["PENDING", "APPROVED"] },
    },
  })
  return !!existing
}

/**
 * Mark a pending action as auto-sent after timer expiry with no user response
 */
export async function markAsAutoSentAfterTimeout(pendingActionId: string): Promise<void> {
  await prisma.pendingAction.update({
    where: { id: pendingActionId },
    data: {
      status: "AUTO_EXECUTED",
      executedAt: new Date(),
      metadata: {
        autoSentAfterTimeout: true,
        reason: "User did not respond to interactive question within timeout window",
      },
    },
  })
}

/**
 * Suggest a follow-up action based on the lead's answer to a question
 */
export function getSuggestedFollowUp(
  leadAnswer: string,
  questionContext: string
): {
  suggestedAction: string
  priority: "high" | "medium" | "low"
} {
  const answerLower = leadAnswer.toLowerCase()

  // High priority indicators
  if (answerLower.includes("urgent") || answerLower.includes("asap") || answerLower.includes("now")) {
    return {
      suggestedAction: "Schedule a call within 24 hours. This lead is hot.",
      priority: "high",
    }
  }

  // Budget answers
  if (
    answerLower.includes("$") ||
    answerLower.includes("k") ||
    answerLower.includes("thousand") ||
    answerLower.includes("million")
  ) {
    return {
      suggestedAction: "Send a tailored proposal with their budget in mind. No sticker shock.",
      priority: "high",
    }
  }

  // Objection answers
  if (
    answerLower.includes("cost") ||
    answerLower.includes("price") ||
    answerLower.includes("expensive") ||
    answerLower.includes("affordab")
  ) {
    return {
      suggestedAction:
        "Prepare ROI talking points or tiered pricing options. Address cost head-on.",
      priority: "high",
    }
  }

  // Timeline answers
  if (
    answerLower.includes("next quarter") ||
    answerLower.includes("next month") ||
    answerLower.includes("this month")
  ) {
    return {
      suggestedAction: "Move to proposal stage. They're ready.",
      priority: "high",
    }
  }

  // Committee/approval needed
  if (
    answerLower.includes("need to") ||
    answerLower.includes("team") ||
    answerLower.includes("approval") ||
    answerLower.includes("boss")
  ) {
    return {
      suggestedAction: "Ask for stakeholder intros. Narrow the buying committee.",
      priority: "medium",
    }
  }

  // Generic positive signal
  if (
    answerLower.includes("yes") ||
    answerLower.includes("interested") ||
    answerLower.includes("sounds good")
  ) {
    return {
      suggestedAction: "Send a proposal or next-step calendar link.",
      priority: "medium",
    }
  }

  // Default: nurture
  return {
    suggestedAction: "Add to nurture campaign. They're thinking about it.",
    priority: "low",
  }
}
