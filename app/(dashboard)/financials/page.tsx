"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Wallet, Plus, Trash2, X, Loader2, TrendingUp, TrendingDown, Timer } from "lucide-react"
import { toast } from "sonner"

type FinancialRecord = {
  id: string
  leadId: string
  period: string
  revenue: number
  costs: number
  grossMargin: number
  burnRate: number | null
  runway: number | null
  currency: string
  notes: string | null
  lead: { id: string; company: string | null; email: string; status: string }
}

type WonLead = { id: string; company: string | null; email: string }

const fieldStyle = { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }
import { formatCurrency, CURRENCY_OPTIONS } from "@/lib/currency"

const cardStyle = {
  background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
  border: "1px solid rgba(255,255,255,.07)",
}

export default function FinancialsPage() {
  const { status: authStatus } = useSession()
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [leads, setLeads] = useState<WonLead[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    leadId: "",
    period: new Date().toISOString().slice(0, 7),
    revenue: "",
    costs: "",
    burnRate: "",
    runway: "",
    currency: "USD",
    notes: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [finRes, leadsRes] = await Promise.all([
        fetch("/api/financials"),
        fetch("/api/leads?status=WON").catch(() => null),
      ])
      const fin = await finRes.json()
      setRecords(Array.isArray(fin) ? fin : [])
      if (leadsRes?.ok) {
        const data = await leadsRes.json()
        const list = Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : []
        setLeads(list.filter((l: { status?: string }) => !l.status || l.status === "WON"))
      }
    } catch {
      toast.error("Failed to load financials")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus !== "authenticated") return
    load()
  }, [authStatus, load])

  // Latest period per client for headline metrics
  const summary = useMemo(() => {
    const latestByLead = new Map<string, FinancialRecord>()
    for (const r of records) {
      const existing = latestByLead.get(r.leadId)
      if (!existing || new Date(r.period) > new Date(existing.period)) latestByLead.set(r.leadId, r)
    }
    const latest = [...latestByLead.values()]
    const totalRevenue = latest.reduce((s, r) => s + r.revenue, 0)
    const totalCosts = latest.reduce((s, r) => s + r.costs, 0)
    const avgMargin = latest.length ? latest.reduce((s, r) => s + r.grossMargin, 0) / latest.length : 0
    const runways = latest.filter(r => r.runway != null).map(r => r.runway!)
    const minRunway = runways.length ? Math.min(...runways) : null
    return { totalRevenue, totalCosts, avgMargin, minRunway, clients: latest.length }
  }, [records])

  async function save() {
    if (!form.leadId) { toast.error("Select a client"); return }
    if (!form.revenue || !form.costs) { toast.error("Enter revenue and costs"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: form.leadId,
          period: `${form.period}-01`,
          revenue: Number(form.revenue),
          costs: Number(form.costs),
          burnRate: form.burnRate ? Number(form.burnRate) : null,
          runway: form.runway ? Number(form.runway) : null,
          currency: form.currency,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Financials saved")
      setShowForm(false)
      setForm(f => ({ ...f, revenue: "", costs: "", burnRate: "", runway: "", notes: "" }))
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setRecords(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/financials/${id}`, { method: "DELETE" }).catch(() => {})
  }

  const tiles = [
    { label: "Portfolio Revenue / mo", value: formatCurrency(summary.totalRevenue, "USD"), icon: TrendingUp, color: "text-emerald-400" },
    { label: "Portfolio Costs / mo", value: formatCurrency(summary.totalCosts, "USD"), icon: TrendingDown, color: "text-red-400" },
    { label: "Avg Gross Margin", value: `${summary.avgMargin.toFixed(1)}%`, icon: Wallet, color: "text-indigo-300" },
    { label: "Shortest Runway", value: summary.minRunway != null ? `${summary.minRunway} mo` : "—", icon: Timer, color: "text-amber-300" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="size-4 text-white/30" />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Fractional CFO</span>
          </div>
          <h1 className="text-[24px] font-black tracking-tight leading-none text-white/90">Client Financials</h1>
          <p className="text-[12px] text-white/30 mt-2">Track revenue, margin, burn and runway per won client — these feed the CFO playbook report metrics.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-black transition-all hover:brightness-110 shrink-0"
          style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)" }}
        >
          <Plus className="size-3.5" /> Add Period
        </button>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(tile => (
          <div key={tile.label} className="rounded-2xl p-4 space-y-2" style={cardStyle}>
            <div className="flex items-center gap-2">
              <tile.icon className={`size-3.5 ${tile.color}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">{tile.label}</span>
            </div>
            <p className="text-[22px] font-black tracking-tight text-white/90">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/30"><Loader2 className="size-5 animate-spin" /></div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-[13px] font-bold text-white/40">No financial records yet</p>
            <p className="text-[11.5px] text-white/25">Add a monthly period for a won client to start tracking burn rate, runway and margin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Client", "Period", "Revenue", "Costs", "Gross Margin", "Burn Rate", "Runway", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/25 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-[12.5px] font-bold text-white/75 whitespace-nowrap">{r.lead.company || r.lead.email}</td>
                    <td className="px-4 py-3 text-[12px] text-white/45 whitespace-nowrap">
                      {new Date(r.period).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-bold text-emerald-300/80 whitespace-nowrap">{formatCurrency(r.revenue, r.currency)}</td>
                    <td className="px-4 py-3 text-[12px] text-white/50 whitespace-nowrap">{formatCurrency(r.costs, r.currency)}</td>
                    <td className="px-4 py-3 text-[12px] whitespace-nowrap">
                      <span className={r.grossMargin >= 50 ? "text-emerald-300/80" : r.grossMargin >= 20 ? "text-amber-300/80" : "text-red-400/80"}>
                        {r.grossMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-white/50 whitespace-nowrap">{r.burnRate != null ? formatCurrency(r.burnRate, r.currency) : "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-white/50 whitespace-nowrap">{r.runway != null ? `${r.runway} mo` : "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(r.id)} className="text-white/20 hover:text-red-400/80 transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 bg-[#16171f]" style={{ border: "1px solid rgba(255,255,255,.09)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-black text-white/90">Add Financial Period</h2>
              <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white/70"><X className="size-4" /></button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Client (won leads)</label>
              <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none bg-black/40 border border-white/10">
                <option value="" className="bg-[#1a1b24]">Select a client…</option>
                {leads.map(l => <option key={l.id} value={l.id} className="bg-[#1a1b24]">{l.company || l.email}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Period (month)</label>
                <input type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none" style={fieldStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none bg-black/40 border border-white/10">
                  {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code} className="bg-[#1a1b24]">{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Revenue</label>
                <input type="number" placeholder="12000" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none placeholder:text-white/20" style={fieldStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Costs</label>
                <input type="number" placeholder="8000" value={form.costs} onChange={e => setForm(f => ({ ...f, costs: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none placeholder:text-white/20" style={fieldStyle} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Burn Rate (optional)</label>
                <input type="number" placeholder="4000" value={form.burnRate} onChange={e => setForm(f => ({ ...f, burnRate: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none placeholder:text-white/20" style={fieldStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Runway, months (optional)</label>
                <input type="number" placeholder="9" value={form.runway} onChange={e => setForm(f => ({ ...f, runway: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none placeholder:text-white/20" style={fieldStyle} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Anything notable this month…"
                className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none resize-none placeholder:text-white/20" style={fieldStyle} />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)" }}
            >
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save Period"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
