"use client"

import { useState } from "react"
import {
  ShieldCheck, Zap, Target, Clock, ChevronRight,
  DollarSign, Loader2, Plus, Mail, Calendar,
  Star, FileText, AlertCircle, CheckCircle2, Check,
  MessageSquare,
} from "lucide-react"
import { toast } from "sonner"
import { formatRelative } from "@/lib/utils"

type BattleCard = {
  summary: string
  talkingPoints: string[]
  likelyObjections: { objection: string; counter: string }[]
  suggestedNextStep: string
  urgencyAngle: string
}

type Activity = {
  id: string; type: string; note: string | null; createdAt: string; metadata: Record<string, unknown> | null
}

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  EMAIL_SENT:            { icon: Mail,         color: "text-sky-400"     },
  EMAIL_OPENED:          { icon: Star,          color: "text-amber-400"   },
  EMAIL_CLICKED:         { icon: ChevronRight,  color: "text-emerald-400" },
  REPLY_RECEIVED:        { icon: MessageSquare, color: "text-violet-400"  },
  STAGE_CHANGED:         { icon: Zap,           color: "text-white/40"    },
  NOTE_ADDED:            { icon: FileText,      color: "text-white/55"    },
  MEETING_BOOKED:        { icon: Calendar,      color: "text-emerald-400" },
  DEAL_WON:              { icon: CheckCircle2,  color: "text-emerald-400" },
  DEAL_LOST:             { icon: AlertCircle,   color: "text-red-400"     },
  BATTLE_CARD_GENERATED: { icon: ShieldCheck,   color: "text-amber-400"   },
  PROPOSAL_GENERATED:    { icon: FileText,      color: "text-orange-400"  },
}

const ACTIVITY_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  EMAIL_SENT:            { label: "Email Sent",     bg: "rgba(56,189,248,.1)",  text: "text-sky-300"     },
  EMAIL_OPENED:          { label: "Email Opened",   bg: "rgba(251,191,36,.1)",  text: "text-amber-300"   },
  EMAIL_CLICKED:         { label: "Email Clicked",  bg: "rgba(52,211,153,.1)",  text: "text-emerald-300" },
  REPLY_RECEIVED:        { label: "Lead Reply",     bg: "rgba(167,139,250,.1)", text: "text-violet-300"  },
  STAGE_CHANGED:         { label: "Stage Change",   bg: "rgba(255,255,255,.05)",text: "text-white/40"    },
  NOTE_ADDED:            { label: "Note",           bg: "rgba(255,255,255,.06)",text: "text-white/50"    },
  MEETING_BOOKED:        { label: "Meeting Booked", bg: "rgba(52,211,153,.12)", text: "text-emerald-400" },
  DEAL_WON:              { label: "Deal Won",       bg: "rgba(52,211,153,.15)", text: "text-emerald-400 font-bold" },
  DEAL_LOST:             { label: "Deal Lost",      bg: "rgba(239,68,68,.12)",  text: "text-red-400"     },
  BATTLE_CARD_GENERATED: { label: "AI Battle Card", bg: "rgba(251,191,36,.1)",  text: "text-amber-300"   },
  PROPOSAL_GENERATED:    { label: "AI Proposal",    bg: "rgba(249,115,22,.1)",  text: "text-orange-300"  },
}

const STATUS_ORDER: Record<string, number> = {
  NEW: 1,
  CONTACTED: 2,
  REPLIED: 3,
  INTERESTED: 4,
  MEETING_BOOKED: 5,
  PROPOSAL_SENT: 6,
  WON: 7,
  LOST: 7,
  NOT_INTERESTED: 7,
  BOUNCED: 7,
}

const STAGE_COLORS: Record<string, string> = {
  NEW: "text-white/40 border-white/20",
  CONTACTED: "text-sky-300 border-sky-300/30",
  REPLIED: "text-violet-300 border-violet-300/30",
  INTERESTED: "text-amber-300 border-amber-300/30",
  MEETING_BOOKED: "text-emerald-300 border-emerald-300/30",
  PROPOSAL_SENT: "text-orange-300 border-orange-300/30",
  WON: "text-emerald-400 border-emerald-400/30",
  LOST: "text-red-400 border-red-400/30",
  NOT_INTERESTED: "text-white/30 border-white/20",
  BOUNCED: "text-red-400 border-red-400/30",
}

const PIPELINE_STEPS = [
  { order: 1, label: "New", key: "NEW" },
  { order: 2, label: "Contacted", key: "CONTACTED" },
  { order: 3, label: "Replied", key: "REPLIED" },
  { order: 4, label: "Interested", key: "INTERESTED" },
  { order: 5, label: "Meeting Booked", key: "MEETING_BOOKED" },
  { order: 6, label: "Proposal Sent", key: "PROPOSAL_SENT" },
  { order: 7, label: "Closed", key: "CLOSED" },
]

