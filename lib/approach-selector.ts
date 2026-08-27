/* eslint-disable @typescript-eslint/no-explicit-any */

export type OutreachApproachId =
  | "website"
  | "local-rank"
  | "competitor"
  | "industry"
  | "review-friction"
  | "roadmap"
  | "question"

export interface ApproachInfo {
  id: OutreachApproachId
  label: string
  tagline: string
  reason: string
}

export const ALL_APPROACHES: { id: OutreachApproachId; label: string; tagline: string }[] = [
  { id: "website", label: "Website & Tech Audit", tagline: "Highlights verified performance, SSL, or speed issues" },
  { id: "local-rank", label: "Local SEO & Map Pack", tagline: "Targets local search dominance and missing buyer visibility" },
  { id: "competitor", label: "Competitor Market Gap", tagline: "Shows what rival businesses are doing to capture market share" },
  { id: "review-friction", label: "Review & Intake Friction", tagline: "Addresses customer conversion bottlenecks and reputation gaps" },
  { id: "roadmap", label: "Expansion & Growth Trigger", tagline: "Hooks into recent announcements, hiring, or expansion moves" },
  { id: "industry", label: "Industry Shift", tagline: "Frames outreach around modern regulatory or technological shifts" },
  { id: "question", label: "Diagnostic Question", tagline: "Opens with a consultative discovery question on client acquisition" },
]

/**
 * Intelligently determines the highest-converting outreach angle for a given lead
 * based on their technical audit, reviews, public signals, and company data.
 */
export function determineOptimalApproach(lead: {
  company?: string | null
  website?: string | null
  industry?: string | null
  painPoint?: string | null
  recentNews?: string | null
  notes?: string | null
  auditJson?: string | null
  recommendedApproach?: string | null
}): ApproachInfo {
  // If explicitly set and valid, use it
  if (lead.recommendedApproach) {
    const matched = ALL_APPROACHES.find(a => a.id === lead.recommendedApproach)
    if (matched) {
      return {
        ...matched,
        reason: "Previously identified by AI deep research as highest converting angle.",
      }
    }
  }

  // Parse audit if available
  let audit: any = null
  if (lead.auditJson) {
    try {
      audit = JSON.parse(lead.auditJson)
    } catch { /* skip */ }
  }

  const painPoint = (lead.painPoint || "").toLowerCase()
  const recentNews = (lead.recentNews || "").toLowerCase()
  const notes = (lead.notes || "").toLowerCase()

  // 1. Check for Website & Technical issues
  const hasTechIssues =
    (audit && (!audit.ssl || audit.speed > 2500 || !audit.pixel || !audit.mobile)) ||
    painPoint.includes("ssl") ||
    painPoint.includes("speed") ||
    painPoint.includes("pixel") ||
    painPoint.includes("mobile")

  // 2. Check for Review / Reputation friction
  const hasReviewFriction =
    notes.includes("rating: 3.") ||
    notes.includes("rating: 2.") ||
    notes.includes("rating: 1.") ||
    painPoint.includes("review") ||
    painPoint.includes("reputation") ||
    painPoint.includes("complaint")

  // 3. Check for Roadmap / Expansion signals
  const hasRoadmapSignals =
    recentNews.includes("announc") ||
    recentNews.includes("hiring") ||
    recentNews.includes("expand") ||
    recentNews.includes("growth") ||
    recentNews.includes("new location")

  // Heuristic prioritization:
  if (hasReviewFriction) {
    return {
      id: "review-friction",
      label: "Review & Intake Friction",
      tagline: "Addresses customer conversion bottlenecks and reputation gaps",
      reason: "Detected customer feedback friction points or sub-optimal ratings that represent an immediate booking bottleneck.",
    }
  }

  if (hasTechIssues && lead.website) {
    return {
      id: "website",
      label: "Website & Tech Audit",
      tagline: "Highlights verified performance, SSL, or speed issues",
      reason: "Detected specific technical friction (SSL, mobile viewport, or page speed) that can be proven to the decision maker.",
    }
  }

  if (hasRoadmapSignals) {
    return {
      id: "roadmap",
      label: "Expansion & Growth Trigger",
      tagline: "Hooks into recent announcements, hiring, or expansion moves",
      reason: "Public growth signals detected — business is in an active expansion phase with budget for scaling.",
    }
  }

  // 4. Local service businesses with website -> Local SEO
  const industry = (lead.industry || "").toLowerCase()
  const isLocalNiche =
    industry.includes("clinic") ||
    industry.includes("dental") ||
    industry.includes("spa") ||
    industry.includes("roof") ||
    industry.includes("hvac") ||
    industry.includes("plumb") ||
    industry.includes("law") ||
    industry.includes("doctor")

  if (isLocalNiche && lead.website) {
    return {
      id: "local-rank",
      label: "Local SEO & Map Pack",
      tagline: "Targets local search dominance and missing buyer visibility",
      reason: "High-value local commercial service where dominating top 3 Google Maps positions directly multiplies inbound clients.",
    }
  }

  if (!lead.website) {
    return {
      id: "question",
      label: "Diagnostic Question",
      tagline: "Opens with a consultative discovery question on client acquisition",
      reason: "No active website detected — open with consultative diagnostic inquiry rather than technical breakdown.",
    }
  }

  // Default smart fallback
  return {
    id: "competitor",
    label: "Competitor Market Gap",
    tagline: "Shows what rival businesses are doing to capture market share",
    reason: "Established market position — framing around competitor client acquisition gaps yields highest response rate.",
  }
}
