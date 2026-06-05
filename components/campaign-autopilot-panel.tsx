"use client"

import { useState } from "react"
import { Zap, Power, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

type AutoSearch = {
  id: string
  query: string
  location: string
  frequency: string
  enabled: boolean
  lastRunAt: string | null
  totalImported: number
}

interface Props {
  campaignId: string
  sequenceId: string
  initialAutoSearch: AutoSearch | null
}

export function CampaignAutopilotPanel({ campaignId, sequenceId, initialAutoSearch }: Props) {
  const [search, setSearch] = useState<AutoSearch | null>(initialAutoSearch)
  const [query, setQuery] = useState(initialAutoSearch?.query || "")
  const [location, setLocation] = useState(initialAutoSearch?.location || "")
  const [frequency, setFrequency] = useState(initialAutoSearch?.frequency || "daily")
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  async function handleSave() {
    if (!query.trim() || !location.trim()) {
      toast.error("Query and location are required")
      return
    }
    setSaving(true)
    try {
      const payload = { query, location, frequency, sequenceId, campaignId }
      let res
      if (search) {
        res = await fetch(`/api/auto-search/${search.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/auto-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSearch(data)
      toast.success("Autopilot settings saved")
    } catch {
      toast.error("Failed to save autopilot settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle() {
    if (!search) return
    setToggling(true)
    try {
      const enabled = !search.enabled
      const res = await fetch(`/api/auto-search/${search.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error()
      setSearch({ ...search, enabled })
      toast.success(enabled ? "Autopilot enabled" : "Autopilot paused")
    } catch {
      toast.error("Failed to toggle autopilot")
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl mt-8"
      style={{
        background: "linear-gradient(145deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.015) 100%)",
        border: "1px solid rgba(255,255,255,.07)",
      }}
    >
      <div className="absolute top-0 inset-x-6 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(52,211,153,.2),transparent)" }} />

      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,.06)" }}>
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-emerald-400" />
          <h2 className="text-[13px] font-bold text-white/60 uppercase tracking-[.12em]">Autopilot Mode</h2>
        </div>
        {search && (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all"
            style={
              search.enabled
                ? { background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.15)", color: "rgba(52,211,153,.8)" }
                : { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", color: "rgba(255,255,255,.3)" }
            }
          >
            {toggling ? <Loader2 className="size-3 animate-spin" /> : <Power className="size-3" />}
            {search.enabled ? "Active" : "Paused"}
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        <p className="text-[12px] text-white/40 leading-relaxed">
          When autopilot is active, the system automatically searches Google Maps for leads matching these criteria and enrolls them into this campaign.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Business Type</label>
            <input
              placeholder="e.g. Dentists"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-[13px] text-white/70 outline-none placeholder:text-white/20"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Location</label>
            <input
              placeholder="e.g. London"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-[13px] text-white/70 outline-none placeholder:text-white/20"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
            {(["daily", "weekly"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className="rounded-lg px-3 py-1 text-[11px] font-bold capitalize transition-all"
                style={frequency === f
                  ? { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.8)" }
                  : { color: "rgba(255,255,255,.3)" }}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 8px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.5)" }}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save Settings
          </button>
        </div>

        {search && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-[11px] text-white/30" style={{ borderColor: "rgba(255,255,255,.06)" }}>
            <span>{search.totalImported} leads imported automatically</span>
            <span>{search.lastRunAt ? `Last run: ${new Date(search.lastRunAt).toLocaleDateString()}` : "Never run"}</span>
          </div>
        )}
      </div>
    </div>
  )
}
