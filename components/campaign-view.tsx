/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */
"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Mail, Eye, MessageSquare, Clock, CheckCircle2, XCircle,
  Loader2, MapPin, Upload, Users, FileText, Zap,
  Activity as ActivityIcon, Calendar, Send,
  Search, Edit3, ArrowUpRight, ChevronLeft, ChevronRight,
  Building2, Bot, Play, RotateCcw, Layers, Check, Lightbulb, AlertCircle, Settings
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import Link from "next/link"
import { initials } from "@/lib/utils"
import { computeWorkflowPhase } from "@/lib/campaign-workflow"
import { determineOptimalApproach, ALL_APPROACHES } from "@/lib/approach-selector"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SequenceStep = {
  id: string
  stepNumber: number
  delayDays: number
  subjectTemplate: string | null
  bodyTemplate: string | null
  stepType?: string
}

export type SequenceItem = {
  id: string
  name: string
  steps: SequenceStep[]
}

type EmailRecord = {
  id: string
  subject: string
  body: string
  stepNumber: number
  status: string
  sentAt: string | null
  openedAt: string | null
  openCount: number
  clickCount: number
  scheduledAt?: string | null
  replySnippet?: string | null
}

type ActivityRecord = {
  id: string
  type: string
  note: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
  lead?: { firstName?: string | null; lastName?: string | null; email?: string; company?: string | null } | null
}

type Lead = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  company: string | null
  status: string
  emails: EmailRecord[]
  activities?: ActivityRecord[]
  recommendedApproach?: string | null
  contactsJson?: string | null
  painPoint?: string | null
  recentNews?: string | null
  notes?: string | null
  auditJson?: string | null
  website?: string | null
  industry?: string | null
}

interface CampaignViewProps {
  campaignId: string
  status: string
  autonomous: boolean
  leads: Lead[]
  sequenceId?: string
  sequenceName?: string
  sequenceSteps: SequenceStep[]
  availableSequences?: SequenceItem[]
  onLeadsChange?: (leads: Lead[]) => void
  onSequenceChange?: (sequence: SequenceItem) => void
  onLaunch?: () => void
}

// ── Status colours ─────────────────────────────────────────────────────────────

const EMAIL_STATUS_DOT: Record<string, string> = {
  SENT: "bg-sky-400",
  DELIVERED: "bg-sky-400",
  OPENED: "bg-emerald-400",
  CLICKED: "bg-emerald-400",
  REPLIED: "bg-violet-400",
  QUEUED: "bg-amber-400",
  BOUNCED: "bg-red-400",
  FAILED: "bg-red-400",
  DRAFT: "bg-white/30",
}

const EMAIL_STATUS_LABEL: Record<string, string> = {
  SENT: "Sent", DELIVERED: "Delivered", OPENED: "Opened",
  CLICKED: "Clicked", REPLIED: "Replied", QUEUED: "Queued",
  BOUNCED: "Bounced", FAILED: "Failed", DRAFT: "Draft",
}

const LEAD_STATUS_COLOR: Record<string, string> = {
  NEW: "text-white/40",
  CONTACTED: "text-sky-400",
  REPLIED: "text-violet-400",
  INTERESTED: "text-emerald-400",
  MEETING_BOOKED: "text-amber-400",
  WON: "text-emerald-300",
  LOST: "text-red-400",
  NOT_INTERESTED: "text-red-400",
  BOUNCED: "text-red-400",
}

const APPROACHES = [
  { id: "auto", label: "✨ AI Auto-Selected Angle" },
  ...ALL_APPROACHES,
]

const REFINE_CHIPS = [
  { label: "Shorter", prompt: "Make this email much shorter, under 75 words, punchy and direct." },
  { label: "Add urgency", prompt: "Add subtle urgency regarding competitor trends and limited availability." },
  { label: "Emphasise ROI", prompt: "Focus more on financial return on investment and tangible growth." },
  { label: "Softer CTA", prompt: "Make the closing question lighter and easier with zero commitment friction." },
  { label: "Pain focus", prompt: "Sharpen the hook to immediately call out their specific business bottleneck." },
]

const FOLLOWUP_CHIPS = [
  { label: "Quick bump", prompt: "Make this a quick, friendly, 2-sentence bump referencing the previous note." },
  { label: "Add tip", prompt: "Include a specific high-value audit recommendation they can use immediately." },
  { label: "Client result", prompt: "Add a 1-sentence proof point showing concrete percentage revenue or lead lift." },
  { label: "Check if seen", prompt: "Politely check if they had a chance to see the previous email, keep it conversational." },
  { label: "Final nudge", prompt: "Position this as the final follow-up, wishing them well while leaving the door open." },
]

