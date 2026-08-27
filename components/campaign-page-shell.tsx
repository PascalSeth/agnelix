/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft, Mail, Eye, MessageSquare, Calendar, Users,
  RefreshCw, Zap, Play, Pause, Rocket, Loader2, MapPin,
  Upload, Search, ChevronLeft, ChevronRight, FileText,
  Check, X, RotateCcw, Send, Layers, Activity
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { CampaignControls } from "@/components/campaign-controls"
import { CampaignView } from "@/components/campaign-view"
import { pct } from "@/lib/utils"

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
}

type Lead = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  company: string | null
  status: string
  emails: EmailRecord[]
  contactsJson?: string | null
}

type SequenceStep = {
  id: string
  stepNumber: number
  delayDays: number
  subjectTemplate: string | null
  bodyTemplate: string | null
  stepType?: string
}

type SequenceItem = {
  id: string
  name: string
  steps: SequenceStep[]
}

interface CampaignPageShellProps {
  campaignId: string
  name: string
  status: string
  autonomous: boolean
  leads: Lead[]
  sequenceId?: string
  sequenceSteps: SequenceStep[]
  sequenceName: string
  availableSequences?: SequenceItem[]
  stepCount: number
  emailsSent: number
  emailsOpened: number
  replies: number
  meetings: number
  isNew?: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; pulse?: boolean }> = {
  DRAFT:     { label: "Draft",     color: "text-white/50",    bg: "bg-white/[0.05]",    dot: "bg-white/30" },
  ACTIVE:    { label: "Active",    color: "text-emerald-300", bg: "bg-emerald-500/10",  dot: "bg-emerald-400", pulse: true },
  PAUSED:    { label: "Paused",    color: "text-amber-300",   bg: "bg-amber-500/10",    dot: "bg-amber-400" },
  COMPLETED: { label: "Done",      color: "text-white/35",    bg: "bg-white/[0.03]",    dot: "bg-white/20" },
}

