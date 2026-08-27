"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

type ContentItem = {
  id: string
  platform: string
  scheduledFor: string
  contentType: string
  caption: string
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SCHEDULED" | "POSTED" | "FAILED"
}

const PLATFORMS = ["instagram", "tiktok", "linkedin", "x", "facebook", "pinterest"] as const
const CONTENT_TYPES = ["post", "story", "reel", "carousel", "short"] as const
const STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "POSTED", "FAILED"] as const

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e879f9",
  tiktok: "#5eead4",
  linkedin: "#7dd3fc",
  x: "#e2e5ed",
  facebook: "#818cf8",
  pinterest: "#fb7185",
}

const STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  DRAFT: { text: "text-white/40", bg: "rgba(255,255,255,.06)" },
  PENDING_APPROVAL: { text: "text-amber-300", bg: "rgba(251,191,36,.12)" },
  APPROVED: { text: "text-emerald-300", bg: "rgba(52,211,153,.12)" },
  SCHEDULED: { text: "text-sky-300", bg: "rgba(125,211,252,.12)" },
  POSTED: { text: "text-indigo-300", bg: "rgba(129,140,248,.12)" },
  FAILED: { text: "text-red-400", bg: "rgba(248,113,113,.12)" },
}

const fieldStyle = { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }
const cardStyle = {
  background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
  border: "1px solid rgba(255,255,255,.07)",
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export default function ContentCalendarPage() {
  const { status: authStatus } = useSession()
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [items, setItems] = useState<ContentItem[]>([])
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Partial<ContentItem> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month: monthKey(cursor) })
      if (platformFilter !== "all") params.set("platform", platformFilter)
      const res = await fetch(`/api/content-calendar?${params}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Failed to load calendar")
    } finally {
      setLoading(false)
    }
  }, [cursor, platformFilter])

  useEffect(() => {
    if (authStatus !== "authenticated") return
    load()
  }, [authStatus, load])

  const days = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    // Monday-first offset
    const offset = (first.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [cursor])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>()
    for (const item of items) {
      const d = new Date(item.scheduledFor)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [items])

  async function saveItem() {
    if (!editing) return
    if (!editing.caption?.trim()) { toast.error("Enter a caption"); return }
    setSaving(true)
    try {
      const payload = {
        platform: editing.platform || "instagram",
        contentType: editing.contentType || "post",
        caption: editing.caption,
        scheduledFor: editing.scheduledFor || new Date().toISOString(),
        status: editing.status || "DRAFT",
      }
      const res = editing.id
        ? await fetch(`/api/content-calendar/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/content-calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(await res.text())
      toast.success(editing.id ? "Content updated" : "Content scheduled")
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    setEditing(null)
    await fetch(`/api/content-calendar/${id}`, { method: "DELETE" }).catch(() => {})
  }

  async function rescheduleItem(id: string, day: Date) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const prev = new Date(item.scheduledFor)
    const next = new Date(day)
    next.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
    setItems(list => list.map(i => (i.id === id ? { ...i, scheduledFor: next.toISOString() } : i)))
    const res = await fetch(`/api/content-calendar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: next.toISOString() }),
    }).catch(() => null)
    if (!res?.ok) { toast.error("Reschedule failed"); load() }
  }

  const monthLabel = cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  const today = new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="size-4 text-white/30" />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Social Media</span>
          </div>
          <h1 className="text-[24px] font-black tracking-tight leading-none text-white/90">Content Calendar</h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="flex size-8 items-center justify-center rounded-xl text-white/40 hover:text-white/70 transition-colors" style={fieldStyle}>
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[13px] font-bold text-white/70 w-36 text-center">{monthLabel}</span>
          <button onClick={() => setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="flex size-8 items-center justify-center rounded-xl text-white/40 hover:text-white/70 transition-colors" style={fieldStyle}>
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setEditing({ platform: "instagram", contentType: "post", status: "DRAFT", scheduledFor: new Date().toISOString() })}
            className="ml-2 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-black transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)" }}
          >
            <Plus className="size-3.5" /> New Content
          </button>
        </div>
      </div>

      {/* Platform filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {["all", ...PLATFORMS].map(p => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold capitalize transition-all ${platformFilter === p ? "text-black" : "text-white/40 hover:text-white/70"}`}
            style={platformFilter === p ? { background: "rgba(255,255,255,.85)" } : fieldStyle}
          >
            {p === "x" ? "X / Twitter" : p}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="grid grid-cols-7 border-b border-white/[0.06]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
            <div key={d} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-white/25">{d}</div>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/30">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const key = day ? `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` : `empty-${i}`
              const dayItems = day ? (itemsByDay.get(key) ?? []) : []
              const isToday = !!day && day.toDateString() === today.toDateString()
              return (
                <div
                  key={key}
                  onDragOver={day ? (e) => e.preventDefault() : undefined}
                  onDrop={day ? (e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) rescheduleItem(id, day) } : undefined}
                  className={`min-h-[104px] border-b border-r border-white/[0.04] p-1.5 space-y-1 ${day ? "" : "bg-black/20"}`}
                >
                  {day && (
                    <span className={`inline-flex size-5 items-center justify-center rounded-full text-[10px] font-black ${isToday ? "bg-white/85 text-black" : "text-white/30"}`}>
                      {day.getDate()}
                    </span>
                  )}
                  {dayItems.map(item => (
                    <button
                      key={item.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                      onClick={() => setEditing(item)}
                      className="block w-full rounded-md px-1.5 py-1 text-left cursor-grab active:cursor-grabbing"
                      style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderLeft: `2.5px solid ${PLATFORM_COLORS[item.platform] ?? "#e2e5ed"}` }}
                      title={`${item.platform} ${item.contentType} — ${item.status.replace(/_/g, " ").toLowerCase()}. Drag to another day to reschedule.`}
                    >
                      <span className="block text-[9.5px] font-black uppercase tracking-wide" style={{ color: PLATFORM_COLORS[item.platform] ?? "#e2e5ed" }}>
                        {item.platform} · {item.contentType}
                      </span>
                      <span className="block truncate text-[10.5px] text-white/60">{item.caption}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit / create modal */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 bg-[#16171f]" style={{ border: "1px solid rgba(255,255,255,.09)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-black text-white/90">{editing.id ? "Edit Content" : "Schedule Content"}</h2>
              <button onClick={() => setEditing(null)} className="text-white/30 hover:text-white/70"><X className="size-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Platform</label>
                <select value={editing.platform} onChange={e => setEditing(p => ({ ...p, platform: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none bg-black/40 border border-white/10">
                  {PLATFORMS.map(p => <option key={p} value={p} className="bg-[#1a1b24] capitalize">{p}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Type</label>
                <select value={editing.contentType} onChange={e => setEditing(p => ({ ...p, contentType: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none bg-black/40 border border-white/10">
                  {CONTENT_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1b24] capitalize">{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Scheduled For</label>
                <input
                  type="datetime-local"
                  value={editing.scheduledFor ? new Date(new Date(editing.scheduledFor).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                  onChange={e => setEditing(p => ({ ...p, scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : p?.scheduledFor }))}
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none" style={fieldStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Status</label>
                <select value={editing.status} onChange={e => setEditing(p => ({ ...p, status: e.target.value as ContentItem["status"] }))}
                  className={`w-full rounded-xl px-3 py-2 text-[12px] outline-none bg-black/40 border border-white/10 ${STATUS_STYLES[editing.status ?? "DRAFT"].text}`}>
                  {STATUSES.map(s => <option key={s} value={s} className="bg-[#1a1b24] text-white">{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-white/35">Caption</label>
              <textarea
                value={editing.caption ?? ""}
                onChange={e => setEditing(p => ({ ...p, caption: e.target.value }))}
                rows={4}
                placeholder="Write the caption / creative brief…"
                className="w-full rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none resize-none placeholder:text-white/20"
                style={fieldStyle}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {editing.id ? (
                <button onClick={() => deleteItem(editing.id!)} className="flex items-center gap-1.5 text-[11.5px] font-bold text-red-400/70 hover:text-red-400 transition-colors">
                  <Trash2 className="size-3.5" /> Delete
                </button>
              ) : <span />}
              <button
                onClick={saveItem}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-[12.5px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)" }}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {editing.id ? "Save Changes" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
