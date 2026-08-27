/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  TrendingUp,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Zap,
  Target,
  DollarSign,
  Mail,
  MessageSquare,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Layers,
  Flame,
  ShieldCheck,
  X,
  PieChart as PieIcon,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts"
import { toast } from "sonner"

interface InsightsData {
  summary: {
    totalLeads: number
    emailsSent: number
    emailsOpened: number
    emailsReplied: number
    openRate: number
    replyRate: number
    clickRate: number
    bounceRate: number
    totalWonRevenue: number
    activePipelineValue: number
    wonDealsCount: number
    proposalsSentCount: number
    avgDealSize: number
    proposalCloseRate: number
    monthlyMeetingGoal: number
  }
  funnelChartData: Array<{ name: string; value: number; rate: string; color: string }>
  timeSeries: Array<{ date: string; sent: number; opens: number; replies: number }>
  objectionSlices: Array<{ name: string; value: number; color: string; pct: number }>
  cadenceChartData: Array<{ name: string; sent: number; fill: string }>
  topSubjects: Array<{ subject: string; sent: number; opened: number; openRate: number }>
  alerts: Array<{
    id: string
    type: "CROSS_SELL_OPPORTUNITY" | "RISK_ALERT" | "PERFORMANCE_ANOMALY" | "MILESTONE_REACHED"
    title: string
    body: string
    cta: string | null
    createdAt: string
  }>
  aiBriefing: {
    executiveBriefing: {
      growthWins: string
      leakagePoints: string
      strategicFocus: string
    }
    growthMoves: Array<{
      id: string
      title: string
      description: string
      expectedImpact: string
      category: string
      actionUrl: string
      actionLabel: string
      priority: "HIGH" | "MEDIUM"
    }>
    funnelDiagnosis: {
      bottleneckStage: string
      bottleneckDescription: string
      recommendation: string
    }
  }
  lastUpdated: string
}

