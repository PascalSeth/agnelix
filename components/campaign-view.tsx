/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown, ChevronRight, Mail, Eye, MousePointerClick,
  MessageSquare, Clock, CheckCircle2, XCircle, Loader2,
  MapPin, Upload, Users, FileText, Sparkles, Zap,
  Activity as ActivityIcon, Star, Calendar, Send
} from "lucide-react"
import Link from "next/link"
import { initials } from "@/lib/utils"
import { CampaignWorkflowBar } from "@/components/campaign-workflow-bar"
import { computeWorkflowPhase } from "@/lib/campaign-workflow"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────

type SequenceStep = {
  id: string; stepNumber: number; delayDays: number
  subjectTemplate: string | null; bodyTemplate: string | null
}

type EmailRecord = {
  id: string; subject: string; body: string; stepNumber: number
  status: string; sentAt: string | null; openedAt: string | null
  openCount: number; clickCount: number
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
  id: string; firstName: string | null; lastName: string | null
  email: string; company: string | null; status: string
  emails: EmailRecord[]
  activities?: ActivityRecord[]
  recommendedApproach?: string | null
  contactsJson?: string | null
}

interface CampaignViewProps {
  campaignId: string
  status: string
  autonomous: boolean
  leads: Lead[]
  sequenceSteps: SequenceStep[]
  onLeadsChange?: (leads: Lead[]) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STEP_DAY: Record<number, string> = { 1: "Day 1", 2: "Day 3", 3: "Day 7", 4: "Day 14" }

const EMAIL_STATUS: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  SENT:      { icon: Mail,             color: "text-emerald-400",  label: "Sent"     },
  DELIVERED: { icon: Mail,             color: "text-emerald-400",  label: "Delivered"},
  OPENED:    { icon: Eye,              color: "text-emerald-400",  label: "Opened"   },
  CLICKED:   { icon: MousePointerClick,color: "text-sky-400",      label: "Clicked"  },
  REPLIED:   { icon: MessageSquare,    color: "text-violet-400",   label: "Replied"  },
  QUEUED:    { icon: Clock,            color: "text-sky-400/60",   label: "Queued"   },
  BOUNCED:   { icon: XCircle,          color: "text-red-400",      label: "Bounced"  },
  FAILED:    { icon: XCircle,          color: "text-red-400",      label: "Failed"   },
  DRAFT:     { icon: FileText,         color: "text-amber-400/80", label: "Draft"    },
}

const ACTIVITY_META: Record<string, { icon: typeof Mail; color: string; label: string }> = {
  EMAIL_SENT:            { icon: Send,          color: "text-sky-400",     label: "Email Sent"     },
  EMAIL_OPENED:          { icon: Star,          color: "text-amber-400",   label: "Opened"         },
  EMAIL_CLICKED:         { icon: ChevronRight,  color: "text-emerald-400", label: "Clicked"        },
  REPLY_RECEIVED:        { icon: MessageSquare, color: "text-violet-400",  label: "Reply"          },
  STAGE_CHANGED:         { icon: Zap,           color: "text-white/40",    label: "Stage Changed"  },
  NOTE_ADDED:            { icon: FileText,      color: "text-white/55",    label: "Note"           },
  MEETING_BOOKED:        { icon: Calendar,      color: "text-emerald-400", label: "Meeting Booked" },
  BATTLE_CARD_GENERATED: { icon: Sparkles,      color: "text-amber-400",   label: "AI Drafted"     },
}

const LEAD_STATUS: Record<string, string> = {
  NEW:           "rgba(255,255,255,.3)",
  CONTACTED:     "rgba(125,211,252,.7)",
  REPLIED:       "rgba(167,139,250,.8)",
  INTERESTED:    "rgba(52,211,153,.8)",
  MEETING_BOOKED:"rgba(251,191,36,.8)",
  WON:           "rgba(52,211,153,1)",
  LOST:          "rgba(248,113,113,.6)",
  NOT_INTERESTED:"rgba(248,113,113,.6)",
  BOUNCED:       "rgba(248,113,113,.5)",
}

