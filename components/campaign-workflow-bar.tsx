"use client"

import {
  Loader2, Send, FileText, Play, Zap,
  CheckCircle2, Pause, Users, AlertCircle, ArrowRight,
  TrendingUp, RefreshCw, Layers
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import Link from "next/link"
import { type WorkflowPhase, WORKFLOW_COPY } from "@/lib/campaign-workflow"

interface CampaignWorkflowBarProps {
  phase: WorkflowPhase
  autonomous: boolean
  totalLeads?: number
  leadsWithoutDrafts: number
  draftCount: number
  pendingSendCount: number
  failedCount: number
  isGenerating: boolean
  isSending: boolean
  onGenerateAllDrafts?: () => void
  onApproveAll?: () => void
  onRetryFailed?: () => void
  onLaunch?: () => void
}

const PHASE_THEME: Record<WorkflowPhase, {
  gradient: string
  borderColor: string
  accentColor: string
  glowColor: string
  badgeBg: string
  badgeText: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  stepNum: number
}> = {
  "no-leads": {
    gradient: "from-white/[0.04] via-white/[0.02] to-transparent",
    borderColor: "rgba(255,255,255,0.08)",
    accentColor: "#94a3b8",
    glowColor: "rgba(148,163,184,0.12)",
    badgeBg: "rgba(255,255,255,0.06)",
    badgeText: "text-white/60",
    icon: Users,
    stepNum: 1,
  },
  enriching: {
    gradient: "from-emerald-500/10 via-emerald-500/[0.03] to-transparent",
    borderColor: "rgba(52,211,153,0.25)",
    accentColor: "#34d399",
    glowColor: "rgba(52,211,153,0.18)",
    badgeBg: "rgba(52,211,153,0.12)",
    badgeText: "text-emerald-300",
    icon: Loader2,
    stepNum: 2,
  },
  ready: {
    gradient: "from-sky-500/10 via-sky-500/[0.03] to-transparent",
    borderColor: "rgba(56,189,248,0.25)",
    accentColor: "#38bdf8",
    glowColor: "rgba(56,189,248,0.18)",
    badgeBg: "rgba(56,189,248,0.12)",
    badgeText: "text-sky-300",
    icon: Play,
    stepNum: 3,
  },
  generating: {
    gradient: "from-violet-500/15 via-indigo-500/[0.04] to-transparent",
    borderColor: "rgba(167,139,250,0.3)",
    accentColor: "#a78bfa",
    glowColor: "rgba(167,139,250,0.2)",
    badgeBg: "rgba(167,139,250,0.15)",
    badgeText: "text-violet-300",
    icon: Sparkles,
    stepNum: 3,
  },
  sending: {
    gradient: "from-sky-500/12 via-blue-500/[0.03] to-transparent",
    borderColor: "rgba(56,189,248,0.28)",
    accentColor: "#38bdf8",
    glowColor: "rgba(56,189,248,0.2)",
    badgeBg: "rgba(56,189,248,0.12)",
    badgeText: "text-sky-300",
    icon: Send,
    stepNum: 4,
  },
  review: {
    gradient: "from-amber-500/12 via-amber-500/[0.03] to-transparent",
    borderColor: "rgba(251,191,36,0.25)",
    accentColor: "#fbbf24",
    glowColor: "rgba(251,191,36,0.18)",
    badgeBg: "rgba(251,191,36,0.12)",
    badgeText: "text-amber-300",
    icon: FileText,
    stepNum: 4,
  },
  live: {
    gradient: "from-emerald-500/12 via-emerald-500/[0.03] to-transparent",
    borderColor: "rgba(52,211,153,0.3)",
    accentColor: "#34d399",
    glowColor: "rgba(52,211,153,0.2)",
    badgeBg: "rgba(52,211,153,0.15)",
    badgeText: "text-emerald-300",
    icon: CheckCircle2,
    stepNum: 5,
  },
  paused: {
    gradient: "from-amber-500/10 via-amber-500/[0.02] to-transparent",
    borderColor: "rgba(251,191,36,0.2)",
    accentColor: "#fbbf24",
    glowColor: "rgba(251,191,36,0.15)",
    badgeBg: "rgba(251,191,36,0.1)",
    badgeText: "text-amber-300",
    icon: Pause,
    stepNum: 4,
  },
}

const WORKFLOW_STEPS = [
  { step: 1, label: "Add Leads" },
  { step: 2, label: "AI Enrichment" },
  { step: 3, label: "Draft Generation" },
  { step: 4, label: "Review & Send" },
  { step: 5, label: "Live Sequences" },
]

export function CampaignWorkflowBar({
  phase,
  autonomous,
  totalLeads = 0,
  leadsWithoutDrafts,
  draftCount,
  pendingSendCount,
  failedCount,
  isGenerating,
  isSending,
  onGenerateAllDrafts,
  onApproveAll,
  onRetryFailed,
  onLaunch,
}: CampaignWorkflowBarProps) {
  const theme = PHASE_THEME[phase] || PHASE_THEME.ready
  const Icon = theme.icon
  const copy = WORKFLOW_COPY[phase] || { title: "Campaign Hub", description: "Manage your outreach pipeline." }

  let title = copy.title
  let description = copy.description

  if (phase === "generating" && leadsWithoutDrafts > 0) {
    title = `Writing outreach emails for ${leadsWithoutDrafts} lead${leadsWithoutDrafts !== 1 ? "s" : ""}`
    description = autonomous
      ? "Autopilot active: emails generate and dispatch automatically to your inbox queue."
      : "Drafts will populate in the studio below for your quick review."
  } else if (phase === "sending" && pendingSendCount > 0) {
    title = `Dispatching ${pendingSendCount} email${pendingSendCount !== 1 ? "s" : ""}`
    description = "Executing outreach sequences with rate-limit protection."
  } else if (phase === "review" && draftCount > 0) {
    title = `${draftCount} draft${draftCount !== 1 ? "s" : ""} ready for review & approval`
    description = "Inspect personalized copy, customize approaches, or approve all with one click."
  } else if (phase === "live") {
    title = "Campaign Engine Active & Running"
    description = "Step-by-step sequences and follow-ups are dispatching automatically based on lead activity."
  }

  const showApprove = (phase === "review" || draftCount > 0) && !autonomous && onApproveAll
  const showGenerateDrafts = leadsWithoutDrafts > 0 && !isGenerating && onGenerateAllDrafts && phase !== "enriching"
  const showRetry = failedCount > 0 && onRetryFailed && !autonomous

  return (
    <div className="relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-xl bg-gradient-to-r p-5 sm:p-6 mb-6"
      style={{
        borderColor: theme.borderColor,
        background: `linear-gradient(135deg, ${theme.glowColor} 0%, rgba(15, 17, 26, 0.75) 60%, rgba(10, 12, 18, 0.95) 100%)`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Decorative ambient background lights */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl opacity-30"
        style={{ background: theme.accentColor }}
      />

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Status Icon + Text + Phase indicator */}
        <div className="flex items-start gap-4 min-w-0">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-md transition-transform"
            style={{
              background: `radial-gradient(circle at center, ${theme.glowColor} 0%, rgba(255,255,255,0.03) 100%)`,
              borderColor: theme.borderColor,
            }}
          >
            {(phase === "generating" && isGenerating) || (phase === "sending" && isSending) || phase === "enriching" ? (
              <Loader2 className="size-6 animate-spin" style={{ color: theme.accentColor }} />
            ) : (
              <Icon className="size-6" style={{ color: theme.accentColor }} />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${theme.badgeText}`}
                style={{ background: theme.badgeBg, border: `1px solid ${theme.borderColor}` }}
              >
                <span className="size-1.5 rounded-full" style={{ background: theme.accentColor, boxShadow: `0 0 6px ${theme.accentColor}` }} />
                Stage {theme.stepNum}: {phase.replace("-", " ")}
              </span>

              {autonomous && phase !== "paused" && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
                  <Zap className="size-3 fill-current text-emerald-400" /> Autopilot Active
                </span>
              )}

              {draftCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/20">
                  <FileText className="size-3 text-amber-400" /> {draftCount} Draft{draftCount !== 1 ? "s" : ""}
                </span>
              )}

              {leadsWithoutDrafts > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-violet-300/90 bg-violet-500/10 border border-violet-500/20">
                  <Sparkles className="size-3 text-violet-400" /> {leadsWithoutDrafts} Need AI Copy
                </span>
              )}
            </div>

            <h2 className="text-[17px] sm:text-[19px] font-black tracking-tight text-white/95">
              {title}
            </h2>
            <p className="text-[12px] sm:text-[13px] text-white/60 max-w-2xl font-normal leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Right Side: Primary Workflow Action CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center shrink-0">
          {showRetry && (
            <button
              onClick={onRetryFailed}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <AlertCircle className="size-4" />
              Retry {failedCount} Failed
            </button>
          )}

          {showGenerateDrafts && (
            <button
              onClick={onGenerateAllDrafts}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-400/30 transition-all shadow-lg shadow-violet-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="size-4 animate-spin text-white" /> : <Sparkles className="size-4 text-violet-200 fill-current" />}
              Generate Copy for All ({leadsWithoutDrafts})
            </button>
          )}

          {showApprove && (
            <button
              onClick={onApproveAll}
              disabled={isSending}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-black text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isSending ? <Loader2 className="size-4 animate-spin text-black" /> : <Send className="size-4 text-black fill-current" />}
              Approve & Send All ({draftCount})
            </button>
          )}

          {phase === "ready" && onLaunch && (
            <button
              onClick={onLaunch}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-black text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition-all shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="size-4 fill-current text-black" />
              Launch Sequence
            </button>
          )}

          {phase === "no-leads" && (
            <div className="flex items-center gap-2">
              <Link
                href="/leads/find"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold text-black bg-white hover:bg-white/90 shadow-md transition-all hover:scale-[1.02]"
              >
                <Users className="size-3.5" /> Find Leads
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Progress Track Ribbon */}
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {WORKFLOW_STEPS.map((s, idx) => {
          const isDone = s.step < theme.stepNum || phase === "live"
          const isCurrent = s.step === theme.stepNum && phase !== "live"

          return (
            <div key={s.step} className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className="flex size-6 items-center justify-center rounded-full text-[10px] font-black transition-all"
                  style={{
                    background: isDone ? "#10b981" : isCurrent ? theme.accentColor : "rgba(255,255,255,0.06)",
                    color: isDone || isCurrent ? "#000" : "rgba(255,255,255,0.3)",
                    boxShadow: isCurrent ? `0 0 10px ${theme.accentColor}` : "none",
                  }}
                >
                  {isDone ? "✓" : s.step}
                </div>
                <span
                  className="text-[11px] font-bold transition-colors whitespace-nowrap"
                  style={{
                    color: isDone ? "rgba(255,255,255,0.7)" : isCurrent ? "#fff" : "rgba(255,255,255,0.25)",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div
                  className="h-0.5 w-6 sm:w-12 rounded-full transition-colors"
                  style={{
                    background: isDone ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