export function CampaignPageShell(props: CampaignPageShellProps) {
  const {
    campaignId, name, status: initStatus, autonomous: initAutonomous, leads: initLeads,
    sequenceId: initSequenceId, sequenceSteps: initSequenceSteps, sequenceName: initSequenceName,
    availableSequences: initAvailableSequences = [], stepCount: initStepCount,
    emailsSent, emailsOpened, replies, meetings, isNew,
  } = props

  const [status, setStatus] = useState(initStatus)
  const [autonomous, setAutonomous] = useState(initAutonomous)
  const [leads, setLeads] = useState(initLeads)
  const [sequenceId, setSequenceId] = useState(initSequenceId || "")
  const [sequenceName, setSequenceName] = useState(initSequenceName)
  const [sequenceSteps, setSequenceSteps] = useState(initSequenceSteps)
  const [stepCount, setStepCount] = useState(initStepCount)
  const [availableSequences, setAvailableSequences] = useState(initAvailableSequences)
  const [showNewHint, setShowNewHint] = useState(isNew ?? false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const autoGenTriggered = useRef(false)

  useEffect(() => { setLeads(initLeads) }, [initLeads])
  useEffect(() => { setStatus(initStatus) }, [initStatus])
  useEffect(() => { setAutonomous(initAutonomous) }, [initAutonomous])
  useEffect(() => { setSequenceId(initSequenceId || "") }, [initSequenceId])
  useEffect(() => { setSequenceName(initSequenceName) }, [initSequenceName])
  useEffect(() => { setSequenceSteps(initSequenceSteps) }, [initSequenceSteps])
  useEffect(() => { setStepCount(initStepCount) }, [initStepCount])
  useEffect(() => { if (initAvailableSequences?.length) setAvailableSequences(initAvailableSequences) }, [initAvailableSequences])

  const hasLeads = leads.length > 0
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT

  const leadsWithoutDrafts = leads.filter(l =>
    l.emails.length === 0 && !["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED"].includes(l.status)
  ).length
  const isEnriching = leads.some(l => l.status === "NEW" && !l.contactsJson)

  const refreshCampaign = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (!res.ok) return
      const campaign = await res.json()
      const updatedLeads = campaign?.campaignLeads?.map((cl: { lead: Lead }) => cl.lead)
      if (Array.isArray(updatedLeads)) setLeads(updatedLeads)
      if (campaign?.status) setStatus(campaign.status)
      if (campaign?.autonomous !== undefined) setAutonomous(campaign.autonomous)
      if (campaign?.sequence) {
        setSequenceId(campaign.sequence.id)
        setSequenceName(campaign.sequence.name)
        if (Array.isArray(campaign.sequence.steps)) {
          setSequenceSteps(campaign.sequence.steps)
          setStepCount(campaign.sequence.steps.length)
        }
      }
    } catch { /* silent */ }
    finally { setIsRefreshing(false) }
  }, [campaignId])

  function handleSequenceChange(newSeq: SequenceItem) {
    setSequenceId(newSeq.id)
    setSequenceName(newSeq.name)
    setSequenceSteps(newSeq.steps)
    setStepCount(newSeq.steps.length)
  }

  useEffect(() => {
    const hasPending = leads.some(l => l.emails.some(e => ["QUEUED", "SENDING"].includes(e.status)))
    const needsPoll = status === "ACTIVE" && (hasPending || leadsWithoutDrafts > 0 || isEnriching)
    if (!needsPoll) return
    refreshCampaign()
    const iv = setInterval(refreshCampaign, 4000)
    return () => clearInterval(iv)
  }, [status, leads, leadsWithoutDrafts, isEnriching, refreshCampaign])

  useEffect(() => {
    if (!autonomous || status !== "ACTIVE" || leadsWithoutDrafts === 0 || isEnriching) return
    if (autoGenTriggered.current) return
    autoGenTriggered.current = true
    fetch(`/api/campaigns/${campaignId}/generate-drafts-all`, { method: "POST" })
      .then(() => refreshCampaign())
      .catch(() => { autoGenTriggered.current = false })
  }, [autonomous, status, leadsWithoutDrafts, isEnriching, campaignId, refreshCampaign])

  useEffect(() => {
    if (leadsWithoutDrafts === 0) autoGenTriggered.current = false
  }, [leadsWithoutDrafts])

  function handleLaunched() {
    setStatus("ACTIVE")
    setShowNewHint(false)
    refreshCampaign()
  }

  const computedSent     = Math.max(emailsSent,    leads.reduce((s, l) => s + l.emails.filter(e => ["SENT","DELIVERED","OPENED","CLICKED","REPLIED"].includes(e.status)).length, 0))
  const computedOpened   = Math.max(emailsOpened,  leads.reduce((s, l) => s + l.emails.filter(e => ["OPENED","CLICKED","REPLIED"].includes(e.status)).length, 0))
  const computedReplies  = Math.max(replies,        leads.filter(l => l.status === "REPLIED" || l.emails.some(e => e.status === "REPLIED")).length)
  const computedMeetings = Math.max(meetings,       leads.filter(l => ["MEETING_BOOKED","WON"].includes(l.status)).length)

  const openRate = pct(computedOpened, computedSent)
  const replyRate = pct(computedReplies, leads.length)

  return (
    <div className="flex flex-col gap-0 h-full min-h-0">

      {/* ═══════════════════════════════════════════════════════════════════════
          TOP BAR — slim, clean, everything in one line
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 px-1 py-3 border-b border-white/[0.06] mb-4">
        {/* Back */}
        <Link
          href="/campaigns"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.07] transition-all"
        >
          <ArrowLeft className="size-4" />
        </Link>

        {/* Title */}
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <h1 className="text-[16px] font-semibold text-white/90 truncate">{name}</h1>

          {/* Status pill */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.color} ${cfg.bg}`}>
            <span className={`size-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`} />
            {cfg.label}
          </span>

          {autonomous && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-300 border border-violet-500/20">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-violet-400"></span>
              </span>
              <span>
                {isEnriching
                  ? "Autopilot: Researching leads…"
                  : leadsWithoutDrafts > 0
                  ? `Autopilot: Drafting ${leadsWithoutDrafts} sequence${leadsWithoutDrafts !== 1 ? "s" : ""}…`
                  : leads.some(l => l.emails.some(e => e.status === "QUEUED"))
                  ? "Autopilot: Sending queued emails…"
                  : status === "ACTIVE"
                  ? "Autopilot: Live & Monitoring"
                  : "Autopilot Armed"}
              </span>
            </span>
          )}

          {isEnriching && !autonomous && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">
              <Loader2 className="size-3 animate-spin" /> Researching leads…
            </span>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={refreshCampaign}
          disabled={isRefreshing}
          title="Refresh"
          className="flex size-8 items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-30"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
        </button>

        {/* Campaign controls */}
        <CampaignControls
          id={campaignId}
          status={status as "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"}
          autonomous={autonomous}
          hasLeads={hasLeads}
          isEnriching={isEnriching}
          onLaunched={handleLaunched}
          onAutonomousChange={setAutonomous}
          onStatusChange={setStatus}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          METRICS ROW — horizontal pill metrics, no cards
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { icon: Users,        label: "Prospects",  value: leads.length,    accent: "text-sky-400" },
          { icon: Mail,         label: "Sent",       value: computedSent,    accent: "text-slate-400" },
          { icon: Eye,          label: "Open rate",  value: openRate,        accent: "text-emerald-400" },
          { icon: MessageSquare,label: "Reply rate", value: replyRate,       accent: "text-violet-400" },
          { icon: Calendar,     label: "Meetings",   value: computedMeetings,accent: "text-amber-400" },
        ].map(({ icon: Icon, label, value, accent }) => (
          <div key={label} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2">
            <Icon className={`size-3.5 shrink-0 ${accent}`} />
            <span className="text-[14px] font-semibold text-white/85">{value}</span>
            <span className="text-[11px] text-white/35">{label}</span>
          </div>
        ))}

        {/* Sequence info — pushed right */}
        <div className="ml-auto hidden lg:flex items-center gap-1.5 text-[11px] text-white/30">
          <Layers className="size-3.5 text-white/20" />
          <span>{sequenceName}</span>
          <span className="text-white/15">·</span>
          <span>{stepCount} step{stepCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          HINT BANNER — only when new
      ═══════════════════════════════════════════════════════════════════════ */}
      {showNewHint && hasLeads && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-500/[0.08] to-transparent px-4 py-3">
          <Sparkles className="size-4 text-sky-400 shrink-0" />
          <p className="flex-1 text-[13px] text-white/70">
            {autonomous
              ? "Autopilot is on — hit Launch and Galien will write and send everything automatically."
              : "Ready — click Launch to generate personalised AI drafts for your review."}
          </p>
          <button onClick={() => setShowNewHint(false)} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN WORKSPACE
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0">
        <CampaignView
          campaignId={campaignId}
          status={status}
          autonomous={autonomous}
          leads={leads}
          sequenceId={sequenceId}
          sequenceName={sequenceName}
          sequenceSteps={sequenceSteps}
          availableSequences={availableSequences}
          onLeadsChange={setLeads}
          onSequenceChange={handleSequenceChange}
          onLaunch={() => {
            const launchBtn = document.querySelector("button[title*='Launch'], button:has(svg.lucide-play)") as HTMLButtonElement
            if (launchBtn) launchBtn.click()
          }}
        />
      </div>
    </div>
  )
}
