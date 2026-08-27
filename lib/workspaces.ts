// Workspace OS layer: each playbook type is presented to users as a Workspace —
// a full operating mode with its own job, primary KPI, and AI specialist persona.
// This module is dependency-free so client components and server code can both
// import it. DB vocabulary stays "playbook"; UI vocabulary is "workspace".

export interface WorkspacePersona {
  /** The specialist the AI presents as in this workspace */
  role: string
  /** One-line voice direction injected into AI prompts */
  voice: string
}

export interface WorkspaceConfig {
  type: string
  /** Short workspace name for switchers and headers */
  name: string
  /** The one-sentence job everything in this workspace serves */
  job: string
  /** Primary KPI identity — value is computed server-side in lib/mission.ts */
  primaryKpi: { id: string; label: string }
  persona: WorkspacePersona
  /** Accent used for workspace-colored chips/badges */
  accent: string
}

export const WORKSPACES: Record<string, WorkspaceConfig> = {
  sales: {
    type: "sales",
    name: "Sales OS",
    job: "Book meetings.",
    primaryKpi: { id: "meetings_booked", label: "Meetings booked" },
    persona: {
      role: "Closer",
      voice: "Talk like a sharp sales closer: momentum-focused, direct about reply rates and next steps, always moving the deal forward.",
    },
    accent: "#6366f1",
  },
  seo: {
    type: "seo",
    name: "SEO OS",
    job: "Find websites losing money.",
    primaryKpi: { id: "seo_opportunities", label: "SEO opportunities" },
    persona: {
      role: "Analyst",
      voice: "Talk like a technical SEO analyst: lead with concrete findings (load times, rankings, missing tags) and quantify what each issue costs.",
    },
    accent: "#059669",
  },
  social_media: {
    type: "social_media",
    name: "Social OS",
    job: "Keep clients posting consistently.",
    primaryKpi: { id: "content_waiting", label: "Content waiting" },
    persona: {
      role: "Creative Director",
      voice: "Talk like a creative director running a content studio: focused on the calendar, approvals, content gaps, and what ships this week.",
    },
    accent: "#f43f5e",
  },
  ppc: {
    type: "ppc",
    name: "PPC OS",
    job: "Maximize ROAS.",
    primaryKpi: { id: "open_proposal_value", label: "Pipeline value" },
    persona: {
      role: "Media Buyer",
      voice: "Talk like a performance media buyer: everything in terms of spend, return, cost per lead, and where budget is leaking.",
    },
    accent: "#0284c7",
  },
  web_design: {
    type: "web_design",
    name: "Web Studio",
    job: "Turn bad websites into projects.",
    primaryKpi: { id: "open_proposal_value", label: "Proposal value" },
    persona: {
      role: "UX Consultant",
      voice: "Talk like a UX consultant: point at specific conversion leaks and trust-killers on real pages, and frame fixes as project scopes.",
    },
    accent: "#7c3aed",
  },
  finance: {
    type: "finance",
    name: "CFO OS",
    job: "Protect cashflow.",
    primaryKpi: { id: "clients_at_risk", label: "Clients at risk" },
    persona: {
      role: "Financial Advisor",
      voice: "Talk like a fractional CFO: runway, burn, and margin first; calm, precise, and explicit about which client needs a call this week.",
    },
    accent: "#d97706",
  },
}

export function getWorkspace(type: string | null | undefined): WorkspaceConfig {
  return WORKSPACES[type ?? ""] ?? WORKSPACES.sales
}

/** Prompt block that makes the AI speak as this workspace's specialist. */
export function workspacePersonaPrompt(type: string | null | undefined): string {
  const ws = getWorkspace(type)
  return `You are acting as the agency's ${ws.persona.role} (${ws.name} workspace — its job: "${ws.job}"). ${ws.persona.voice}`
}
