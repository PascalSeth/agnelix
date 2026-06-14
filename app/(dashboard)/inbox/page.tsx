/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  Loader2, MessageSquare, Sparkles, Send, Zap,
  Clock, ArrowRight, Bot, CheckCircle, XCircle, X,
  ShieldAlert, Flame, MailOpen, Activity, Command,
  Play, PauseCircle
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

type OriginalEmail = { id: string; subject: string; body: string; sentAt: string | null; stepNumber: number } | null

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
  expiresAt: string | null
  status: string
  riskLevel: "LOW" | "HIGH"
  confidence: "LOW" | "MEDIUM" | "HIGH"
  metadata?: { whyThisDraft?: string; nextBestAction?: string }
  createdAt: string
  lead: Lead
  reply: {
    id: string; body: string; subject: string | null; receivedAt: string; fromEmail: string
    email?: { campaign: { id: string; name: string; autonomous: boolean } | null } | null
  } | null
}

type ThreadMessage = {
  id: string; type: "sent" | "received"; subject: string | null; body: string; timestamp: string | Date
  stepNumber?: number | null; wasRepliedTo?: boolean
}

type TriageItem = {
  id: string
  key: string
  type: "REPLY" | "PENDING"
  lead: Lead
  reply?: Reply
  pendingAction?: PendingAction
  intent: string
  isAutopilot: boolean
  expiresAt: string | null
  timestamp: string
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

// ── COMPONENTS ─────────────────────────────────────────────────────────

function CircularCountdown({ expiresAt }: { expiresAt: string | null }) {
  const ms = useCountdown(expiresAt)
  if (!expiresAt) return null
  
  const totalMs = 15 * 60 * 1000 // Assumed 15 min total
  const progress = Math.max(0, Math.min(1, ms / totalMs))
  const dashArray = 2 * Math.PI * 10
  const dashOffset = dashArray * (1 - progress)

  const isUrgent = ms < 2 * 60 * 1000
  const isWarning = ms < 5 * 60 * 1000

  let color = "text-emerald-400"
  if (isUrgent) color = "text-rose-500 animate-pulse"
  else if (isWarning) color = "text-amber-400"

  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)

  return (
    <div className="relative flex items-center justify-center size-8">
      <svg className="size-full -rotate-90 transform" viewBox="0 0 24 24">
        <circle className="text-white/10 stroke-current" strokeWidth="2" cx="12" cy="12" r="10" fill="transparent" />
        <circle 
          className={`${color} stroke-current transition-all duration-1000 ease-linear`}
          strokeWidth="2" strokeLinecap="round" cx="12" cy="12" r="10" fill="transparent"
          strokeDasharray={dashArray} strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/70 tabular-nums">
        {ms === 0 ? "0:00" : `${mins}:${secs.toString().padStart(2, "0")}`}
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────

export default function InboxPage() {
  const { status } = useSession()
  
  const [replies, setReplies] = useState<Reply[]>([])
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Triage State
  const [triageQueue, setTriageQueue] = useState<TriageItem[]>([])
  const [triageIndex, setTriageIndex] = useState(-1)
  const [activeFilter, setActiveFilter] = useState("all")
  
  const currentItem = triageQueue[triageIndex] || null

  // Focus Mode State
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [draftSubject, setDraftSubject] = useState("")
  const [draftBody, setDraftBody] = useState("")
  const [omniPrompt, setOmniPrompt] = useState("")
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView()
    }
  }, [threadMessages, currentItem])

  const [generating, setGenerating] = useState(false)
  const [pendingBusy, setPendingBusy] = useState(false)

  const currentLeadIdRef = useRef<string | null>(null)
  const lastDraftRef = useRef({ subject: "", body: "" })

  useEffect(() => {
    currentLeadIdRef.current = currentItem?.lead?.id || null
  }, [currentItem])

  const syncInbox = useCallback(async (silent = false, syncImap = false) => {
    if (!silent) setSyncing(true)
    try {
      if (!silent || syncImap) {
        await fetch("/api/inbox/sync", { method: "POST" })
      }
      const [resReplies, resPending] = await Promise.all([fetch("/api/inbox"), fetch("/api/agent/pending")])
      if (resReplies.ok) setReplies(await resReplies.json())
      if (resPending.ok) setPendingActions(await resPending.json())
    } catch {
      if (!silent) toast.error("Sync failed")
    } finally {
      if (!silent) setSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    
    // Fetch local DB state instantly so the UI isn't blocked by slow IMAP servers
    Promise.all([fetch("/api/inbox"), fetch("/api/agent/pending")])
      .then(async ([resR, resP]) => {
        if (resR.ok) setReplies(await resR.json())
        if (resP.ok) setPendingActions(await resP.json())
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Run the slow IMAP pull in the background
    setTimeout(() => {
      syncInbox(false)
    }, 500)

    // Poll DB every 10 seconds, and run full IMAP sync silently every 30 seconds
    let ticks = 0
    const interval = setInterval(() => {
      ticks += 10
      const runImapSync = ticks % 30 === 0
      syncInbox(true, runImapSync)

      // Refresh active thread messages in background
      const activeLeadId = currentLeadIdRef.current
      if (activeLeadId) {
        fetch(`/api/leads/${activeLeadId}/thread`)
          .then(r => r.json())
          .then(data => {
            const messagesList = Array.isArray(data) ? data : []
            setThreadMessages(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(messagesList)) {
                // If a new incoming message is received
                const prevLatest = prev[prev.length - 1]
                const nextLatest = messagesList[messagesList.length - 1]
                if (nextLatest && nextLatest.type === "received" && (!prevLatest || prevLatest.id !== nextLatest.id)) {
                  toast.info("New message received!")
                }
                return messagesList
              }
              return prev
            })
          })
          .catch(() => {})
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [status, syncInbox])

  useEffect(() => {
    if (!currentItem) return
    const leadId = currentItem.lead.id
    setLoadingThread(true)
    
    // Clear inputs immediately to prevent flash of previous lead's data
    setDraftSubject("")
    setDraftBody("")
    setOmniPrompt("")
    lastDraftRef.current = { subject: "", body: "" }

    fetch(`/api/leads/${leadId}/thread`)
      .then(r => r.json())
      .then(data => {
        const messagesList = Array.isArray(data) ? data : []
        setThreadMessages(messagesList)
        
        // Check if the latest message in the thread is from us
        const latestMsg = messagesList[messagesList.length - 1]
        const isLatestFromMe = latestMsg && latestMsg.type === "sent"

        if (isLatestFromMe) {
          // Leave blank until lead sends a message
          setDraftSubject("")
          setDraftBody("")
        } else {
          // Pre-fill / Auto-generate draft
          if (currentItem.pendingAction) {
            const subject = currentItem.pendingAction.draftSubject || ""
            const body = currentItem.pendingAction.draftBody || ""
            setDraftSubject(subject)
            setDraftBody(body)
            lastDraftRef.current = { subject, body }
          } else {
            // Auto-generate draft on the fly if it hasn't processed yet
            const replyId = currentItem.reply?.id
            if (replyId) {
              setGenerating(true)
              fetch(`/api/inbox/${replyId}/draft`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ responseStyle: "VALUE-FIRST" })
              })
                .then(res => res.json())
                .then(data => {
                  if (data.subject) {
                    setDraftSubject(data.subject)
                    lastDraftRef.current.subject = data.subject
                  }
                  if (data.body) {
                    setDraftBody(data.body)
                    lastDraftRef.current.body = data.body
                  }
                })
                .catch(() => {})
                .finally(() => setGenerating(false))
            }
          }
        }
      })
      .catch(() => {
        setThreadMessages([])
        if (currentItem.pendingAction) {
          const subject = currentItem.pendingAction.draftSubject || ""
          const body = currentItem.pendingAction.draftBody || ""
          setDraftSubject(subject)
          setDraftBody(body)
          lastDraftRef.current = { subject, body }
        }
      })
      .finally(() => setLoadingThread(false))
  }, [currentItem])

  // Keep the focus mode queue and index in sync with background additions/deletions/resolutions
  useEffect(() => {
    if (triageIndex < 0 || triageQueue.length === 0) return
    const activeItem = triageQueue[triageIndex]
    if (!activeItem) return

    const exists = activeItem.type === "PENDING"
      ? pendingActions.some(pa => pa.id === activeItem.id)
      : replies.some(r => r.id === activeItem.id)

    if (!exists) {
      // It was resolved in the background (e.g. auto-sent or rejected)
      const nextQueue = triageQueue.filter(item => item.key !== activeItem.key)
      setTriageQueue(nextQueue)
      if (nextQueue.length === 0) {
        setTriageIndex(-1)
        toast.info("Active thread resolved in the background.")
      } else {
        const nextIndex = triageIndex >= nextQueue.length ? nextQueue.length - 1 : triageIndex
        setTriageIndex(nextIndex)
        toast.info("Active thread resolved in the background. Loading next...")
      }
      return
    }

    // Keep activeItem properties fresh (e.g. expiresAt or pendingAction details)
    setTriageQueue(prev => {
      const isDifferent = prev.some(item => {
        if (item.type === "PENDING") {
          const fresh = pendingActions.find(pa => pa.id === item.id)
          return fresh && (fresh.expiresAt !== item.expiresAt || fresh.draftBody !== item.pendingAction?.draftBody || fresh.draftSubject !== item.pendingAction?.draftSubject)
        } else {
          const fresh = replies.find(r => r.id === item.id)
          return fresh && (fresh.receivedAt !== item.reply?.receivedAt)
        }
      })
      if (!isDifferent) return prev

      return prev.map(item => {
        if (item.type === "PENDING") {
          const fresh = pendingActions.find(pa => pa.id === item.id)
          if (fresh) {
            return {
              ...item,
              expiresAt: fresh.expiresAt,
              pendingAction: fresh,
              lead: fresh.lead
            }
          }
        } else {
          const fresh = replies.find(r => r.id === item.id)
          if (fresh) {
            return {
              ...item,
              reply: fresh,
              lead: fresh.lead
            }
          }
        }
        return item
      })
    })
  }, [pendingActions, replies, triageIndex, triageQueue])

  // Keep editor inputs in sync with background draft updates if the user has not started custom editing
  useEffect(() => {
    if (!currentItem) return
    const pa = currentItem.pendingAction
    if (!pa) return

    // If the background draft changed AND the user hasn't typed anything different from the previous draft
    const editorIsDefaultOrEmpty = 
      (!draftSubject && !draftBody) || 
      (draftSubject === lastDraftRef.current.subject && draftBody === lastDraftRef.current.body)

    if (editorIsDefaultOrEmpty) {
      if (pa.draftSubject !== draftSubject || pa.draftBody !== draftBody) {
        setDraftSubject(pa.draftSubject || "")
        setDraftBody(pa.draftBody || "")
        lastDraftRef.current = { subject: pa.draftSubject || "", body: pa.draftBody }
      }
    }
  }, [currentItem, draftSubject, draftBody])

  // Map to Triage Items
  const triageItems: TriageItem[] = []
  
  pendingActions.forEach(pa => {
    triageItems.push({
      id: pa.id, key: `pending-${pa.id}`, type: "PENDING", lead: pa.lead,
      pendingAction: pa, reply: pa.reply as Reply | undefined,
      intent: pa.intent, isAutopilot: pa.riskLevel === "LOW",
      expiresAt: pa.expiresAt, timestamp: pa.createdAt
    })
  })
  
  replies.forEach(r => {
    const hasPending = pendingActions.some(pa => pa.reply?.id === r.id)
    if (!hasPending) {
      triageItems.push({
        id: r.id, key: `reply-${r.id}`, type: "REPLY", lead: r.lead,
        reply: r, intent: "MANUAL_REVIEW", isAutopilot: false,
        expiresAt: null, timestamp: r.receivedAt
      })
    }
  })

  // Categorize
  const autopilotItems = triageItems.filter(i => i.isAutopilot)
  const hotItems = triageItems.filter(i => !i.isAutopilot && ["INTERESTED", "BOOK_MEETING"].includes(i.intent || ""))
  const objectionItems = triageItems.filter(i => !i.isAutopilot && ["OBJECTION", "NOT_NOW"].includes(i.intent || ""))
  const questionsItems = triageItems.filter(i => !i.isAutopilot && !hotItems.includes(i) && !objectionItems.includes(i))

  const filterTabs = [
    { id: "all", title: "All Active", icon: Command, color: "text-white/80", bg: "bg-white/10", border: "border-white/10", items: triageItems },
    { id: "hot", title: "Hot Leads", icon: Flame, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", items: hotItems },
    { id: "autopilot", title: "Autopilot", icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", items: autopilotItems },
    { id: "objections", title: "Objections", icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", items: objectionItems },
    { id: "questions", title: "Questions & Manual", icon: MailOpen, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", items: questionsItems },
  ]

  const activeItems = filterTabs.find(t => t.id === activeFilter)?.items || triageItems

  const openFocusMode = (queue: TriageItem[], startIndex: number) => {
    setTriageQueue(queue)
    setTriageIndex(startIndex)
  }

  const closeFocusMode = () => {
    setTriageIndex(-1)
    syncInbox(true) // Refresh queue state
  }

  const removeCurrentItemAndGoNext = () => {
    if (!currentItem) return

    // 1. Remove from base list states so overview stream updates immediately
    if (currentItem.type === "PENDING") {
      setPendingActions(prev => prev.filter(pa => pa.id !== currentItem.id))
    } else {
      setReplies(prev => prev.filter(r => r.id !== currentItem.id))
    }

    // 2. Remove from active triageQueue
    const newQueue = triageQueue.filter(item => item.key !== currentItem.key)
    setTriageQueue(newQueue)

    // 3. Handle index navigation
    if (newQueue.length === 0) {
      toast.success("Queue cleared! Outstanding triage.")
      closeFocusMode()
    } else {
      if (triageIndex >= newQueue.length) {
        setTriageIndex(newQueue.length - 1)
      }
    }
  }

  const pauseTimer = () => {
    if (!currentItem?.pendingAction?.id || !currentItem.expiresAt) return;
    setPendingActions(prev => prev.map(pa => 
      pa.id === currentItem.pendingAction!.id ? { ...pa, expiresAt: null } : pa
    ))
    setTriageQueue(prev => prev.map(item => 
      item.key === currentItem.key 
        ? { ...item, expiresAt: null, pendingAction: item.pendingAction ? { ...item.pendingAction, expiresAt: null } : undefined }
        : item
    ))
    if (currentItem.reply?.id) {
      fetch(`/api/inbox/${currentItem.reply.id}/pause`, { method: "POST" }).catch(() => {})
    }
  }

  const resumeTimer = async () => {
    if (!currentItem?.pendingAction?.id || currentItem.expiresAt || !currentItem.reply?.id) return;
    try {
      const res = await fetch(`/api/inbox/${currentItem.reply.id}/resume`, { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPendingActions(prev => prev.map(pa => 
        pa.id === currentItem.pendingAction!.id ? { ...pa, expiresAt: data.expiresAt } : pa
      ))
      setTriageQueue(prev => prev.map(item => 
        item.key === currentItem.key 
          ? { ...item, expiresAt: data.expiresAt, pendingAction: item.pendingAction ? { ...item.pendingAction, expiresAt: data.expiresAt } : undefined }
          : item
      ))
      toast.success("Autopilot resumed")
    } catch {
      toast.error("Failed to resume autopilot")
    }
  }

  async function generateDraft(instruction?: string) {
    if (!currentItem) return
    const replyId = currentItem.reply?.id
    if (!replyId) {
      toast.error("Cannot regenerate without a prospect reply context.")
      return
    }
    
    setGenerating(true)
    pauseTimer()
    try {
      const res = await fetch(`/api/inbox/${replyId}/draft`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseStyle: instruction || omniPrompt || "VALUE-FIRST" })
      })
      if (!res.ok) throw new Error()
      const { subject, body } = await res.json()
      
      setDraftSubject(subject)
      setDraftBody(body)
      setOmniPrompt("")
      toast.success("Draft regenerated via AI Copilot")
      
      // Auto-save if it's a pending action
      if (currentItem.pendingAction) {
        await fetch(`/api/agent/pending/${currentItem.pendingAction.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "edit", subject, draftBody: body })
        })
        syncInbox(true) // Instantly refresh the UI timer
      }
    } catch {
      toast.error("Failed to generate draft")
    } finally {
      setGenerating(false)
    }
  }

  async function sendOrApprove() {
    if (!currentItem) return
    if (!draftBody.trim()) {
      toast.error("Cannot send an empty message")
      return
    }
    setPendingBusy(true)
    try {
      if (currentItem.type === "PENDING" && currentItem.pendingAction) {
        // Sync text before approving
        await fetch(`/api/agent/pending/${currentItem.pendingAction.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "edit", subject: draftSubject, draftBody: draftBody })
        })
        const res = await fetch(`/api/agent/pending/${currentItem.pendingAction.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" })
        })
        if (!res.ok) throw new Error()
      } else if (currentItem.type === "REPLY" && currentItem.reply) {
        const res = await fetch(`/api/inbox/${currentItem.reply.id}/send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: draftSubject, body: draftBody })
        })
        if (!res.ok) throw new Error()
      }
      toast.success("Message Dispatched ✓")
      removeCurrentItemAndGoNext()
    } catch {
      toast.error("Failed to process action")
    } finally {
      setPendingBusy(false)
    }
  }

  async function dismissAction() {
    if (!currentItem) return
    setPendingBusy(true)
    try {
      if (currentItem.type === "PENDING" && currentItem.pendingAction) {
        await fetch(`/api/agent/pending/${currentItem.pendingAction.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" })
        })
      }
      toast.success("Action Dismissed")
      removeCurrentItemAndGoNext()
    } catch {
      toast.error("Failed to dismiss")
    } finally {
      setPendingBusy(false)
    }
  }

  // Handle Omnibar Enter
  const handleOmniKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (omniPrompt.trim()) generateDraft()
    }
  }

  // ── RENDER ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-transparent">
        <Loader2 className="size-6 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] -m-6 lg:-m-8 bg-transparent text-white/90 overflow-hidden relative font-sans">
      
      {/* ── STATE 1: COMMAND STREAM (OVERVIEW) ─────────────────────────── */}
      <div className={`absolute inset-0 flex flex-col transition-all duration-500 ${triageIndex >= 0 ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}>
        
        {/* Header & Filter Bar */}
        <div className="shrink-0 px-8 py-6 border-b border-white/[0.04] bg-black/10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black tracking-tight text-white/90">Agnelix Command Stream</h1>
              <p className="text-sm text-white/40 mt-1">AI has categorized your inbox. {triageItems.length} items need review.</p>
            </div>
            <button onClick={() => syncInbox()} disabled={syncing} className="flex items-center gap-2 rounded-xl px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-all text-xs font-bold text-white/60 active:scale-95 cursor-pointer">
              <Activity className="size-4" />
              {syncing ? "Syncing..." : "Sync Inbox"}
            </button>
          </div>
          
          {/* Horizontal Segmented Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all cursor-pointer shrink-0 ${
                  activeFilter === tab.id 
                    ? `bg-white/[0.08] border-white/20 shadow-inner text-white` 
                    : `bg-transparent border-transparent text-white/40 hover:bg-white/[0.02] hover:text-white/70`
                }`}
              >
                <tab.icon className={`size-3.5 ${activeFilter === tab.id ? tab.color : ""}`} />
                <span className="text-xs font-bold">{tab.title}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === tab.id ? tab.bg : "bg-white/5"}`}>
                  {tab.items.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Command Stream Feed */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-3 pb-8">
            {activeItems.length === 0 ? (
               <div className="rounded-2xl border border-dashed border-white/[0.05] py-16 text-center text-white/30 text-sm font-medium">
                 Inbox Zero for this category.
               </div>
            ) : (
              activeItems.map((item, idx) => (
                <div 
                  key={item.key}
                  onClick={() => openFocusMode(activeItems, idx)}
                  className="group flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl p-4 bg-white/[0.015] hover:bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer shadow-sm"
                >
                   {/* Avatar & Info */}
                   <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="size-10 rounded-full bg-white/[0.05] border border-white/5 flex items-center justify-center text-xs font-bold text-white/60 shrink-0">
                        {item.lead.firstName?.[0] || item.lead.email[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white/80 truncate">
                          {[item.lead.firstName, item.lead.lastName].filter(Boolean).join(" ") || item.lead.email}
                        </h3>
                        <p className="text-xs text-white/40 truncate mt-0.5">
                          {item.pendingAction?.draftSubject || item.reply?.subject || "Drafting reply..."}
                        </p>
                      </div>
                   </div>

                   {/* Intent Badge */}
                   <div className="shrink-0 hidden md:flex">
                     <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/50">
                       {item.intent.replace(/_/g, " ")}
                     </span>
                   </div>

                   {/* Time / Auto-send */}
                   <div className="shrink-0 flex items-center gap-4 md:ml-4">
                     {item.expiresAt ? (
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold uppercase text-emerald-400">Auto-Send</span>
                         <CircularCountdown expiresAt={item.expiresAt} />
                       </div>
                     ) : (
                       <span className="text-[11px] font-medium text-white/30">{formatRelative(item.timestamp)}</span>
                     )}
                     <ArrowRight className="size-4 text-white/20 group-hover:text-white/60 transition-colors" />
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── STATE 2: FOCUS MODE (CINEMATIC TRIAGE) ───────────────────── */}
      <div className={`absolute inset-0 flex transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${triageIndex >= 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12 pointer-events-none"}`}>
        {currentItem && (
          <>
            {/* LEFT CANVAS: Context & Thread */}
            <div className="w-[380px] shrink-0 border-r border-white/[0.04] bg-[#07080e] flex flex-col relative z-10 shadow-2xl">
              {/* Top Context Header */}
              <div className="p-6 border-b border-white/[0.04] space-y-4">
                <button onClick={closeFocusMode} className="flex items-center gap-2 text-[11px] font-bold text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider">
                  <ArrowRight className="size-3 rotate-180" /> Back to Deck
                </button>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-white/90">
                      {[currentItem.lead.firstName, currentItem.lead.lastName].filter(Boolean).join(" ") || currentItem.lead.email}
                    </h2>
                    <p className="text-xs text-white/40 mt-1">{currentItem.lead.company || currentItem.lead.email}</p>
                  </div>
                  <div className="size-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-sm font-black text-violet-400">
                    {currentItem.lead.firstName?.[0] || "A"}
                  </div>
                </div>
              </div>

              {/* Thread History */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {loadingThread ? (
                  <div className="flex justify-center"><Loader2 className="size-5 animate-spin text-white/20" /></div>
                ) : (
                  threadMessages.map(msg => {
                    const isSent = msg.type === "sent"
                    return (
                      <div key={msg.id} className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[90%] rounded-2xl p-4 ${isSent ? "bg-white/[0.02] border border-white/[0.05]" : "bg-violet-500/[0.03] border border-violet-500/15"}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSent ? "text-white/30" : "text-violet-400"}`}>
                              {isSent ? "You" : "Prospect"}
                            </span>
                            <span className="text-[9px] text-white/20">{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                        </div>
                      </div>
                    )
                  })
                )}
                {currentItem.reply && !threadMessages.some(m => m.id === currentItem.reply?.id) && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl p-4 bg-violet-500/[0.05] border border-violet-500/20 ring-1 ring-violet-500/10 shadow-[0_0_30px_-5px_rgba(139,92,246,0.15)] relative">
                       <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-violet-500 text-[9px] font-black uppercase text-white px-2 py-0.5 rounded shadow-lg">Latest</div>
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Prospect</span>
                          <span className="text-[9px] text-white/20">{formatRelative(currentItem.reply.receivedAt)}</span>
                        </div>
                        {currentItem.reply.subject && <p className="text-[11px] font-black text-white/50 mb-2">Re: {currentItem.reply.subject}</p>}
                        <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap">{currentItem.reply.body}</p>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} className="h-4" />
              </div>
            </div>

            {/* RIGHT CANVAS: AI Draft & Omnibar */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0c13]">
              {/* Radial Glow Overlay */}
              <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-violet-500/5 blur-[120px] rounded-full pointer-events-none" />

              {/* Progress & Metadata */}
              <div className="shrink-0 p-6 flex justify-between items-center z-10 relative">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 bg-white/5 px-2 py-1 rounded">
                    {triageIndex + 1} OF {triageQueue.length}
                  </span>
                  {currentItem.pendingAction?.metadata?.whyThisDraft && (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300/80 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                      <Sparkles className="size-3" />
                      {currentItem.pendingAction.metadata.whyThisDraft}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!currentItem.expiresAt && currentItem.pendingAction && (
                    <button onClick={resumeTimer} className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest transition-all">
                      <Play className="size-3" /> Resume Autopilot
                    </button>
                  )}
                  {currentItem.expiresAt && (
                     <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20">
                       <button onClick={pauseTimer} className="hover:text-white transition-colors" title="Pause Timer">
                         <PauseCircle className="size-3 text-rose-400" />
                       </button>
                       <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Auto-Send</span>
                       <CircularCountdown expiresAt={currentItem.expiresAt} />
                     </div>
                  )}
                </div>
              </div>

              {/* Massive Editor */}
              <div className="flex-1 flex flex-col px-12 py-4 z-10 relative w-full max-w-4xl mx-auto">
                {generating && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0c13]/80 backdrop-blur-sm rounded-3xl border border-white/[0.05]">
                    <Loader2 className="size-8 text-violet-500 animate-spin mb-4" />
                    <p className="text-sm font-bold text-white/60 tracking-wider">Agnelix is rewriting...</p>
                  </div>
                )}
                
                <input
                  value={draftSubject}
                  onChange={e => {
                    setDraftSubject(e.target.value)
                    pauseTimer()
                  }}
                  placeholder="Subject line..."
                  className="w-full bg-transparent text-xl font-bold text-white/50 outline-none border-b border-white/[0.05] pb-4 mb-6 placeholder:text-white/20"
                />
                <textarea
                  value={draftBody}
                  onChange={e => {
                    setDraftBody(e.target.value)
                    pauseTimer()
                  }}
                  placeholder="The AI draft will appear here. Or you can write a manual reply..."
                  className="w-full flex-1 bg-transparent text-lg text-white/90 outline-none resize-none leading-relaxed placeholder:text-white/10"
                />
              </div>

              {/* Omnibar & Action Deck */}
              <div className="shrink-0 p-8 z-10 relative w-full max-w-4xl mx-auto">
                <div className="rounded-3xl bg-white/[0.02] border border-white/[0.08] p-2 backdrop-blur-2xl shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <Command className="size-4 text-violet-400" />
                    <input 
                      value={omniPrompt}
                      onChange={e => {
                        setOmniPrompt(e.target.value)
                        pauseTimer()
                      }}
                      onKeyDown={handleOmniKeyDown}
                      placeholder="Instruct Copilot (e.g., 'Make it punchier' or 'Offer a meeting on Thursday')"
                      className="flex-1 bg-transparent text-sm font-medium text-white/80 outline-none placeholder:text-white/30"
                    />
                    <button 
                      onClick={() => generateDraft()}
                      disabled={generating || (!omniPrompt && !draftBody)}
                      className="text-[10px] font-bold uppercase tracking-wider text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-full transition-colors border border-violet-500/20 disabled:opacity-50"
                    >
                      Rewrite
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mt-2 pt-2 border-t border-white/[0.04] px-2 pb-1">
                    <div className="flex gap-2 flex-1 w-full overflow-hidden">
                       <button onClick={() => closeFocusMode()} className="shrink-0 flex items-center justify-center p-2 rounded-full text-white/30 hover:text-white/80 hover:bg-white/[0.05] transition-all" title="Dismiss (Esc)">
                         <XCircle className="size-5" />
                       </button>

                       {/* Dynamic Objection extracted from this specific reply */}
                       {(currentItem.pendingAction?.metadata as any)?.extractedObjection && (
                          <button onClick={() => generateDraft(`Address this specific objection: ${(currentItem.pendingAction?.metadata as any).extractedObjection}`)} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold text-rose-300/80 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all max-w-[240px] whitespace-nowrap overflow-hidden">
                             <ShieldAlert className="size-3 shrink-0" /> <span className="truncate">Handle: {(currentItem.pendingAction?.metadata as any).extractedObjection}</span>
                          </button>
                       )}

                       {/* Quick action chips mapped to battle card objections if available */}
                       {!(currentItem.pendingAction?.metadata as any)?.extractedObjection && currentItem.lead.battleCard && JSON.parse(currentItem.lead.battleCard).likelyObjections?.slice(0, 2).map((obj: any, idx: number) => (
                          <button key={idx} onClick={() => generateDraft(`Address this objection: ${obj.objection}. Counter: ${obj.counter}`)} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold text-amber-300/80 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all max-w-[200px] whitespace-nowrap overflow-hidden">
                             <ShieldAlert className="size-3 shrink-0" /> <span className="truncate">{obj.objection}</span>
                          </button>
                       ))}
                    </div>
                    <button 
                      onClick={sendOrApprove}
                      disabled={pendingBusy || generating}
                      className="shrink-0 flex items-center gap-2 px-6 py-2 rounded-full text-sm font-black text-black bg-white hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
                    >
                      {pendingBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Approve & Next (Enter)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}