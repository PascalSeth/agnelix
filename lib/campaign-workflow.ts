export type WorkflowPhase =
  | "no-leads"
  | "enriching"
  | "ready"
  | "generating"
  | "sending"
  | "review"
  | "live"
  | "paused"

type LeadLike = {
  status: string
  contactsJson?: string | null
  emails: { status: string }[]
}

export function computeWorkflowPhase(
  status: string,
  autonomous: boolean,
  leads: LeadLike[],
  isGenerating = false,
): WorkflowPhase {
  if (status === "PAUSED") return "paused"
  if (leads.length === 0) return "no-leads"

  const enriching = leads.some(l => l.status === "NEW" && !l.contactsJson)
  if (enriching) return "enriching"

  const withoutDrafts = leads.filter(l =>
    l.emails.length === 0 && !["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED"].includes(l.status)
  ).length
  const hasDrafts = leads.some(l => l.emails.some(e => e.status === "DRAFT"))
  const hasPending = leads.some(l => l.emails.some(e => ["QUEUED", "SENDING"].includes(e.status)))
  const hasFailed = leads.some(l => l.emails.some(e => e.status === "FAILED"))

  if (status === "DRAFT") return "ready"

  if (withoutDrafts > 0 || isGenerating) return "generating"

  if (hasPending) return "sending"

  if (!autonomous && hasDrafts) return "review"

  if (hasFailed && !autonomous) return "review"

  if (status === "ACTIVE") return "live"

  return "ready"
}

export const WORKFLOW_COPY: Record<WorkflowPhase, { title: string; description: string }> = {
  "no-leads": {
    title: "Add leads to get started",
    description: "Find leads on Maps or upload a CSV, then launch your campaign.",
  },
  enriching: {
    title: "Enriching lead data",
    description: "Researching contacts, LinkedIn profiles, and website audits — this runs automatically.",
  },
  ready: {
    title: "Ready to launch",
    description: "Hit Launch — AI will write personalised emails and queue your sequence.",
  },
  generating: {
    title: "Writing outreach emails",
    description: "AI is generating personalised drafts for your leads. Sending starts automatically.",
  },
  sending: {
    title: "Sending emails",
    description: "Your outreach is going out via SMTP. Status updates live below.",
  },
  review: {
    title: "Drafts ready for review",
    description: "Review and edit emails below, then approve when you're happy to send.",
  },
  live: {
    title: "Campaign live",
    description: "Outreach is running. Follow-ups send automatically on schedule.",
  },
  paused: {
    title: "Campaign paused",
    description: "No emails will send until you resume.",
  },
}
