"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Swords, Loader2, Sparkles, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { CustomSelect } from "@/components/ui/custom-select"

type Lead = { id: string; firstName: string | null; lastName: string | null; company: string | null; email: string; industry: string | null; competitorAnalysis: string | null }

function leadName(l: { firstName: string | null; lastName: string | null; company: string | null; email: string }) {
  return l.company || [l.firstName, l.lastName].filter(Boolean).join(" ") || l.email
}

export default function CompetitorIntelPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState("")
  const [competitorName, setCompetitorName] = useState("")
  const [competitorWebsite, setCompetitorWebsite] = useState("")
  const [competitorNotes, setCompetitorNotes] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(data => setLeads(Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const lead = leads.find(l => l.id === selectedLead)

  async function handleAnalyze() {
    if (!selectedLead || !competitorName.trim()) {
      toast.error("Choose a lead and enter a competitor name")
      return
    }
    setAnalyzing(true)
    setResult(null)
    try {
      const res = await fetch("/api/leads/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead,
          competitorName: competitorName.trim(),
          competitorWebsite: competitorWebsite.trim() || undefined,
          competitorNotes: competitorNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Analysis failed")
      setResult(data.text)
      setLeads(prev => prev.map(l => l.id === selectedLead ? { ...l, competitorAnalysis: data.text } : l))
      toast.success("Competitor analysis generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  const leadsWithAnalysis = leads.filter(l => l.competitorAnalysis)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Competitor Intel</h1>
        <p className="text-sm text-white/40">Generate AI competitive analysis for a lead and surface talking points to win the deal.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4" style={{ backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
          <Swords className="size-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-white">Run an analysis</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-white/30"><Loader2 className="size-5 animate-spin" /></div>
        ) : (
          <>
            <CustomSelect
              value={selectedLead}
              onChange={setSelectedLead}
              placeholder="Choose a lead…"
              options={leads.map(l => ({ value: l.id, label: `${leadName(l)}${l.industry ? ` · ${l.industry}` : ""}` }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Competitor name"
                value={competitorName}
                onChange={e => setCompetitorName(e.target.value)}
                className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none"
              />
              <input
                placeholder="Competitor website (optional)"
                value={competitorWebsite}
                onChange={e => setCompetitorWebsite(e.target.value)}
                className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none"
              />
            </div>
            <textarea
              placeholder="Notes about this competitor (optional)"
              value={competitorNotes}
              onChange={e => setCompetitorNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none resize-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold px-4 py-2 border border-rose-500/25 transition-all disabled:opacity-40"
            >
              {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {analyzing ? "Analysing…" : "Generate Analysis"}
            </button>
          </>
        )}

        {result && (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mt-2">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-wide mb-2">Analysis for {lead ? leadName(lead) : ""}</p>
            <pre className="text-[12px] text-white/70 leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
          </div>
        )}
      </div>

      {leadsWithAnalysis.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden" style={{ backdropFilter: "blur(12px)" }}>
          <div className="border-b border-white/[0.04] px-6 py-4">
            <h2 className="text-sm font-semibold text-white">Leads with intel on file</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {leadsWithAnalysis.map(l => (
              <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{leadName(l)}</p>
                  <p className="text-[11px] text-white/35 truncate">{l.competitorAnalysis?.split("\n")[0]}</p>
                </div>
                <ExternalLink className="size-3.5 text-white/20 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
