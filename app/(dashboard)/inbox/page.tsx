"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Loader2, MessageSquare, Sparkles, Send, ChevronRight,
  ShieldCheck, Zap, Target, Clock, User, ArrowLeft,
  Bot, CheckCircle, XCircle, Edit3, Timer,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { formatRelative } from "@/lib/utils"

type Lead = {
  id: string; firstName: string | null; lastName: string | null
  email: string; company: string | null; status: string
  battleCard: string | null
  user: { name: string | null; agencyName: string | null; companyName: string | null }
}

type OriginalEmail = {
  id: string; subject: string; body: string; sentAt: string | null; stepNumber: number
} | null

type Reply = {
  id: string; fromEmail: string; subject: string | null; body: string; receivedAt: string
  lead: Lead; email: OriginalEmail
}

type PendingAction = {
  id: string
  type: "SEND_REPLY" | "ENROLL_NURTURE" | "UPDATE_STAGE" | "BOOK_MEETING" | "SEND_PROPOSAL"
  intent: string
  draftSubject: string | null
  draftBody: string
  expiresAt: string
  status: string
  riskLevel: "LOW" | "HIGH"
  confidence: "LOW" | "MEDIUM" | "HIGH"
  metadata?: { whyThisDraft?: string; nextBestAction?: string }
  createdAt: string
  lead: { id: string; firstName: string | null; lastName: string | null; email: string; company: string | null; status: string }
  reply: { id: string; body: string; subject: string | null; receivedAt: string; fromEmail: string } | null
}

type BattleCard = {
  summary: string
  talkingPoints: string[]
  likelyObjections: { objection: string; counter: string }[]
  suggestedNextStep: string
  urgencyAngle: string
}

const STAGE_OPTIONS = [
  "NEW", "CONTACTED", "REPLIED", "INTERESTED",
  "MEETING_BOOKED", "PROPOSAL_SENT", "WON", "LOST",
]

const STAGE_COLORS: Record<string, string> = {
  NEW: "text-white/40", CONTACTED: "text-sky-300", REPLIED: "text-violet-300",
  INTERESTED: "text-amber-300", MEETING_BOOKED: "text-emerald-300",
  PROPOSAL_SENT: "text-orange-300", WON: "text-emerald-400", LOST: "text-red-400",
}

const INTENT_COLORS: Record<string, string> = {
  INTERESTED: "text-emerald-400",
  QUESTION: "text-sky-400",
  OBJECTION: "text-amber-400",
  NOT_NOW: "text-orange-400",
  OOO: "text-white/35",
}