interface Props {
  leadId: string
  initialStatus: string
  initialDealValue: number | null
  initialBattleCard: string | null
  initialActivities: Activity[]
}

export function LeadPipelinePanel({
  leadId, initialStatus, initialDealValue, initialBattleCard, initialActivities,
}: Props) {
  const [status] = useState(initialStatus)
  const [dealValue, setDealValue] = useState(initialDealValue?.toString() ?? "")
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [savingDeal, setSavingDeal] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  const battleCard: BattleCard | null = (() => {
    try { return initialBattleCard ? JSON.parse(initialBattleCard) : null } catch { return null }
  })()

  const currentOrder = STATUS_ORDER[status] ?? 1

  const getStepStatus = (stepOrder: number) => {
    if (currentOrder > stepOrder) return "completed"
    if (currentOrder === stepOrder) return "current"
    return "upcoming"
  }

  const getStepLabel = (stepKey: string) => {
    if (stepKey === "CLOSED") {
      if (status === "WON") return "Closed (Won)"
      if (status === "LOST") return "Closed (Lost)"
      if (status === "NOT_INTERESTED") return "Closed (Not Interested)"
      if (status === "BOUNCED") return "Closed (Bounced)"
      return "Closed"
    }
    if (stepKey === "NEW") return "New"
    if (stepKey === "CONTACTED") return "Contacted"
    if (stepKey === "REPLIED") return "Replied"
    if (stepKey === "INTERESTED") return "Interested"
    if (stepKey === "MEETING_BOOKED") return "Meeting Booked"
    if (stepKey === "PROPOSAL_SENT") return "Proposal Sent"
    return stepKey
  }

  async function saveDealValue() {
    setSavingDeal(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/deal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealValue: dealValue ? parseFloat(dealValue) : null }),
      })
      if (!res.ok) throw new Error()
      toast.success("Deal value saved")
    } catch {
      toast.error("Failed to save deal value")
    } finally {
      setSavingDeal(false)
    }
  }

  async function addNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText.trim() }),
      })
      if (!res.ok) throw new Error()
      const activity = await res.json()
      setActivities(prev => [activity, ...prev])
      setNoteText("")
      toast.success("Note added")
    } catch {
      toast.error("Failed to add note")
    } finally {
      setAddingNote(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Pipeline stage + deal value */}
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div className="absolute top-0 inset-x-6 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)" }} />

        <p className="text-[10px] font-black text-white/30 uppercase tracking-[.18em] mb-4">Pipeline</p>

        <div className="space-y-4">
          <div className="space-y-3.5 pl-1.5 pt-1">
            {PIPELINE_STEPS.map((step, idx) => {
              const stepStatus = getStepStatus(step.order)
              const stepLabel = getStepLabel(step.key)
              
              const isCompleted = stepStatus === "completed"
              const isCurrent = stepStatus === "current"
              
              let textColor = "text-white/20"
              let bubbleColor = "border-white/10"

              if (isCompleted) {
                textColor = "text-white/65 font-medium"
                bubbleColor = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              } else if (isCurrent) {
                textColor = `font-bold ${STAGE_COLORS[status]?.split(" ")[0] ?? "text-white"}`
                bubbleColor = `bg-white/5 border-2 ${STAGE_COLORS[status]?.split(" ")[1] ?? "border-white/20"}`
              }

              return (
                <div key={step.key} className="flex gap-3 items-start relative">
                  {/* Bubble / Line Column */}
                  <div className="flex flex-col items-center shrink-0 w-5">
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border transition-all ${bubbleColor}`}
                    >
                      {isCompleted ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : isCurrent ? (
                        <div className="size-1.5 rounded-full bg-current animate-pulse" />
                      ) : null}
                    </div>
                    {idx < PIPELINE_STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-6 my-1 transition-all ${isCompleted ? "bg-emerald-500/25" : "bg-white/5"}`}
                      />
                    )}
                  </div>

                  {/* Label Column */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-[12px] leading-none transition-all ${textColor}`}>
                      {stepLabel}
                      {isCurrent && (
                        <span
                          className="ml-2 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider"
                          style={{
                            background: "rgba(255,255,255,.05)",
                            border: "1px solid rgba(255,255,255,.08)",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/35 uppercase tracking-wide">Deal Value</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/25" />
                <input
                  type="number"
                  placeholder="0"
                  value={dealValue}
                  onChange={e => setDealValue(e.target.value)}
                  onBlur={saveDealValue}
                  className="w-full rounded-xl pl-8 pr-4 py-2.5 text-[13px] text-white/70 outline-none placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}
                />
              </div>
              <button
                onClick={saveDealValue}
                disabled={savingDeal}
                className="flex items-center justify-center rounded-xl px-3 text-white/40 hover:text-white/70 transition-colors"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}
              >
                {savingDeal ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Card */}
      {battleCard && (
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ background: "rgba(251,191,36,.04)", border: "1px solid rgba(251,191,36,.12)" }}
        >
          <div className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "rgba(251,191,36,.1)" }}>
            <ShieldCheck className="size-4 text-amber-400" />
            <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Battle Card</span>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-[12px] text-white/65 leading-relaxed">{battleCard.summary}</p>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="size-3 text-amber-400" />
                <p className="text-[9px] font-black text-amber-300/70 uppercase tracking-wider">Talking Points</p>
              </div>
              <ul className="space-y-1">
                {battleCard.talkingPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-white/55">
                    <span className="text-amber-400/50 shrink-0">·</span> {pt}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="size-3 text-amber-400" />
                <p className="text-[9px] font-black text-amber-300/70 uppercase tracking-wider">Handle Objections</p>
              </div>
              <div className="space-y-2">
                {battleCard.likelyObjections.map((obj, i) => (
                  <div key={i} className="rounded-lg p-2.5" style={{ background: "rgba(0,0,0,.2)" }}>
                    <p className="text-[10px] font-bold text-white/50 mb-0.5">&quot;{obj.objection}&quot;</p>
                    <p className="text-[10px] text-amber-300/70">→ {obj.counter}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 grid-cols-2">
              <div className="rounded-xl p-3" style={{ background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.1)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <ChevronRight className="size-3 text-emerald-400" />
                  <p className="text-[9px] font-black text-emerald-400/70 uppercase tracking-wider">Next Step</p>
                </div>
                <p className="text-[11px] text-white/60">{battleCard.suggestedNextStep}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,.04)", border: "1px solid rgba(239,68,68,.08)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="size-3 text-red-400" />
                  <p className="text-[9px] font-black text-red-400/70 uppercase tracking-wider">Urgency</p>
                </div>
                <p className="text-[11px] text-white/60">{battleCard.urgencyAngle}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.015) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div className="absolute top-0 inset-x-6 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)" }} />

        <div className="px-5 py-4 border-b flex flex-col gap-1"
          style={{ borderColor: "rgba(255,255,255,.06)" }}>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[.18em]">Activity Timeline</p>
          <p className="text-[10px] text-white/25">Chronological log of outreach, lead responses, and AI actions.</p>
        </div>

        {/* Add note */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,.05)" }}>
          <div className="flex gap-2">
            <input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addNote() }}
              placeholder="Add a note…"
              className="flex-1 rounded-xl px-3 py-2 text-[12px] text-white/70 outline-none placeholder:text-white/20"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            />
            <button
              onClick={addNote}
              disabled={addingNote || !noteText.trim()}
              className="flex items-center justify-center rounded-xl px-3 text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              {addingNote ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Timeline entries */}
        <div className="max-h-[400px] overflow-y-auto">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[11px] text-white/20">No activity yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-1">
              {activities.map((act, idx) => {
                const meta = ACTIVITY_ICONS[act.type] ?? ACTIVITY_ICONS.NOTE_ADDED
                const Icon = meta.icon
                const badge = ACTIVITY_BADGES[act.type] ?? ACTIVITY_BADGES.NOTE_ADDED
                return (
                  <div key={act.id} className="flex items-start gap-3 py-2">
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`flex size-6 items-center justify-center rounded-full ${meta.color}`}
                        style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}
                      >
                        <Icon className="size-3" />
                      </div>
                      {idx < activities.length - 1 && (
                        <div className="w-px flex-1 mt-1" style={{ background: "rgba(255,255,255,.05)", minHeight: 12 }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${badge.text}`}
                          style={{ background: badge.bg }}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[9px] text-white/25 shrink-0">{formatRelative(act.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-snug">{act.note || act.type.replace(/_/g, " ")}</p>
                      {(() => {
                        const draft = act.metadata?.proposalDraft
                        if (typeof draft !== "string") return null
                        return (
                          <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                            <p className="text-[10px] font-black text-orange-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <FileText className="size-3" /> AI Draft Proposal
                            </p>
                            <div className="text-[11px] text-white/50 whitespace-pre-wrap leading-relaxed">
                              {draft}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
