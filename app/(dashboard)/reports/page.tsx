"use client"

import { useState, useEffect } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import { CustomSelect } from "@/components/ui/custom-select"
import { BarChart3, Plus, Send, Loader2, Trash2 } from "lucide-react"

interface Campaign {
  id: string
  name: string
  status: string
}

interface Report {
  id: string
  periodStart: string
  periodEnd: string
  metricsJson: Record<string, number | string>
  aiNarrative: string | null
  status: "DRAFT" | "SCHEDULED" | "SENT" | "VIEWED"
  sentAt: string | null
  createdAt: string
  campaign: Campaign
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-white/[0.04] text-white/40",
  SCHEDULED: "bg-amber-500/10 text-amber-400",
  SENT: "bg-blue-500/10 text-blue-400",
  VIEWED: "bg-emerald-500/10 text-emerald-400",
}

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const { activePlaybook } = usePlaybook()
  const [reports, setReports] = useState<Report[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [campaignId, setCampaignId] = useState("")
  const [periodStart, setPeriodStart] = useState(startOfMonth())
  const [periodEnd, setPeriodEnd] = useState(today())
  const [generating, setGenerating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/campaigns").then(r => r.json()),
    ]).then(([r, c]) => {
      setReports(Array.isArray(r) ? r : [])
      setCampaigns(Array.isArray(c) ? c : [])
    }).finally(() => setLoading(false))
  }, [])

  async function generateReport() {
    if (!campaignId) return
    setGenerating(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, periodStart, periodEnd }),
      })
      if (res.ok) {
        const report = await res.json()
        setReports(prev => [report, ...prev])
        setShowForm(false)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function markSent(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      })
      if (res.ok) {
        const updated = await res.json()
        setReports(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
      }
    } finally {
      setBusyId(null)
    }
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report?")) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" })
      if (res.ok) setReports(prev => prev.filter(r => r.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Client Reports</h1>
          <p className="text-sm text-white/40">Compile performance metrics and AI-written summaries for your clients.</p>
        </div>
        {campaigns.length > 0 && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 border border-white/[0.08] transition-all"
          >
            <Plus className="size-4" />
            <span>Generate Report</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4" style={{ backdropFilter: "blur(12px)" }}>
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Generate Report</p>
          <CustomSelect
            value={campaignId}
            onChange={setCampaignId}
            options={campaigns.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Select a campaign…"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Period start</label>
              <input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[12px] text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Period end</label>
              <input
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[12px] text-white outline-none"
              />
            </div>
          </div>
          <button
            onClick={generateReport}
            disabled={!campaignId || generating}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black text-xs font-bold px-4 py-2 disabled:opacity-40 transition-all"
          >
            {generating ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {generating ? "Generating…" : "Generate Report"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-white/30">Loading…</p>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-2xl p-16 text-center space-y-4 bg-white/[0.01]"
             style={{ backdropFilter: "blur(12px)" }}>
          <div className="size-12 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]">
            <BarChart3 className="size-6 text-white/30" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-sm font-semibold text-white">No reports generated yet</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Select an active client campaign to automatically compile playbook metrics and narrative audits.
            </p>
          </div>

          {activePlaybook && (
            <div className="pt-4 text-xs text-white/40 max-w-md">
              <p className="text-[10px] uppercase font-black tracking-wider text-white/20 mb-2">Metrics Tracked for {activePlaybook.name}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {activePlaybook.reportMetrics.map((m) => (
                  <span key={m} className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/[0.06] capitalize">
                    {m.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3" style={{ backdropFilter: "blur(12px)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{report.campaign.name}</p>
                  <p className="text-[11px] text-white/40">
                    {new Date(report.periodStart).toLocaleDateString()} – {new Date(report.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${STATUS_STYLE[report.status]}`}>
                  {report.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(report.metricsJson).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2">
                    <p className="text-sm font-black text-white">{v}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide capitalize">{k.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>

              {report.aiNarrative && (
                <p className="text-[12px] text-white/50 leading-relaxed whitespace-pre-line">{report.aiNarrative}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                {report.status === "DRAFT" && (
                  <button
                    onClick={() => markSent(report.id)}
                    disabled={busyId === report.id}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-500/90 hover:bg-blue-500 text-black text-[11px] font-bold px-3 py-1.5 disabled:opacity-40 transition-all"
                  >
                    <Send className="size-3.5" /> Mark as Sent
                  </button>
                )}
                <button
                  onClick={() => deleteReport(report.id)}
                  disabled={busyId === report.id}
                  className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 border border-white/[0.06] text-[11px] font-semibold text-white/60 hover:text-rose-300 px-3 py-1.5 disabled:opacity-40 transition-all"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
