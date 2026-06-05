"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Rocket, Loader2 } from "lucide-react"
import { toast } from "sonner"

type PreviewEmail = {
  leadId: string
  leadName: string
  stepNumber: number
  subject: string
  body: string
}

type LeadPreview = {
  leadId: string
  leadName: string
  steps: { stepNumber: number; subject: string; body: string }[]
}

const stepLabel = (n: number) =>
  n === 1 ? "Day 1" : n === 2 ? "Day 3" : "Day 7"

function LeadPreviewCard({ lead, onChange }: { lead: LeadPreview, onChange: (leadId: string, stepNum: number, field: "subject"|"body", val: string) => void }) {
  const [active, setActive] = useState(lead.steps[0]?.stepNumber ?? 1)
  const step = lead.steps.find((s) => s.stepNumber === active) ?? lead.steps[0]

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
        border: "1px solid rgba(255,255,255,.07)",
        boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
      }}
    >
      <div className="absolute top-0 inset-x-6 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,.06)" }}>
        <p className="text-[13px] font-bold text-white/75">{lead.leadName}</p>
        <span
          className="rounded-full px-2.5 py-1 text-[9px] font-bold text-white/30 uppercase tracking-wide"
          style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          {lead.steps.length} emails
        </span>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1.5 px-5 pt-4">
        {lead.steps.map((s) => (
          <button
            key={s.stepNumber}
            onClick={() => setActive(s.stepNumber)}
            className="rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all"
            style={
              active === s.stepNumber
                ? {
                    background: "rgba(255,255,255,.1)",
                    border: "1px solid rgba(255,255,255,.12)",
                    color: "rgba(255,255,255,.8)",
                  }
                : {
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,.05)",
                    color: "rgba(255,255,255,.3)",
                  }
            }
          >
            {stepLabel(s.stepNumber)}
          </button>
        ))}
      </div>

      {/* Email content */}
      {step && (
        <div className="p-5 space-y-4">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}
          >
            <div>
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-[.15em] mb-1">Subject</p>
              <input 
                value={step.subject}
                onChange={(e) => onChange(lead.leadId, active, "subject", e.target.value)}
                className="w-full bg-transparent text-[13px] font-bold text-white/75 outline-none border-b border-transparent focus:border-white/20 transition-colors pb-1"
              />
            </div>
            <div className="border-t" style={{ borderColor: "rgba(255,255,255,.05)" }} />
            <div>
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-[.15em] mb-2">Body</p>
              <textarea 
                value={step.body}
                onChange={(e) => onChange(lead.leadId, active, "body", e.target.value)}
                rows={8}
                className="w-full bg-transparent text-[12px] leading-relaxed font-sans text-white/55 outline-none resize-y"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [leads, setLeads]       = useState<LeadPreview[]>([])
  const [loading, setLoading]   = useState(true)
  const [launching, setLaunching] = useState(false)

  useEffect(() => {
    fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id, preview: true }),
    })
      .then((r) => r.json())
      .then((emails: PreviewEmail[]) => {
        const map = new Map<string, LeadPreview>()
        for (const e of emails) {
          if (!map.has(e.leadId))
            map.set(e.leadId, { leadId: e.leadId, leadName: e.leadName, steps: [] })
          map.get(e.leadId)!.steps.push({ stepNumber: e.stepNumber, subject: e.subject, body: e.body })
        }
        setLeads(Array.from(map.values()))
      })
      .catch(() => toast.error("Failed to generate preview"))
      .finally(() => setLoading(false))
  }, [id])

  function handleUpdate(leadId: string, stepNum: number, field: "subject"|"body", val: string) {
    setLeads(prev => prev.map(l => {
      if (l.leadId !== leadId) return l
      return {
        ...l,
        steps: l.steps.map(s => s.stepNumber === stepNum ? { ...s, [field]: val } : s)
      }
    }))
  }

  async function handleLaunch() {
    setLaunching(true)
    
    // Flatten leads into customEmails format
    const customEmails = leads.flatMap(l => 
      l.steps.map(s => ({
        leadId: l.leadId,
        stepNumber: s.stepNumber,
        subject: s.subject,
        body: s.body
      }))
    )

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id, customEmails }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { sent } = await res.json()
      toast.success(`Campaign launched — ${sent} emails queued`)
      router.push(`/campaigns/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Launch failed")
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-4">
          <Link
            href={`/campaigns/${id}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:text-white/70"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 6px rgba(52,211,153,.9)" }} />
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">AI Preview</span>
            </div>
            <h1 className="text-[24px] font-black tracking-tight leading-none text-white/90">
              Preview & Launch
            </h1>
          </div>
        </div>

        <button
          onClick={handleLaunch}
          disabled={launching || loading}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
        >
          {launching
            ? <Loader2 className="size-4 animate-spin" />
            : <Rocket className="size-4" />}
          {launching ? "Launching…" : "Launch Campaign"}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="size-6 animate-spin text-white/25" />
          <p className="text-[12px] text-white/25 font-medium">Generating AI emails…</p>
        </div>
      ) : leads.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
          style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}
        >
          <p className="text-[12px] font-bold text-white/25">No emails to preview</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <LeadPreviewCard key={lead.leadId} lead={lead} onChange={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