export function InsightsHub() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchInsights(isForceRefresh = false) {
    if (isForceRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/insights/hub${isForceRefresh ? "?refresh=true" : ""}`)
      if (!res.ok) throw new Error("Failed to load insights")
      const result = await res.json()
      setData(result)
      if (isForceRefresh) toast.success("AI pipeline diagnosis refreshed")
    } catch {
      toast.error("Failed to load pipeline insights")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  async function dismissAlert(id: string) {
    if (!data) return
    setData({
      ...data,
      alerts: data.alerts.filter(a => a.id !== id),
    })
    await fetch(`/api/insights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-white/30 space-y-3">
        <Loader2 className="size-8 animate-spin text-violet-400" />
        <p className="text-[13px] text-white/50 font-medium">Generating Visual Pipeline Diagnostics...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center rounded-2xl border border-white/10 bg-white/[0.02]">
        <p className="text-[13px] text-white/60">Could not load insights telemetry.</p>
      </div>
    )
  }

  const s = data.summary

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-violet-300">
              Galien Revenue Intelligence
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
              Live Charts & Telemetry
            </span>
          </div>
          <h1 className="text-[26px] font-black tracking-tight text-white/95">Pipeline Analytics & Insights</h1>
          <p className="text-[12.5px] text-white/40 font-medium">
            Visual funnel conversion rates, engagement velocity charts, and AI growth directives.
          </p>
        </div>

        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[12px] font-bold text-white/80 transition-all active:scale-95 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-violet-400" : ""}`} />
          Refresh AI Briefing
        </button>
      </div>

      {/* Top 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Closed Won Revenue */}
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Revenue Won</span>
            <DollarSign className="size-3.5 text-emerald-400" />
          </div>
          <p className="text-[22px] font-black text-emerald-300">${s.totalWonRevenue.toLocaleString()}</p>
          <span className="text-[11px] text-emerald-400/70 font-medium block truncate">
            {s.wonDealsCount} closed deals • avg ${s.avgDealSize.toLocaleString()}
          </span>
        </div>

        {/* Active Pipeline Value */}
        <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Active Pipeline</span>
            <FileSpreadsheet className="size-3.5 text-violet-400" />
          </div>
          <p className="text-[22px] font-black text-white/90">${s.activePipelineValue.toLocaleString()}</p>
          <span className="text-[11px] text-white/40 font-medium block truncate">
            {s.proposalsSentCount} active proposal{s.proposalsSentCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Open Rate */}
        <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Avg Open Rate</span>
            <Mail className="size-3.5 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-[22px] font-black text-sky-300">{s.openRate}%</p>
            <span className="text-[10.5px] font-semibold text-emerald-400">
              {s.openRate >= 24 ? `+${(s.openRate - 24).toFixed(0)}% vs avg` : "vs 24% avg"}
            </span>
          </div>
          <span className="text-[11px] text-white/40 font-medium block truncate">
            {s.emailsOpened} of {s.emailsSent} opened
          </span>
        </div>

        {/* Reply Rate */}
        <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Avg Reply Rate</span>
            <MessageSquare className="size-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-[22px] font-black text-amber-300">{s.replyRate}%</p>
            <span className="text-[10.5px] font-semibold text-emerald-400">
              {s.replyRate >= 5 ? `+${(s.replyRate - 5).toFixed(0)}% vs avg` : "vs 5% avg"}
            </span>
          </div>
          <span className="text-[11px] text-white/40 font-medium block truncate">
            {s.emailsReplied} prospect replies
          </span>
        </div>
      </div>

      {/* 2-Column Core Layout: Left Visual Charts, Right AI Directives */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* LEFT COLUMN: VISUAL CHARTS & PIPELINE METRICS (7 Cols)        */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Chart 1: Visual Funnel Conversion BarChart */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14.5px] font-black text-white/90 flex items-center gap-2">
                  <BarChart3 className="size-4 text-sky-400" />
                  Full-Funnel Conversion & Leakage
                </h3>
                <p className="text-[11.5px] text-white/40 mt-0.5">
                  Conversion volume from targeted lead down to closed won deal
                </p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-bold">
                Drop-Off Velocity
              </span>
            </div>

            {/* Recharts Horizontal Funnel BarChart */}
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.funnelChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="rgba(255,255,255,0.4)"
                    fontSize={11.5}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="p-2.5 rounded-xl bg-black/90 border border-white/15 text-[12px] shadow-2xl backdrop-blur-md space-y-1">
                            <p className="font-extrabold text-white">{d.name}</p>
                            <p className="text-white/60">
                              Volume: <strong className="text-white">{d.value.toLocaleString()}</strong>
                            </p>
                            <p className="text-emerald-400 font-semibold">Stage Conversion: {d.rate}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {data.funnelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bottleneck Diagnostic Strip */}
            <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 flex items-start gap-2.5 text-[11.5px]">
              <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">
                  Bottleneck Detected at {data.aiBriefing.funnelDiagnosis.bottleneckStage}:
                </span>{" "}
                <span className="text-white/70">{data.aiBriefing.funnelDiagnosis.bottleneckDescription}</span>
              </div>
            </div>
          </div>

          {/* Chart 2: 7-Day Engagement Trend AreaChart */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14.5px] font-black text-white/90 flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-400" />
                  7-Day Engagement Velocity
                </h3>
                <p className="text-[11.5px] text-white/40 mt-0.5">
                  Daily pacing for outreach sent, emails opened, and replies received
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10.5px] font-bold">
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="size-2 rounded-full bg-sky-400" /> Sent
                </span>
                <span className="flex items-center gap-1 text-violet-400">
                  <span className="size-2 rounded-full bg-violet-400" /> Opens
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-400" /> Replies
                </span>
              </div>
            </div>

            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReplies" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2.5 rounded-xl bg-black/90 border border-white/15 text-[11.5px] shadow-2xl backdrop-blur-md space-y-1">
                            <p className="font-bold text-white">{payload[0].payload.date}</p>
                            <p className="text-sky-400">Sent: {payload[0].payload.sent}</p>
                            <p className="text-violet-300">Opens: {payload[0].payload.opens}</p>
                            <p className="text-emerald-400">Replies: {payload[0].payload.replies}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="#38bdf8" fillOpacity={1} fill="url(#colorSent)" />
                  <Area type="monotone" dataKey="opens" stroke="#a78bfa" fillOpacity={1} fill="url(#colorOpens)" />
                  <Area
                    type="monotone"
                    dataKey="replies"
                    stroke="#34d399"
                    fillOpacity={1}
                    fill="url(#colorReplies)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3 & 4: Objection Donut Chart & Cadence Step Bars in 2 sub-columns */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Objection Radar Donut Chart */}
            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.015] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-white/90 flex items-center gap-1.5">
                  <PieIcon className="size-3.5 text-amber-400" />
                  Objection & Intent Heatmap
                </span>
                <Link
                  href="/settings/autopilot"
                  className="text-[10.5px] font-bold text-violet-400 hover:text-violet-300"
                >
                  Train AI →
                </Link>
              </div>

              {data.objectionSlices.length === 0 ? (
                <div className="h-[140px] flex items-center justify-center text-[11px] text-white/30 text-center">
                  Objection intents will populate as leads reply
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-[120px] h-[120px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.objectionSlices}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          stroke="none"
                        >
                          {data.objectionSlices.map((entry, index) => (
                            <Cell key={`slice-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="p-2 rounded-lg bg-black/90 border border-white/15 text-[11px]">
                                  <p className="font-bold text-white">{d.name}</p>
                                  <p className="text-white/60">
                                    {d.value} replies ({d.pct}%)
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1 flex-1 overflow-hidden">
                    {data.objectionSlices.slice(0, 3).map((slice, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-white/70 truncate">
                          <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                          {slice.name}
                        </span>
                        <span className="font-mono text-white/90 font-semibold">{slice.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cadence Step Volume Bars */}
            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.015] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-white/90 flex items-center gap-1.5">
                  <Layers className="size-3.5 text-violet-400" />
                  Step-by-Step Cadence Volume
                </span>
                <span className="text-[10.5px] text-white/40">Step 1 vs 2 vs 3</span>
              </div>

              <div className="space-y-2 pt-1">
                {data.cadenceChartData.map((step, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/70 font-semibold">{step.name}</span>
                      <span className="font-mono text-white/90">{step.sent.toLocaleString()} sent</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(
                            10,
                            Math.min(
                              100,
                              (step.sent / Math.max(1, data.cadenceChartData[0]?.sent || 1)) * 100
                            )
                          )}%`,
                          backgroundColor: step.fill,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: GALIEN AI ACTION ENGINE & STRATEGIC MOVES (5 Cols) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Executive AI Strategic Diagnosis Card */}
          <div
            className="p-5 rounded-2xl border space-y-3.5"
            style={{
              background: "linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(99,102,241,0.02) 100%)",
              borderColor: "rgba(168,85,247,0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-400" />
                <h3 className="text-[14px] font-black text-white/95">Galien AI Executive Briefing</h3>
              </div>
              <span className="text-[10.5px] text-violet-300/70 font-semibold">AI Generated</span>
            </div>

            <div className="space-y-2.5 text-[12px] leading-relaxed">
              <div className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15">
                <span className="font-bold text-emerald-400 mr-1.5 flex items-center gap-1 mb-0.5">
                  <CheckCircle2 className="size-3" /> Growth Win:
                </span>
                <span className="text-white/80">{data.aiBriefing.executiveBriefing.growthWins}</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/15">
                <span className="font-bold text-amber-400 mr-1.5 flex items-center gap-1 mb-0.5">
                  <AlertTriangle className="size-3" /> Pipeline Leakage:
                </span>
                <span className="text-white/80">{data.aiBriefing.executiveBriefing.leakagePoints}</span>
              </div>

              <div className="p-3 rounded-xl bg-violet-500/[0.04] border border-violet-500/15">
                <span className="font-bold text-violet-300 mr-1.5 flex items-center gap-1 mb-0.5">
                  <Zap className="size-3" /> Priority Focus:
                </span>
                <span className="text-white/80">{data.aiBriefing.executiveBriefing.strategicFocus}</span>
              </div>
            </div>
          </div>

          {/* Top 3 1-Click High-Leverage Growth Moves */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13.5px] font-black text-white/90 flex items-center gap-1.5">
                <Flame className="size-4 text-orange-400" />
                High-Leverage Growth Moves
              </h3>
              <span className="text-[10.5px] text-white/40">1-Click Execution</span>
            </div>

            <div className="space-y-2.5">
              {data.aiBriefing.growthMoves.map(move => (
                <div
                  key={move.id}
                  className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-violet-500/30 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-white/70">
                      {move.category}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {move.expectedImpact}
                    </span>
                  </div>

                  <div>
                    <p className="text-[13px] font-bold text-white/90 group-hover:text-violet-200 transition-colors">
                      {move.title}
                    </p>
                    <p className="text-[11.5px] text-white/50 leading-relaxed mt-0.5">{move.description}</p>
                  </div>

                  <Link
                    href={move.actionUrl}
                    className="flex items-center justify-between w-full p-2 rounded-lg bg-white/5 hover:bg-white text-white hover:text-black font-bold text-[11px] transition-all"
                  >
                    <span>{move.actionLabel}</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Active Risk Alerts Tray */}
          {data.alerts.length > 0 && (
            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.015] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-white/80 flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 text-rose-400" />
                  Active Risk & Opportunity Alerts ({data.alerts.length})
                </span>
              </div>

              <div className="space-y-2">
                {data.alerts.slice(0, 3).map(alert => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 flex-1">
                      <p className="text-[12px] font-bold text-white/90">{alert.title}</p>
                      <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">{alert.body}</p>
                      {alert.cta && (
                        <Link
                          href={alert.cta}
                          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-violet-400 hover:text-violet-300 pt-0.5"
                        >
                          Take action <ArrowRight className="size-2.5" />
                        </Link>
                      )}
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-1 text-white/20 hover:text-white"
                      title="Dismiss"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
