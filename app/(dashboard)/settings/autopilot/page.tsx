"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Zap, Plus, Trash2, Loader2, MapPin, GitBranch, Power, Megaphone } from "lucide-react"
import { toast } from "sonner"
import { CustomSelect } from "@/components/ui/custom-select"
import { formatRelative } from "@/lib/utils"

type Sequence = { id: string; name: string }
type Campaign = { id: string; name: string; status: string }
type AutoSearch = {
  id: string; query: string; location: string; sequenceId: string
  campaignName: string; campaignId: string | null; frequency: string; enabled: boolean
  lastRunAt: string | null; totalImported: number
  sequence: { name: string }
  campaign: { id: string; name: string } | null
}

type AgentGoal = {
  meetingsPerMonth: number
  replyRateTarget: number
  dailyLeadCap: number
  autoSendEnabled: boolean
  reviewWindowMins: number
  maxAutoSendsPerDay: number
  minConfidence: "LOW" | "MEDIUM" | "HIGH"
}

const fieldStyle = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
}

export default function AutopilotPage() {
  const { status } = useSession()
  const [searches, setSearches]     = useState<AutoSearch[]>([])
  const [sequences, setSequences]   = useState<Sequence[]>([])
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [goal, setGoal]             = useState<AgentGoal | null>(null)
  const [savingGoal, setSavingGoal] = useState(false)

  const [query, setQuery]           = useState("")
  const [location, setLocation]     = useState("")
  const [sequenceId, setSequenceId] = useState("")
  const [frequency, setFrequency]   = useState("daily")

  // Campaign mode
  const [campaignMode, setCampaignMode] = useState<"existing" | "new">("existing")
  const [campaignId, setCampaignId]     = useState("")
  const [campaignName, setCampaignName] = useState("")

  useEffect(() => {
    if (status !== "authenticated") return
    Promise.allSettled([
      fetch("/api/auto-search").then(r => r.json()),
      fetch("/api/sequences").then(r => r.json()),
      fetch("/api/campaigns").then(r => r.json()),
      fetch("/api/agent/goals").then(r => r.json()),
    ]).then(([s, seqs, camps, goalRes]) => {
      setSearches(s.status === "fulfilled" && Array.isArray(s.value) ? s.value : [])
      setSequences(seqs.status === "fulfilled" && Array.isArray(seqs.value) ? seqs.value : [])
      const c = camps.status === "fulfilled" && Array.isArray(camps.value) ? camps.value : []
      setCampaigns(c)
      if (goalRes.status === "fulfilled") setGoal(goalRes.value as AgentGoal)
      if (c.length === 0) setCampaignMode("new")
      setLoading(false)
    })
  }, [status])

  async function saveGoal(partial: Partial<AgentGoal>) {
    if (!goal) return
    const next = { ...goal, ...partial }
    setGoal(next)
    setSavingGoal(true)
    try {
      const res = await fetch("/api/agent/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      })
      if (!res.ok) throw new Error("Failed")
      const updated = await res.json()
      setGoal(updated)
    } catch {
      toast.error("Failed to save agent goals")
      setGoal(goal)
    } finally {
      setSavingGoal(false)
    }
  }

  async function handleCreate() {
    if (!query.trim())    { toast.error("Enter a business type"); return }
    if (!location.trim()) { toast.error("Enter a location"); return }
    if (!sequenceId)      { toast.error("Select a sequence"); return }
    if (campaignMode === "existing" && !campaignId) { toast.error("Choose a campaign"); return }
    if (campaignMode === "new" && !campaignName.trim()) { toast.error("Enter a campaign name"); return }

    setCreating(true)
    try {
      const payload = campaignMode === "existing"
        ? { query, location, sequenceId, campaignId, frequency }
        : { query, location, sequenceId, campaignName, frequency }

      const res = await fetch("/api/auto-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const created = await res.json()
      setSearches(prev => [created, ...prev])
      setQuery(""); setLocation(""); setSequenceId(""); setCampaignId(""); setCampaignName("")
      toast.success("Auto-search created — runs on next cron cycle")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create")
    } finally {
      setCreating(false)
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/auto-search/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    })
    setSearches(prev => prev.map(s => s.id === id ? { ...s, enabled } : s))
    toast.success(enabled ? "Auto-search enabled" : "Auto-search paused")
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this auto-search?")) return
    await fetch(`/api/auto-search/${id}`, { method: "DELETE" })
    setSearches(prev => prev.filter(s => s.id !== id))
    toast.success("Deleted")
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="size-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,.9)" }} />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Autonomous Mode</span>
        </div>
        <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">Autopilot</h1>
        <p className="mt-2 text-[13px] text-white/25 font-medium">
          Set criteria once — the system finds leads, creates campaigns, and sends emails automatically
        </p>
      </div>

      {/* How it works */}
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: "rgba(52,211,153,.04)", border: "1px solid rgba(52,211,153,.1)" }}
      >
        <div className="flex items-start gap-4">
          <Zap className="size-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="space-y-1 text-[12px] text-white/40 leading-relaxed">
            <p className="font-bold text-white/60 text-[13px]">How it works</p>
            <p>1. You define a business type, location, and email sequence below.</p>
            <p>2. The system searches Google Maps daily (or weekly) for matching businesses.</p>
            <p>3. New businesses are imported as leads, enrolled in a campaign, and emailed automatically.</p>
            <p>4. When a lead replies, their follow-ups are cancelled and the reply counter updates.</p>
          </div>
        </div>
      </div>

      {/* Goal planner */}
      {goal && (
        <div
          className="relative overflow-hidden rounded-2xl p-6 space-y-4"
          style={{ background: "rgba(99,102,241,.05)", border: "1px solid rgba(99,102,241,.15)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-white/35 uppercase tracking-[.12em]">Goal Planner</p>
              <p className="text-[12px] text-white/35 mt-1">Set outcomes. Agent calibrates actions automatically.</p>
            </div>
            {savingGoal && <Loader2 className="size-4 animate-spin text-white/30" />}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-[11px] text-white/35">Meetings / month</span>
              <input type="number" min={1} value={goal.meetingsPerMonth} onChange={e => saveGoal({ meetingsPerMonth: Number(e.target.value) })} className="w-full rounded-xl px-3 py-2 text-[13px] text-white/75 outline-none" style={fieldStyle} />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-white/35">Reply rate target %</span>
              <input type="number" min={1} value={goal.replyRateTarget} onChange={e => saveGoal({ replyRateTarget: Number(e.target.value) })} className="w-full rounded-xl px-3 py-2 text-[13px] text-white/75 outline-none" style={fieldStyle} />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-white/35">Daily lead cap</span>
              <input type="number" min={5} value={goal.dailyLeadCap} onChange={e => saveGoal({ dailyLeadCap: Number(e.target.value) })} className="w-full rounded-xl px-3 py-2 text-[13px] text-white/75 outline-none" style={fieldStyle} />
            </label>
          </div>
        </div>
      )}

      {/* Create form */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 space-y-5"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
        }}
      >
        <div className="absolute top-0 inset-x-6 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

        <p className="text-[11px] font-bold text-white/35 uppercase tracking-[.12em]">New Auto-Search</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wide">Business Type</label>
            <input
              placeholder="e.g. Dental practices"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
              style={fieldStyle}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wide">Location</label>
            <input
              placeholder="e.g. New York"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
              style={fieldStyle}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wide">Email Sequence</label>
            {sequences.length === 0 ? (
              <p className="text-[12px] text-white/25 px-1">No sequences yet — create one in Sequences first</p>
            ) : (
              <CustomSelect
                value={sequenceId}
                onChange={setSequenceId}
                placeholder="Choose sequence…"
                icon={<GitBranch className="size-3.5" />}
                options={sequences.map(s => ({ value: s.id, label: s.name }))}
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wide">Campaign</label>
            {/* Mode tabs */}
            <div className="flex items-center gap-1 mb-2 p-1 rounded-xl w-fit"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
              {(["existing", "new"] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCampaignMode(mode)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all"
                  style={campaignMode === mode
                    ? { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.75)" }
                    : { color: "rgba(255,255,255,.3)" }}
                >
                  {mode === "existing" ? <Megaphone className="size-3" /> : <Plus className="size-3" />}
                  {mode === "existing" ? "Existing" : "New"}
                </button>
              ))}
            </div>
            {campaignMode === "existing" ? (
              campaigns.length === 0 ? (
                <p className="text-[12px] text-white/30">
                  No campaigns yet —{" "}
                  <button type="button" onClick={() => setCampaignMode("new")} className="text-white/60 underline underline-offset-2">
                    create one
                  </button>
                </p>
              ) : (
                <CustomSelect
                  value={campaignId}
                  onChange={setCampaignId}
                  placeholder="Choose a campaign…"
                  icon={<Megaphone className="size-3.5" />}
                  options={campaigns.map(c => ({ value: c.id, label: c.name, badge: c.status }))}
                />
              )
            ) : (
              <input
                placeholder="e.g. NYC Dental Outreach"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
                style={fieldStyle}
              />
            )}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wide">Frequency</label>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
              {(["daily", "weekly"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className="rounded-lg px-4 py-1.5 text-[11px] font-bold transition-all capitalize"
                  style={frequency === f
                    ? { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.8)" }
                    : { color: "rgba(255,255,255,.3)" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {creating ? "Creating…" : "Create Auto-Search"}
          </button>
        </div>
      </div>

      {/* Search list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-white/80">Active Auto-Searches</h2>
          {!loading && searches.length > 0 && (
            <span className="text-[11px] text-white/25">{searches.length} configured</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="size-5 animate-spin text-white/20" />
          </div>
        ) : searches.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-14 text-center"
            style={{ background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.07)" }}
          >
            <Zap className="size-8 text-white/10 mb-3" />
            <p className="text-[13px] font-bold text-white/25">No auto-searches yet</p>
            <p className="text-[11px] text-white/15 mt-1">Create one above to start the autonomous loop</p>
          </div>
        ) : (
          searches.map(search => (
            <div
              key={search.id}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4"
              style={{
                background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
                border: `1px solid ${search.enabled ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.07)"}`,
              }}
            >
              {search.enabled && (
                <div className="absolute top-0 inset-x-6 h-px"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(52,211,153,.2),transparent)" }} />
              )}

              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: search.enabled ? "rgba(52,211,153,.08)" : "rgba(255,255,255,.04)",
                  border: `1px solid ${search.enabled ? "rgba(52,211,153,.15)" : "rgba(255,255,255,.07)"}`,
                }}
              >
                <MapPin className={`size-4 ${search.enabled ? "text-emerald-400/70" : "text-white/20"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-[13px] text-white/75 truncate">{search.query}</p>
                  <span className="text-white/20 text-[11px]">in</span>
                  <p className="font-bold text-[13px] text-white/75 truncate">{search.location}</p>
                </div>
                <p className="text-[11px] text-white/30">
                  {search.campaign?.name ?? search.campaignName} · {search.sequence.name} · {search.frequency} ·{" "}
                  {search.totalImported} leads ·{" "}
                  {search.lastRunAt ? `Last run ${formatRelative(search.lastRunAt)}` : "Never run"}
                </p>
              </div>

              {/* Enable/disable toggle */}
              <button
                onClick={() => toggleEnabled(search.id, !search.enabled)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all"
                style={
                  search.enabled
                    ? { background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.15)", color: "rgba(52,211,153,.8)" }
                    : { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", color: "rgba(255,255,255,.3)" }
                }
              >
                <Power className="size-3" />
                {search.enabled ? "On" : "Off"}
              </button>

              <button
                onClick={() => handleDelete(search.id)}
                className="flex size-8 shrink-0 items-center justify-center rounded-xl text-red-400/40 transition-all hover:text-red-400 hover:bg-red-500/10"
                style={{ border: "1px solid rgba(239,68,68,.08)" }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