function useCountdown(expiresAt: string | null) {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => setMs(Math.max(0, new Date(expiresAt).getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return ms
}

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const ms = useCountdown(expiresAt)
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  const isUrgent = ms < 5 * 60 * 1000
  if (ms === 0) return <span className="text-[9px] font-black text-red-400">Sending…</span>
  return (
    <span className={`text-[9px] font-black tabular-nums ${isUrgent ? "text-red-400" : "text-white/35"}`}>
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  )
}

export default function InboxPage() {
  const { status } = useSession()
  const [activeTab, setActiveTab] = useState<"replies" | "pending">("replies")

  // Replies state
  const [replies, setReplies] = useState<Reply[]>([])
  const [loadingReplies, setLoadingReplies] = useState(true)
  const [selected, setSelected] = useState<Reply | null>(null)
  const [draftSubject, setDraftSubject] = useState("")
  const [draftBody, setDraftBody] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatingStyle, setGeneratingStyle] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [updatingStage, setUpdatingStage] = useState(false)
  const [archived, setArchived] = useState<Set<string>>(new Set())

  // Pending actions state
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [selectedPending, setSelectedPending] = useState<PendingAction | null>(null)
  const [editingSubject, setEditingSubject] = useState("")
  const [editingBody, setEditingBody] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [pendingBusy, setPendingBusy] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/inbox")
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setReplies(list)
        if (list.length > 0) setSelected(list[0])
        setLoadingReplies(false)
      })
      .catch(() => setLoadingReplies(false))

    fetch("/api/agent/pending")
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setPendingActions(list)
        if (list.length > 0) {
          const first = list[0] as PendingAction
          setSelectedPending(first)
          setEditingSubject(first.draftSubject ?? "")
          setEditingBody(first.draftBody)
        }
        setLoadingPending(false)
      })
      .catch(() => setLoadingPending(false))
  }, [status])

  const selectReply = useCallback((reply: Reply) => {
    setSelected(reply)
    setDraftSubject("")
    setDraftBody("")
  }, [])

  const selectPending = useCallback((action: PendingAction) => {
    setSelectedPending(action)
    setEditingSubject(action.draftSubject ?? "")
    setEditingBody(action.draftBody)
    setIsEditing(false)
  }, [])

  async function generateDraft(style?: string) {
    if (!selected) return
    setGenerating(true)
    setGeneratingStyle(style ?? null)
    try {
      const res = await fetch(`/api/inbox/${selected.id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseStyle: style })
      })
      if (!res.ok) throw new Error()
      const { subject, body } = await res.json()
      setDraftSubject(subject)
      setDraftBody(body)
    } catch {
      toast.error("Failed to generate draft")
    } finally {
      setGenerating(false)
      setGeneratingStyle(null)
    }
  }

  async function sendReply() {
    if (!selected || !draftSubject.trim() || !draftBody.trim()) {
      toast.error("Write a reply first")
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/inbox/${selected.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: draftSubject, body: draftBody }),
      })
      if (!res.ok) throw new Error()
      toast.success("Reply sent ✓")
      setDraftSubject("")
      setDraftBody("")
      archiveReply(selected.id)
    } catch {
      toast.error("Failed to send reply")
    } finally {
      setSending(false)
    }
  }

  function archiveReply(replyId: string) {
    setArchived(prev => new Set([...prev, replyId]))
    const remaining = replies.filter(r => r.id !== replyId && !archived.has(r.id))
    setSelected(remaining[0] ?? null)
  }

  async function updateStage(stage: string) {
    if (!selected) return
    setUpdatingStage(true)
    try {
      const res = await fetch(`/api/leads/${selected.lead.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) throw new Error()
      setReplies(prev => prev.map(r =>
        r.id === selected.id ? { ...r, lead: { ...r.lead, status: stage } } : r
      ))
      setSelected(prev => prev ? { ...prev, lead: { ...prev.lead, status: stage } } : prev)
      toast.success(`Stage → ${stage.replace(/_/g, " ")}`)
    } catch {
      toast.error("Failed to update stage")
    } finally {
      setUpdatingStage(false)
    }
  }

  async function handlePendingAction(actionId: string, action: "approve" | "reject" | "edit") {
    setPendingBusy(true)
    try {
      const body: Record<string, string> = { action }
      if (action === "edit") {
        body.subject = editingSubject
        body.draftBody = editingBody
      }
      const res = await fetch(`/api/agent/pending/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()

      if (action === "approve") {
        toast.success("Reply approved and sent ✓")
        removePendingAction(actionId)
      } else if (action === "reject") {
        toast.success("Action dismissed")
        removePendingAction(actionId)
      } else {
        toast.success("Draft saved")
        setIsEditing(false)
        setPendingActions(prev => prev.map(a =>
          a.id === actionId
            ? { ...a, draftSubject: editingSubject, draftBody: editingBody }
            : a
        ))
        setSelectedPending(prev => prev && prev.id === actionId
          ? { ...prev, draftSubject: editingSubject, draftBody: editingBody }
          : prev
        )
      }
    } catch {
      toast.error(action === "approve" ? "Failed to send reply" : "Failed to update action")
    } finally {
      setPendingBusy(false)
    }
  }

  function removePendingAction(actionId: string) {
    const remaining = pendingActions.filter(a => a.id !== actionId)
    setPendingActions(remaining)
    setSelectedPending(remaining[0] ?? null)
    if (remaining[0]) {
      setEditingSubject(remaining[0].draftSubject ?? "")
      setEditingBody(remaining[0].draftBody)
    }
  }

  const battleCard: BattleCard | null = (() => {
    try { return selected?.lead.battleCard ? JSON.parse(selected.lead.battleCard) : null } catch { return null }
  })()

  const visibleReplies = replies.filter(r => !archived.has(r.id))
  const pendingCount = pendingActions.length

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 lg:-m-8 overflow-hidden">

      {/* Left panel */}
      <div
        className={`flex flex-col border-r shrink-0 ${(activeTab === "replies" ? selected : selectedPending) ? "hidden lg:flex" : "flex"} w-full lg:w-75`}
        style={{ borderColor: "rgba(255,255,255,.06)", background: "rgba(255,255,255,.01)" }}
      >
        {/* Tabs */}
        <div className="px-4 pt-4 pb-0 border-b" style={{ borderColor: "rgba(255,255,255,.06)" }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("replies")}
              className={`flex items-center gap-1.5 pb-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "replies" ? "text-white/75 border-violet-400" : "text-white/30 border-transparent hover:text-white/50"}`}
            >
              <MessageSquare className="size-3" />
              Replies
              {visibleReplies.length > 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black text-violet-300 tabular-nums"
                  style={{ background: "rgba(167,139,250,.1)" }}>
                  {visibleReplies.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-1.5 pb-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "pending" ? "text-white/75 border-amber-400" : "text-white/30 border-transparent hover:text-white/50"}`}
            >
              <Bot className="size-3" />
              AI Queue
              {pendingCount > 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black text-amber-300 tabular-nums"
                  style={{ background: "rgba(251,191,36,.1)" }}>
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "replies" ? (
            loadingReplies ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-4 animate-spin text-white/20" />
              </div>
            ) : visibleReplies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <MessageSquare className="size-7 text-white/8 mb-3" />
                <p className="text-[12px] font-bold text-white/25">{replies.length > 0 ? "All caught up!" : "No replies yet"}</p>
                <p className="text-[10px] text-white/15 mt-1">{replies.length > 0 ? "All replies handled" : "Replies land here automatically"}</p>
              </div>
            ) : (
              visibleReplies.map(reply => {
                const name = [reply.lead.firstName, reply.lead.lastName].filter(Boolean).join(" ") || reply.lead.email
                const isActive = selected?.id === reply.id
                return (
                  <button
                    key={reply.id}
                    onClick={() => selectReply(reply)}
                    className="w-full text-left px-4 py-3.5 border-b transition-all hover:bg-white/2"
                    style={{
                      borderColor: "rgba(255,255,255,.04)",
                      background: isActive ? "rgba(167,139,250,.05)" : "transparent",
                      borderLeft: isActive ? "2px solid rgba(167,139,250,.45)" : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-[12px] font-bold text-white/75 truncate">{name}</p>
                      <span className="text-[9px] text-white/25 shrink-0 mt-0.5">{formatRelative(reply.receivedAt)}</span>
                    </div>
                    <p className="text-[10px] text-white/35 truncate mb-1.5">{reply.lead.company || reply.lead.email}</p>
                    <p className="text-[10px] text-white/30 truncate italic leading-relaxed">{reply.body.slice(0, 70)}…</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${STAGE_COLORS[reply.lead.status] ?? "text-white/30"}`}>
                        {reply.lead.status.replace(/_/g, " ")}
                      </span>
                      {reply.lead.battleCard && (
                        <span className="text-[8px] font-black text-amber-300 px-1.5 rounded"
                          style={{ background: "rgba(251,191,36,.08)" }}>Battle Card</span>
                      )}
                    </div>
                  </button>
                )
              })
            )
          ) : (
            // Pending actions list
            loadingPending ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-4 animate-spin text-white/20" />
              </div>
            ) : pendingActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Bot className="size-7 text-white/8 mb-3" />
                <p className="text-[12px] font-bold text-white/25">No pending actions</p>
                <p className="text-[10px] text-white/15 mt-1">AI drafts will appear here for review</p>
              </div>
            ) : (
              pendingActions.map(action => {
                const name = [action.lead.firstName, action.lead.lastName].filter(Boolean).join(" ") || action.lead.email
                const isActive = selectedPending?.id === action.id
                return (
                  <button
                    key={action.id}
                    onClick={() => selectPending(action)}
                    className="w-full text-left px-4 py-3.5 border-b transition-all hover:bg-white/2"
                    style={{
                      borderColor: "rgba(255,255,255,.04)",
                      background: isActive ? "rgba(251,191,36,.04)" : "transparent",
                      borderLeft: isActive ? "2px solid rgba(251,191,36,.35)" : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-[12px] font-bold text-white/75 truncate">{name}</p>
                      <CountdownBadge expiresAt={action.expiresAt} />
                    </div>
                    <p className="text-[10px] text-white/35 truncate mb-1.5">{action.lead.company || action.lead.email}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-wider ${INTENT_COLORS[action.intent] ?? "text-white/30"}`}>
                        {action.intent}
                      </span>
                      <span className="text-[9px] text-white/25">{action.type.replace(/_/g, " ")}</span>
                    </div>
                  </button>
                )
              })
            )
          )}
        </div>
      </div>

      {/* Right panel */}
      {activeTab === "replies" ? (
        !selected ? (
          <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-2 text-center">
            <MessageSquare className="size-10 text-white/5" />
            <p className="text-[13px] font-bold text-white/20">Select a reply</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Thread header */}
            <div className="shrink-0 px-5 py-3.5 border-b flex items-center gap-3"
              style={{ borderColor: "rgba(255,255,255,.06)", background: "rgba(255,255,255,.01)" }}>
              <button className="lg:hidden text-white/40 hover:text-white/70" onClick={() => setSelected(null)}>
                <ArrowLeft className="size-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-white/80 truncate">
                  {[selected.lead.firstName, selected.lead.lastName].filter(Boolean).join(" ") || selected.lead.email}
                  <span className="ml-2 text-[10px] font-normal text-white/30">{selected.lead.company}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={selected.lead.status}
                  onChange={e => updateStage(e.target.value)}
                  disabled={updatingStage}
                  className="rounded-xl px-3 py-1.5 text-[10px] font-bold text-white/55 outline-none cursor-pointer"
                  style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)" }}
                >
                  {STAGE_OPTIONS.map(s => (
                    <option key={s} value={s} style={{ background: "#1e2029" }}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <Link
                  href={`/leads/${selected.lead.id}`}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-white/40 hover:text-white/65 transition-colors"
                  style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
                >
                  <User className="size-3" /> Lead
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-5 py-5 space-y-5">
                {selected.email && (
                  <div className="rounded-2xl p-4"
                    style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="size-5 rounded-full flex items-center justify-center text-[9px] font-black text-white/40"
                        style={{ background: "rgba(255,255,255,.06)" }}>
                        {(selected.lead.user.agencyName || selected.lead.user.name || "A")[0]}
                      </div>
                      <p className="text-[10px] text-white/40">
                        {selected.lead.user.agencyName || selected.lead.user.name || "You"} · Step {selected.email.stepNumber}
                        {selected.email.sentAt && (
                          <span className="ml-2 text-white/20">
                            {new Date(selected.email.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-[11px] font-bold text-white/50 mb-2">{selected.email.subject}</p>
                    <p className="text-[11px] text-white/35 whitespace-pre-wrap leading-relaxed line-clamp-5">{selected.email.body}</p>
                  </div>
                )}

                <div className="rounded-2xl p-4"
                  style={{ background: "rgba(167,139,250,.05)", border: "1px solid rgba(167,139,250,.14)" }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="size-5 rounded-full flex items-center justify-center text-[9px] font-black text-violet-300"
                      style={{ background: "rgba(167,139,250,.12)" }}>
                      {(selected.lead.firstName || selected.lead.email)[0].toUpperCase()}
                    </div>
                    <p className="text-[10px] text-violet-300/70">
                      {[selected.lead.firstName, selected.lead.lastName].filter(Boolean).join(" ") || selected.lead.email}
                      <span className="ml-2 text-white/25">{formatRelative(selected.receivedAt)}</span>
                    </p>
                  </div>
                  {selected.subject && <p className="text-[11px] font-bold text-white/55 mb-2">{selected.subject}</p>}
                  <p className="text-[13px] text-white/70 whitespace-pre-wrap leading-relaxed">{selected.body}</p>
                </div>

                {battleCard && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: "rgba(251,191,36,.04)", border: "1px solid rgba(251,191,36,.11)" }}>
                    <div className="px-4 py-3 border-b flex items-center gap-2"
                      style={{ borderColor: "rgba(251,191,36,.09)" }}>
                      <ShieldCheck className="size-3.5 text-amber-400" />
                      <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">AI Battle Card</span>
                    </div>
                    <div className="p-4 space-y-4">
                      <p className="text-[12px] text-white/65 leading-relaxed">{battleCard.summary}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="flex items-center gap-1 mb-1.5">
                            <Zap className="size-2.5 text-amber-400" />
                            <p className="text-[9px] font-black text-amber-300/60 uppercase tracking-wider">Talking Points</p>
                          </div>
                          <ul className="space-y-1">
                            {battleCard.talkingPoints.map((pt, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/50">
                                <span className="text-amber-400/40 shrink-0">·</span>{pt}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1.5">
                            <Target className="size-2.5 text-amber-400" />
                            <p className="text-[9px] font-black text-amber-300/60 uppercase tracking-wider">Objections</p>
                          </div>
                          <div className="space-y-1.5">
                            {battleCard.likelyObjections.map((obj, i) => (
                              <div key={i} className="rounded-lg p-2" style={{ background: "rgba(0,0,0,.2)" }}>
                                <p className="text-[10px] font-bold text-white/45 mb-0.5">&quot;{obj.objection}&quot;</p>
                                <p className="text-[10px] text-amber-300/65">→ {obj.counter}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl p-3" style={{ background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.09)" }}>
                          <div className="flex items-center gap-1 mb-1">
                            <ChevronRight className="size-2.5 text-emerald-400" />
                            <p className="text-[9px] font-black text-emerald-400/60 uppercase tracking-wider">Next Step</p>
                          </div>
                          <p className="text-[11px] text-white/60">{battleCard.suggestedNextStep}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,.04)", border: "1px solid rgba(239,68,68,.07)" }}>
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="size-2.5 text-red-400" />
                            <p className="text-[9px] font-black text-red-400/60 uppercase tracking-wider">Urgency</p>
                          </div>
                          <p className="text-[11px] text-white/60">{battleCard.urgencyAngle}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reply composer */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: "rgba(255,255,255,.05)" }}>
                    <div className="flex items-center gap-2">
                      <Send className="size-3 text-white/35" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">Reply</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-white/30 hidden sm:inline">AI DRAFT:</span>
                      {(["SOFT", "DIRECT", "VALUE-FIRST"] as const).map(style => {
                        const styleConfig = {
                          SOFT:         { label: "Soft",        cls: "text-white/60 hover:text-white",          bg: "rgba(255,255,255,.05)", border: "rgba(255,255,255,.1)"  },
                          DIRECT:       { label: "Direct",      cls: "text-sky-400/80 hover:text-sky-400",      bg: "rgba(56,189,248,.1)",  border: "rgba(56,189,248,.2)"  },
                          "VALUE-FIRST":{ label: "Value-First", cls: "text-amber-400/80 hover:text-amber-400", bg: "rgba(251,191,36,.1)", border: "rgba(251,191,36,.2)" },
                        }[style]
                        const isThis = generatingStyle === style && generating
                        return (
                          <button
                            key={style}
                            onClick={() => generateDraft(style)}
                            disabled={generating}
                            className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 ${styleConfig.cls}`}
                            style={{ background: styleConfig.bg, border: `1px solid ${styleConfig.border}` }}
                          >
                            {isThis ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                            {styleConfig.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <input
                      value={draftSubject}
                      onChange={e => setDraftSubject(e.target.value)}
                      placeholder="Subject…"
                      className="w-full rounded-xl px-3 py-2 text-[12px] text-white/65 outline-none placeholder:text-white/20"
                      style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
                    />
                    <textarea
                      value={draftBody}
                      onChange={e => setDraftBody(e.target.value)}
                      placeholder="Write your reply…"
                      rows={7}
                      className="w-full rounded-xl px-3 py-2.5 text-[12px] text-white/65 outline-none placeholder:text-white/20 resize-none"
                      style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={sendReply}
                        disabled={sending || !draftBody.trim()}
                        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 10px rgba(0,0,0,.25)" }}
                      >
                        {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                        {sending ? "Sending…" : "Send Reply"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        // Pending action detail
        !selectedPending ? (
          <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-2 text-center">
            <Bot className="size-10 text-white/5" />
            <p className="text-[13px] font-bold text-white/20">Select an action</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Pending header */}
            <div className="shrink-0 px-5 py-3.5 border-b flex items-center gap-3"
              style={{ borderColor: "rgba(255,255,255,.06)", background: "rgba(255,255,255,.01)" }}>
              <button className="lg:hidden text-white/40 hover:text-white/70" onClick={() => setSelectedPending(null)}>
                <ArrowLeft className="size-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-white/80 truncate">
                  {[selectedPending.lead.firstName, selectedPending.lead.lastName].filter(Boolean).join(" ") || selectedPending.lead.email}
                  <span className="ml-2 text-[10px] font-normal text-white/30">{selectedPending.lead.company}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] font-black uppercase tracking-wider ${INTENT_COLORS[selectedPending.intent] ?? "text-white/30"}`}>
                    {selectedPending.intent}
                  </span>
                  <span className="text-white/15 text-[9px]">·</span>
                  <span className="text-[9px] text-white/30">{selectedPending.type.replace(/_/g, " ")}</span>
                  <span className="text-white/15 text-[9px]">·</span>
                  <span className={`text-[9px] font-bold ${selectedPending.riskLevel === "HIGH" ? "text-amber-300" : "text-emerald-300"}`}>
                    {selectedPending.riskLevel} RISK
                  </span>
                  <span className="text-[9px] text-white/35">{selectedPending.confidence} CONF</span>
                </div>
              </div>
              <Link
                href={`/leads/${selectedPending.lead.id}`}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-white/40 hover:text-white/65 transition-colors"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
              >
                <User className="size-3" /> Lead
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-5 py-5 space-y-5">

                {/* Auto-send countdown */}
                <div className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "rgba(251,191,36,.04)", border: "1px solid rgba(251,191,36,.10)" }}>
                  <Timer className="size-4 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-amber-300/80">Auto-sends in</p>
                    <p className="text-[10px] text-white/35 mt-0.5">Review and approve, edit, or dismiss before the timer expires</p>
                  </div>
                  <div className="text-right shrink-0">
                    <CountdownBadge expiresAt={selectedPending.expiresAt} />
                  </div>
                </div>

                {/* Original reply (if available) */}
                {selectedPending.reply && (
                  <div className="rounded-2xl p-4"
                    style={{ background: "rgba(167,139,250,.05)", border: "1px solid rgba(167,139,250,.12)" }}>
                    <p className="text-[9px] font-black text-violet-400/60 uppercase tracking-wider mb-2">Their Reply</p>
                    {selectedPending.reply.subject && (
                      <p className="text-[11px] font-bold text-white/50 mb-1.5">{selectedPending.reply.subject}</p>
                    )}
                    <p className="text-[12px] text-white/65 whitespace-pre-wrap leading-relaxed">{selectedPending.reply.body}</p>
                  </div>
                )}
                {selectedPending.metadata?.whyThisDraft && (
                  <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)" }}>
                    <p className="text-[9px] font-black text-white/35 uppercase tracking-wider mb-1.5">Why this draft</p>
                    <p className="text-[12px] text-white/60 leading-relaxed">{selectedPending.metadata.whyThisDraft}</p>
                  </div>
                )}

                {/* AI draft */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: "rgba(255,255,255,.05)" }}>
                    <div className="flex items-center gap-2">
                      <Bot className="size-3 text-amber-400" />
                      <span className="text-[10px] font-black text-amber-300/70 uppercase tracking-wider">AI Draft</span>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-black text-white/45 hover:text-white/70 transition-colors uppercase tracking-wider"
                        style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)" }}
                      >
                        <Edit3 className="size-3" /> Edit
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-2.5">
                    {isEditing ? (
                      <>
                        <input
                          value={editingSubject}
                          onChange={e => setEditingSubject(e.target.value)}
                          placeholder="Subject…"
                          className="w-full rounded-xl px-3 py-2 text-[12px] text-white/65 outline-none placeholder:text-white/20"
                          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
                        />
                        <textarea
                          value={editingBody}
                          onChange={e => setEditingBody(e.target.value)}
                          rows={8}
                          className="w-full rounded-xl px-3 py-2.5 text-[12px] text-white/65 outline-none resize-none"
                          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
                        />
                      </>
                    ) : (
                      <>
                        {selectedPending.draftSubject && (
                          <p className="text-[12px] font-bold text-white/55 pb-2 border-b" style={{ borderColor: "rgba(255,255,255,.05)" }}>
                            {selectedPending.draftSubject}
                          </p>
                        )}
                        <p className="text-[13px] text-white/70 whitespace-pre-wrap leading-relaxed">{selectedPending.draftBody}</p>
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="px-4 pb-4 flex items-center gap-3">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handlePendingAction(selectedPending.id, "edit")}
                          disabled={pendingBusy}
                          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold text-white/70 transition-all disabled:opacity-40"
                          style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}
                        >
                          {pendingBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Edit3 className="size-3.5" />}
                          Save Draft
                        </button>
                        <button
                          onClick={() => { setIsEditing(false); setEditingSubject(selectedPending.draftSubject ?? ""); setEditingBody(selectedPending.draftBody) }}
                          className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePendingAction(selectedPending.id, "approve")}
                          disabled={pendingBusy}
                          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)", boxShadow: "0 2px 10px rgba(0,0,0,.25)" }}
                        >
                          {pendingBusy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                          Send Now
                        </button>
                        <button
                          onClick={() => handlePendingAction(selectedPending.id, "reject")}
                          disabled={pendingBusy}
                          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold text-red-400/75 hover:text-red-400 transition-all disabled:opacity-40"
                          style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.12)" }}
                        >
                          <XCircle className="size-3.5" /> Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