const APPROACHES = [
  { id: "website", label: "Website Audit" },
  { id: "local-rank", label: "Local Rank" },
  { id: "competitor", label: "Competitor Pattern" },
  { id: "industry", label: "Industry Shift" },
  { id: "question", label: "Question Open" },
  { id: "social-proof", label: "Social Proof" },
  { id: "local-neighbor", label: "Local Neighbor (B2C)" },
]

// ── Lead row with step timeline ───────────────────────────────────────────────

function LeadRow({
  lead, sequenceSteps, campaignId, isLast, onUpdateLead,
}: {
  lead: Lead; sequenceSteps: SequenceStep[]; campaignId: string; isLast: boolean; onUpdateLead: (updated: Lead) => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [preview, setPreview]     = useState<EmailRecord[] | null>(null)
  const [loadingPrev, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(1)

  const [emails, setEmails] = useState<EmailRecord[]>(lead.emails)
  const [approach, setApproach] = useState(lead.recommendedApproach || "website")
  const [generating, setGenerating] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editSubject, setEditSubject] = useState("")
  const [editBody, setEditBody] = useState("")
  const [refinePrompt, setRefinePrompt] = useState("")
  const [savingEdits, setSavingEdits] = useState(false)
  const [refiningAI, setRefiningAI] = useState(false)
  const [queuingLead, setQueuingLead] = useState(false)

  // Sync state if lead prop changes
  useEffect(() => {
    Promise.resolve().then(() => setEmails(lead.emails))
  }, [lead.emails])

  const name        = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email
  const sentEmails  = emails
  const leadColor   = LEAD_STATUS[lead.status] ?? LEAD_STATUS.NEW

  // Get the furthest email status for the header badge
  const priority = ["REPLIED", "CLICKED", "OPENED", "DELIVERED", "SENT", "QUEUED", "DRAFT", "BOUNCED", "FAILED"]
  const _topStatus = priority.find(s => sentEmails.some(e => e.status === s)) ?? (sentEmails.length === 0 ? "NEW" : "SENT")

  async function loadPreview(force = false) {
    if (preview && !force) return
    setLoading(true)
    try {
      const res = await fetch(`/api/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, leadId: lead.id, preview: true }),
      })
      if (res.ok) {
        const data = await res.json()
        const emailList = Array.isArray(data) ? data : (data.emails ?? [])
        setPreview(emailList)
        setActiveStep(emailList[0]?.stepNumber ?? 1)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  function toggle() {
    setExpanded(e => !e)
    if (!expanded && !preview && emails.length === 0) loadPreview()
  }

  const activeEmail = emails.find(e => e.stepNumber === activeStep)

  async function handleSaveEdits() {
    if (!activeEmail) return
    setSavingEdits(true)
    try {
      const res = await fetch(`/api/emails/${activeEmail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      })
      if (res.ok) {
        toast.success("Draft updated successfully")
        const updatedEmails = emails.map(e => e.id === activeEmail.id ? { ...e, subject: editSubject, body: editBody } : e)
        setEmails(updatedEmails)
        onUpdateLead({ ...lead, emails: updatedEmails })
        setIsEditing(false)
      } else {
        toast.error("Failed to save changes")
      }
    } catch {
      toast.error("Failed to save changes")
    } finally {
      setSavingEdits(false)
    }
  }

  async function handleRefineAI() {
    if (!activeEmail) return
    setRefiningAI(true)
    try {
      const res = await fetch(`/api/emails/${activeEmail.id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: refinePrompt }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("AI refined email draft!")
        const updatedEmails = emails.map(e => e.id === activeEmail.id ? { ...e, subject: data.email.subject, body: data.email.body } : e)
        setEmails(updatedEmails)
        onUpdateLead({ ...lead, emails: updatedEmails })
        setEditSubject(data.email.subject)
        setEditBody(data.email.body)
        setRefinePrompt("")
        setIsEditing(false)
      } else {
        toast.error("AI refinement failed")
      }
    } catch {
      toast.error("AI refinement failed")
    } finally {
      setRefiningAI(false)
    }
  }

  async function handleQueueLead() {
    setQueuingLead(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads/${lead.id}/queue`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("✅ Email sent successfully!")
        const updatedEmails = emails.map(e =>
          e.id === data.email?.id ? { ...e, status: data.email.status ?? "SENT", sentAt: data.email.sentAt } : e
        )
        setEmails(updatedEmails)
        onUpdateLead({ ...lead, emails: updatedEmails })
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error || "Failed to send email")
      }
    } catch {
      toast.error("Failed to send email")
    } finally {
      setQueuingLead(false)
    }
  }


  async function handleGenerateDrafts(selectedApproach: string) {
    setGenerating(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads/${lead.id}/generate-drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approach: selectedApproach }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("Outreach drafts generated successfully!")
        setEmails(data.emails)
        onUpdateLead({ ...lead, emails: data.emails })
        setActiveStep(1)
        setIsEditing(false)
      } else {
        toast.error("Failed to generate drafts")
      }
    } catch {
      toast.error("Failed to generate drafts")
    } finally {
      setGenerating(false)
    }
  }

  async function handleStopEnrichment(e: React.MouseEvent) {
    e.stopPropagation() // Prevent row expansion
    try {
      const res = await fetch(`/api/leads/${lead.id}/stop-enrichment`, {
        method: "POST",
      })
      if (res.ok) {
        toast.success("Enrichment stopped")
        onUpdateLead({ ...lead, contactsJson: "[]" })
      } else {
        toast.error("Failed to stop enrichment")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  const showOutreachDesigner = emails.length === 0 || emails.every(e => e.status === "DRAFT")

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,.04)" }}>
      {/* Row */}
      <div
        onClick={toggle}
        className="grid items-center gap-3 px-5 py-3.5 hover:bg-white/[.015] cursor-pointer transition-colors group"
        style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,2fr) minmax(0,1.2fr) 52px 96px 28px" }}
      >
        {/* Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white/60"
            style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}
          >
            {initials(name)}
          </div>
          <p className="text-[13px] font-semibold text-white/80 truncate">{name}</p>
        </div>

        {/* Email */}
        <p className="hidden sm:block text-[11px] text-white/35 truncate">{lead.email}</p>

        {/* Company */}
        <p className="hidden md:block text-[12px] text-white/30 truncate">{lead.company ?? "—"}</p>

        {/* Step progress dots */}
        <div className="hidden sm:flex items-center gap-1">
          {sequenceSteps.map((step, i) => {
            const email = sentEmails.find(e => e.stepNumber === step.stepNumber)
            const isOpened = email && ["OPENED", "CLICKED", "REPLIED"].includes(email.status)
            const isSent   = email && ["SENT", "DELIVERED", "QUEUED"].includes(email.status)
            const isDraft  = email && email.status === "DRAFT"
            const isActive = isSent || isOpened

            return (
              <div key={i}
                className="size-2 rounded-full transition-all"
                style={{
                  background: isOpened ? "#34d399"
                    : isDraft ? "#fbbf24"
                    : isActive ? "rgba(255,255,255,.35)"
                    : "rgba(255,255,255,.1)",
                  boxShadow: isOpened ? "0 0 4px rgba(52,211,153,.6)" : isDraft ? "0 0 4px rgba(251,191,36,.5)" : "none",
                }}
              />
            )
          })}
        </div>

        {/* Status badge */}
        {lead.status === "NEW" && !lead.contactsJson ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-[10px] font-bold uppercase tracking-wide truncate flex items-center gap-1 text-emerald-400"
              title="Enriching contacts, LinkedIn profiles, and website audit details in the background..."
            >
              <Loader2 className="size-3 animate-spin text-emerald-400 shrink-0" />
              Enriching...
            </span>
            <button
              onClick={handleStopEnrichment}
              className="text-[9px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 px-1.5 py-0.5 rounded transition-all opacity-0 group-hover:opacity-100 select-none shrink-0"
              title="Stop enrichment for this lead"
            >
              Stop
            </button>
          </div>
        ) : (
          <span
            className="text-[10px] font-bold uppercase tracking-wide truncate"
            style={{ color: leadColor }}
          >
            {lead.status.replace(/_/g, " ")}
          </span>
        )}

        {/* Expand */}
        <div className="flex justify-end text-white/20">
          {loadingPrev ? <Loader2 className="size-4 animate-spin" /> : expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </div>
      </div>

      {/* Expanded: step-by-step timeline */}
      {expanded && (
        <div className="px-5 pb-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)" }}
          >
            {/* Approach selection bar for drafts */}
            {showOutreachDesigner && (
              <div className="flex items-center justify-between px-5 py-3 border-b flex-wrap gap-2.5" style={{ borderColor: "rgba(255,255,255,.05)", background: "rgba(255,255,255,.01)" }}>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-emerald-400" />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Outreach Approach</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={approach}
                    onChange={(e) => setApproach(e.target.value)}
                    className="bg-white/[.03] border border-white/[.08] rounded-lg px-2.5 py-1 text-[11px] text-white/70 outline-none cursor-pointer hover:bg-white/[.06] transition-all"
                  >
                    {APPROACHES.map(a => (
                      <option key={a.id} value={a.id} className="bg-[#0f172a] text-white/80">
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleGenerateDrafts(approach)}
                    disabled={generating}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-bold text-black bg-emerald-400 hover:brightness-110 disabled:opacity-40 transition-all select-none font-sans"
                  >
                    {generating ? <Loader2 className="size-3 animate-spin text-black" /> : <Zap className="size-3 text-black fill-current" />}
                    Generate Drafts
                  </button>
                </div>
              </div>
            )}

            {emails.length === 0 ? (
              <div className="px-5 py-8 text-center space-y-2">
                <p className="text-[12px] font-semibold text-white/30">No drafts generated for this lead yet.</p>
                <p className="text-[11px] text-white/20">Select an outreach approach above and click &quot;Generate Drafts&quot; to build personalized email cadences.</p>
              </div>
            ) : (
              <>
                {/* Step tabs */}
                <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                  {sequenceSteps.map(step => {
                    const email    = sentEmails.find(e => e.stepNumber === step.stepNumber)
                    const previewE = (preview ?? []).find(e => e.stepNumber === step.stepNumber)
                    const isActive = activeStep === step.stepNumber
                    const _isOpened = email && ["OPENED", "CLICKED", "REPLIED"].includes(email.status)
                    const _isSent   = email && email.status !== "FAILED"

                    return (
                      <button
                        key={step.stepNumber}
                        onClick={() => {
                          setActiveStep(step.stepNumber)
                          setIsEditing(false)
                        }}
                        className="flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5 transition-all text-left"
                        style={{
                          background: isActive ? "rgba(255,255,255,.05)" : "transparent",
                          borderBottom: isActive ? "2px solid rgba(255,255,255,.3)" : "2px solid transparent",
                        }}
                      >
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">
                          {STEP_DAY[step.stepNumber] ?? `Step ${step.stepNumber}`}
                        </span>
                        {email ? (
                          <span className={`text-[10px] font-bold ${EMAIL_STATUS[email.status]?.color ?? "text-white/40"}`}>
                            {EMAIL_STATUS[email.status]?.label ?? email.status}
                            {email.openCount > 1 && ` ×${email.openCount}`}
                          </span>
                        ) : previewE ? (
                          <span className="text-[10px] text-white/20">Preview</span>
                        ) : (
                          <span className="text-[10px] text-white/20">Pending</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Email content for active step */}
                {(() => {
                  const email    = sentEmails.find(e => e.stepNumber === activeStep)
                  const previewE = (preview ?? []).find(e => e.stepNumber === activeStep)
                  const data = email ?? previewE

                  if (!data) return (
                    <div className="px-5 py-6 text-center">
                      <p className="text-[11px] text-white/25">Email not sent yet — will be scheduled automatically</p>
                    </div>
                  )

                  const isDraft = data.status === "DRAFT"

                  return (
                    <div className="px-5 py-4 space-y-4">
                      {/* Metadata & Actions row */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] text-white/25">
                        <div className="flex items-center gap-3">
                          {email?.sentAt && <span>Sent {new Date(email.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                          {email && !email.sentAt && <span className="font-semibold text-amber-400/80">Draft Outreach</span>}
                          {!email && <span className="italic">Preview (not yet sent)</span>}
                          {email && email.openCount > 0 && <span className="text-emerald-400/70">· Opened {email.openCount}×</span>}
                          {email && email.clickCount > 0 && <span className="text-sky-400/70">· Clicked {email.clickCount}×</span>}
                        </div>

                        {isDraft && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditSubject(data.subject)
                                setEditBody(data.body)
                                setIsEditing(prev => !prev)
                                setRefinePrompt("")
                              }}
                              className="px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 font-semibold uppercase tracking-wider text-[9px] transition-all font-sans"
                            >
                              {isEditing ? "Cancel" : "Edit Draft"}
                            </button>
                            <button
                              onClick={handleQueueLead}
                              disabled={queuingLead}
                              className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-400 hover:brightness-110 disabled:opacity-40 text-black font-black uppercase tracking-wider text-[9px] transition-all font-sans"
                            >
                              {queuingLead ? <Loader2 className="size-3 animate-spin text-black" /> : <Send className="size-3 text-black" />}
                              {queuingLead ? "Sending..." : "Send Now"}
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing && isDraft ? (
                        /* Edit Form */
                        <div className="space-y-3.5 p-4 rounded-xl bg-black/20 border border-white/[.04]">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-wider">Subject</label>
                            <input
                              value={editSubject}
                              onChange={e => setEditSubject(e.target.value)}
                              className="w-full bg-white/[.03] border border-white/[.08] rounded-lg px-3 py-1.5 text-[12px] text-white/80 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-wider">Body</label>
                            <textarea
                              value={editBody}
                              onChange={e => setEditBody(e.target.value)}
                              rows={6}
                              className="w-full bg-white/[.03] border border-white/[.08] rounded-lg px-3 py-2 text-[12px] text-white/70 outline-none leading-relaxed font-sans"
                            />
                          </div>

                          {/* AI Refinement Box */}
                          <div className="pt-2.5 border-t border-white/[.05] space-y-2">
                            <label className="text-[9px] font-black text-emerald-400/80 uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="size-3 text-emerald-400 fill-current" /> AI Refinement instruction
                            </label>
                            <div className="flex gap-2">
                              <input
                                placeholder="e.g. 'Make it more direct', 'Mention a 10% discount'"
                                value={refinePrompt}
                                onChange={e => setRefinePrompt(e.target.value)}
                                className="flex-1 bg-white/[.03] border border-white/[.08] rounded-lg px-3 py-1.5 text-[11px] text-white/70 outline-none placeholder:text-white/20"
                              />
                              <button
                                onClick={handleRefineAI}
                                disabled={refiningAI || !refinePrompt.trim()}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-black bg-emerald-400 hover:brightness-110 disabled:opacity-30 text-[11px] font-bold transition-all font-sans"
                              >
                                {refiningAI ? <Loader2 className="size-3 animate-spin text-black" /> : <Sparkles className="size-3 text-black fill-current" />}
                                Refine
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-white/[.03]">
                            <button
                              onClick={() => setIsEditing(false)}
                              className="px-3 py-1.5 rounded-lg text-white/40 hover:text-white/60 text-[11px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdits}
                              disabled={savingEdits}
                              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-white bg-white/10 hover:bg-white/15 text-[11px] font-bold border border-white/10 font-sans"
                            >
                              {savingEdits && <Loader2 className="size-3 animate-spin" />}
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display Draft/Email content */
                        <div className="space-y-3">
                          {/* Subject */}
                          <p className="text-[12px] text-white/60">
                            <span className="text-white/25">Subject: </span>
                            <span className="font-semibold text-white/75">{data.subject}</span>
                          </p>

                          {/* Body */}
                          <pre className="text-[12px] text-white/55 leading-relaxed whitespace-pre-wrap font-sans"
                            style={{ maxHeight: "200px", overflowY: "auto" }}>
                            {data.body}
                          </pre>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
            )}
          </div>

          {/* ── Activity Log ─────────────────────────────────────────────── */}
          {lead.activities && lead.activities.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.04)" }}>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Activity</p>
              <div className="space-y-1.5">
                {lead.activities.map(act => {
                  const meta = ACTIVITY_META[act.type] ?? { icon: ActivityIcon, color: "text-white/30", label: act.type }
                  const Icon = meta.icon
                  return (
                    <div key={act.id} className="flex items-start gap-2">
                      <Icon className={`size-3 shrink-0 mt-0.5 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white/55 leading-snug">{act.note || meta.label}</p>
                        <p className="text-[9px] text-white/20 mt-0.5">
                          {new Date(act.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sequence tab ──────────────────────────────────────────────────────────────

function SequenceTab({ steps, leads }: { steps: SequenceStep[]; leads: Lead[] }) {
  const [activeStep, setActiveStep] = useState(steps[0]?.stepNumber ?? 1)
  const step = steps.find(s => s.stepNumber === activeStep) ?? steps[0]

  // Aggregate stats per step
  function statsForStep(stepNum: number) {
    const emails = leads.flatMap(l => l.emails.filter(e => e.stepNumber === stepNum))
    const sent     = emails.filter(e => !["FAILED", "BOUNCED", "DRAFT"].includes(e.status)).length
    const opened   = emails.filter(e => ["OPENED", "CLICKED", "REPLIED"].includes(e.status)).length
    const replied  = emails.filter(e => e.status === "REPLIED").length
    return { sent, opened, replied, total: emails.length }
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-[13px] font-bold text-white/30">No sequence steps</p>
        <p className="text-[11px] text-white/20">Create a sequence to define your email cadence</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Step list (left) */}
      <div
        className="shrink-0 w-48 overflow-y-auto"
        style={{ borderRight: "1px solid rgba(255,255,255,.05)" }}
      >
        {steps.map(s => {
          const stats  = statsForStep(s.stepNumber)
          const isActive = activeStep === s.stepNumber
          return (
            <button
              key={s.stepNumber}
              onClick={() => setActiveStep(s.stepNumber)}
              className="w-full text-left px-4 py-3.5 transition-all"
              style={{
                background: isActive ? "rgba(255,255,255,.05)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,.04)",
                borderLeft: isActive ? "2px solid rgba(255,255,255,.35)" : "2px solid transparent",
              }}
            >
              <p className={`text-[12px] font-bold ${isActive ? "text-white/85" : "text-white/40"}`}>
                {STEP_DAY[s.stepNumber] ?? `Step ${s.stepNumber}`}
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">
                {s.delayDays === 0 ? "Sends immediately" : `After ${s.delayDays} day${s.delayDays !== 1 ? "s" : ""}`}
              </p>
              {stats.sent > 0 && (
                <p className="text-[9px] text-white/20 mt-1">
                  {stats.sent} sent · {stats.opened} opened
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Step detail (right) */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {step ? (
          <>
            {/* Stats row */}
            {(() => {
              const stats = statsForStep(step.stepNumber)
              return stats.total > 0 ? (
                <div className="flex items-center gap-4 flex-wrap">
                  {[
                    { label: "Sent",    val: stats.sent,    color: "text-white/50" },
                    { label: "Opened",  val: stats.opened,  color: "text-emerald-400/70" },
                    { label: "Replied", val: stats.replied, color: "text-violet-400/70" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`text-[15px] font-black ${color}`}>{val}</span>
                      <span className="text-[11px] text-white/25">{label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-white/20 italic">No emails sent at this step yet</p>
              )
            })()}

            {/* Template */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,.07)" }}
            >
              <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
                <p className="text-[10px] font-black text-white/25 uppercase tracking-wide mb-1">Subject template</p>
                <p className="text-[13px] font-semibold text-white/75">
                  {step.subjectTemplate || <span className="text-white/25 italic">No subject template set</span>}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-black text-white/25 uppercase tracking-wide mb-2">Body template</p>
                <pre className="text-[12px] text-white/55 leading-relaxed whitespace-pre-wrap font-sans"
                  style={{ maxHeight: "320px", overflowY: "auto" }}>
                  {step.bodyTemplate || <span className="text-white/25 italic">No body template set</span>}
                </pre>
              </div>
            </div>

            <p className="text-[10px] text-white/20">
              Variables: <span className="text-white/35 font-mono">{"{{firstName}} {{company}} {{industry}} {{painPoint}}"}</span> are personalised per lead using AI
            </p>
          </>
        ) : (
          <p className="text-[12px] text-white/30">Select a step</p>
        )}
      </div>
    </div>
  )
}

// ── Main view with tabs ───────────────────────────────────────────────────────

export function CampaignView({ campaignId, status, autonomous, leads, sequenceSteps, onLeadsChange }: CampaignViewProps) {
  const [tab, setTab] = useState<"leads" | "sequence" | "activity">("leads")
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)
  const [queuingAll, setQueuingAll] = useState(false)
  const [generatingAllDrafts, setGeneratingAllDrafts] = useState(false)
  const [processingQueue, setProcessingQueue] = useState(false)
  const [campaignActivities, setCampaignActivities] = useState<ActivityRecord[]>([])

  function updateLeads(next: Lead[]) {
    setLocalLeads(next)
    onLeadsChange?.(next)
  }

  // Keep local state in sync if prop changes
  useEffect(() => {
    Promise.resolve().then(() => setLocalLeads(leads))
  }, [leads])

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/activities`)
      if (res.ok) setCampaignActivities(await res.json())
    } catch { /* silent */ }
  }, [campaignId])

  // Fetch activities when activity tab open
  useEffect(() => {
    if (tab !== "activity") return
    fetchActivities()
    const iv = setInterval(fetchActivities, 8000)
    return () => clearInterval(iv)
  }, [tab, fetchActivities])

  const hasEnriching = localLeads.some(l => l.status === "NEW" && !l.contactsJson)
  const draftCount = localLeads.reduce((n, l) => n + l.emails.filter(e => e.status === "DRAFT").length, 0)
  const pendingSendCount = localLeads.reduce((n, l) => n + l.emails.filter(e => ["QUEUED", "SENDING"].includes(e.status)).length, 0)
  const failedCount = localLeads.reduce((n, l) => n + l.emails.filter(e => e.status === "FAILED").length, 0)
  const workflowPhase = computeWorkflowPhase(status, autonomous, localLeads, generatingAllDrafts)

  async function refreshLeads() {
    const res = await fetch(`/api/campaigns/${campaignId}`)
    if (!res.ok) return
    const campaign = await res.json()
    const updatedLeads = campaign?.campaignLeads?.map((cl: { lead: Lead }) => cl.lead)
    if (Array.isArray(updatedLeads)) updateLeads(updatedLeads)
  }

  const leadsWithoutDrafts = localLeads.filter(l =>
    l.emails.length === 0 && !(["REPLIED","MEETING_BOOKED","NOT_INTERESTED","BOUNCED"].includes(l.status))
  )

  const TABS = [
    { id: "leads"    as const, label: `Leads (${localLeads.length})` },
    { id: "sequence" as const, label: `Sequence (${sequenceSteps.length} steps)` },
    { id: "activity" as const, label: "Activity Log" },
  ]

  async function handleGenerateAllDrafts() {
    setGeneratingAllDrafts(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate-drafts-all`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success((data as { message?: string }).message || "Generating drafts in the background…")
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error || "Failed to start draft generation")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setGeneratingAllDrafts(false)
    }
  }

  async function handleQueueAll() {
    setQueuingAll(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/queue-all`, { method: "POST" })
      if (res.ok) {
        toast.success("Sending approved drafts…")
        await refreshLeads()
      } else {
        toast.error("Failed to send drafts")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setQueuingAll(false)
    }
  }

  async function handleProcessQueue() {
    setProcessingQueue(true)
    try {
      const res = await fetch("/api/process-queue", { method: "POST" })
      if (res.ok) {
        await refreshLeads()
      } else {
        toast.error("Failed to retry sends")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setProcessingQueue(false)
    }
  }

  function handleUpdateLead(updated: Lead) {
    updateLeads(localLeads.map(l => l.id === updated.id ? updated : l))
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar + add leads button */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}
      >
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-3 text-[12px] font-bold transition-all"
              style={{
                color: tab === t.id ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.3)",
                borderBottom: tab === t.id ? "2px solid rgba(255,255,255,.5)" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Add leads — only on leads tab */}
        {tab === "leads" && (
          <div className="flex items-center gap-2 py-2">
            <Link
              href="/leads/upload"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white/40 hover:text-white/65 transition-colors"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <Upload className="size-3" /> CSV
            </Link>
            <Link
              href="/leads/find"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white/40 hover:text-white/65 transition-colors"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <MapPin className="size-3" /> Maps
            </Link>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "leads" ? (
          localLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl"
                style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                <Users className="size-6 text-white/20" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-white/30">No leads enrolled</p>
                <p className="text-[12px] text-white/20 mt-1">Add leads to get started</p>
              </div>
              <div className="flex gap-2">
                <Link href="/leads/find"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition-all hover:brightness-110 font-sans"
                  style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", color: "#0f172a" }}>
                  <MapPin className="size-3.5" /> Find Leads
                </Link>
                <Link href="/leads/upload"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-white/50 hover:text-white/70 transition-all font-sans"
                  style={{ border: "1px solid rgba(255,255,255,.1)" }}>
                  <Upload className="size-3.5" /> Upload CSV
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <CampaignWorkflowBar
                phase={workflowPhase}
                autonomous={autonomous}
                leadsWithoutDrafts={leadsWithoutDrafts.length}
                draftCount={draftCount}
                pendingSendCount={pendingSendCount}
                failedCount={failedCount}
                isGenerating={generatingAllDrafts}
                isSending={queuingAll || processingQueue || pendingSendCount > 0}
                onApproveAll={handleQueueAll}
                onRetryFailed={handleProcessQueue}
              />

              {/* Column headers */}
              <div
                className="hidden sm:grid items-center gap-3 px-5 py-2"
                style={{
                  gridTemplateColumns: "minmax(0,2fr) minmax(0,2fr) minmax(0,1.2fr) 52px 96px 28px",
                  borderBottom: "1px solid rgba(255,255,255,.04)",
                }}
              >
                {["Name", "Email", "Company", "Steps", "Status", ""].map(h => (
                  <p key={h} className="text-[9px] font-black text-white/20 uppercase tracking-widest">{h}</p>
                ))}
              </div>

              {localLeads.map((lead, i) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  sequenceSteps={sequenceSteps}
                  campaignId={campaignId}
                  isLast={i === localLeads.length - 1}
                  onUpdateLead={handleUpdateLead}
                />
              ))}
            </div>
          )
        ) : tab === "sequence" ? (
          <SequenceTab steps={sequenceSteps} leads={localLeads} />
        ) : (
          /* Activity Log tab */
          campaignActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="size-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                <ActivityIcon className="size-5 text-white/20" />
              </div>
              <p className="text-[13px] font-bold text-white/25">No activity yet</p>
              <p className="text-[11px] text-white/15">Events will appear here as emails are sent</p>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-0">
              {campaignActivities.map((act) => {
                const meta = ACTIVITY_META[act.type] ?? { icon: ActivityIcon, color: "text-white/30", label: act.type }
                const Icon = meta.icon
                const lead = act.lead
                const leadName = lead?.firstName
                  ? `${lead.firstName}${lead.lastName ? " " + lead.lastName : ""}`
                  : (lead?.email ?? "Unknown")
                return (
                  <div key={act.id} className="flex items-start gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                    <div className="size-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-white/[.04] border border-white/[.06]">
                      <Icon className={`size-3.5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-white/70 truncate">{leadName}</span>
                        {lead?.company && <span className="text-[10px] text-white/25">{lead.company}</span>}
                      </div>
                      <p className="text-[11px] text-white/45 mt-0.5 leading-snug">{act.note || meta.label}</p>
                    </div>
                    <span className="text-[9px] text-white/20 shrink-0 mt-1">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
