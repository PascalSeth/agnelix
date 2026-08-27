"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, ArrowRight, TrendingUp, AlertTriangle, Trophy } from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"

type Insight = {
  id: string
  type: "CROSS_SELL_OPPORTUNITY" | "RISK_ALERT" | "PERFORMANCE_ANOMALY" | "MILESTONE_REACHED"
  title: string
  body: string
  cta: string | null
  createdAt: string
  lead: { id: string; company: string | null; email: string } | null
}

const TYPE_META = {
  CROSS_SELL_OPPORTUNITY: { icon: TrendingUp, label: "Cross-sell", color: "text-emerald-400", bg: "rgba(52,211,153,.1)", border: "rgba(52,211,153,.2)" },
  RISK_ALERT: { icon: AlertTriangle, label: "Risk", color: "text-red-400", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.2)" },
  PERFORMANCE_ANOMALY: { icon: AlertTriangle, label: "Anomaly", color: "text-amber-400", bg: "rgba(251,191,36,.1)", border: "rgba(251,191,36,.2)" },
  MILESTONE_REACHED: { icon: Trophy, label: "Milestone", color: "text-indigo-300", bg: "rgba(129,140,248,.1)", border: "rgba(129,140,248,.2)" },
} as const

export function AgentInsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/insights")
      .then(r => (r.ok ? r.json() : []))
      .then(data => { setInsights(Array.isArray(data) ? data.slice(0, 6) : []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  async function dismiss(id: string) {
    setInsights(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/insights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    }).catch(() => {})
  }

  if (!loaded || insights.length === 0) return null

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6 space-y-4"
      style={{
        background: "linear-gradient(135deg, rgba(30, 32, 45, 0.7) 0%, rgba(15, 16, 22, 0.4) 100%)",
        border: "1px solid rgba(255,255,255,.06)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.05), 0 20px 40px rgba(0,0,0,0.3)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="absolute -right-16 -top-16 size-44 rounded-full bg-emerald-500/10 blur-[80px]" />

      <div className="flex items-center gap-2.5 relative z-10">
        <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Sparkles className="size-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-[15px] font-black tracking-tight text-white/90">Galien Recommends</h2>
          <p className="text-[11px] text-white/30">Opportunities the agent spotted across your pipeline</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
        {insights.map(insight => {
          const meta = TYPE_META[insight.type] ?? TYPE_META.CROSS_SELL_OPPORTUNITY
          const Icon = meta.icon
          return (
            <div
              key={insight.id}
              className="relative rounded-2xl p-4 space-y-2.5"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <button
                onClick={() => dismiss(insight.id)}
                className="absolute top-3 right-3 text-white/20 hover:text-white/60 transition-colors"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider ${meta.color}`}
                  style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                >
                  <Icon className="size-3" />
                  {meta.label}
                </span>
              </div>

              <p className="text-[13px] font-bold text-white/85 leading-snug pr-5">{insight.title}</p>
              <p className="text-[11.5px] text-white/45 leading-relaxed">{insight.body}</p>

              {insight.cta && (
                <Link
                  href={insight.cta}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-300/80 hover:text-emerald-200 transition-colors"
                >
                  View lead <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
