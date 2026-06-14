/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePlaybook } from "@/lib/playbook-context"
import { FileText, Plus, Loader2, Sparkles, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { CustomSelect } from "@/components/ui/custom-select"

type Lead = { id: string; firstName: string | null; lastName: string | null; company: string | null; email: string }
type Proposal = {
  id: string
  title: string
  status: string
  totalValue: number | null
  currency: string
  createdAt: string
  lead: { id: string; firstName: string | null; lastName: string | null; company: string | null; email: string }
}

const STATUS_STYLE: Record<string, { text: string; bg: string }> = {
  DRAFT:  { text: "text-white/40", bg: "rgba(255,255,255,.06)" },
  SENT:   { text: "text-sky-300", bg: "rgba(125,211,252,.1)" },
  VIEWED: { text: "text-amber-300", bg: "rgba(251,191,36,.1)" },
  SIGNED: { text: "text-emerald-400", bg: "rgba(52,211,153,.12)" },
  EXPIRED: { text: "text-red-400", bg: "rgba(239,68,68,.1)" },
}

function leadName(l: { firstName: string | null; lastName: string | null; company: string | null; email: string }) {
  return l.company || [l.firstName, l.lastName].filter(Boolean).join(" ") || l.email
}

export default function ProposalsPage() {
  const { activePlaybook } = usePlaybook()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedLead, setSelectedLead] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [generating, setGenerating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [p, l] = await Promise.all([
        fetch("/api/proposals").then(r => r.json()),
        fetch("/api/leads").then(r => r.json()),
      ])
      setProposals(Array.isArray(p) ? p : [])
      setLeads(Array.isArray(l) ? l : Array.isArray(l?.leads) ? l.leads : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleGenerate() {
    if (!selectedLead) { toast.error("Choose a lead first"); return }
    setGenerating(true)
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLead, templateId: selectedTemplate || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      toast.success("Proposal generated")
      setShowCreate(false)
      setSelectedLead("")
      setSelectedTemplate("")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Proposals</h1>
          <p className="text-sm text-white/40">AI-generated proposals built from your playbook templates and lead research.</p>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 border border-white/[0.08] transition-all"
        >
          <Plus className="size-4" />
          <span>New Proposal</span>
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4" style={{ backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
            <Sparkles className="size-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Generate from {activePlaybook?.name} templates</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CustomSelect
              value={selectedLead}
              onChange={setSelectedLead}
              placeholder="Choose a lead…"
              options={leads.map(l => ({ value: l.id, label: leadName(l) }))}
            />
            <CustomSelect
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              placeholder={activePlaybook?.proposalTemplates?.[0]?.name || "Default template"}
              options={(activePlaybook?.proposalTemplates || []).map(t => ({ value: t.id, label: `${t.name} — ${t.currency === "GBP" ? "£" : t.currency}${t.price}/${t.period === "monthly" ? "mo" : "one-off"}` }))}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedLead}
            className="flex items-center gap-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-xs font-semibold px-4 py-2 border border-violet-500/30 transition-all disabled:opacity-40"
          >
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? "Generating…" : "Generate Proposal"}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden" style={{ backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2 border-b border-white/[0.04] px-6 py-4">
          <FileText className="size-4 text-pink-400" />
          <h2 className="text-sm font-semibold text-white">All Proposals</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/30">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-3">
            <FileText className="size-8 text-white/15" />
            <p className="text-[13px] font-bold text-white/30">No proposals yet</p>
            <p className="text-[11px] text-white/20 max-w-sm">Generate one from a lead using your active playbook&apos;s templates and pricing.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {proposals.map(p => {
              const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.DRAFT
              return (
                <Link
                  key={p.id}
                  href={`/proposals/${p.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{p.title}</p>
                    <p className="text-[11px] text-white/35 truncate">{leadName(p.lead)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {p.totalValue != null && (
                      <span className="text-xs font-bold text-white/60">
                        {p.currency === "GBP" ? "£" : p.currency}{p.totalValue.toLocaleString()}
                      </span>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${style.text}`} style={{ background: style.bg }}>
                      {p.status}
                    </span>
                    <ChevronRight className="size-4 text-white/20" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
