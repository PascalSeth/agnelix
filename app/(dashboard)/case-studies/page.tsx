/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import { Briefcase, Plus, Loader2, Trash2, Quote, X, Sparkles, Star } from "lucide-react"
import { toast } from "sonner"

interface CaseStudy {
  id: string
  clientName: string
  industry: string
  nicheTags: string[]
  challenge: string
  solution: string
  results: string
  testimonialQuote: string | null
  aiSummary: string | null
  usageCount: number
}

const EMPTY_FORM = { clientName: "", industry: "", nicheTags: "", challenge: "", solution: "", results: "", testimonialQuote: "" }

export default function CaseStudiesPage() {
  const { activePlaybook } = usePlaybook()
  const [items, setItems] = useState<CaseStudy[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/case-studies")
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const verticals = activePlaybook?.targetVerticals || []

  async function handleCreate() {
    if (!form.clientName || !form.industry || !form.challenge || !form.solution || !form.results) {
      toast.error("Fill in client, industry, challenge, solution and results")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/case-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nicheTags: form.nicheTags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success("Case study added")
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this case study?")) return
    try {
      const res = await fetch(`/api/case-studies/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  function isMatch(cs: CaseStudy) {
    if (!verticals.length) return false
    const hay = `${cs.industry} ${cs.nicheTags.join(" ")}`.toLowerCase()
    return verticals.some(v => hay.includes(v.toLowerCase()) || v.toLowerCase().includes(cs.industry.toLowerCase()))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Case Studies</h1>
          <p className="text-sm text-white/40">
            Manage your success stories. Highlighted cards match your active playbook verticals
            {verticals.length > 0 && <> ({verticals.slice(0, 3).join(", ")})</>}.
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 border border-white/[0.08] transition-all"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          <span>{showForm ? "Cancel" : "Add Success Story"}</span>
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4" style={{ backdropFilter: "blur(12px)" }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Client name" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none" />
            <input placeholder="Industry" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none" />
          </div>
          <input placeholder="Niche tags (comma separated)" value={form.nicheTags} onChange={e => setForm(f => ({ ...f, nicheTags: e.target.value }))}
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none" />
          <textarea placeholder="Challenge" value={form.challenge} onChange={e => setForm(f => ({ ...f, challenge: e.target.value }))} rows={2}
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none resize-none" />
          <textarea placeholder="Solution" value={form.solution} onChange={e => setForm(f => ({ ...f, solution: e.target.value }))} rows={2}
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none resize-none" />
          <textarea placeholder="Results (e.g. +40% leads, £5k MRR added)" value={form.results} onChange={e => setForm(f => ({ ...f, results: e.target.value }))} rows={2}
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none resize-none" />
          <textarea placeholder="Testimonial quote (optional)" value={form.testimonialQuote} onChange={e => setForm(f => ({ ...f, testimonialQuote: e.target.value }))} rows={2}
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[13px] text-white outline-none resize-none" />
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold px-4 py-2 border border-emerald-500/25 transition-all disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {saving ? "Saving & summarising…" : "Save Case Study"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/30">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-2xl p-16 text-center space-y-4 bg-white/[0.01]"
             style={{ backdropFilter: "blur(12px)" }}>
          <div className="size-12 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]">
            <Briefcase className="size-6 text-white/30" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-sm font-semibold text-white">No case studies cataloged yet</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Record client results for your playbook verticals ({verticals.slice(0, 3).join(", ") || "niche industries"}) to provide instant social proof in your outbound pitches.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(cs => (
            <div
              key={cs.id}
              className="rounded-2xl p-5 space-y-3"
              style={{
                background: isMatch(cs) ? "linear-gradient(145deg,rgba(52,211,153,.06),rgba(255,255,255,.02))" : "rgba(255,255,255,.02)",
                border: isMatch(cs) ? "1px solid rgba(52,211,153,.2)" : "1px solid rgba(255,255,255,.06)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">{cs.clientName}</p>
                  <p className="text-[11px] text-white/40">{cs.industry}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isMatch(cs) && (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      <Star className="size-2.5 fill-current" /> Match
                    </span>
                  )}
                  <button onClick={() => handleDelete(cs.id)} className="text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {cs.nicheTags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {cs.nicheTags.map(t => (
                    <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-white/40">{t}</span>
                  ))}
                </div>
              )}

              {cs.aiSummary && (
                <p className="text-[12px] text-white/60 leading-relaxed">{cs.aiSummary}</p>
              )}

              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 space-y-1.5">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-wide">Results</p>
                <p className="text-[12px] text-emerald-400/80 font-semibold leading-relaxed">{cs.results}</p>
              </div>

              {cs.testimonialQuote && (
                <div className="flex gap-2 pt-1">
                  <Quote className="size-3.5 text-white/15 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/40 italic leading-relaxed">{cs.testimonialQuote}</p>
                </div>
              )}

              {cs.usageCount > 0 && (
                <p className="text-[10px] text-white/20">Used in {cs.usageCount} pitch{cs.usageCount !== 1 ? "es" : ""}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
