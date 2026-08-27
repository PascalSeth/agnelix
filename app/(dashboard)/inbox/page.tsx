/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  Loader2, MessageSquare, Send, Zap,
  Clock, ArrowRight, Bot, CheckCircle, XCircle, X,
  ShieldAlert, Flame, MailOpen, Activity, Command,
  Play, PauseCircle, Layers, FileText, Search, Briefcase,
  Calendar, Award, Sparkles as LucideSparkles, RefreshCw,
  Sliders, UserCheck, ChevronRight, Check
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import Link from "next/link"
import { toast } from "sonner"
import { formatRelative } from "@/lib/utils"

type Lead = {
  id: string; firstName: string | null; lastName: string | null
  email: string; company: string | null; status: string
  industry?: string | null; website?: string | null
  painPoint?: string | null; recentNews?: string | null
  battleCard: string | null
  auditJson?: string | null; researchNotes?: string | null
  competitorAnalysis?: string | null; buyingSignalsJson?: string | null
  user: {
    name: string | null; agencyName: string | null; companyName: string | null
    companyDesc?: string | null; tone?: string | null; title?: string | null
    calendarLink?: string | null; flagshipOffer?: any
  }
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
  const [activeContextTab, setActiveContextTab] = useState<"thread" | "battlecard" | "research" | "offer">("thread")
  const [draftSubject, setDraftSubject] = useState("")
  const [draftBody, setDraftBody] = useState("")
  const [omniPrompt, setOmniPrompt] = useState("")

  const [interactiveQuestion, setInteractiveQuestion] = useState<{
    question: string
    context: string
    timeoutSeconds: number
    followUpPrompt: string
  } | null>(null)
  const [userQuestionResponse, setUserQuestionResponse] = useState("")
  const [showInteractiveQuestion, setShowInteractiveQuestion] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)

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
      if (syncImap) {
        await fetch("/api/inbox/sync", { method: "POST" }).catch(() => {})
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

    // Run initial IMAP pull gently in the background
    setTimeout(() => {
      syncInbox(true, true)
    }, 1000)

    // Poll local DB state every 4 seconds for instant real-time reactivity
    const interval = setInterval(() => {
      syncInbox(true, false)

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
                  syncInbox(true)
                }
                return messagesList
              }
              return prev
            })
          })
          .catch(() => {})
      }
    }, 4000)

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
    setShowInteractiveQuestion(false)
    setUserQuestionResponse("")
    lastDraftRef.current = { subject: "", body: "" }

    // Load interactive question if it's a reply
    if (currentItem.type === "REPLY") {
      loadInteractiveQuestion()
    }

    fetch(`/api/leads/${leadId}/thread`)
      .then(r => r.json())
      .then(data => {
        const messagesList = Array.isArray(data) ? data : []
        setThreadMessages(messagesList)
        
        // Check if the latest message in the thread is from us
        const latestMsg = messagesList[messagesList.length - 1]
        const isLatestFromMe = latestMsg && latestMsg.type === "sent"
        const isContactedOnly = currentItem.intent === "CONTACTED" || currentItem.id.startsWith("contacted-") || (currentItem.reply as any)?.isOutboundOnly

        if (isContactedOnly) {
          // Pre-fill subject with Re: previous subject so user can easily write a follow-up
          const subj = latestMsg?.subject ? (latestMsg.subject.startsWith("Re:") ? latestMsg.subject : `Re: ${latestMsg.subject}`) : "Follow-up"
          setDraftSubject(subj)
          setDraftBody("")
        } else if (isLatestFromMe) {
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
            if (replyId && !replyId.startsWith("contacted-")) {
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

    const matchedPending = pendingActions.find(pa => pa.id === activeItem.id || pa.lead.id === activeItem.lead.id)
    const matchedReply = replies.find(r => r.id === activeItem.id || r.lead.id === activeItem.lead.id)

    if (!matchedPending && !matchedReply) {
      // It was resolved in the background (e.g. auto-sent or rejected or dismissed)
      const nextQueue = triageQueue.filter(item => item.lead.id !== activeItem.lead.id)
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

    // Keep activeItem properties fresh (e.g. if a reply was received or draft was generated)
    setTriageQueue(prev => {
      let changed = false
      const updated = prev.map(item => {
        const p = pendingActions.find(pa => pa.id === item.id || pa.lead.id === item.lead.id)
        if (p) {
          if (item.type !== "PENDING" || item.id !== p.id || item.expiresAt !== p.expiresAt || item.pendingAction?.draftBody !== p.draftBody) {
            changed = true
            return {
              ...item,
              id: p.id,
              key: `pending-${p.id}`,
              type: "PENDING" as const,
              pendingAction: p,
              reply: p.reply as Reply | undefined,
              intent: p.intent,
              isAutopilot: p.riskLevel === "LOW",
              expiresAt: p.expiresAt,
              timestamp: p.createdAt,
              lead: p.lead,
            }
          }
        } else {
          const r = replies.find(reply => reply.id === item.id || reply.lead.id === item.lead.id)
          if (r) {
            const isContactedOutbound = r.id.startsWith("contacted-") || (r as any).isOutboundOnly
            if (item.type !== "REPLY" || item.id !== r.id || item.reply?.receivedAt !== r.receivedAt) {
              changed = true
              return {
                ...item,
                id: r.id,
                key: `reply-${r.id}`,
                type: "REPLY" as const,
                reply: r,
                intent: isContactedOutbound ? "CONTACTED" : ((r as any).intent || "MANUAL_REVIEW"),
                isAutopilot: false,
                expiresAt: null,
                timestamp: r.receivedAt,
                lead: r.lead,
              }
            }
          }
        }
        return item
      })
      return changed ? updated : prev
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
      const isContactedOutbound = r.id.startsWith("contacted-") || (r as any).isOutboundOnly
      triageItems.push({
        id: r.id, key: `reply-${r.id}`, type: "REPLY", lead: r.lead,
        reply: r, intent: isContactedOutbound ? "CONTACTED" : "MANUAL_REVIEW", isAutopilot: false,
        expiresAt: null, timestamp: r.receivedAt
      })
    }
  })

  // Categorize
  const autopilotItems = triageItems.filter(i => i.isAutopilot)
  const hotItems = triageItems.filter(i => !i.isAutopilot && ["INTERESTED", "BOOK_MEETING"].includes(i.intent || ""))
  const replyItems = triageItems.filter(i => !i.isAutopilot && !i.id.startsWith("contacted-") && !(i.reply as any)?.isOutboundOnly)
  const contactedItems = triageItems.filter(i => i.intent === "CONTACTED" || i.id.startsWith("contacted-") || (i.reply as any)?.isOutboundOnly)
  const objectionItems = triageItems.filter(i => !i.isAutopilot && ["OBJECTION", "NOT_NOW"].includes(i.intent || ""))
  const questionsItems = triageItems.filter(i => !i.isAutopilot && !hotItems.includes(i) && !objectionItems.includes(i) && !contactedItems.includes(i))

  const filterTabs = [
    { id: "all", title: "All Active", icon: Command, color: "text-white/80", bg: "bg-white/10", border: "border-white/10", items: triageItems },
    { id: "contacted", title: "Contacted", icon: Send, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", items: contactedItems },
    { id: "replies", title: "Replies", icon: MessageSquare, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", items: replyItems },
    { id: "hot", title: "Hot Leads", icon: Flame, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", items: hotItems },
    { id: "autopilot", title: "Autopilot", icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", items: autopilotItems },
    { id: "objections", title: "Objections", icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", items: objectionItems },
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

  async function loadInteractiveQuestion() {
    if (!currentItem?.reply?.id) return

    setLoadingQuestion(true)
    try {
      const res = await fetch(`/api/inbox/${currentItem.reply.id}/interactive-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.questions && data.questions.length > 0) {
          setInteractiveQuestion(data.questions[0])
          setShowInteractiveQuestion(true)
        }
      }
    } catch {
      // Silent fail - interactive questions are optional
    } finally {
      setLoadingQuestion(false)
    }
  }

  async function generateDraft(instruction?: string, actionType?: string) {
    if (!currentItem) return
    const replyId = currentItem.reply?.id || (currentItem.id.startsWith("contacted-") ? currentItem.id : `contacted-${currentItem.lead.id}`)
    if (!replyId) {
      toast.error("Cannot regenerate without prospect context.")
      return
    }

    setGenerating(true)
    pauseTimer()
    try {
      const res = await fetch(`/api/inbox/${replyId}/draft`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseStyle: instruction || omniPrompt || "VALUE-FIRST",
          actionType: actionType || undefined,
        })
      })
      if (!res.ok) throw new Error()
      const { subject, body } = await res.json()

      setDraftSubject(subject)
      setDraftBody(body)
      setOmniPrompt("")
      toast.success("Draft restructured with contextual intelligence")

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

  async function submitQuestionResponse() {
    if (!currentItem?.reply?.id || !userQuestionResponse.trim()) return

    try {
      // Record the user's response as activity
      await fetch(`/api/leads/${currentItem.lead.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "NOTE_ADDED",
          note: `[QUESTION_RESPONSE] Q: ${interactiveQuestion?.question}\nA: ${userQuestionResponse}`,
        }),
      }).catch(() => {})

      // Hide the question and let timer continue
      setShowInteractiveQuestion(false)
      setUserQuestionResponse("")
      toast.success("Response recorded. Galien is preparing a better reply...")
    } catch {
      toast.error("Failed to record response")
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
              <h1 className="text-xl font-black tracking-tight text-white/90">Galien Command Stream</h1>
              <p className="text-sm text-white/40 mt-1">AI has categorized your inbox. {triageItems.length} items need review.</p>
            </div>
            <button onClick={() => syncInbox(false, true)} disabled={syncing} className="flex items-center gap-2 rounded-xl px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-all text-xs font-bold text-white/60 active:scale-95 cursor-pointer">
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
                          {item.reply?.body ? `"${item.reply.body.slice(0, 85)}"` : (item.pendingAction?.draftSubject || item.reply?.subject || "Outreach in cadence")}
                        </p>
                      </div>
                   </div>

                   {/* Intent Badge */}
                   <div className="shrink-0 hidden md:flex items-center gap-2">
                     {(item.reply as any)?.lastActionStatus === "AUTO_EXECUTED" && (
                       <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                         <Zap className="size-2.5" /> Handled
                       </span>
                     )}
                     <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                       item.intent === "CONTACTED"
                         ? "bg-sky-500/10 border-sky-500/20 text-sky-300"
                         : item.intent === "INTERESTED" || item.intent === "BOOK_MEETING"
                         ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                         : item.intent === "QUESTION"
                         ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                         : item.isAutopilot
                         ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                         : "bg-violet-500/10 border-violet-500/20 text-violet-300"
                     }`}>
                       {item.intent === "CONTACTED" ? "In Cadence" : item.intent.replace(/_/g, " ")}
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
            {/* LEFT CANVAS: Context, Battle Card, Research & Thread */}
            <div className="w-[420px] shrink-0 border-r border-white/[0.04] bg-[#07080e] flex flex-col relative z-10 shadow-2xl">
              {/* Top Context Header */}
              <div className="p-5 border-b border-white/[0.04] space-y-3 bg-black/20">
                <div className="flex items-center justify-between">
                  <button onClick={closeFocusMode} className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider">
                    <ArrowRight className="size-3 rotate-180" /> Back to Deck (Esc)
                  </button>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    currentItem.intent === "CONTACTED"
                      ? "bg-sky-500/10 border-sky-500/20 text-sky-300"
                      : currentItem.intent === "INTERESTED" || currentItem.intent === "BOOK_MEETING"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      : currentItem.intent === "QUESTION"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-violet-500/10 border-violet-500/20 text-violet-300"
                  }`}>
                    {currentItem.intent === "CONTACTED" ? "In Cadence" : currentItem.intent.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-3">
                    <h2 className="text-base font-black text-white/90 truncate">
                      {[currentItem.lead.firstName, currentItem.lead.lastName].filter(Boolean).join(" ") || currentItem.lead.email}
                    </h2>
                    <p className="text-xs text-white/40 truncate mt-0.5">{currentItem.lead.company || currentItem.lead.email}</p>
                  </div>
                  <div className="size-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-400 shrink-0">
                    {currentItem.lead.firstName?.[0] || currentItem.lead.email[0]}
                  </div>
                </div>

                {/* Tab Navigation for Context Panel */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setActiveContextTab("thread")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                      activeContextTab === "thread" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <MessageSquare className="size-3" />
                    <span>Thread</span>
                  </button>
                  <button
                    onClick={() => setActiveContextTab("battlecard")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                      activeContextTab === "battlecard" ? "bg-white/[0.08] text-amber-300 shadow-sm" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <ShieldAlert className="size-3" />
                    <span>Battle</span>
                  </button>
                  <button
                    onClick={() => setActiveContextTab("research")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                      activeContextTab === "research" ? "bg-white/[0.08] text-sky-300 shadow-sm" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <Search className="size-3" />
                    <span>Audit</span>
                  </button>
                  <button
                    onClick={() => setActiveContextTab("offer")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                      activeContextTab === "offer" ? "bg-white/[0.08] text-emerald-300 shadow-sm" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <Briefcase className="size-3" />
                    <span>Offer</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: Thread History */}
              {activeContextTab === "thread" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                  {loadingThread ? (
                    <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-white/20" /></div>
                  ) : (
                    threadMessages.map(msg => {
                      const isSent = msg.type === "sent"
                      return (
                        <div key={msg.id} className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[92%] rounded-2xl p-3.5 ${isSent ? "bg-white/[0.025] border border-white/[0.05]" : "bg-violet-500/[0.04] border border-violet-500/15"}`}>
                            <div className="flex justify-between items-center mb-1.5 gap-2">
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

                  {/* Status chip if outreach is in-flight awaiting reply */}
                  {threadMessages.length > 0 && !threadMessages.some(m => m.type === "received") && (
                    <div className="flex justify-center my-2">
                      <div className="rounded-full px-3 py-1 bg-sky-500/[0.08] border border-sky-500/20 text-[10px] font-medium text-sky-300 flex items-center gap-1.5 shadow-sm">
                        <Clock className="size-3 text-sky-400" />
                        <span>Outreach active · Awaiting prospect reply</span>
                      </div>
                    </div>
                  )}

                  {/* Fallback only for genuine unrendered reply */}
                  {currentItem.reply && !currentItem.reply.id.startsWith("contacted-") && !(currentItem.reply as any)?.isOutboundOnly && !threadMessages.some(m => m.id === currentItem.reply?.id) && (
                    <div className="flex justify-start">
                      <div className="max-w-[92%] rounded-2xl p-3.5 bg-violet-500/[0.05] border border-violet-500/20 ring-1 ring-violet-500/10 shadow-sm relative">
                         <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Prospect</span>
                            <span className="text-[9px] text-white/20">{formatRelative(currentItem.reply.receivedAt)}</span>
                          </div>
                          {currentItem.reply.subject && <p className="text-[11px] font-bold text-white/50 mb-1.5">Re: {currentItem.reply.subject}</p>}
                          <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap">{currentItem.reply.body}</p>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} className="h-4" />
                </div>
              )}

              {/* TAB 2: Battle Card & Objection Counters */}
              {activeContextTab === "battlecard" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
                  {currentItem.lead.battleCard ? (() => {
                    let bc: any = null
                    try {
                      bc = typeof currentItem.lead.battleCard === "string" ? JSON.parse(currentItem.lead.battleCard) : currentItem.lead.battleCard
                    } catch {
                      bc = { summary: currentItem.lead.battleCard }
                    }
                    return (
                      <div className="space-y-4">
                        {/* Summary & Urgency */}
                        <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/15 space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                            <LucideSparkles className="size-3.5" /> Deal Status & Intent
                          </div>
                          <p className="text-white/80 leading-relaxed">{bc.summary || "Prospect in active engagement stage."}</p>
                          {bc.urgencyAngle && (
                            <div className="pt-2 border-t border-amber-500/10 text-[11px] text-amber-300/80">
                              <span className="font-bold">⚡ Urgency Hook:</span> {bc.urgencyAngle}
                            </div>
                          )}
                        </div>

                        {/* Likely Objections & Counter-Strategies */}
                        {Array.isArray(bc.likelyObjections) && bc.likelyObjections.length > 0 && (
                          <div className="space-y-2.5">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-white/40">Predicted Objections & Counters</h4>
                            {bc.likelyObjections.map((obj: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-amber-500/30 transition-all space-y-2 group">
                                <div className="font-bold text-white/90 flex items-start justify-between gap-2">
                                  <span>“{obj.objection}”</span>
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 shrink-0">Objection</span>
                                </div>
                                <p className="text-white/60 text-[11px] leading-relaxed">
                                  <span className="text-emerald-400 font-bold">Counter:</span> {obj.counter}
                                </p>
                                <button
                                  onClick={() => generateDraft(`Address this objection: "${obj.objection}". Counter strategy: "${obj.counter}". Keep it conversational and authoritative.`)}
                                  className="w-full py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Zap className="size-3" /> Apply Counter to Draft
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Talking Points */}
                        {Array.isArray(bc.talkingPoints) && bc.talkingPoints.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-white/40">Strategic Talking Points</h4>
                            <div className="space-y-1.5">
                              {bc.talkingPoints.map((tp: string, idx: number) => (
                                <div
                                  key={idx}
                                  onClick={() => generateDraft(`Incorporate this talking point into the reply: "${tp}"`)}
                                  className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] text-white/70 hover:text-white cursor-pointer transition-all flex items-start gap-2 group"
                                >
                                  <ChevronRight className="size-3 text-white/30 group-hover:text-amber-400 shrink-0 mt-0.5" />
                                  <span className="text-[11px] leading-snug">{tp}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })() : (
                    <div className="text-center py-12 space-y-3">
                      <ShieldAlert className="size-8 text-white/20 mx-auto" />
                      <p className="text-white/40">No battle card generated for this lead yet.</p>
                      <button
                        onClick={() => generateDraft("", "USE_BATTLE_CARD")}
                        className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 font-bold text-xs transition-all"
                      >
                        Generate Intelligence Draft
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Deep Research & Site Audit */}
              {activeContextTab === "research" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
                  {/* Lead Metadata */}
                  <div className="p-3.5 rounded-xl bg-sky-500/[0.04] border border-sky-500/15 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-sky-300 font-bold text-[11px] uppercase tracking-wider">
                      <Search className="size-3.5" /> Prospect Intelligence
                    </div>
                    {currentItem.lead.website && (
                      <div className="text-[11px]">
                        <span className="text-white/40">Website:</span>{" "}
                        <a href={currentItem.lead.website.startsWith("http") ? currentItem.lead.website : `https://${currentItem.lead.website}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                          {currentItem.lead.website}
                        </a>
                      </div>
                    )}
                    {currentItem.lead.industry && (
                      <div className="text-[11px]"><span className="text-white/40">Industry:</span> <span className="text-white/80 font-medium">{currentItem.lead.industry}</span></div>
                    )}
                    {currentItem.lead.painPoint && (
                      <div className="text-[11px] pt-1.5 border-t border-sky-500/10">
                        <span className="text-white/40">Identified Pain Point:</span>
                        <p className="text-white/80 mt-0.5">{currentItem.lead.painPoint}</p>
                        <button
                          onClick={() => generateDraft(`Address this specific pain point directly in the message: "${currentItem.lead.painPoint}"`)}
                          className="mt-1.5 text-[10px] font-bold text-sky-300 hover:underline flex items-center gap-1"
                        >
                          <Zap className="size-2.5" /> Address in Draft
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Website / SEO Audit */}
                  {currentItem.lead.auditJson && (() => {
                    let audit: any = null
                    try {
                      audit = typeof currentItem.lead.auditJson === "string" ? JSON.parse(currentItem.lead.auditJson) : currentItem.lead.auditJson
                    } catch {}
                    if (!audit) return null
                    return (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-white/40">Audit Findings & Tech Stack</h4>
                        {audit.techStack && (
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-white/40">Tech Stack</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(Array.isArray(audit.techStack) ? audit.techStack : String(audit.techStack).split(",")).map((t: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] text-white/70 font-medium">
                                  {t.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {audit.issuesFound && (
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                            <span className="text-[10px] font-bold uppercase text-rose-400">Identified Website / SEO Gaps</span>
                            <div className="space-y-1.5">
                              {(Array.isArray(audit.issuesFound) ? audit.issuesFound : [audit.issuesFound]).map((issue: string, idx: number) => (
                                <div key={idx} className="p-2 rounded-lg bg-rose-500/[0.04] border border-rose-500/15 flex items-start justify-between gap-2">
                                  <span className="text-[11px] text-white/80 leading-snug">{issue}</span>
                                  <button
                                    onClick={() => generateDraft(`Quote this specific website/SEO finding to establish credibility: "${issue}". Offer a brief audit review.`)}
                                    className="shrink-0 text-[10px] font-bold text-rose-300 hover:text-white px-2 py-0.5 rounded bg-rose-500/20 transition-all"
                                  >
                                    Quote
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Competitor Gaps */}
                  {currentItem.lead.competitorAnalysis && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <span className="text-[10px] font-bold uppercase text-white/40">Competitor Differentiation Gaps</span>
                      <p className="text-[11px] text-white/75 leading-relaxed">{currentItem.lead.competitorAnalysis}</p>
                      <button
                        onClick={() => generateDraft(`Leverage this competitor differentiation angle: "${currentItem.lead.competitorAnalysis}"`)}
                        className="text-[10px] font-bold text-sky-300 hover:underline flex items-center gap-1"
                      >
                        <Zap className="size-2.5" /> Use in AI Draft
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Flagship Offer & Proposals */}
              {activeContextTab === "offer" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
                  {/* Flagship Offer */}
                  {currentItem.lead.user?.flagshipOffer ? (() => {
                    const fo = typeof currentItem.lead.user.flagshipOffer === "string" ? JSON.parse(currentItem.lead.user.flagshipOffer) : currentItem.lead.user.flagshipOffer
                    return (
                      <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px] uppercase tracking-wider">
                          <Award className="size-3.5" /> Agency Flagship Offer
                        </div>
                        <h4 className="text-sm font-bold text-white/90">{fo.name || "Custom Growth Sprint"}</h4>
                        <div className="text-[11px] text-white/75 space-y-1">
                          <div><span className="text-white/40">Transformation:</span> {fo.transformation || "Turn browsers into paying clients"}</div>
                          <div><span className="text-white/40">Core Deliverable:</span> {fo.deliverable || "Full audit & execution roadmap"}</div>
                        </div>
                        <button
                          onClick={() => generateDraft("", "SEND_OFFER")}
                          className="w-full py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Zap className="size-3" /> Pitch Flagship Transformation
                        </button>
                      </div>
                    )
                  })() : (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <span className="text-[10px] font-bold uppercase text-white/40">Company Profile</span>
                      <p className="text-[11px] text-white/75">{currentItem.lead.user?.companyDesc || "Specialized B2B growth and digital services."}</p>
                    </div>
                  )}

                  {/* Calendar Link Quick Inject */}
                  {currentItem.lead.user?.calendarLink && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-white/40">Calendar Booking Link</span>
                        <p className="text-[11px] text-sky-400 truncate mt-0.5">{currentItem.lead.user.calendarLink}</p>
                      </div>
                      <button
                        onClick={() => {
                          setDraftBody(prev => `${prev.trim()}\n\nHere is my direct booking link if that's easier: ${currentItem.lead.user.calendarLink}`)
                          toast.success("Calendar link appended to draft")
                        }}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-300 text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        Insert Link
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT CANVAS: AI Draft & Interactive Restructure Deck */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0c13]">
              {/* Radial Glow Overlay */}
              <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-violet-500/5 blur-[120px] rounded-full pointer-events-none" />

              {/* Progress & Metadata */}
              <div className="shrink-0 px-8 py-4 flex justify-between items-center z-10 relative border-b border-white/[0.04] bg-black/20">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 bg-white/5 px-2.5 py-1 rounded-lg border border-white/[0.05]">
                    {triageIndex + 1} OF {triageQueue.length}
                  </span>
                  {currentItem.pendingAction?.metadata?.whyThisDraft && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      <Sparkles className="size-3 text-amber-400" />
                      <span>{currentItem.pendingAction.metadata.whyThisDraft}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!currentItem.expiresAt && currentItem.pendingAction && (
                    <button onClick={resumeTimer} className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest transition-all">
                      <Play className="size-3" /> Resume Autopilot
                    </button>
                  )}
                  {currentItem.expiresAt && (
                     <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                       <button onClick={pauseTimer} className="hover:text-white transition-colors" title="Pause Timer">
                         <PauseCircle className="size-3 text-rose-400" />
                       </button>
                       <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Auto-Send</span>
                       <CircularCountdown expiresAt={currentItem.expiresAt} />
                     </div>
                  )}
                </div>
              </div>

              {/* Interactive AI Restructure Ribbon */}
              <div className="shrink-0 px-8 py-2.5 bg-white/[0.015] border-b border-white/[0.04] z-10 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/30 shrink-0 mr-1 flex items-center gap-1">
                  <Sliders className="size-3" /> AI Restructure:
                </span>
                <button
                  onClick={() => generateDraft("Make the draft direct, ultra-concise, under 45 words, straight to the point.")}
                  disabled={generating}
                  className="shrink-0 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-bold text-white/70 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Zap className="size-3 text-amber-400" /> Punchy & Direct
                </button>
                <button
                  onClick={() => generateDraft("", "USE_BATTLE_CARD")}
                  disabled={generating}
                  className="shrink-0 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-[11px] font-bold text-amber-300 transition-all flex items-center gap-1.5"
                >
                  <ShieldAlert className="size-3" /> Counter via Battle Card
                </button>
                <button
                  onClick={() => generateDraft("", "INJECT_RESEARCH")}
                  disabled={generating}
                  className="shrink-0 px-3 py-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-[11px] font-bold text-sky-300 transition-all flex items-center gap-1.5"
                >
                  <Search className="size-3" /> Cite Audit Gap
                </button>
                <button
                  onClick={() => generateDraft("", "PROPOSE_MEETING")}
                  disabled={generating}
                  className="shrink-0 px-3 py-1 rounded-full bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-[11px] font-bold text-violet-300 transition-all flex items-center gap-1.5"
                >
                  <Calendar className="size-3" /> Book 15-Min Call
                </button>
                <button
                  onClick={() => generateDraft("Offer a completely free custom 2-page growth audit or checklist before asking for a call.")}
                  disabled={generating}
                  className="shrink-0 px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] font-bold text-rose-300 transition-all flex items-center gap-1.5"
                >
                  <Award className="size-3" /> Offer Free Audit
                </button>
                <button
                  onClick={() => generateDraft("", "SEND_OFFER")}
                  disabled={generating}
                  className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] font-bold text-emerald-300 transition-all flex items-center gap-1.5"
                >
                  <Briefcase className="size-3" /> Pitch Flagship
                </button>
              </div>

              {/* Massive Fluid Editor */}
              <div className="flex-1 flex flex-col px-8 py-5 z-10 relative w-full max-w-4xl mx-auto overflow-hidden">
                {generating && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0c13]/85 backdrop-blur-md rounded-3xl border border-white/[0.05]">
                    <Loader2 className="size-8 text-violet-400 animate-spin mb-3" />
                    <p className="text-sm font-bold text-white/80 tracking-wider">AI Copilot is restructuring draft...</p>
                    <p className="text-xs text-white/40 mt-1">Applying battle cards, company training & research context</p>
                  </div>
                )}

                <input
                  value={draftSubject}
                  onChange={e => {
                    setDraftSubject(e.target.value)
                    pauseTimer()
                  }}
                  placeholder="Subject line..."
                  className="w-full bg-transparent text-lg font-bold text-white/70 outline-none border-b border-white/[0.05] pb-3 mb-4 placeholder:text-white/20"
                />
                <textarea
                  value={draftBody}
                  onChange={e => {
                    setDraftBody(e.target.value)
                    pauseTimer()
                  }}
                  placeholder="The AI draft structured from research and battle cards will appear here..."
                  className="w-full flex-1 bg-transparent text-base text-white/90 outline-none resize-none leading-relaxed placeholder:text-white/20 custom-scrollbar"
                />
                <div className="flex justify-between items-center text-[10px] text-white/30 pt-2 border-t border-white/[0.04]">
                  <span>{draftBody ? `${draftBody.split(/\s+/).filter(Boolean).length} words` : "Empty draft"}</span>
                  <span className="flex items-center gap-1 text-white/40">
                    <Zap className="size-3 text-emerald-400" /> Governed by Company & Admin Training Rules
                  </span>
                </div>
              </div>

              {/* Omnibar & Action Deck */}
              <div className="shrink-0 p-6 z-10 relative w-full max-w-4xl mx-auto">
                <div className="rounded-3xl bg-white/[0.02] border border-white/[0.08] p-2.5 backdrop-blur-2xl shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-3 px-3 py-1.5">
                    <Command className="size-4 text-violet-400 shrink-0" />
                    <input 
                      value={omniPrompt}
                      onChange={e => {
                        setOmniPrompt(e.target.value)
                        pauseTimer()
                      }}
                      onKeyDown={handleOmniKeyDown}
                      placeholder="Prompt AI Copilot (e.g. 'Emphasize our 14-day turnaround' or 'Propose Tuesday 10 AM')"
                      className="flex-1 bg-transparent text-sm font-medium text-white/80 outline-none placeholder:text-white/30"
                    />
                    <button 
                      onClick={() => generateDraft()}
                      disabled={generating || (!omniPrompt && !draftBody)}
                      className="text-[11px] font-bold uppercase tracking-wider text-violet-200 bg-violet-500/20 hover:bg-violet-500/30 px-3.5 py-1.5 rounded-full transition-all border border-violet-500/30 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="size-3 text-violet-400" />
                      Rewrite
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mt-2 pt-2 border-t border-white/[0.04] px-2 pb-0.5">
                    <div className="flex gap-2 flex-1 w-full overflow-hidden items-center">
                       <button onClick={() => closeFocusMode()} className="shrink-0 flex items-center justify-center p-2 rounded-full text-white/30 hover:text-white/80 hover:bg-white/[0.05] transition-all" title="Dismiss (Esc)">
                         <XCircle className="size-5" />
                       </button>

                       {/* Dynamic Objection extracted from this specific reply */}
                       {(currentItem.pendingAction?.metadata as any)?.extractedObjection && (
                          <button onClick={() => generateDraft(`Address this specific objection: ${(currentItem.pendingAction?.metadata as any).extractedObjection}`)} className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-rose-300/80 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all max-w-[240px] whitespace-nowrap overflow-hidden">
                             <ShieldAlert className="size-3 shrink-0" /> <span className="truncate">Handle: {(currentItem.pendingAction?.metadata as any).extractedObjection}</span>
                          </button>
                       )}

                       {/* Dynamic Battle Card quick chips */}
                       {!(currentItem.pendingAction?.metadata as any)?.extractedObjection && currentItem.lead.battleCard && (() => {
                         try {
                           const bc = typeof currentItem.lead.battleCard === "string" ? JSON.parse(currentItem.lead.battleCard) : currentItem.lead.battleCard
                           return bc.likelyObjections?.slice(0, 2).map((obj: any, idx: number) => (
                              <button key={idx} onClick={() => generateDraft(`Address this objection: ${obj.objection}. Counter: ${obj.counter}`)} className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-amber-300/80 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all max-w-[200px] whitespace-nowrap overflow-hidden">
                                 <ShieldAlert className="size-3 shrink-0 text-amber-400" /> <span className="truncate">{obj.objection}</span>
                              </button>
                           ))
                         } catch {
                           return null
                         }
                       })()}
                    </div>
                    <button 
                      onClick={sendOrApprove}
                      disabled={pendingBusy || generating}
                      className="shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black text-black bg-white hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.25)] disabled:opacity-50 cursor-pointer"
                    >
                      {pendingBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      {currentItem.intent === "CONTACTED" || currentItem.id.startsWith("contacted-") ? "Send Follow-up (Enter)" : "Approve & Send (Enter)"}
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