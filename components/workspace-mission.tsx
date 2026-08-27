"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ListChecks, ArrowRight, CheckCircle2 } from "lucide-react"
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

export function WorkspaceMission() {
  const { activeType } = usePlaybook()
  const ws = getWorkspace(activeType)
  const [items, setItems] = useState<MissionItem[]>([])
  const [completedToday, setCompletedToday] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setItems(Array.isArray(data.items) ? data.items.slice(0, 5) : [])
          setCompletedToday(data.completedToday ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [activeType])

  if (!loaded) return null

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6"
      style={{
        background: "linear-gradient(135deg, rgba(30, 32, 45, 0.7) 0%, rgba(15, 16, 22, 0.4) 100%)",
        border: "1px solid rgba(255,255,255,.06)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.05), 0 20px 40px rgba(0,0,0,0.3)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="absolute -left-16 -top-16 size-44 rounded-full blur-[80px]" style={{ background: `${ws.accent}1a` }} />

      <div className="flex items-center justify-between gap-3 flex-wrap relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl" style={{ background: `${ws.accent}1f`, border: `1px solid ${ws.accent}40` }}>
            <ListChecks className="size-4" style={{ color: ws.accent }} />
          </div>
          <div>
            <h2 className="text-[15px] font-black tracking-tight text-white/90">Today&apos;s Mission</h2>
            <p className="text-[11px] text-white/30">{ws.name} · {ws.job}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {completedToday > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300/80">
              <CheckCircle2 className="size-3.5" /> {completedToday} done today
            </span>
          )}
          <Link href="/tasks" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-white/40 hover:text-white/75 transition-colors">
            All tasks <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-2 relative z-10">
        {items.length === 0 ? (
          <p className="text-[12px] text-white/30 py-3">
            Mission clear — nothing needs your attention right now. The agent keeps working in the background.
          </p>
        ) : (
          items.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all hover:brightness-125 group"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
            >
              <span
                className="text-[9px] font-black uppercase tracking-[.1em] px-1.5 py-0.5 rounded-md shrink-0"
                style={item.priority === "high"
                  ? { background: "rgba(244,63,94,.12)", color: "#fb7185", border: "1px solid rgba(244,63,94,.25)" }
                  : { background: "rgba(251,191,36,.10)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.22)" }}
              >
                {item.priority}
              </span>
              <span className="text-[12.5px] font-bold text-white/80 truncate flex-1">{item.title}</span>
              <ArrowRight className="size-3.5 text-white/15 group-hover:text-white/50 transition-colors shrink-0" />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
