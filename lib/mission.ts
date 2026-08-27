import { prisma } from "./db"
import { getWorkspace } from "./workspaces"

// Today's Mission: a deterministic, prioritized work queue derived from tables
// Galien already writes. Each workspace weights the same underlying signals
// differently — the AI narrates this queue, it does not invent it.

export interface MissionItem {
  id: string
  title: string
  detail: string
  priority: "high" | "medium"
  href: string
  kind: string
  count: number
}

export interface Mission {
  workspace: string
  items: MissionItem[]
  completedToday: number
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function buildMission(userId: string, playbookType: string | null | undefined): Promise<Mission> {
  const ws = getWorkspace(playbookType)
  const today = startOfToday()
  const items: MissionItem[] = []

  const [
    reviewActions,
    linkedinTasks,
    unhandledReplies,
    viewedProposals,
    staleProposals,
    draftStep1,
    executedToday,
    sentToday,
  ] = await Promise.all([
    prisma.pendingAction.count({ where: { userId, status: "PENDING", type: { not: "LINKEDIN_TASK" } } }),
    prisma.pendingAction.count({ where: { userId, status: "PENDING", type: "LINKEDIN_TASK" } }),
    prisma.reply.count({ where: { lead: { userId }, status: "RECEIVED" } }),
    prisma.proposal.count({ where: { userId, status: "VIEWED" } }),
    prisma.proposal.count({
      where: { userId, status: "SENT", sentAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.email.count({
      where: { lead: { userId }, status: "DRAFT", stepNumber: 1, campaign: { status: "ACTIVE" } },
    }),
    prisma.pendingAction.count({
      where: { userId, status: { in: ["APPROVED", "AUTO_EXECUTED"] }, executedAt: { gte: today } },
    }),
    prisma.email.count({ where: { lead: { userId }, status: "SENT", sentAt: { gte: today } } }),
  ])

  // ── Workspace-specific signals (pinned first within their priority) ────────
  if (ws.type === "social_media") {
    const [pendingApproval, shipToday] = await Promise.all([
      prisma.contentCalendar.count({ where: { userId, status: "PENDING_APPROVAL" } }),
      prisma.contentCalendar.count({
        where: {
          userId,
          status: { in: ["APPROVED", "SCHEDULED"] },
          scheduledFor: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        },
      }),
    ])
    if (pendingApproval > 0)
      items.push({ id: "content-approval", kind: "content", priority: "high", count: pendingApproval, title: `Approve ${pendingApproval} post${pendingApproval > 1 ? "s" : ""}`, detail: "Content waiting for approval blocks the week's schedule", href: "/content-calendar" })
    if (shipToday > 0)
      items.push({ id: "content-ship", kind: "content", priority: "medium", count: shipToday, title: `${shipToday} post${shipToday > 1 ? "s" : ""} ship today`, detail: "Approved content scheduled for today", href: "/content-calendar" })
  }

  if (ws.type === "finance") {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    const [wonClients, financialsThisMonth, latestFinancials] = await Promise.all([
      prisma.lead.findMany({ where: { userId, status: "WON" }, select: { id: true } }),
      prisma.clientFinancials.findMany({ where: { userId, period: monthStart }, select: { leadId: true } }),
      prisma.clientFinancials.findMany({
        where: { userId, runway: { not: null } },
        orderBy: { period: "desc" },
        take: 50,
        select: { leadId: true, runway: true },
      }),
    ])
    const covered = new Set(financialsThisMonth.map(f => f.leadId))
    const missing = wonClients.filter(c => !covered.has(c.id)).length
    const seen = new Set<string>()
    let atRisk = 0
    for (const f of latestFinancials) {
      if (seen.has(f.leadId)) continue
      seen.add(f.leadId)
      if ((f.runway ?? 99) < 6) atRisk++
    }
    if (atRisk > 0)
      items.push({ id: "runway-risk", kind: "financials", priority: "high", count: atRisk, title: `Call ${atRisk} client${atRisk > 1 ? "s" : ""} with < 6 months runway`, detail: "Short runway needs a plan before it becomes an emergency", href: "/financials" })
    if (missing > 0)
      items.push({ id: "financials-missing", kind: "financials", priority: "medium", count: missing, title: `Enter this month's numbers for ${missing} client${missing > 1 ? "s" : ""}`, detail: "Missing periods leave gaps in reports and risk tracking", href: "/financials" })
  }

  if (ws.type === "seo" || ws.type === "web_design") {
    const auditTargets = await prisma.lead.count({
      where: { userId, status: "NEW", painPoint: { not: null }, auditJson: { not: null } },
    })
    if (auditTargets > 0)
      items.push({ id: "audit-targets", kind: "leads", priority: "medium", count: auditTargets, title: `${auditTargets} audited prospect${auditTargets > 1 ? "s" : ""} with issues, not yet contacted`, detail: ws.type === "seo" ? "Each finding is a teardown email angle" : "Each finding is a Loom teardown candidate", href: "/leads" })
  }

  // ── Shared signals ─────────────────────────────────────────────────────────
  if (reviewActions > 0)
    items.push({ id: "review-actions", kind: "agent", priority: "high", count: reviewActions, title: `Review ${reviewActions} agent draft${reviewActions > 1 ? "s" : ""}`, detail: "AI replies waiting for approval — some expire and auto-send", href: "/inbox" })
  if (viewedProposals > 0)
    items.push({ id: "proposals-viewed", kind: "proposals", priority: "high", count: viewedProposals, title: `Follow up ${viewedProposals} viewed proposal${viewedProposals > 1 ? "s" : ""}`, detail: "The client opened it — strike while it's warm", href: "/proposals" })
  if (unhandledReplies > 0)
    items.push({ id: "replies", kind: "inbox", priority: "medium", count: unhandledReplies, title: `${unhandledReplies} repl${unhandledReplies > 1 ? "ies" : "y"} not yet handled`, detail: "Received but no draft or action yet", href: "/inbox" })
  if (linkedinTasks > 0)
    items.push({ id: "linkedin-tasks", kind: "tasks", priority: "medium", count: linkedinTasks, title: `Copy & send ${linkedinTasks} LinkedIn message${linkedinTasks > 1 ? "s" : ""}`, detail: "Drafted by the AI — send them manually on LinkedIn", href: "/inbox" })
  if (draftStep1 > 0)
    items.push({ id: "drafts-waiting", kind: "campaigns", priority: "medium", count: draftStep1, title: `${draftStep1} outreach draft${draftStep1 > 1 ? "s" : ""} awaiting send approval`, detail: "Step-1 emails generated after enrichment, not yet queued", href: "/campaigns" })
  if (staleProposals > 0)
    items.push({ id: "proposals-stale", kind: "proposals", priority: "medium", count: staleProposals, title: `Nudge ${staleProposals} proposal${staleProposals > 1 ? "s" : ""} sent 3+ days ago`, detail: "Sent but never opened — worth a follow-up", href: "/proposals" })

  // High first, stable within priority (workspace items were pushed first)
  items.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1))

  return { workspace: ws.type, items, completedToday: executedToday + sentToday }
}

// ── Primary KPI per workspace ─────────────────────────────────────────────────

export async function getPrimaryKpiValue(userId: string, playbookType: string | null | undefined): Promise<{ label: string; value: string; sub: string }> {
  const ws = getWorkspace(playbookType)

  switch (ws.primaryKpi.id) {
    case "meetings_booked": {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const n = await prisma.activity.count({
        where: { lead: { userId }, type: "MEETING_BOOKED", createdAt: { gte: monthStart } },
      })
      return { label: ws.primaryKpi.label, value: String(n), sub: "this month" }
    }
    case "seo_opportunities": {
      const n = await prisma.lead.count({
        where: { userId, painPoint: { not: null }, status: { in: ["NEW", "CONTACTED"] } },
      })
      return { label: ws.primaryKpi.label, value: String(n), sub: "audited prospects with issues" }
    }
    case "content_waiting": {
      const n = await prisma.contentCalendar.count({ where: { userId, status: "PENDING_APPROVAL" } })
      return { label: ws.primaryKpi.label, value: String(n), sub: "posts awaiting approval" }
    }
    case "open_proposal_value": {
      const proposals = await prisma.proposal.findMany({
        where: { userId, status: { in: ["SENT", "VIEWED"] } },
        select: { totalValue: true, currency: true },
      })
      const total = proposals.reduce((s, p) => s + (p.totalValue ?? 0), 0)
      const symbol = proposals[0]?.currency === "USD" ? "$" : proposals[0]?.currency === "EUR" ? "€" : "£"
      return { label: ws.primaryKpi.label, value: `${symbol}${Math.round(total).toLocaleString("en-GB")}`, sub: `${proposals.length} open proposal${proposals.length === 1 ? "" : "s"}` }
    }
    case "clients_at_risk": {
      const latest = await prisma.clientFinancials.findMany({
        where: { userId, runway: { not: null } },
        orderBy: { period: "desc" },
        take: 50,
        select: { leadId: true, runway: true },
      })
      const seen = new Set<string>()
      let atRisk = 0
      for (const f of latest) {
        if (seen.has(f.leadId)) continue
        seen.add(f.leadId)
        if ((f.runway ?? 99) < 6) atRisk++
      }
      return { label: ws.primaryKpi.label, value: String(atRisk), sub: "runway under 6 months" }
    }
    default:
      return { label: ws.primaryKpi.label, value: "—", sub: "" }
  }
}
