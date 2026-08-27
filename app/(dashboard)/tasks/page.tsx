"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ListChecks, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { usePlaybook } from "@/lib/playbook-context"
import { getWorkspace } from "@/lib/workspaces"

type MissionItem = {
  id: string
  title: string
  detail: string
  priority: "high" | "medium"
  href: string
  count: number
}

const cardStyle = {
  background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
  border: "1px solid rgba(255,255,255,.07)",
}

export default function TasksPage() {
  const { status } = useSession()
  const { activeType } = usePlaybook()
  const ws = getWorkspace(activeType)
  const [items, setItems] = useState<MissionItem[]>([])
  const [completedToday, setCompletedToday] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/tasks")
      .then(r => r.json())
      .then(data => {
        setItems(Array.isArray(data?.items) ? data.items : [])
        setCompletedToday(data?.completedToday ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  const high = items.filter(i => i.priority === "high")
  const medium = items.filter(i => i.priority === "medium")

  function Section({ label, list, tone }: { label: string; list: MissionItem[]; tone: "high" | "medium" }) {
    if (list.length === 0) return null
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span
            className="text-[9.5px] font-black uppercase tracking-[.14em] px-2 py-0.5 rounded-md"
            style={tone === "high"
              ? { background: "rgba(244,63,94,.12)", color: "#fb7185", border: "1px solid rgba(244,63,94,.25)" }
              : { background: "rgba(251,191,36,.10)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.22)" }}
          >
            {label}
          </span>
          <span className="text-[11px] text-white/25">{list.length} item{list.length > 1 ? "s" : ""}</span>
        </div>
        {list.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-4 rounded-2xl p-4 transition-all hover:brightness-110 group"
            style={cardStyle}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-black"
              style={{ background: `${ws.accent}1f`, border: `1px solid ${ws.accent}40`, color: ws.accent }}
            >
              {item.count}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-white/85 truncate">{item.title}</p>
              <p className="text-[11.5px] text-white/35 mt-0.5">{item.detail}</p>
            </div>
            <ArrowRight className="size-4 text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <ListChecks className="size-4" style={{ color: ws.accent }} />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">{ws.name} · Today&apos;s Mission</span>
        </div>
        <h1 className="text-[24px] font-black tracking-tight leading-none text-white/90">Tasks</h1>
        <p className="text-[12.5px] text-white/30 mt-2">
          Everything that needs you, in priority order — built from your live pipeline, not guesses.
          Your workspace&apos;s job: <span className="text-white/55 font-semibold">{ws.job}</span>
        </p>
      </div>

      {completedToday > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3" style={{ background: "rgba(5,150,105,.07)", border: "1px solid rgba(5,150,105,.2)" }}>
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <p className="text-[12px] text-emerald-200/70">
            <span className="font-bold text-emerald-300">{completedToday}</span> actions completed today (sends + approvals, including autopilot)
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/30"><Loader2 className="size-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl py-16 text-center space-y-2" style={cardStyle}>
          <Sparkles className="size-5 text-white/25 mx-auto" />
          <p className="text-[13px] font-bold text-white/50">Mission clear</p>
          <p className="text-[11.5px] text-white/25">Nothing needs your attention right now — the agent keeps working.</p>
        </div>
      ) : (
        <>
          <Section label="High priority" list={high} tone="high" />
          <Section label="Medium priority" list={medium} tone="medium" />
        </>
      )}
    </div>
  )
}
