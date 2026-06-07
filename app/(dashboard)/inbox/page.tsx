"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Loader2, MessageSquare, Sparkles, Send,
  ShieldCheck, Zap, Clock, User, ArrowLeft,
  Bot, CheckCircle, XCircle, Edit3, Timer, PanelRightClose,
  PanelRightOpen, Mail, Inbox, X
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
  reply: {
    id: string
    body: string
    subject: string | null
    receivedAt: string
    fromEmail: string
    email?: {
      campaign: {
        id: string
        name: string
        autonomous: boolean
      } | null
    } | null
  } | null
}

type ThreadMessage = {
  id: string
  type: "sent" | "received"
  subject: string | null
  body: string
  timestamp: string | Date
  status?: string | null
  stepNumber?: number | null
  wasRepliedTo?: boolean
  fromEmail?: string
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
  "NOT_INTERESTED", "BOUNCED",
]

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-white/5 text-white/40",
  CONTACTED: "bg-sky-500/10 text-sky-300",
  REPLIED: "bg-violet-500/10 text-violet-300",
  INTERESTED: "bg-amber-500/10 text-amber-300",
  MEETING_BOOKED: "bg-emerald-500/10 text-emerald-300",
  PROPOSAL_SENT: "bg-orange-500/10 text-orange-300",
  WON: "bg-emerald-500/15 text-emerald-400",
  LOST: "bg-red-500/10 text-red-400",
  NOT_INTERESTED: "bg-pink-500/10 text-pink-400",
  BOUNCED: "bg-rose-950/20 text-rose-400",
}

