/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus, Megaphone, Layers, Users, Mail, MessageSquare, Calendar,
  Search, Sparkles, Power, Play, Pause, Trash2, ArrowUpRight,
  TrendingUp, CheckCircle2, Clock, Globe, ArrowRight, LayoutGrid,
  List, Shield, Filter, ExternalLink, RefreshCw, Loader2, Bot,
  MousePointer2, Zap, AlertCircle
} from "lucide-react"
import { formatDate, formatRelative, pct } from "@/lib/utils"
import { toast } from "sonner"

export type CampaignRecord = {
  id: string
  name: string
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"
  autonomous: boolean
  playbookType?: string | null
  clientGoal?: string | null
  workflowStage?: string | null
  totalLeads: number
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  replies: number
  meetings: number
  revenueAttributed?: number | null
  launchedAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
  sequence?: {
    id: string
    name: string
    steps?: { id: string; stepNumber: number; stepType?: string }[]
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  DRAFT: { label: "Draft", dot: "bg-white/30", text: "text-white/50", bg: "bg-white/[0.04]", border: "border-white/[0.08]" },
  ACTIVE: { label: "Active", dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  PAUSED: { label: "Paused", dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  COMPLETED: { label: "Completed", dot: "bg-sky-400", text: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/25" },
}

const PLAYBOOK_LABELS: Record<string, string> = {
  agency_growth: "Agency Growth",
  local_seo: "Local SEO & Maps",
  social_media: "Social Content",
  lead_generation: "Lead Generation",
  b2b_saas: "B2B SaaS",
  consulting: "High-Ticket Consulting",
}

export function CampaignsDashboard({ initialCampaigns }: { initialCampaigns: CampaignRecord[] }) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(initialCampaigns)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [busyActionId, setBusyActionId] = useState<string | null>(null)

  // ── Actions ──────────────────────────────────────────────────────────────

  async function toggleStatus(campaign: CampaignRecord, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const nextStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE"
    setBusyActionId(campaign.id)

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error()

      // If resuming or launching, trigger immediate queue dispatch
      if (nextStatus === "ACTIVE") {
        fetch("/api/process-queue", { method: "POST" }).catch(() => {})
      }

      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: nextStatus } : c))
      toast.success(nextStatus === "ACTIVE" ? `"${campaign.name}" active & dispatching` : `"${campaign.name}" paused`)
    } catch {
      toast.error("Failed to update campaign status")
    } finally {
      setBusyActionId(null)
    }
  }

  async function deleteCampaign(campaign: CampaignRecord, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete campaign "${campaign.name}"? This action cannot be undone.`)) return

    setBusyActionId(campaign.id)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setCampaigns(prev => prev.filter(c => c.id !== campaign.id))
      toast.success(`Deleted "${campaign.name}"`)
    } catch {
      toast.error("Failed to delete campaign")
    } finally {
      setBusyActionId(null)
    }
  }

  // ── Metrics Calculation ──────────────────────────────────────────────────

  const activeCount = useMemo(() => campaigns.filter(c => c.status === "ACTIVE").length, [campaigns])
  const autonomousCount = useMemo(() => campaigns.filter(c => c.autonomous).length, [campaigns])
  const totalLeads = useMemo(() => campaigns.reduce((s, c) => s + (c.totalLeads || 0), 0), [campaigns])
  const totalSent = useMemo(() => campaigns.reduce((s, c) => s + (c.emailsSent || 0), 0), [campaigns])
  const totalOpened = useMemo(() => campaigns.reduce((s, c) => s + (c.emailsOpened || 0), 0), [campaigns])
  const totalReplies = useMemo(() => campaigns.reduce((s, c) => s + (c.replies || 0), 0), [campaigns])
  const totalMeetings = useMemo(() => campaigns.reduce((s, c) => s + (c.meetings || 0), 0), [campaigns])
  const estPipeline = totalMeetings * 1800

  // ── Filter & Search ──────────────────────────────────────────────────────

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.sequence?.name || "").toLowerCase().includes(q) ||
        (c.playbookType || "").toLowerCase().includes(q) ||
        (c.clientGoal || "").toLowerCase().includes(q)

      if (!matchSearch) return false

      if (statusFilter === "AUTONOMOUS") return c.autonomous
      if (statusFilter === "ACTIVE") return c.status === "ACTIVE"
      if (statusFilter === "DRAFT") return c.status === "DRAFT"
      if (statusFilter === "PAUSED") return c.status === "PAUSED"
      if (statusFilter === "COMPLETED") return c.status === "COMPLETED"

      return true
    })
  }, [campaigns, search, statusFilter])

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto text-white">

      {/* ── Top Hero Banner ── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border border-white/[0.08]"
        style={{
          background: "linear-gradient(135deg, rgba(24, 26, 38, 0.75) 0%, rgba(12, 13, 20, 0.9) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Glow vector backs */}
        <div className="absolute -left-20 -top-20 size-56 rounded-full bg-indigo-500/15 blur-[90px] pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 size-56 rounded-full bg-purple-500/15 blur-[90px] pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px rgba(34,211,238,0.9)" }} />
            <span className="text-[10.5px] font-bold uppercase tracking-[.2em] text-white/40">
              Outbound Growth Engine
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white/95 leading-tight">
            Campaigns &amp; Outbound Flows
          </h1>
          <p className="text-xs sm:text-[13px] text-white/45 font-medium flex items-center gap-2 flex-wrap">
            <span>{campaigns.length} total campaigns</span>
            <span className="text-white/20">·</span>
            <span className="text-indigo-300 font-bold">{autonomousCount} on autonomous pilot</span>
            <span className="text-white/20">·</span>
            <span className="text-emerald-400 font-bold">{activeCount} actively sending</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <Link
            href="/auto-prospecting"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Bot className="size-4 text-indigo-400" />
            Auto-Prospecting Radar
          </Link>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 rounded-xl px-4.5 py-2.5 text-xs font-bold text-white transition-all shadow-md hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)",
            }}
          >
            <Plus className="size-4" />
            Create Campaign
          </Link>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Active", sub: "campaigns", value: activeCount, icon: Layers, color: "text-emerald-400", accent: "#34d399" },
          { label: "Enrolled", sub: "prospects", value: totalLeads.toLocaleString(), icon: Users, color: "text-indigo-400", accent: "#818cf8" },
          { label: "Dispatched", sub: "emails", value: totalSent.toLocaleString(), icon: Mail, color: "text-sky-400", accent: "#38bdf8" },
          { label: "Open Rate", sub: "engagement", value: pct(totalOpened, totalSent), icon: MousePointer2, color: "text-amber-300", accent: "#fbbf24" },
          { label: "Reply Rate", sub: "conversion", value: pct(totalReplies, totalLeads), icon: MessageSquare, color: "text-fuchsia-400", accent: "#c084fc" },
          { label: "Pipeline Value", sub: "booked value", value: `$${estPipeline.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-300", accent: "#10b981" },
        ].map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-2xl p-4 border border-white/[0.07] transition-all hover:border-white/[0.14] group"
            style={{
              background: "linear-gradient(145deg, rgba(20,22,34,0.6) 0%, rgba(12,13,20,0.85) 100%)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center justify-between text-white/35 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">{k.label}</span>
              <k.icon className="size-3.5" style={{ color: k.accent }} />
            </div>
            <p className={`text-xl font-black ${k.color} tracking-tight leading-none`}>{k.value}</p>
            <p className="text-[10px] text-white/35 font-medium mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar: Search, Filters & View Toggle ── */}
      <div
        className="p-3.5 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3"
        style={{
          background: "linear-gradient(145deg, rgba(20,22,34,0.65) 0%, rgba(12,13,20,0.85) 100%)",
          backdropFilter: "blur(14px)",
        }}
      >
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Search campaigns by name, sequence, or playbook…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs text-white placeholder:text-white/30 bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50 outline-none transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-[10px] font-bold">
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All", count: campaigns.length },
            { id: "AUTONOMOUS", label: "✨ Autonomous", count: autonomousCount },
            { id: "ACTIVE", label: "Active", count: activeCount },
            { id: "DRAFT", label: "Drafts", count: campaigns.filter(c => c.status === "DRAFT").length },
            { id: "PAUSED", label: "Paused", count: campaigns.filter(c => c.status === "PAUSED").length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 shadow-sm"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.03]"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === tab.id ? "bg-indigo-500/30 text-white" : "bg-white/[0.06] text-white/40"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/[0.06] shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "grid" ? "bg-white/[0.1] text-white" : "text-white/30 hover:text-white"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "table" ? "bg-white/[0.1] text-white" : "text-white/30 hover:text-white"
            }`}
            title="Table View"
          >
            <List className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main Content: Grid vs Table vs Empty State ── */}
      {filteredCampaigns.length === 0 ? (
        <div
          className="rounded-3xl border border-white/[0.07] p-12 text-center space-y-4"
          style={{ background: "rgba(20,22,34,0.4)" }}
        >
          <div className="size-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Megaphone className="size-7 opacity-70" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">
              {search || statusFilter !== "ALL" ? "No matching campaigns" : "No campaigns created yet"}
            </h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto mt-1 leading-relaxed">
              {search || statusFilter !== "ALL"
                ? "Try clearing your search query or switching to the 'All' tab to see other campaigns."
                : "Create an autonomous campaign or design a custom sequence to start converting B2B prospects."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            {search || statusFilter !== "ALL" ? (
              <button
                onClick={() => { setSearch(""); setStatusFilter("ALL") }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <>
                <Link
                  href="/auto-prospecting"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-md hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" }}
                >
                  <Bot className="size-3.5" />
                  Launch Autonomous Radar
                </Link>
                <Link
                  href="/campaigns/new"
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1] transition-all"
                >
                  <Plus className="size-3.5" />
                  Manual Sequence
                </Link>
              </>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((c) => {
            const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT
            const openRate = pct(c.emailsOpened, c.emailsSent)
            const replyRate = pct(c.replies, c.totalLeads)
            const sentPct = c.totalLeads > 0 ? Math.min(100, Math.round((c.emailsSent / c.totalLeads) * 100)) : 0
            const stepCount = c.sequence?.steps?.length || 1

            return (
              <div
                key={c.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-0.5 shadow-lg"
                style={{
                  background: "linear-gradient(145deg, rgba(24,26,38,0.7) 0%, rgba(14,15,22,0.9) 100%)",
                  backdropFilter: "blur(14px)",
                }}
              >
                {/* Glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{ background: "radial-gradient(circle at top left, rgba(99,102,241,0.1) 0%, transparent 70%)" }} />

                <div className="p-5 space-y-4">
                  {/* Top Bar: Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.autonomous ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          <Sparkles className="size-2.5 text-indigo-400" />
                          Autonomous
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.04] text-white/45 border border-white/[0.07]">
                          <Zap className="size-2.5 text-amber-400" />
                          Manual
                        </span>
                      )}
                      {c.playbookType && (
                        <span className="text-[10px] font-bold text-white/40 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.05]">
                          {PLAYBOOK_LABELS[c.playbookType] || c.playbookType}
                        </span>
                      )}
                    </div>

                    <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black ${st.bg} ${st.text} ${st.border} border`}>
                      <span className={`size-1.5 rounded-full ${st.dot} ${c.status === "ACTIVE" ? "animate-pulse" : ""}`} />
                      {st.label}
                    </div>
                  </div>

                  {/* Campaign Title & Sequence Info */}
                  <div>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-base font-bold text-white/90 hover:text-indigo-300 transition-colors truncate block leading-snug"
                    >
                      {c.name}
                    </Link>
                    <p className="text-[11px] text-white/40 mt-1 flex items-center gap-1.5">
                      <span>{c.sequence?.name || "Default Sequence"} ({stepCount} step{stepCount !== 1 ? "s" : ""})</span>
                      <span>·</span>
                      <span>{c.totalLeads} leads</span>
                    </p>
                  </div>

                  {/* Progress Bar */}
                  {c.totalLeads > 0 && (
                    <div className="space-y-1 bg-black/20 p-2 rounded-xl border border-white/[0.03]">
                      <div className="flex justify-between text-[10px] text-white/40 font-semibold">
                        <span>Dispatch Progress</span>
                        <span>{c.emailsSent} / {c.totalLeads} ({sentPct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${sentPct}%`,
                            background: c.status === "ACTIVE"
                              ? "linear-gradient(90deg, #6366f1, #10b981)"
                              : "linear-gradient(90deg, #64748b, #94a3b8)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 4-Metric Grid */}
                  <div className="grid grid-cols-4 gap-1.5 rounded-xl p-2.5 bg-black/30 border border-white/[0.04] text-center">
                    <div>
                      <p className="text-xs font-black text-white/90">{c.emailsSent}</p>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Sent</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-300">{openRate}</p>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Opens</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-fuchsia-300">{replyRate}</p>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Replies</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-400">{c.meetings}</p>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Booked</p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3 border-t border-white/[0.05] bg-black/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {c.status !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={(e) => toggleStatus(c, e)}
                        disabled={busyActionId === c.id}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer flex items-center gap-1 ${
                          c.status === "ACTIVE"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        {busyActionId === c.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : c.status === "ACTIVE" ? (
                          <Pause className="size-3" />
                        ) : (
                          <Play className="size-3" />
                        )}
                        <span>{c.status === "ACTIVE" ? "Pause" : "Resume"}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => deleteCampaign(c, e)}
                      disabled={busyActionId === c.id}
                      className="p-1 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete Campaign"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <Link
                    href={`/campaigns/${c.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-white transition-colors"
                  >
                    <span>Manage</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div
          className="overflow-hidden rounded-2xl border border-white/[0.08]"
          style={{
            background: "linear-gradient(145deg, rgba(20,22,34,0.65) 0%, rgba(12,13,20,0.85) 100%)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10.5px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Sequence</th>
                  <th className="py-3 px-4">Leads</th>
                  <th className="py-3 px-4">Sent</th>
                  <th className="py-3 px-4">Opens</th>
                  <th className="py-3 px-4">Replies</th>
                  <th className="py-3 px-4">Booked</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredCampaigns.map((c) => {
                  const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-4 font-bold">
                        <Link href={`/campaigns/${c.id}`} className="text-white/90 hover:text-indigo-300 transition-colors block truncate max-w-[200px]">
                          {c.name}
                        </Link>
                        <span className="text-[10px] text-white/30 font-normal">
                          Created {formatRelative(new Date(c.createdAt))}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {c.autonomous ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <Sparkles className="size-2.5" /> AI Autopilot
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/[0.04] text-white/40 border border-white/[0.06]">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white/70">
                        <span className="truncate max-w-[140px] block">{c.sequence?.name || "Default"}</span>
                        <span className="text-[10px] text-white/35">{c.sequence?.steps?.length || 1} steps</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white/90">{c.totalLeads}</td>
                      <td className="py-3 px-4 text-white/70">{c.emailsSent}</td>
                      <td className="py-3 px-4 text-amber-300 font-bold">{pct(c.emailsOpened, c.emailsSent)}</td>
                      <td className="py-3 px-4 text-fuchsia-300 font-bold">{pct(c.replies, c.totalLeads)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{c.meetings}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${st.bg} ${st.text} ${st.border} border`}>
                          <span className={`size-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status !== "COMPLETED" && (
                            <button
                              type="button"
                              onClick={(e) => toggleStatus(c, e)}
                              disabled={busyActionId === c.id}
                              className="p-1 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
                              title={c.status === "ACTIVE" ? "Pause" : "Resume"}
                            >
                              {c.status === "ACTIVE" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => deleteCampaign(c, e)}
                            disabled={busyActionId === c.id}
                            className="p-1 rounded-lg text-white/20 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          <Link
                            href={`/campaigns/${c.id}`}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all"
                          >
                            Open →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