const ACTIVITY_ICON: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  EMAIL_SENT:            { icon: Send,          color: "text-sky-400"     },
  EMAIL_OPENED:          { icon: Eye,           color: "text-amber-400"   },
  EMAIL_CLICKED:         { icon: ArrowUpRight,  color: "text-emerald-400" },
  REPLY_RECEIVED:        { icon: MessageSquare, color: "text-violet-400"  },
  STAGE_CHANGED:         { icon: Zap,           color: "text-white/40"    },
  NOTE_ADDED:            { icon: FileText,      color: "text-white/40"    },
  MEETING_BOOKED:        { icon: Calendar,      color: "text-emerald-400" },
  BATTLE_CARD_GENERATED: { icon: Sparkles,      color: "text-amber-400"   },
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CampaignView({
  campaignId, status, autonomous, leads,
  sequenceId: initSequenceId, sequenceName: initSequenceName, sequenceSteps: initSequenceSteps,
  availableSequences: initAvailableSequences = [],
  onLeadsChange, onSequenceChange, onLaunch,
}: CampaignViewProps) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id ?? null)
  const [activeStepNum, setActiveStepNum] = useState<number>(1)
  const [view, setView] = useState<"leads" | "sequence" | "activity">("leads")

  // Sequence state
  const [localSequenceId, setLocalSequenceId] = useState<string>(initSequenceId || "")
  const [localSequenceName, setLocalSequenceName] = useState<string>(initSequenceName || "Outreach Sequence")
  const [localSequenceSteps, setLocalSequenceSteps] = useState<SequenceStep[]>(initSequenceSteps || [])
  const [allSequences, setAllSequences] = useState<SequenceItem[]>(initAvailableSequences)
  const [isSwitchingSequence, setIsSwitchingSequence] = useState<boolean>(false)

  // Search / filter
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"ALL" | "NEEDS_COPY" | "DRAFTS" | "SENT" | "REPLIED">("ALL")

  // Action states
  const [generatingAll, setGeneratingAll] = useState(false)
  const [queuingAll, setQueuingAll] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [generatingLead, setGeneratingLead] = useState(false)
  const [queuingLead, setQueuingLead] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editSubject, setEditSubject] = useState("")
  const [editBody, setEditBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [refining, setRefining] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState("")
  const [selectedApproach, setSelectedApproach] = useState("website")
  const [activities, setActivities] = useState<ActivityRecord[]>([])

  useEffect(() => {
    setLocalLeads(leads)
    if (!selectedLeadId && leads.length > 0) setSelectedLeadId(leads[0].id)
  }, [leads, selectedLeadId])

  useEffect(() => { if (initSequenceId) setLocalSequenceId(initSequenceId) }, [initSequenceId])
  useEffect(() => { if (initSequenceName) setLocalSequenceName(initSequenceName) }, [initSequenceName])
  useEffect(() => { if (initSequenceSteps?.length) setLocalSequenceSteps(initSequenceSteps) }, [initSequenceSteps])
  useEffect(() => { if (initAvailableSequences?.length) setAllSequences(initAvailableSequences) }, [initAvailableSequences])

  // Fetch available sequences if not provided
  useEffect(() => {
    if (allSequences.length === 0) {
      fetch("/api/sequences")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setAllSequences(data)
          }
        })
        .catch(() => { /* silent */ })
    }
  }, [allSequences.length])

  function updateLeads(next: Lead[]) {
    setLocalLeads(next)
    onLeadsChange?.(next)
  }

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/activities`)
      if (res.ok) setActivities(await res.json())
    } catch { /* silent */ }
  }, [campaignId])

  useEffect(() => {
    if (view !== "activity") return
    fetchActivities()
    const iv = setInterval(fetchActivities, 8000)
    return () => clearInterval(iv)
  }, [view, fetchActivities])

  // Computed
  const draftCount = localLeads.reduce((n, l) => n + l.emails.filter(e => e.status === "DRAFT").length, 0)
  const pendingSendCount = localLeads.reduce((n, l) => n + l.emails.filter(e => ["QUEUED","SENDING"].includes(e.status)).length, 0)
  const failedEmails = useMemo(() => localLeads.flatMap(l => l.emails.filter(e => e.status === "FAILED")), [localLeads])
  const failedCount = failedEmails.length
  const failedReasonSnippet = useMemo(() => {
    const withSnippet = failedEmails.find(e => e.replySnippet && e.replySnippet.trim().length > 0)
    return withSnippet?.replySnippet || ""
  }, [failedEmails])
  const isSmtpMissing = useMemo(() => {
    const lower = failedReasonSnippet.toLowerCase()
    return lower.includes("credentials") || lower.includes("password") || lower.includes("smtp") || lower.includes("not configured")
  }, [failedReasonSnippet])

  const leadsWithoutDrafts = localLeads.filter(l =>
    l.emails.length === 0 && !["REPLIED","MEETING_BOOKED","NOT_INTERESTED","BOUNCED"].includes(l.status)
  )
  const workflowPhase = computeWorkflowPhase(status, autonomous, localLeads, generatingAll)

  const filteredLeads = useMemo(() => {
    return localLeads.filter(l => {
      const name = `${l.firstName || ""} ${l.lastName || ""}`.toLowerCase()
      const q = search.toLowerCase().trim()
      const matchSearch = !q || name.includes(q) || l.email.toLowerCase().includes(q) || (l.company || "").toLowerCase().includes(q)
      if (!matchSearch) return false
      if (filter === "NEEDS_COPY") return l.emails.length === 0
      if (filter === "DRAFTS") return l.emails.some(e => e.status === "DRAFT")
      if (filter === "SENT") return l.emails.some(e => ["SENT","DELIVERED","OPENED","CLICKED"].includes(e.status))
      if (filter === "REPLIED") return l.status === "REPLIED" || l.emails.some(e => e.status === "REPLIED")
      return true
    })
  }, [localLeads, search, filter])

  const selectedLead = useMemo(() => localLeads.find(l => l.id === selectedLeadId) || filteredLeads[0] || null, [localLeads, selectedLeadId, filteredLeads])
  const selectedEmail = useMemo(() => selectedLead?.emails.find(e => e.stepNumber === activeStepNum) || null, [selectedLead, activeStepNum])
  const currentStepDef = useMemo(() => localSequenceSteps.find(s => s.stepNumber === activeStepNum) || localSequenceSteps[0] || null, [localSequenceSteps, activeStepNum])
  const prevEmail = useMemo(() => activeStepNum > 1 ? selectedLead?.emails.find(e => e.stepNumber === activeStepNum - 1) || null : null, [selectedLead, activeStepNum])
  const currentIdx = selectedLead ? filteredLeads.findIndex(l => l.id === selectedLead.id) : -1
  const prevLead = currentIdx > 0 ? filteredLeads[currentIdx - 1] : null
  const nextLead = currentIdx >= 0 && currentIdx < filteredLeads.length - 1 ? filteredLeads[currentIdx + 1] : null
  const refinePad = activeStepNum === 1 ? REFINE_CHIPS : FOLLOWUP_CHIPS

  const selectedLeadOptimalApproach = useMemo(() => {
    if (!selectedLead) return null
    return determineOptimalApproach(selectedLead)
  }, [selectedLead])

  useEffect(() => {
    if (selectedEmail) { setEditSubject(selectedEmail.subject); setEditBody(selectedEmail.body); setIsEditing(false); setRefinePrompt("") }
  }, [selectedEmail])

  useEffect(() => {
    if (selectedLead) {
      setSelectedApproach(selectedLead.recommendedApproach || "auto")
    }
  }, [selectedLead])

  // ── API Actions ──────────────────────────────────────────────────────────────

  async function handleSwitchSequence(newSeqId: string) {
    if (!newSeqId || newSeqId === localSequenceId) return
    const targetSeq = allSequences.find(s => s.id === newSeqId)
    if (!targetSeq) return

    setIsSwitchingSequence(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequenceId: newSeqId }),
      })
      if (res.ok) {
        setLocalSequenceId(targetSeq.id)
        setLocalSequenceName(targetSeq.name)
        setLocalSequenceSteps(targetSeq.steps || [])
        onSequenceChange?.(targetSeq)
        toast.success(`Campaign sequence updated to "${targetSeq.name}" (${targetSeq.steps?.length || 0} steps)`)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Failed to update campaign sequence")
      }
    } catch {
      toast.error("Network error while updating sequence")
    } finally {
      setIsSwitchingSequence(false)
    }
  }

  async function refreshLeads() {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (!res.ok) return
      const data = await res.json()
      const updated = data?.campaignLeads?.map((cl: { lead: Lead }) => cl.lead)
      if (Array.isArray(updated)) updateLeads(updated)
      if (data?.sequence) {
        setLocalSequenceId(data.sequence.id)
        setLocalSequenceName(data.sequence.name)
        if (Array.isArray(data.sequence.steps)) {
          setLocalSequenceSteps(data.sequence.steps)
        }
      }
    } catch { /* silent */ }
  }

  async function generateAllDrafts() {
    setGeneratingAll(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate-drafts-all`, { method: "POST" })
      if (res.ok) { toast.success("Generating drafts…"); await refreshLeads() }
      else toast.error("Failed to start")
    } catch { toast.error("Error") } finally { setGeneratingAll(false) }
  }

  async function approveAll() {
    setQueuingAll(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/queue-all`, { method: "POST" })
      if (res.ok) { const d = await res.json().catch(() => ({})); toast.success(`Dispatched ${d.dayOneCount ?? ""} email${d.dayOneCount !== 1 ? "s" : ""}`); await refreshLeads() }
      else toast.error("Failed to dispatch")
    } catch { toast.error("Error") } finally { setQueuingAll(false) }
  }

  async function handleSyncCycle() {
    setIsSyncing(true)
    try {
      toast.info("Running Autopilot cycle & unlocking queue…")
      // Make sure campaign is active if autonomous
      if (autonomous && status !== "ACTIVE") {
        await fetch(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACTIVE" }),
        })
      }
      await fetch(`/api/campaigns/${campaignId}/generate-drafts-all`, { method: "POST" })
      const qRes = await fetch("/api/process-queue", { method: "POST" })
      const qData = await qRes.json().catch(() => ({}))
      await refreshLeads()
      if (qData.sent > 0) {
        toast.success(`Dispatched ${qData.sent} email${qData.sent !== 1 ? "s" : ""} via SMTP!`)
      } else if (qData.failed > 0) {
        toast.error(`SMTP delivery failed for ${qData.failed} email${qData.failed !== 1 ? "s" : ""}. Please check your SMTP credentials in Settings → Agency.`)
      } else {
        toast.success("Autopilot cycle synced — all steps up to date")
      }
    } catch {
      toast.error("Autopilot sync error")
    } finally {
      setIsSyncing(false)
    }
  }

  async function retryFailed() {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/process-queue", { method: "POST" })
      if (res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.success(`Retrying queue: sent ${d.sent ?? 0}, failed ${d.failed ?? 0}`)
        await refreshLeads()
      } else {
        toast.error("Failed to retry queue")
      }
    } catch {
      toast.error("Network error while retrying queue")
    } finally {
      setIsSyncing(false)
    }
  }

  async function generateForLead(leadId: string, approach: string) {
    setGeneratingLead(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}/generate-drafts`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approach }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("Sequence drafted!")
        updateLeads(localLeads.map(l => l.id === leadId ? { ...l, emails: data.emails, recommendedApproach: approach } : l))
        setActiveStepNum(1); setIsEditing(false)
      } else toast.error("Failed to generate")
    } catch { toast.error("Error") } finally { setGeneratingLead(false) }
  }

  async function sendLeadStep1(leadId: string) {
    setQueuingLead(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}/queue`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success("Email sent!")
        updateLeads(localLeads.map(l => {
          if (l.id !== leadId) return l
          return { ...l, emails: l.emails.map(e => e.id === data.email?.id ? { ...e, status: data.email.status ?? "SENT", sentAt: data.email.sentAt } : e), status: "CONTACTED" }
        }))
      } else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Failed") }
    } catch { toast.error("Failed") } finally { setQueuingLead(false) }
  }

  async function saveEdits() {
    if (!selectedEmail) return
    setSaving(true)
    try {
      const res = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: editSubject, body: editBody }),
      })
      if (res.ok) {
        toast.success("Saved")
        updateLeads(localLeads.map(l => l.id !== selectedLead?.id ? l : { ...l, emails: l.emails.map(e => e.id === selectedEmail.id ? { ...e, subject: editSubject, body: editBody } : e) }))
        setIsEditing(false)
      } else toast.error("Failed to save")
    } catch { toast.error("Error") } finally { setSaving(false) }
  }

  async function refineEmail(instruction?: string) {
    if (!selectedEmail) return
    const instr = instruction || refinePrompt
    if (!instr.trim()) return
    setRefining(true)
    try {
      const res = await fetch(`/api/emails/${selectedEmail.id}/refine`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction: instr }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("Email polished!")
        updateLeads(localLeads.map(l => l.id !== selectedLead?.id ? l : { ...l, emails: l.emails.map(e => e.id === selectedEmail.id ? { ...e, subject: data.email.subject, body: data.email.body } : e) }))
        setEditSubject(data.email.subject); setEditBody(data.email.body); setRefinePrompt(""); setIsEditing(false)
      } else toast.error("Refinement failed")
    } catch { toast.error("Error") } finally { setRefining(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">

      {/* ── Autopilot Live Engine Status Card (when Autopilot is enabled) ─────── */}
      {autonomous && (
        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-r from-violet-500/[0.08] via-indigo-500/[0.04] to-transparent p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2.5 bg-violet-500"></span>
              </span>
              <span className="text-[13px] font-bold text-violet-300">
                Autopilot Engine Active
              </span>
              <span className="text-[11px] text-white/40">
                {status === "ACTIVE" ? "Running fully automated outreach cycle" : "Arms automatically on launch"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncCycle}
                disabled={generatingAll || queuingAll || isSyncing}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold text-violet-300 hover:text-white bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/25 transition-all disabled:opacity-40 cursor-pointer"
              >
                <RotateCcw className={`size-3 ${generatingAll || queuingAll || isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing & Sending…" : "Sync Cycle"}
              </button>
            </div>
          </div>

          {/* 4-Stage Visual Progress Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {/* Stage 1: Intelligence */}
            {(() => {
              const enrichingCount = localLeads.filter(l => l.status === "NEW" && !l.contactsJson).length
              const isEnrichingStage = enrichingCount > 0
              return (
                <div className={`rounded-xl p-2.5 border transition-all ${
                  isEnrichingStage
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                    : "border-white/[0.06] bg-white/[0.02] text-white/50"
                }`}>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      {isEnrichingStage ? <Loader2 className="size-3 animate-spin text-sky-400" /> : <Check className="size-3 text-emerald-400" />}
                      1. Deep Research
                    </span>
                    <span className="text-[10px] opacity-60">{enrichingCount > 0 ? `${enrichingCount} researching` : "Ready"}</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-snug">
                    {enrichingCount > 0 ? "Scraping websites & finding decision-maker emails" : "Lead intelligence verified"}
                  </p>
                </div>
              )
            })()}

            {/* Stage 2: AI Copy Synthesis */}
            {(() => {
              const needsCopyCount = leadsWithoutDrafts.length
              const isCopyStage = needsCopyCount > 0 && !generatingAll
              return (
                <div className={`rounded-xl p-2.5 border transition-all ${
                  isCopyStage || generatingAll
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                    : "border-white/[0.06] bg-white/[0.02] text-white/50"
                }`}>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      {generatingAll ? <Loader2 className="size-3 animate-spin text-violet-400" /> : <Bot className="size-3 text-violet-400" />}
                      2. AI Synthesis
                    </span>
                    <span className="text-[10px] opacity-60">{needsCopyCount > 0 ? `${needsCopyCount} writing` : "Done"}</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-snug">
                    {needsCopyCount > 0 ? "Galien drafting personalized Day 1 & follow-ups" : "Personalized sequences crafted"}
                  </p>
                </div>
              )
            })()}

            {/* Stage 3: Outbound Send Engine */}
            {(() => {
              const queuedCount = localLeads.reduce((n, l) => n + l.emails.filter(e => ["QUEUED", "SENDING"].includes(e.status)).length, 0)
              const sentCount = localLeads.reduce((n, l) => n + l.emails.filter(e => ["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED"].includes(e.status)).length, 0)
              const hasFailed = failedCount > 0
              const isActivelySending = isSyncing || queuingAll

              return (
                <div className={`rounded-xl p-2.5 border transition-all ${
                  isActivelySending
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : queuedCount > 0
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : hasFailed
                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                    : "border-white/[0.06] bg-white/[0.02] text-white/50"
                }`}>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      {isActivelySending ? (
                        <Loader2 className="size-3 animate-spin text-emerald-400" />
                      ) : queuedCount > 0 ? (
                        <Clock className="size-3 text-amber-400" />
                      ) : hasFailed ? (
                        <AlertCircle className="size-3 text-red-400" />
                      ) : (
                        <Check className="size-3 text-emerald-400" />
                      )}
                      3. Outbound Send
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {isActivelySending
                        ? "Sending…"
                        : queuedCount > 0
                        ? `${queuedCount} queued`
                        : hasFailed
                        ? `${failedCount} failed`
                        : `${sentCount} sent`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-[10px] opacity-70 leading-snug">
                      {isActivelySending
                        ? "Dispatching via SMTP with anti-spam pacing…"
                        : queuedCount > 0
                        ? "Emails queued and armed for dispatch."
                        : hasFailed
                        ? "SMTP delivery error — check credentials."
                        : "Day 1 emails dispatched."}
                    </p>

                    {queuedCount > 0 && !isActivelySending && (
                      <button
                        type="button"
                        onClick={handleSyncCycle}
                        disabled={isSyncing}
                        className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-500/35 transition-all cursor-pointer shrink-0"
                      >
                        ⚡ Send Now
                      </button>
                    )}
                    {hasFailed && !isActivelySending && (
                      <button
                        type="button"
                        onClick={retryFailed}
                        disabled={isSyncing}
                        className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-red-500/25 hover:bg-red-500/40 text-red-200 border border-red-500/35 transition-all cursor-pointer shrink-0"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Stage 4: Follow-up Radar */}
            {(() => {
              const repliesCount = localLeads.filter(l => l.status === "REPLIED" || l.emails.some(e => e.status === "REPLIED")).length
              return (
                <div className="rounded-xl p-2.5 border border-white/[0.06] bg-white/[0.02] text-white/50">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      <Zap className="size-3 text-amber-400" />
                      4. Cadence Radar
                    </span>
                    <span className="text-[10px] opacity-60">{repliesCount > 0 ? `${repliesCount} replied` : "Armed"}</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-snug">
                    {repliesCount > 0 ? "Replies detected — follow-ups halted" : "Auto-delays armed; sends Step 2 if unreplied"}
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Missing Copy Alert Banner (Active for all modes when copy is missing) ── */}
      {leadsWithoutDrafts.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-violet-500/30 bg-violet-500/[0.08] px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-violet-400 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-white/90">
                {leadsWithoutDrafts.length} lead{leadsWithoutDrafts.length !== 1 ? "s" : ""} need email copy
              </p>
              <p className="text-[11px] text-white/50">
                AI will evaluate each lead's website, audit, and industry to apply the optimal personalized angle.
              </p>
            </div>
          </div>
          <button
            onClick={generateAllDrafts}
            disabled={generatingAll}
            className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12px] font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
          >
            {generatingAll ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
            <span>{generatingAll ? "Generating Drafts…" : `Generate Copy (${leadsWithoutDrafts.length})`}</span>
          </button>
        </div>
      )}

      {/* ── Action / Status Banner for Manual Mode ──────────────────────────── */}
      {!autonomous && workflowPhase !== "live" && workflowPhase !== "no-leads" && (() => {
        const bannerMap: Record<string, { bg: string; text: string; action?: React.ReactNode }> = {
          enriching: {
            bg: "border-emerald-500/20 bg-emerald-500/[0.06]",
            text: "Researching lead data — contacts, website audits, LinkedIn. This runs automatically.",
          },
          ready: {
            bg: "border-sky-500/20 bg-sky-500/[0.06]",
            text: "Campaign is ready. Launch it to write AI-personalised emails.",
          },
          generating: {
            bg: "border-violet-500/20 bg-violet-500/[0.06]",
            text: `Writing emails for ${leadsWithoutDrafts.length} lead${leadsWithoutDrafts.length !== 1 ? "s" : ""}…`,
            action: (
              <button onClick={generateAllDrafts} disabled={generatingAll} className="flex items-center gap-1.5 text-[12px] font-semibold text-violet-300 hover:text-white transition-colors disabled:opacity-40">
                {generatingAll ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {generatingAll ? "Generating…" : "Write all now"}
              </button>
            ),
          },
          review: {
            bg: "border-amber-500/20 bg-amber-500/[0.06]",
            text: `${draftCount} draft${draftCount !== 1 ? "s" : ""} ready to send.`,
            action: (
              <button onClick={approveAll} disabled={queuingAll} className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-300 hover:text-white transition-colors disabled:opacity-40">
                {queuingAll ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {queuingAll ? "Sending…" : "Approve & send all"}
              </button>
            ),
          },
          sending: {
            bg: "border-sky-500/20 bg-sky-500/[0.06]",
            text: `Sending ${pendingSendCount} email${pendingSendCount !== 1 ? "s" : ""}…`,
          },
          paused: {
            bg: "border-white/[0.08] bg-white/[0.03]",
            text: "Campaign is paused. Resume to continue sending follow-ups.",
          },
        }
        const b = bannerMap[workflowPhase]
        if (!b) return null
        return (
          <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-2.5 ${b.bg}`}>
            <p className="text-[13px] text-white/65">{b.text}</p>
            {b.action}
          </div>
        )
      })()}

      {/* Failed emails retry & reason banner */}
      {failedCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/25 bg-gradient-to-r from-rose-500/[0.12] via-rose-500/[0.06] to-transparent p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 mt-0.5">
              <AlertCircle className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[13.5px] font-bold text-rose-200">
                  {failedCount} {failedCount === 1 ? "email" : "emails"} failed to send
                </p>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                  Action Required
                </span>
              </div>
              <p className="text-[12px] text-rose-300/90 leading-relaxed font-medium">
                <strong className="text-rose-100">Reason: </strong>
                {failedReasonSnippet || "SMTP credentials not configured in settings or server rejected connection."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            {isSmtpMissing && (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all hover:scale-[1.02]"
              >
                <Settings className="size-3.5" />
                Settings → Agency
              </Link>
            )}
            <button
              onClick={retryFailed}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11.5px] font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-400/40 shadow-md shadow-rose-950/50 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Retrying…" : "Retry Failed"}
            </button>
          </div>
        </div>
      )}

      {/* ── View Switcher ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
          {([
            { id: "leads" as const, label: "Leads", icon: Users, count: localLeads.length },
            { id: "sequence" as const, label: "Sequence", icon: Layers, count: localSequenceSteps.length },
            { id: "activity" as const, label: "Activity", icon: ActivityIcon, count: activities.length },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                view === t.id ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
              {t.count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${view === t.id ? "bg-white/10 text-white/70" : "bg-white/[0.06] text-white/30"}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-2">
          <Link href="/leads/find" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] transition-all">
            <MapPin className="size-3.5 text-sky-400" /> Find leads
          </Link>
          <Link href="/leads/upload" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] transition-all">
            <Upload className="size-3.5 text-emerald-400" /> Upload CSV
          </Link>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          LEADS VIEW — split: left list + right email doc
      ════════════════════════════════════════════════════════════════════════ */}
      {view === "leads" && (
        localLeads.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02] py-24 text-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04]">
              <Users className="size-7 text-white/30" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-white/80">No leads in this campaign</h3>
              <p className="mt-1 text-[13px] text-white/35 max-w-xs mx-auto">Add leads from Google Maps or import a CSV to get started.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/leads/find" className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-black bg-white hover:bg-white/90 transition-all shadow-md">
                <MapPin className="size-4" /> Find on Maps
              </Link>
              <Link href="/leads/upload" className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium text-white/70 border border-white/[0.1] hover:bg-white/[0.06] transition-all">
                <Upload className="size-4" /> Import CSV
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex gap-0 h-full min-h-[560px] rounded-2xl border border-white/[0.07] overflow-hidden">

            {/* ── LEFT RAIL: Lead list ────────────────────────────────────────── */}
            <div className="w-[260px] shrink-0 flex flex-col border-r border-white/[0.06] bg-white/[0.015]">

              {/* Search + filter */}
              <div className="p-3 border-b border-white/[0.06] space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/25" />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-[12px] text-white/80 placeholder:text-white/25 bg-white/[0.04] border border-white/[0.07] focus:border-white/20 outline-none"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {([
                    { id: "ALL", label: "All" },
                    { id: "NEEDS_COPY", label: "No copy" },
                    { id: "DRAFTS", label: "Drafts" },
                    { id: "REPLIED", label: "Replied" },
                  ] as const).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                        filter === f.id ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead items */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                {filteredLeads.map(lead => {
                  const isSelected = selectedLead?.id === lead.id
                  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email
                  const isResearching = lead.status === "NEW" && !lead.contactsJson
                  const hasDrafts = lead.emails.some(e => e.status === "DRAFT")
                  const hasSent = lead.emails.some(e => ["SENT","DELIVERED","OPENED","CLICKED","REPLIED"].includes(e.status))

                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`w-full text-left px-3 py-3 transition-all ${
                        isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Avatar */}
                        <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold mt-0.5 ${
                          isSelected ? "bg-sky-500/20 text-sky-300" : "bg-white/[0.06] text-white/50"
                        }`}>
                          {initials(fullName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] font-medium truncate ${isSelected ? "text-white" : "text-white/75"}`}>{fullName}</p>
                          <p className="text-[11px] text-white/35 truncate">{lead.company || lead.email}</p>

                          {/* Step dots */}
                          <div className="flex items-center gap-1 mt-1.5">
                            {localSequenceSteps.map(step => {
                              const email = lead.emails.find(e => e.stepNumber === step.stepNumber)
                              const dotColor = email
                                ? (EMAIL_STATUS_DOT[email.status] || "bg-white/20")
                                : "bg-white/[0.08]"
                              return <span key={step.stepNumber} className={`size-1.5 rounded-full ${dotColor}`} />
                            })}
                            {isResearching && <Loader2 className="size-3 text-emerald-400 animate-spin ml-0.5" />}
                            {lead.emails.length === 0 && !isResearching && (
                              <span className="text-[9px] text-violet-400 ml-0.5">needs copy</span>
                            )}
                            {hasDrafts && !hasSent && (
                              <span className="text-[9px] text-amber-400 ml-0.5">draft</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── RIGHT PANEL: Email workspace ────────────────────────────────── */}
            {selectedLead ? (
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

                {/* Lead header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-indigo-500/15 border border-white/10 text-[12px] font-semibold text-white/80">
                      {initials([selectedLead.firstName, selectedLead.lastName].filter(Boolean).join(" ") || selectedLead.email)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-white/90 truncate">
                          {[selectedLead.firstName, selectedLead.lastName].filter(Boolean).join(" ") || selectedLead.email}
                        </p>
                        <span className={`text-[11px] font-medium ${LEAD_STATUS_COLOR[selectedLead.status] || "text-white/40"}`}>
                          {selectedLead.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-white/35 mt-0.5">
                        {selectedLead.company && <span className="flex items-center gap-1"><Building2 className="size-3" />{selectedLead.company}</span>}
                        <span>{selectedLead.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lead navigation */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-white/25">{currentIdx + 1}/{filteredLeads.length}</span>
                    <button disabled={!prevLead} onClick={() => prevLead && setSelectedLeadId(prevLead.id)} className="flex size-7 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.07] disabled:opacity-25 transition-all">
                      <ChevronLeft className="size-4" />
                    </button>
                    <button disabled={!nextLead} onClick={() => nextLead && setSelectedLeadId(nextLead.id)} className="flex size-7 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.07] disabled:opacity-25 transition-all">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Approach + generate bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b border-white/[0.05] bg-white/[0.01]">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Sparkles className="size-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-white/40">Angle:</span>
                    <select
                      value={selectedApproach}
                      onChange={e => setSelectedApproach(e.target.value)}
                      className="bg-[#0f172a] border border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-white/90 outline-none cursor-pointer"
                    >
                      <option value="auto" className="bg-[#0f172a] text-emerald-300 font-bold">
                        ✨ AI Optimal ({selectedLeadOptimalApproach?.label || "Auto-Selected"})
                      </option>
                      {ALL_APPROACHES.map(a => (
                        <option key={a.id} value={a.id} className="bg-[#0f172a] text-white">
                          {a.label}
                        </option>
                      ))}
                    </select>
                    {selectedLeadOptimalApproach && (
                      <span className="text-[10.5px] text-white/45 hidden sm:inline-block truncate max-w-sm">
                        • {selectedLeadOptimalApproach.reason}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => generateForLead(selectedLead.id, selectedApproach)}
                    disabled={generatingLead}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {generatingLead ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                    {selectedLead.emails.length === 0 ? "Write sequence" : "Rewrite"}
                  </button>
                </div>

                {/* Step tabs */}
                {selectedLead.emails.length > 0 && (
                  <div className="flex items-center gap-1 px-5 py-2 border-b border-white/[0.05] overflow-x-auto">
                    {localSequenceSteps.map(step => {
                      const email = selectedLead.emails.find(e => e.stepNumber === step.stepNumber)
                      const isActive = activeStepNum === step.stepNumber
                      const dotColor = email ? (EMAIL_STATUS_DOT[email.status] || "bg-white/20") : "bg-white/[0.08]"
                      return (
                        <button
                          key={step.stepNumber}
                          onClick={() => { setActiveStepNum(step.stepNumber); setIsEditing(false) }}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all ${
                            isActive ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70"
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${dotColor}`} />
                          {step.stepNumber === 1 ? "Day 1" : `Follow-up ${step.stepNumber - 1}`}
                          {email && <span className="text-[10px] text-white/30">{EMAIL_STATUS_LABEL[email.status]}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Email body area */}
                <div className="flex-1 overflow-y-auto p-5">
                  {selectedLead.emails.length === 0 ? (
                    /* No drafts yet - Rich AI Angle Callout */
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-4 max-w-md mx-auto">
                      <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                        <Sparkles className="size-6 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-[15px] font-bold text-white/90">No emails drafted yet for {selectedLead.company || selectedLead.email}</h3>
                        {selectedLeadOptimalApproach && (
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-left space-y-1 text-xs">
                            <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wide block">
                              ✨ AI Recommended Angle: {selectedLeadOptimalApproach.label}
                            </span>
                            <p className="text-white/70 leading-relaxed">
                              {selectedLeadOptimalApproach.reason}
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => generateForLead(selectedLead.id, selectedApproach)}
                        disabled={generatingLead}
                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)" }}
                      >
                        {generatingLead ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                        <span>{generatingLead ? "Synthesizing Personalized Sequence…" : `Write Sequence with ${selectedLeadOptimalApproach?.label || "AI"}`}</span>
                      </button>
                    </div>
                  ) : selectedEmail ? (
                    <div className="max-w-2xl space-y-4">
                      {/* Failure Warning Box if FAILED */}
                      {selectedEmail.status === "FAILED" && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200 flex items-start gap-3">
                          <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-rose-300">Dispatch Failed</p>
                            <p className="text-[11.5px] text-rose-200/90 leading-relaxed">
                              {selectedEmail.replySnippet || failedReasonSnippet || "Email credentials not configured or SMTP server rejected the connection."}
                            </p>
                            {isSmtpMissing && (
                              <Link
                                href="/settings"
                                className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-300 hover:underline"
                              >
                                <Settings className="size-3" /> Go to Settings → Agency to add App Password
                              </Link>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Subject */}
                      <div>
                        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1.5">Subject</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSubject}
                            onChange={e => setEditSubject(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-[14px] font-medium text-white bg-white/[0.05] border border-white/10 focus:border-white/25 outline-none"
                          />
                        ) : (
                          <p className="text-[15px] font-semibold text-white/90">{selectedEmail.subject || "—"}</p>
                        )}
                      </div>

                      {/* Sent info */}
                      {selectedEmail.sentAt && (
                        <div className="flex items-center gap-2 text-[11px] text-white/35">
                          <CheckCircle2 className="size-3.5 text-emerald-400" />
                          Sent {new Date(selectedEmail.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {selectedEmail.openCount > 0 && <span className="text-emerald-400">· Opened {selectedEmail.openCount}×</span>}
                        </div>
                      )}
                      {activeStepNum > 1 && !selectedEmail.sentAt && (
                        <p className="text-[11px] text-white/30">Sends +{currentStepDef?.delayDays ?? 3}d after step 1 if no reply</p>
                      )}

                      {/* Body */}
                      <div className="border-t border-white/[0.06] pt-4">
                        {isEditing ? (
                          <textarea
                            rows={12}
                            value={editBody}
                            onChange={e => setEditBody(e.target.value)}
                            className="w-full rounded-lg px-3 py-2.5 text-[13px] leading-relaxed text-white/85 bg-white/[0.05] border border-white/10 focus:border-white/25 outline-none font-sans resize-none"
                          />
                        ) : (
                          <p className="text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap font-sans">
                            {selectedEmail.body || <span className="text-white/25 italic">No body written yet</span>}
                          </p>
                        )}
                      </div>

                      {/* Action row */}
                      {selectedEmail.status === "DRAFT" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                          {isEditing ? (
                            <>
                              <button onClick={() => setIsEditing(false)} className="text-[12px] text-white/40 hover:text-white/70 transition-colors">Cancel</button>
                              <button onClick={saveEdits} disabled={saving} className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] border border-white/[0.1] transition-all disabled:opacity-40">
                                {saving && <Loader2 className="size-3.5 animate-spin" />} Save
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/50 hover:text-white hover:bg-white/[0.07] border border-white/[0.07] transition-all">
                              <Edit3 className="size-3.5" /> Edit
                            </button>
                          )}

                          {activeStepNum === 1 && !isEditing && (
                            <button
                              onClick={() => sendLeadStep1(selectedLead.id)}
                              disabled={queuingLead}
                              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-all shadow-md shadow-emerald-500/15 disabled:opacity-40"
                            >
                              {queuingLead ? <Loader2 className="size-3.5 animate-spin text-black" /> : <Send className="size-3.5 text-black" />}
                              Send now
                            </button>
                          )}
                        </div>
                      )}

                      {/* AI polish bar — only for drafts */}
                      {selectedEmail.status === "DRAFT" && !isEditing && (
                        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                          <p className="text-[11px] text-white/35 font-medium flex items-center gap-1.5"><Bot className="size-3.5" /> AI polish</p>
                          <div className="flex flex-wrap gap-1.5">
                            {refinePad.map(c => (
                              <button
                                key={c.label}
                                onClick={() => refineEmail(c.prompt)}
                                disabled={refining}
                                className="rounded-md px-2.5 py-1 text-[11px] font-medium text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] transition-all disabled:opacity-30"
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Custom instruction…"
                              value={refinePrompt}
                              onChange={e => setRefinePrompt(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && refineEmail()}
                              className="flex-1 rounded-lg px-3 py-1.5 text-[12px] text-white/80 placeholder:text-white/25 bg-white/[0.04] border border-white/[0.08] focus:border-white/20 outline-none"
                            />
                            <button
                              onClick={() => refineEmail()}
                              disabled={refining || !refinePrompt.trim()}
                              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all disabled:opacity-30"
                            >
                              {refining ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center gap-2">
                      <Mail className="size-7 text-white/20" />
                      <p className="text-[13px] text-white/35">No email for this step yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/25">
                <p className="text-[13px]">Select a lead</p>
              </div>
            )}
          </div>
        )
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SEQUENCE VIEW — Sequence selector & step breakdown
      ════════════════════════════════════════════════════════════════════════ */}
      {view === "sequence" && (
        <div className="space-y-4">
          {/* Active Sequence Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Layers className="size-4 text-sky-400" />
                <span className="text-[14px] font-semibold text-white/90">
                  {localSequenceName}
                </span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {localSequenceSteps.length} step{localSequenceSteps.length !== 1 ? "s" : ""}
                </span>
                {isSwitchingSequence && (
                  <span className="flex items-center gap-1 text-[11px] text-sky-400">
                    <Loader2 className="size-3 animate-spin" /> Updating…
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/40">
                Choose which sequence cadence and step delays this campaign uses for new outreach drafts.
              </p>
            </div>

            {/* Sequence Dropdown Picker */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  value={localSequenceId}
                  onChange={e => handleSwitchSequence(e.target.value)}
                  disabled={isSwitchingSequence}
                  className="appearance-none rounded-xl pl-3.5 pr-8 py-2 text-[12px] font-medium text-white/90 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/20 focus:border-sky-500/50 outline-none cursor-pointer transition-all disabled:opacity-40"
                >
                  {allSequences.map(seq => (
                    <option key={seq.id} value={seq.id} className="bg-[#0f172a] text-white">
                      {seq.name} ({seq.steps?.length || 0} step{seq.steps?.length !== 1 ? "s" : ""})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-[10px]">
                  ▼
                </div>
              </div>

              <Link
                href="/templates"
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] transition-all whitespace-nowrap"
              >
                <span>Edit templates</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Sequence Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {localSequenceSteps.map(step => {
              const stepEmails = localLeads.flatMap(l => l.emails.filter(e => e.stepNumber === step.stepNumber))
              const sent = stepEmails.filter(e => !["FAILED","BOUNCED","DRAFT"].includes(e.status)).length
              const opened = stepEmails.filter(e => ["OPENED","CLICKED","REPLIED"].includes(e.status)).length
              const replied = stepEmails.filter(e => e.status === "REPLIED").length
              return (
                <div key={step.stepNumber} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-sky-400">
                      {step.stepNumber === 1 ? "Day 1 — Initial" : `Follow-up ${step.stepNumber - 1}`}
                    </span>
                    <span className="text-[10px] text-white/30">{step.delayDays > 0 ? `+${step.delayDays}d delay` : "Immediate"}</span>
                  </div>
                  <div className="rounded-lg bg-black/30 border border-white/[0.05] p-3 space-y-1.5">
                    <p className="text-[12px] font-medium text-white/70 line-clamp-1">{step.subjectTemplate || "Personalized subject"}</p>
                    <p className="text-[11px] text-white/35 line-clamp-3 leading-relaxed font-sans">
                      {step.bodyTemplate || "AI-written copy based on website audit and company signals."}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 pt-1 text-center">
                    <div><p className="text-[13px] font-semibold text-white/80">{sent}</p><p className="text-[10px] text-white/30">Sent</p></div>
                    <div><p className="text-[13px] font-semibold text-emerald-400">{opened}</p><p className="text-[10px] text-white/30">Opened</p></div>
                    <div><p className="text-[13px] font-semibold text-violet-400">{replied}</p><p className="text-[10px] text-white/30">Replied</p></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ACTIVITY VIEW
      ════════════════════════════════════════════════════════════════════════ */}
      {view === "activity" && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.04] overflow-hidden">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <ActivityIcon className="size-7 text-white/15" />
              <p className="text-[13px] text-white/30">No activity yet — events stream here as outreach sends.</p>
            </div>
          ) : activities.map(act => {
            const meta = ACTIVITY_ICON[act.type] || { icon: ActivityIcon, color: "text-white/40" }
            const Icon = meta.icon
            const lead = act.lead
            const leadName = lead?.firstName ? `${lead.firstName}${lead.lastName ? " " + lead.lastName : ""}` : (lead?.email ?? "Prospect")
            return (
              <div key={act.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] mt-0.5">
                  <Icon className={`size-3.5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white/80">{leadName}{lead?.company && <span className="text-white/35 font-normal"> · {lead.company}</span>}</p>
                  <p className="text-[11px] text-white/45 mt-0.5">{act.note || act.type.replace(/_/g, " ")}</p>
                </div>
                <span className="text-[10px] text-white/25 shrink-0 mt-0.5">
                  {new Date(act.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
