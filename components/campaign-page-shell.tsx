/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Eye, MessageSquare, Calendar, Users, LucideIcon } from "lucide-react"
import { CampaignControls } from "@/components/campaign-controls"
import { CampaignView } from "@/components/campaign-view"
import { pct } from "@/lib/utils"

type EmailRecord = {
  id: string; subject: string; body: string; stepNumber: number
  status: string; sentAt: string | null; openedAt: string | null
  openCount: number; clickCount: number
}

type Lead = {
  id: string; firstName: string | null; lastName: string | null
  email: string; company: string | null; status: string
  emails: EmailRecord[]
  contactsJson?: string | null
}

type SequenceStep = {
  id: string; stepNumber: number; delayDays: number
  subjectTemplate: string | null; bodyTemplate: string | null
}

const STATUS_BADGE: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT:     { label: "Draft",     color: "rgba(255,255,255,.3)",  dot: "rgba(255,255,255,.3)"  },
  ACTIVE:    { label: "Live",      color: "rgba(52,211,153,.9)",   dot: "#34d399"               },
  PAUSED:    { label: "Paused",    color: "rgba(251,191,36,.9)",   dot: "#fbbf24"               },
  COMPLETED: { label: "Completed", color: "rgba(255,255,255,.4)",  dot: "rgba(255,255,255,.3)"  },
}

interface CampaignPageShellProps {
  campaignId: string
  name: string
  status: string
  autonomous: boolean
  leads: Lead[]
  sequenceSteps: SequenceStep[]
  sequenceName: string
  stepCount: number
  emailsSent: number
  emailsOpened: number
  replies: number
  meetings: number
  isNew?: boolean
}

export function CampaignPageShell(props: CampaignPageShellProps) {
  const {
    campaignId, name, status: initStatus, autonomous: initAutonomous, leads: initLeads,
    sequenceSteps, sequenceName, stepCount, emailsSent, emailsOpened, replies, meetings, isNew,
  } = props

  const [status, setStatus] = useState(initStatus)
  const [autonomous, setAutonomous] = useState(initAutonomous)
  const [leads, setLeads] = useState(initLeads)
  const [showNewHint, setShowNewHint] = useState(isNew ?? false)
  const autoGenTriggered = useRef(false)

  useEffect(() => { Promise.resolve().then(() => setLeads(initLeads)) }, [initLeads])
  useEffect(() => { Promise.resolve().then(() => setStatus(initStatus)) }, [initStatus])
  useEffect(() => { Promise.resolve().then(() => setAutonomous(initAutonomous)) }, [initAutonomous])

  const hasLeads = leads.length > 0
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.DRAFT

  const leadsWithoutDrafts = leads.filter(l =>
    l.emails.length === 0 && !["REPLIED", "MEETING_BOOKED", "NOT_INTERESTED", "BOUNCED"].includes(l.status)
  ).length
  const isEnriching = leads.some(l => l.status === "NEW" && !l.contactsJson)

  const refreshCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (!res.ok) return
      const campaign = await res.json()
      const updatedLeads = campaign?.campaignLeads?.map((cl: { lead: Lead }) => cl.lead)
      if (Array.isArray(updatedLeads)) setLeads(updatedLeads)
      if (campaign?.status) setStatus(campaign.status)
      if (campaign?.autonomous !== undefined) setAutonomous(campaign.autonomous)
    } catch { /* silent */ }
  }, [campaignId])

  // Poll while campaign has work in progress
  useEffect(() => {
    const hasPending = leads.some(l => l.emails.some(e => ["QUEUED", "SENDING"].includes(e.status)))
    const needsPoll = status === "ACTIVE" && (hasPending || leadsWithoutDrafts > 0 || isEnriching)
    if (!needsPoll) return

    refreshCampaign()
    const iv = setInterval(refreshCampaign, 4000)
    return () => clearInterval(iv)
  }, [status, leads, leadsWithoutDrafts, isEnriching, refreshCampaign])

  // Autopilot: auto-generate drafts for newly added leads on active campaigns
  useEffect(() => {
    if (!autonomous || status !== "ACTIVE" || leadsWithoutDrafts === 0 || isEnriching) return
    if (autoGenTriggered.current) return
    autoGenTriggered.current = true

    fetch(`/api/campaigns/${campaignId}/generate-drafts-all`, { method: "POST" })
      .then(() => refreshCampaign())
      .catch(() => { autoGenTriggered.current = false })
  }, [autonomous, status, leadsWithoutDrafts, isEnriching, campaignId, refreshCampaign])

  // Reset auto-gen guard when new leads appear
  useEffect(() => {
    if (leadsWithoutDrafts === 0) autoGenTriggered.current = false
  }, [leadsWithoutDrafts])

  const stats: { label: string; value: string | number; icon: LucideIcon; color: string }[] = [
    { label: "Leads",    value: leads.length,                               icon: Users,         color: "rgba(255,255,255,.4)"  },
    { label: "Sent",     value: emailsSent,                                 icon: Mail,          color: "rgba(125,211,252,.7)"  },
    { label: "Opened",   value: pct(emailsOpened, emailsSent),              icon: Eye,           color: "rgba(52,211,153,.7)"   },
    { label: "Replied",  value: pct(replies, leads.length),                 icon: MessageSquare, color: "rgba(167,139,250,.7)"  },
    { label: "Meetings", value: meetings,                                   icon: Calendar,      color: "rgba(251,191,36,.7)"   },
  ]

  function handleLaunched() {
    setStatus("ACTIVE")
    setShowNewHint(false)
    refreshCampaign()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div className="flex items-start gap-4">
          <Link
            href="/campaigns"
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:text-white/70"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-[20px] font-black tracking-tight text-white/90 truncate">{name}</h1>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="size-1.5 rounded-full" style={{ background: badge.dot, boxShadow: `0 0 5px ${badge.dot}` }} />
                <span className="text-[11px] font-bold" style={{ color: badge.color }}>{badge.label}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/25">
              {sequenceName} · {stepCount} email{stepCount !== 1 ? "s" : ""}
              {hasLeads && ` · ${leads.length} lead${leads.length !== 1 ? "s" : ""}`}
            </p>
          </div>

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

        {showNewHint && hasLeads && (
          <div
            className="mt-4 ml-12 p-3 rounded-xl flex items-center gap-3"
            style={{ background: "rgba(125,211,252,.06)", border: "1px solid rgba(125,211,252,.15)" }}
          >
            <p className="text-[12px] text-sky-300/80 flex-1">
              {autonomous
                ? "Campaign created with Autopilot. Click Launch — emails write and send automatically."
                : "Campaign created. Click Launch to generate drafts, review them, then approve to send."}
            </p>
            <button onClick={() => setShowNewHint(false)} className="text-[10px] text-white/30 hover:text-white/50 font-bold uppercase tracking-wider">
              Got it
            </button>
          </div>
        )}

        <div className="flex items-center gap-5 mt-4 pl-12 flex-wrap">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="size-3 shrink-0" style={{ color }} />
              <span className="text-[13px] font-bold text-white/70">{value}</span>
              <span className="text-[11px] text-white/25">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CampaignView
          campaignId={campaignId}
          status={status}
          autonomous={autonomous}
          leads={leads}
          sequenceSteps={sequenceSteps}
          onLeadsChange={setLeads}
        />
      </div>
    </div>
  )
}
