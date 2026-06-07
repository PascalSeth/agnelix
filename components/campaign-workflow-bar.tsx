"use client"

import {
  Loader2, Sparkles, Send, FileText, Play, Zap,
  CheckCircle2, Pause, Users, AlertCircle,
} from "lucide-react"
import { computeWorkflowPhase, WORKFLOW_COPY, type WorkflowPhase } from "@/lib/campaign-workflow"

interface CampaignWorkflowBarProps {
  phase: WorkflowPhase
  autonomous: boolean
  leadsWithoutDrafts: number
  draftCount: number
  pendingSendCount: number
  failedCount: number
  isGenerating: boolean
  isSending: boolean
  onApproveAll?: () => void
  onRetryFailed?: () => void
}

const PHASE_STYLE: Record<WorkflowPhase, { gradient: string; border: string; icon: typeof Zap; iconColor: string; titleColor: string }> = {
  "no-leads":    { gradient: "rgba(255,255,255,.03)", border: "rgba(255,255,255,.08)", icon: Users, iconColor: "text-white/30", titleColor: "text-white/40" },
  enriching:     { gradient: "rgba(52,211,153,.06)", border: "rgba(52,211,153,.15)", icon: Loader2, iconColor: "text-emerald-400 animate-spin", titleColor: "text-emerald-300" },
  ready:         { gradient: "rgba(125,211,252,.06)", border: "rgba(125,211,252,.15)", icon: Play, iconColor: "text-sky-400", titleColor: "text-sky-300" },
  generating:    { gradient: "rgba(139,92,246,.07)", border: "rgba(139,92,246,.18)", icon: Sparkles, iconColor: "text-violet-400", titleColor: "text-violet-300" },
  sending:       { gradient: "rgba(125,211,252,.07)", border: "rgba(125,211,252,.18)", icon: Send, iconColor: "text-sky-400", titleColor: "text-sky-300" },
  review:        { gradient: "rgba(251,191,36,.06)", border: "rgba(251,191,36,.12)", icon: FileText, iconColor: "text-amber-400", titleColor: "text-amber-300" },
  live:          { gradient: "rgba(52,211,153,.06)", border: "rgba(52,211,153,.15)", icon: CheckCircle2, iconColor: "text-emerald-400", titleColor: "text-emerald-300" },
  paused:        { gradient: "rgba(251,191,36,.05)", border: "rgba(251,191,36,.12)", icon: Pause, iconColor: "text-amber-400", titleColor: "text-amber-300" },
}

export function CampaignWorkflowBar({
  phase, autonomous, leadsWithoutDrafts, draftCount, pendingSendCount, failedCount,
  isGenerating, isSending, onApproveAll, onRetryFailed,
}: CampaignWorkflowBarProps) {
  if (phase === "no-leads" || phase === "live") return null

  const style = PHASE_STYLE[phase]
  const Icon = style.icon
  const copy = WORKFLOW_COPY[phase]

  let title = copy.title
  let description = copy.description

  if (phase === "generating" && leadsWithoutDrafts > 0) {
    title = `Writing emails for ${leadsWithoutDrafts} lead${leadsWithoutDrafts !== 1 ? "s" : ""}`
    description = autonomous
      ? "Autopilot is on — emails send automatically as they're ready."
      : "Drafts will appear below as they're generated."
  }
  if (phase === "sending" && pendingSendCount > 0) {
    title = `Sending ${pendingSendCount} email${pendingSendCount !== 1 ? "s" : ""}`
  }
  if (phase === "review" && draftCount > 0) {
    title = `${draftCount} draft${draftCount !== 1 ? "s" : ""} ready for review`
  }
  if (phase === "enriching") {
    description = "Launch is available once enrichment completes."
  }

  const showApprove = phase === "review" && !autonomous && onApproveAll
  const showRetry = failedCount > 0 && onRetryFailed && !autonomous

  return (
    <div
      className="mx-5 my-4 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap"
      style={{
        background: `linear-gradient(135deg, ${style.gradient}, transparent)`,
        border: `1px solid ${style.border}`,
      }}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div
          className="size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${style.border}` }}
        >
          {(phase === "generating" && isGenerating) || (phase === "sending" && isSending) ? (
            <Loader2 className={`size-4 ${style.iconColor}`} />
          ) : (
            <Icon className={`size-4 ${style.iconColor}`} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-[13px] font-bold ${style.titleColor}`}>{title}</h3>
            {autonomous && phase !== "paused" && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400/80"
                style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.2)" }}>
                <Zap className="size-2.5 fill-current" /> Autopilot
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showRetry && (
          <button
            onClick={onRetryFailed}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-amber-300 transition-all hover:brightness-110"
            style={{ background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.2)" }}
          >
            <AlertCircle className="size-3.5" />
            Retry Failed
          </button>
        )}
        {showApprove && (
          <button
            onClick={onApproveAll}
            disabled={isSending}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-black bg-amber-400 hover:brightness-110 disabled:opacity-40 transition-all font-sans"
            style={{ boxShadow: "0 2px 10px rgba(251,191,36,.15)" }}
          >
            {isSending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5 fill-current" />}
            {isSending ? "Sending…" : "Approve & Send All"}
          </button>
        )}
      </div>
    </div>
  )
}
