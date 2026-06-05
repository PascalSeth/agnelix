"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Loader2, Mail } from "lucide-react"
import { initials } from "@/lib/utils"

type EmailRecord = {
  id: string; subject: string; body: string; stepNumber: number; status: string
  sentAt: string | null; openedAt: string | null; openCount: number; clickCount: number
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Pending",    color: "rgba(255,255,255,.3)",  bg: "rgba(255,255,255,.04)" },
  QUEUED:     { label: "Queued",     color: "rgba(125,211,252,.7)",  bg: "rgba(125,211,252,.08)" },
  SENT:       { label: "Sent",       color: "rgba(255,255,255,.45)", bg: "rgba(255,255,255,.06)" },
  DELIVERED:  { label: "Delivered",  color: "rgba(255,255,255,.45)", bg: "rgba(255,255,255,.06)" },
  OPENED:     { label: "Opened",     color: "rgba(52,211,153,.8)",   bg: "rgba(52,211,153,.1)"  },
  CLICKED:    { label: "Clicked",    color: "rgba(125,211,252,.9)",  bg: "rgba(125,211,252,.1)" },
  REPLIED:    { label: "Replied",    color: "rgba(167,139,250,.9)",  bg: "rgba(167,139,250,.1)" },
  BOUNCED:    { label: "Bounced",    color: "rgba(248,113,113,.8)",  bg: "rgba(248,113,113,.1)" },
  FAILED:     { label: "Failed",     color: "rgba(248,113,113,.8)",  bg: "rgba(248,113,113,.1)" },
}

interface CampaignLeadRowProps {
  campaignId: string
  lead: {
    id: string; firstName: string | null; lastName: string | null
    email: string; company: string | null; status: string
    emails: EmailRecord[]
  }
  isLast: boolean
}

export function CampaignLeadRow({ campaignId, lead, isLast }: CampaignLeadRowProps) {
  const [expanded, setExpanded]   = useState(false)
  const [previews, setPreviews]   = useState<EmailRecord[] | null>(null)
  const [loading, setLoading]     = useState(false)
  const [activeStep, setActiveStep] = useState(1)

  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email
  const emailStatus = lead.emails?.[0]?.status ?? "PENDING"
  const style = STATUS_STYLE[emailStatus] ?? STATUS_STYLE.PENDING

  async function fetchPreview() {
    if (previews) { setExpanded(e => !e); return }
    setLoading(true)
    setExpanded(true)
    try {
      const res = await fetch(`/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, leadId: lead.id, preview: true }),
      })
      if (!res.ok) throw new Error()
      const data: { emails: EmailRecord[] } = await res.json()
      const emailList = data.emails ?? []
      setPreviews(emailList)
      setActiveStep(emailList[0]?.stepNumber ?? 1)
    } catch {
      // If preview fetch fails, fall back to sent emails
      if (lead.emails.length > 0) {
        setPreviews(lead.emails)
        setActiveStep(lead.emails[0].stepNumber)
      } else {
        setExpanded(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const stepData = (previews ?? lead.emails).find(e => e.stepNumber === activeStep)
    ?? (previews ?? lead.emails)[0]

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,.04)" }}>
      {/* Row */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[.015] transition-colors cursor-pointer"
        onClick={fetchPreview}
      >
        {/* Avatar */}
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white/60"
          style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}
        >
          {initials(name)}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white/80 truncate">{name}</p>
          <p className="text-[11px] text-white/30 truncate">{lead.email}</p>
        </div>

        {/* Company */}
        <p className="hidden sm:block text-[12px] text-white/30 truncate w-32 shrink-0">
          {lead.company ?? "—"}
        </p>

        {/* Email status */}
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
          style={{ color: style.color, background: style.bg }}
        >
          {style.label}
        </span>

        {/* Email sent count */}
        {lead.emails.length > 0 && (
          <div className="hidden md:flex items-center gap-1 text-[10px] text-white/25 shrink-0">
            <Mail className="size-3" />
            {lead.emails.length}
          </div>
        )}

        {/* Expand icon */}
        <div className="shrink-0 text-white/20">
          {loading
            ? <Loader2 className="size-4 animate-spin" />
            : expanded
            ? <ChevronDown className="size-4" />
            : <ChevronRight className="size-4" />
          }
        </div>
      </div>

      {/* Inline preview panel */}
      {expanded && !loading && stepData && (
        <div
          className="mx-4 mb-4 rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)" }}
        >
          {/* Step tabs */}
          {(previews ?? lead.emails).length > 1 && (
            <div
              className="flex gap-1 px-4 pt-3 pb-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}
            >
              {(previews ?? lead.emails).map(e => (
                <button
                  key={e.stepNumber}
                  onClick={() => setActiveStep(e.stepNumber)}
                  className="rounded-lg px-3 py-1 text-[11px] font-bold transition-all"
                  style={activeStep === e.stepNumber
                    ? { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.8)" }
                    : { color: "rgba(255,255,255,.3)" }}
                >
                  {e.stepNumber === 1 ? "Day 1" : e.stepNumber === 2 ? "Day 3" : `Day ${e.stepNumber * 3}`}
                </button>
              ))}
            </div>
          )}

          {/* Email content */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-[12px] font-bold text-white/60">
              <span className="text-white/25 font-normal">Subject: </span>
              {stepData.subject}
            </p>
            <pre
              className="text-[12px] text-white/55 leading-relaxed whitespace-pre-wrap font-sans"
              style={{ maxHeight: "220px", overflowY: "auto" }}
            >
              {stepData.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