const INTENT_COLORS: Record<string, string> = {
  INTERESTED: "bg-emerald-500/10 text-emerald-400",
  QUESTION: "bg-sky-500/10 text-sky-400",
  OBJECTION: "bg-amber-500/10 text-amber-400",
  NOT_NOW: "bg-orange-500/10 text-orange-400",
  OOO: "bg-white/5 text-white/35",
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
  
  if (ms === 0) {
    return (
      <span className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 animate-pulse">
        <Clock className="size-3" />
        Sending…
      </span>
    )
  }

  const isUrgent = ms < 2 * 60 * 1000
  const isWarning = ms < 5 * 60 * 1000
  
  let pillClass = "bg-white/5 text-white/40"
  if (isUrgent) pillClass = "bg-red-500/10 text-red-400"
  else if (isWarning) pillClass = "bg-amber-500/10 text-amber-300"

  return (
    <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tabular-nums ${pillClass}`}>
      <Clock className="size-3" />
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
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [battleCardTab, setBattleCardTab] = useState<"points" | "objections">("points")
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [showCopilot, setShowCopilot] = useState(false)
  const [prevPendingId, setPrevPendingId] = useState<string | null>(null)

  // Sync editing fields when selected pending action changes (by ID) directly during rendering
  const currentPendingId = selectedPending?.id || null
  if (currentPendingId !== prevPendingId) {
    setPrevPendingId(currentPendingId)
    setEditingSubject(selectedPending?.draftSubject ?? "")
    setEditingBody(selectedPending?.draftBody ?? "")
    setIsEditing(false)
  }

  const syncInbox = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true)
    try {
      const res = await fetch("/api/inbox/sync", { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      
      const res2 = await fetch("/api/inbox")
      if (res2.ok) {
        const list = await res2.json()
        setReplies(list)
        setSelected(s => {
          if (s) {
            const updated = list.find((r: { id: string }) => r.id === s.id)
            if (updated) return updated
          }
          return list[0] || null
        })
      }

      const res3 = await fetch("/api/agent/pending")
      if (res3.ok) {
        const list = await res3.json()
        setPendingActions(list)
        setSelectedPending(sp => {
          if (sp) {
            const updated = list.find((p: { id: string }) => p.id === sp.id)
            if (updated) return updated
          }
          return (list[0] as PendingAction) || null
        })
      }

      if (data.found > 0) {
        toast.success(`Sync complete! Found ${data.found} new reply/replies.`)
      } else if (!silent) {
        toast.success("Inbox is up to date")
      }
      setLastSyncedAt(new Date())
    } catch {
      if (!silent) {
        toast.error("Failed to sync inbox")
      }
    } finally {
      if (!silent) setSyncing(false)
    }
  }, [])

  // Initial load
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
        }
        setLoadingPending(false)
      })
      .catch(() => setLoadingPending(false))

    setTimeout(() => {
      syncInbox()
    }, 0)
  }, [status, syncInbox])

  // Poll database updates silently every 3 seconds
  useEffect(() => {
    if (status !== "authenticated") return

    const interval = setInterval(() => {
      fetch("/api/inbox")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setReplies(prev => {
              if (prev.length === data.length) {
                const hasChanged = data.some((item: Reply, idx: number) => {
                  const prevItem = prev[idx]
                  return !prevItem || prevItem.id !== item.id || prevItem.body !== item.body || prevItem.lead?.status !== item.lead?.status
                })
                if (!hasChanged) return prev
              }
              return data
            })
            setSelected(s => {
              if (s) {
                const updated = data.find((r: Reply) => r.id === s.id)
                if (updated) {
                  const hasChanged = updated.body !== s.body || updated.lead?.status !== s.lead?.status || updated.lead?.firstName !== s.lead?.firstName || updated.lead?.lastName !== s.lead?.lastName
                  return hasChanged ? updated : s
                }
              }
              return data[0] || null
            })
          }
        })
        .catch(() => {})

      fetch("/api/agent/pending")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPendingActions(prev => {
              if (prev.length === data.length) {
                const hasChanged = data.some((item: PendingAction, idx: number) => {
                  const prevItem = prev[idx]
                  return !prevItem || prevItem.id !== item.id || prevItem.draftBody !== item.draftBody || prevItem.draftSubject !== item.draftSubject || prevItem.expiresAt !== item.expiresAt
                })
                if (!hasChanged) return prev
              }
              return data
            })
            setSelectedPending(sp => {
              if (sp) {
                const updated = data.find((p: PendingAction) => p.id === sp.id)
                if (updated) {
                  const hasChanged = updated.draftBody !== sp.draftBody || updated.draftSubject !== sp.draftSubject || updated.expiresAt !== sp.expiresAt
                  return hasChanged ? updated : sp
                }
              }
              return (data[0] as PendingAction) || null
            })
          }
        })
        .catch(() => {})
    }, 3000)

    return () => clearInterval(interval)
  }, [status])

  // Silent IMAP sync every 15 seconds in background
  useEffect(() => {
    if (status !== "authenticated") return

    const interval = setInterval(() => {
      syncInbox(true)
    }, 15000)

    return () => clearInterval(interval)
  }, [status, syncInbox])

  // Load and poll selected conversation thread
  useEffect(() => {
    const leadId = activeTab === "replies" ? selected?.lead.id : selectedPending?.lead.id
    if (!leadId) {
      Promise.resolve().then(() => setThreadMessages([]))
      return
    }

    const fetchThread = (showLoading = false) => {
      if (showLoading) setLoadingThread(true)
      fetch(`/api/leads/${leadId}/thread`)
        .then(r => r.json())
        .then(data => {
          const list = Array.isArray(data) ? data : []
          setThreadMessages(prev => {
            if (prev.length === list.length) {
              const hasChanged = list.some((msg: ThreadMessage, index: number) => {
                const prevMsg = prev[index]
                return !prevMsg || prevMsg.id !== msg.id || prevMsg.body !== msg.body || prevMsg.timestamp !== msg.timestamp || prevMsg.wasRepliedTo !== msg.wasRepliedTo
              })
              if (!hasChanged) return prev
            }
            return list
          })
          if (showLoading) setLoadingThread(false)
        })
        .catch(() => {
          if (showLoading) setLoadingThread(false)
          setThreadMessages([])
        })
    }

    // Initial load
    fetchThread(true)

    // Poll every 3 seconds
    const interval = setInterval(() => {
      fetchThread(false)
    }, 3000)

    return () => clearInterval(interval)
  }, [selected?.lead.id, selectedPending?.lead.id, activeTab])

  const selectReply = useCallback((reply: Reply) => {
    setSelected(reply)
    setDraftSubject("")
    setDraftBody("")
    setBattleCardTab("points")
    setShowCopilot(false)
  }, [])

  const selectPending = useCallback((action: PendingAction) => {
    setSelectedPending(action)
    setEditingSubject(action.draftSubject ?? "")
    setEditingBody(action.draftBody)
    setIsEditing(false)
    setShowCopilot(false)
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
  const activeItem = activeTab === "replies" ? selected : selectedPending

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 lg:-m-8 overflow-hidden bg-[#08080c]">

      {/* LEFT PANEL — Inbox List */}
      <div className={`
        flex flex-col shrink-0 border-r border-white/[0.04] bg-[#08080c]
        w-full lg:w-80
        ${activeItem ? "hidden lg:flex" : "flex"}
      `}>
        {/* Header */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-sm font-bold text-white/80 tracking-tight">Inbox</h1>
            <button
              onClick={() => syncInbox()}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white/50 hover:text-white/80 transition-all border border-white/[0.08] hover:border-white/[0.15] disabled:opacity-40 bg-white/[0.02]"
            >
              {syncing ? <Loader2 className="size-3 animate-spin text-sky-400" /> : <span className="size-1.5 rounded-full bg-sky-400" />}
              {syncing ? "Syncing..." : "Sync"}
            </button>
          </div>

          {/* Segmented Tabs */}
          <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => setActiveTab("replies")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === "replies" ? "bg-white/[0.08] text-white/90 shadow-sm" : "text-white/35 hover:text-white/55"}`}
            >
              <Mail className="size-3.5" />
              Replies
              {visibleReplies.length > 0 && (
                <span className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black bg-violet-500/15 text-violet-300">
                  {visibleReplies.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === "pending" ? "bg-white/[0.08] text-white/90 shadow-sm" : "text-white/35 hover:text-white/55"}`}
            >
              <Bot className="size-3.5" />
              AI Queue
              {pendingCount > 0 && (
                <span className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black bg-amber-500/15 text-amber-300">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {lastSyncedAt && (
            <p className="text-[9px] text-white/20 mt-2 text-right">
              Synced {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {activeTab === "replies" ? (
            <>
              {loadingReplies ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="size-5 animate-spin text-white/15" />
                </div>
              ) : visibleReplies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <Inbox className="size-8 text-white/10 mb-3" />
                  <p className="text-sm font-semibold text-white/25">{replies.length > 0 ? "All caught up!" : "No replies yet"}</p>
                  <p className="text-xs text-white/15 mt-1">{replies.length > 0 ? "All replies handled" : "Replies land here automatically"}</p>
                </div>
              ) : (
                visibleReplies.map(reply => {
                  const name = [reply.lead.firstName, reply.lead.lastName].filter(Boolean).join(" ") || reply.lead.email
                  const isActive = selected?.id === reply.id
                  return (
                    <button
                      key={reply.id}
                      onClick={() => selectReply(reply)}
                      className={`w-full text-left rounded-xl px-3 py-3 transition-all group ${isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`size-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isActive ? "bg-violet-500/15 text-violet-300" : "bg-white/[0.05] text-white/40"}`}>
                            {name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[13px] font-semibold truncate ${isActive ? "text-white/90" : "text-white/70"}`}>{name}</p>
                            <p className="text-[11px] text-white/30 truncate">{reply.lead.company || reply.lead.email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-white/20 shrink-0 mt-0.5">{formatRelative(reply.receivedAt)}</span>
                      </div>
                      <p className="text-[12px] text-white/35 truncate pl-[2.75rem] leading-relaxed">{reply.body.slice(0, 80)}…</p>
                      <div className="flex items-center gap-2 pl-[2.75rem] mt-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${STAGE_COLORS[reply.lead.status]}`}>
                          {reply.lead.status.replace(/_/g, " ")}
                        </span>
                        {reply.lead.battleCard && (
                          <span className="text-[9px] font-bold text-amber-300/80 flex items-center gap-1">
                            <Sparkles className="size-2.5" /> AI Ready
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </>
          ) : (
            <>
              {loadingPending ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="size-5 animate-spin text-white/15" />
                </div>
              ) : pendingActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <Bot className="size-8 text-white/10 mb-3" />
                  <p className="text-sm font-semibold text-white/25">No pending actions</p>
                  <p className="text-xs text-white/15 mt-1">AI drafts will appear here for review</p>
                </div>
              ) : (
                pendingActions.map(action => {
                  const name = [action.lead.firstName, action.lead.lastName].filter(Boolean).join(" ") || action.lead.email
                  const isActive = selectedPending?.id === action.id
                  const isAutopilot = action.reply?.email?.campaign?.autonomous ?? false
                  return (
                    <button
                      key={action.id}
                      onClick={() => selectPending(action)}
                      className={`w-full text-left rounded-xl px-3 py-3 transition-all ${isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`size-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isActive ? "bg-amber-500/15 text-amber-300" : "bg-white/[0.05] text-white/40"}`}>
                            {name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[13px] font-semibold truncate ${isActive ? "text-white/90" : "text-white/70"}`}>{name}</p>
                            <p className="text-[11px] text-white/30 truncate">{action.lead.company || action.lead.email}</p>
                          </div>
                        </div>
                        <CountdownBadge expiresAt={action.expiresAt} />
                      </div>
                      <div className="flex items-center gap-2 pl-[2.75rem] mt-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${INTENT_COLORS[action.intent]}`}>
                          {action.intent}
                        </span>
                        <span className="text-[9px] text-white/20">{action.type.replace(/_/g, " ")}</span>
                        {isAutopilot && (
                          <span className="text-[9px] font-bold text-sky-300/70 flex items-center gap-1 ml-auto">
                            <span className="size-1 rounded-full bg-sky-400 animate-pulse" />
                            Auto
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Content */}
      <div className={`
        flex-1 flex flex-col min-w-0 bg-[#08080c]
        ${activeItem ? "flex" : "hidden lg:flex"}
      `}>
        {!activeItem ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center">
            <div className="size-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <MessageSquare className="size-7 text-white/10" />
            </div>
            <p className="text-sm font-semibold text-white/20">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Top Bar */}
            <div className="shrink-0 px-6 py-4 border-b border-white/[0.04] flex items-center justify-between bg-[#08080c]/80 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-white/40" onClick={() => activeTab === "replies" ? setSelected(null) : setSelectedPending(null)}>
                  <ArrowLeft className="size-4" />
                </button>
                <div className="size-9 rounded-full bg-white/[0.05] flex items-center justify-center text-[13px] font-bold text-white/50 shrink-0">
                  {((activeTab === "replies" ? selected?.lead.firstName : selectedPending?.lead.firstName) || (activeTab === "replies" ? selected?.lead.email : selectedPending?.lead.email))?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-white/80 truncate">
                    {activeTab === "replies"
                      ? [selected?.lead.firstName, selected?.lead.lastName].filter(Boolean).join(" ") || selected?.lead.email
                      : [selectedPending?.lead.firstName, selectedPending?.lead.lastName].filter(Boolean).join(" ") || selectedPending?.lead.email}
                  </p>
                  <p className="text-[11px] text-white/30 truncate">
                    {activeTab === "replies" ? selected?.lead.company : selectedPending?.lead.company} · 
                    {activeTab === "replies" ? selected?.lead.email : selectedPending?.lead.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === "replies" && selected && (
                  <select
                    value={selected.lead.status}
                    onChange={e => updateStage(e.target.value)}
                    disabled={updatingStage}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-bold outline-none cursor-pointer bg-white/[0.04] border border-white/[0.08] text-white/60 hover:border-white/[0.15] transition-colors"
                  >
                    {STAGE_OPTIONS.map(s => (
                      <option key={s} value={s} className="bg-[#1a1a24]">{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setShowCopilot(!showCopilot)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all border ${showCopilot ? "text-violet-300 border-violet-500/30 bg-violet-500/10" : "text-white/40 border-white/[0.08] hover:text-white/60 hover:border-white/[0.15] bg-white/[0.02]"}`}
                >
                  {showCopilot ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                  Copilot
                </button>
                <Link
                  href={`/leads/${activeTab === "replies" ? selected?.lead.id : selectedPending?.lead.id}`}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                >
                  <User className="size-4" />
                </Link>
              </div>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loadingThread ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="size-5 animate-spin text-white/15" />
                </div>
              ) : threadMessages.length === 0 ? (
                <div className="max-w-2xl mx-auto">
                  {activeTab === "replies" && selected && (
                    <div className="rounded-2xl p-5 bg-violet-500/[0.03] border border-violet-500/[0.08]">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-full bg-violet-500/10 flex items-center justify-center text-[11px] font-bold text-violet-300 shrink-0 mt-0.5">
                          {(selected.lead.firstName || selected.lead.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[12px] font-semibold text-white/70">
                              {[selected.lead.firstName, selected.lead.lastName].filter(Boolean).join(" ") || selected.lead.email}
                            </span>
                            <span className="text-[10px] text-white/25">{formatRelative(selected.receivedAt)}</span>
                          </div>
                          {selected.subject && <p className="text-[13px] font-bold text-white/50 mb-2">{selected.subject}</p>}
                          <p className="text-[13px] text-white/65 whitespace-pre-wrap leading-relaxed">{selected.body}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "pending" && selectedPending?.reply && (
                    <div className="rounded-2xl p-5 bg-violet-500/[0.03] border border-violet-500/[0.08]">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-full bg-violet-500/10 flex items-center justify-center text-[11px] font-bold text-violet-300 shrink-0 mt-0.5">
                          {(selectedPending.lead.firstName || selectedPending.lead.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[12px] font-semibold text-white/70">
                              {[selectedPending.lead.firstName, selectedPending.lead.lastName].filter(Boolean).join(" ") || selectedPending.lead.email}
                            </span>
                            <span className="text-[10px] text-white/25">{formatRelative(selectedPending.reply.receivedAt)}</span>
                          </div>
                          {selectedPending.reply.subject && <p className="text-[13px] font-bold text-white/50 mb-2">{selectedPending.reply.subject}</p>}
                          <p className="text-[13px] text-white/65 whitespace-pre-wrap leading-relaxed">{selectedPending.reply.body}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-4">
                  {threadMessages.map((msg) => {
                    const isSent = msg.type === "sent"
                    return (
                      <div key={msg.id} className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${isSent ? "bg-white/[0.04] border border-white/[0.06]" : "bg-violet-500/[0.04] border border-violet-500/[0.10]"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[11px] font-semibold ${isSent ? "text-white/50" : "text-violet-300/70"}`}>
                              {isSent ? "You" : (activeTab === "replies" ? [selected?.lead.firstName, selected?.lead.lastName].filter(Boolean).join(" ") : [selectedPending?.lead.firstName, selectedPending?.lead.lastName].filter(Boolean).join(" ")) || "Prospect"}
                            </span>
                            {isSent && (
                              <span className="text-[9px] uppercase tracking-wider text-white/20">
                                {msg.stepNumber === 0 ? "AI" : msg.stepNumber === 99 ? "Manual" : `Step ${msg.stepNumber}`}
                              </span>
                            )}
                            {isSent && msg.wasRepliedTo && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                <CheckCircle className="size-3" /> Replied
                              </span>
                            )}
                            <span className="text-[10px] text-white/20 ml-auto">
                              {new Date(msg.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {msg.subject && <p className="text-[12px] font-bold text-white/40 mb-2">{msg.subject}</p>}
                          <p className="text-[13px] text-white/70 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bottom Composer / Review */}
            <div className="shrink-0 border-t border-white/[0.04] bg-[#08080c]/80 backdrop-blur-xl">
              {activeTab === "replies" ? (
                <div className="max-w-2xl mx-auto px-6 py-4 space-y-3">
                  {/* AI Draft Buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Generate</span>
                    {(["SOFT", "DIRECT", "VALUE-FIRST"] as const).map(style => {
                      const styleConfig = {
                        SOFT:         { label: "Soft",        cls: "text-white/70 hover:text-white",          bg: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.12)"  },
                        DIRECT:       { label: "Direct",      cls: "text-sky-300/80 hover:text-sky-300",      bg: "rgba(56,189,248,.1)",  border: "rgba(56,189,248,.25)"  },
                        "VALUE-FIRST":{ label: "Value-First", cls: "text-amber-300/80 hover:text-amber-300", bg: "rgba(251,191,36,.1)", border: "rgba(251,191,36,.25)" },
                      }[style]
                      const isThis = generatingStyle === style && generating
                      return (
                        <button
                          key={style}
                          onClick={() => generateDraft(style)}
                          disabled={generating}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all disabled:opacity-40 ${styleConfig.cls}`}
                          style={{ background: styleConfig.bg, border: `1px solid ${styleConfig.border}` }}
                        >
                          {isThis ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                          {styleConfig.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] focus-within:border-white/[0.12] transition-colors">
                    <input
                      value={draftSubject}
                      onChange={e => setDraftSubject(e.target.value)}
                      placeholder="Subject line..."
                      className="w-full px-4 py-2.5 text-[13px] text-white/70 bg-transparent outline-none placeholder:text-white/20 border-b border-white/[0.04]"
                    />
                    <textarea
                      value={draftBody}
                      onChange={e => setDraftBody(e.target.value)}
                      placeholder="Write your reply..."
                      rows={3}
                      className="w-full px-4 py-3 text-[13px] text-white/70 bg-transparent outline-none placeholder:text-white/20 resize-none"
                    />
                    <div className="px-3 pb-3 flex justify-end">
                      <button
                        onClick={sendReply}
                        disabled={sending || !draftBody.trim()}
                        className="flex items-center gap-2 rounded-lg px-5 py-2 text-[12px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 10px rgba(0,0,0,.25)" }}
                      >
                        {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                        {sending ? "Sending…" : "Send Reply"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto px-6 py-4">
                  <div className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
                    <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="size-4 text-amber-400" />
                        <span className="text-[11px] font-bold text-amber-300/80">AI Draft Review</span>
                        <CountdownBadge expiresAt={selectedPending!.expiresAt} />
                      </div>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white/40 hover:text-white/70 transition-colors bg-white/[0.04] border border-white/[0.08]"
                        >
                          <Edit3 className="size-3" /> Edit
                        </button>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {isEditing ? (
                        <>
                          <input
                            value={editingSubject}
                            onChange={e => setEditingSubject(e.target.value)}
                            placeholder="Subject..."
                            className="w-full rounded-lg px-3 py-2 text-[13px] text-white/70 bg-white/[0.04] border border-white/[0.08] outline-none placeholder:text-white/20"
                          />
                          <textarea
                            value={editingBody}
                            onChange={e => setEditingBody(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg px-3 py-2.5 text-[13px] text-white/70 bg-white/[0.04] border border-white/[0.08] outline-none resize-none placeholder:text-white/20"
                          />
                        </>
                      ) : (
                        <>
                          {selectedPending?.draftSubject && (
                            <p className="text-[13px] font-bold text-white/50 pb-2 border-b border-white/[0.04]">{selectedPending.draftSubject}</p>
                          )}
                          <p className="text-[13px] text-white/70 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-2">{selectedPending?.draftBody}</p>
                        </>
                      )}
                    </div>

                    <div className="px-4 pb-4 flex items-center gap-3">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handlePendingAction(selectedPending!.id, "edit")}
                            disabled={pendingBusy}
                            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[11px] font-bold text-white/70 bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.08] transition-all disabled:opacity-40"
                          >
                            {pendingBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Edit3 className="size-3.5" />}
                            Save Draft
                          </button>
                          <button
                            onClick={() => { setIsEditing(false); setEditingSubject(selectedPending!.draftSubject ?? ""); setEditingBody(selectedPending!.draftBody) }}
                            className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handlePendingAction(selectedPending!.id, "approve")}
                            disabled={pendingBusy}
                            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[12px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)", boxShadow: "0 2px 10px rgba(0,0,0,.25)" }}
                          >
                            {pendingBusy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                            {["SEND_REPLY", "BOOK_MEETING", "SEND_PROPOSAL"].includes(selectedPending!.type) ? "Approve & Send" : "Confirm Update"}
                          </button>
                          <button
                            onClick={() => handlePendingAction(selectedPending!.id, "reject")}
                            disabled={pendingBusy}
                            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[11px] font-bold text-red-400/70 hover:text-red-400 transition-all disabled:opacity-40 bg-red-500/[0.06] border border-red-500/[0.12]"
                          >
                            <XCircle className="size-3.5" /> Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* AI COPILOT — Slide-over Panel */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-[22rem] bg-[#0c0c14]/95 backdrop-blur-2xl border-l border-white/[0.06] shadow-2xl
        transition-transform duration-300 ease-out
        ${showCopilot ? "translate-x-0" : "translate-x-full"}
      `}>
        <div className="h-full flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="shrink-0 px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-violet-400" />
              <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">AI Copilot</span>
            </div>
            <button 
              onClick={() => setShowCopilot(false)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Battle Card */}
            {battleCard && activeTab === "replies" && (
              <div className="rounded-2xl p-4 space-y-4 bg-[#0f0f18] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-violet-300 uppercase tracking-wider">Strategy Card</span>
                  {battleCard.urgencyAngle && (
                    <span className="text-[9px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full">
                      {battleCard.urgencyAngle}
                    </span>
                  )}
                </div>

                <div className="rounded-xl p-3 bg-emerald-500/[0.05] border border-emerald-500/[0.12]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="size-3.5 text-emerald-400" />
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Next Action</p>
                  </div>
                  <p className="text-[12px] font-semibold text-white/90 leading-relaxed">{battleCard.suggestedNextStep}</p>
                </div>

                <div className="flex border-b border-white/[0.04]">
                  <button
                    onClick={() => setBattleCardTab("points")}
                    className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider border-b transition-all ${battleCardTab === "points" ? "text-violet-300 border-violet-400" : "text-white/30 border-transparent"}`}
                  >
                    Key Points
                  </button>
                  {battleCard.likelyObjections && battleCard.likelyObjections.length > 0 && (
                    <button
                      onClick={() => setBattleCardTab("objections")}
                      className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider border-b transition-all ${battleCardTab === "objections" ? "text-amber-300 border-amber-400" : "text-white/30 border-transparent"}`}
                    >
                      Objections ({battleCard.likelyObjections.length})
                    </button>
                  )}
                </div>

                {battleCardTab === "points" && (
                  <div className="space-y-3">
                    <p className="text-[12px] text-white/60 leading-relaxed italic border-l-2 border-white/[0.08] pl-3">
                      &quot;{battleCard.summary}&quot;
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {battleCard.talkingPoints.map((pt, i) => (
                        <span key={i} className="text-[10px] text-white/60 bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-md">
                          {pt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {battleCardTab === "objections" && battleCard.likelyObjections && (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {battleCard.likelyObjections.map((obj, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-1.5 bg-black/20 border border-white/[0.04]">
                        <p className="text-[11px] text-white/50 italic">&quot;{obj.objection}&quot;</p>
                        <p className="text-[11px] text-amber-200/70 leading-relaxed">{obj.counter}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending Meta */}
            {activeTab === "pending" && selectedPending?.metadata?.whyThisDraft && (
              <div className="rounded-2xl p-4 bg-[#0f0f18] border border-white/[0.06]">
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-2">Why this draft</p>
                <p className="text-[12px] text-white/60 leading-relaxed">{selectedPending.metadata.whyThisDraft}</p>
              </div>
            )}

            {activeTab === "pending" && selectedPending && (
              <div className="rounded-2xl p-4 bg-amber-500/[0.03] border border-amber-500/[0.10] flex items-center gap-3">
                <Timer className="size-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[12px] font-bold text-amber-300/80">Auto-sends soon</p>
                  <p className="text-[11px] text-white/30 mt-0.5">Review before the timer expires</p>
                </div>
                <div className="ml-auto">
                  <CountdownBadge expiresAt={selectedPending.expiresAt} />
                </div>
              </div>
            )}

            {/* Lead Details */}
            <div className="rounded-2xl p-4 space-y-3 bg-[#0f0f18] border border-white/[0.06]">
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Prospect Details</p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-white/25 uppercase mb-0.5">Company</p>
                  <p className="text-[12px] font-semibold text-white/80">
                    {(activeTab === "replies" ? selected?.lead.company : selectedPending?.lead.company) || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/25 uppercase mb-0.5">Email</p>
                  <p className="text-[12px] text-white/50 truncate">
                    {activeTab === "replies" ? selected?.lead.email : selectedPending?.lead.email}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/25 uppercase mb-0.5">Stage</p>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${STAGE_COLORS[activeTab === "replies" ? selected?.lead.status ?? "NEW" : selectedPending?.lead.status ?? "NEW"]}`}>
                    {(activeTab === "replies" ? selected?.lead.status : selectedPending?.lead.status)?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile copilot */}
      {showCopilot && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowCopilot(false)}
        />
      )}
    </div>
  )
}