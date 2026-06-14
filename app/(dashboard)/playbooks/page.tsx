/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import { Briefcase, Target, FileText, CheckCircle2, MessageSquare, Plus, Trash2, X, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

export default function PlaybooksPage() {
  const { activePlaybook } = usePlaybook()
  const [verticals, setVerticals] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [objections, setObjections] = useState<Array<{ objection: string; response: string }>>([])
  
  const [newVertical, setNewVertical] = useState("")
  const [newPlatform, setNewPlatform] = useState("")
  const [saving, setSaving] = useState(false)

  // Sync state whenever activePlaybook loads or shifts
  useEffect(() => {
    if (activePlaybook) {
      setVerticals(activePlaybook.targetVerticals || [])
      setPlatforms(activePlaybook.platformOptions || [])
      setObjections(activePlaybook.objectionHandlers || [])
    }
  }, [activePlaybook])

  if (!activePlaybook) {
    return (
      <div className="flex h-96 items-center justify-center text-white/40 text-sm">
        <Loader2 className="size-5 animate-spin mr-2" />
        Loading playbook details...
      </div>
    )
  }

  // Verticals logic
  function addVertical() {
    const term = newVertical.trim().toLowerCase()
    if (!term) return
    if (verticals.includes(term)) {
      toast.error("Niche already targetable")
      return
    }
    setVerticals(prev => [...prev, term])
    setNewVertical("")
  }

  // Platforms logic
  function addPlatform() {
    const term = newPlatform.trim()
    if (!term) return
    if (platforms.includes(term)) {
      toast.error("Channel already configured")
      return
    }
    setPlatforms(prev => [...prev, term])
    setNewPlatform("")
  }

  // Objections logic
  function addObjection() {
    setObjections(prev => [...prev, { objection: "New Objection Text", response: "Strategy override response..." }])
  }

  function updateObjection(idx: number, key: "objection" | "response", val: string) {
    setObjections(prev => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item))
  }

  // Save all settings
  async function handleSave() {
    if (!activePlaybook) return
    setSaving(true)
    try {
      const res = await fetch(`/api/playbooks/${activePlaybook.type}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetVerticals: verticals,
          platformOptions: platforms,
          objectionHandlers: objections
        })
      })
      if (!res.ok) throw new Error("Failed to save playbook settings")
      toast.success("Playbook configuration saved successfully!")
    } catch (err: any) {
      toast.error(err.message || "Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-1.5 rounded-full bg-indigo-400" style={{ boxShadow: "0 0 6px rgba(129,140,248,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">
              Niche Settings
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">
            {activePlaybook.name} Config
          </h1>
          <p className="mt-2 text-[13px] text-white/25 font-medium">
            Calibrate target verticals, platforms, and AI objection handlers for automated campaigns
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-bold text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)",
            boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)"
          }}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Saving Changes…" : "Save Configuration"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Verticals */}
        <div 
          className="relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between"
          style={{
            background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
            border: "1px solid rgba(255,255,255,.07)",
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="size-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Target Verticals</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {verticals.length === 0 ? (
                <p className="text-xs text-white/20 italic">No target verticals added.</p>
              ) : (
                verticals.map((v) => (
                  <span 
                    key={v} 
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 capitalize"
                  >
                    {v}
                    <button 
                      type="button" 
                      onClick={() => setVerticals(prev => prev.filter(item => item !== v))} 
                      className="hover:text-emerald-200 text-emerald-400/55 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-5 max-w-sm">
            <input
              placeholder="Add niche vertical (e.g. spas)..."
              value={newVertical}
              onChange={e => setNewVertical(e.target.value)}
              className="flex-1 rounded-xl px-3.5 py-2 text-xs text-white/70 bg-black/30 border border-white/5 outline-none placeholder:text-white/15"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addVertical(); } }}
            />
            <button 
              onClick={addVertical} 
              className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors shrink-0"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Discovery & Platforms */}
        <div 
          className="relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between"
          style={{
            background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
            border: "1px solid rgba(255,255,255,.07)",
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="size-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Discovery Strategy</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-white/35">Primary Discovery Method</p>
                <p className="text-xs text-white/70 capitalize mt-1.5">{activePlaybook.discoveryMethod} Search</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-white/35">Target Channels / Mediums</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {platforms.length === 0 ? (
                    <p className="text-xs text-white/20 italic">No channels added.</p>
                  ) : (
                    platforms.map((p) => (
                      <span 
                        key={p} 
                        className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60 border border-white/[0.06]"
                      >
                        {p}
                        <button 
                          type="button" 
                          onClick={() => setPlatforms(prev => prev.filter(item => item !== p))} 
                          className="hover:text-white text-white/20 transition-colors"
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5 max-w-sm">
            <input
              placeholder="Add target channel (e.g. Yelp)..."
              value={newPlatform}
              onChange={e => setNewPlatform(e.target.value)}
              className="flex-1 rounded-xl px-3.5 py-2 text-xs text-white/70 bg-black/30 border border-white/5 outline-none placeholder:text-white/15"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPlatform(); } }}
            />
            <button 
              onClick={addPlatform} 
              className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-colors shrink-0"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sequence Templates */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="size-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Preset Sequence Templates</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {activePlaybook.sequenceTemplates.map((seq) => (
            <div key={seq.id} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white">{seq.name}</h3>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">{seq.steps} steps</span>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{seq.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Proposal Templates */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <FileText className="size-4 text-pink-400" />
          <h2 className="text-sm font-semibold text-white">Preset Proposal Pricing Packages</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {activePlaybook.proposalTemplates.map((prop) => (
            <div key={prop.id} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-semibold text-white">{prop.name}</h3>
                  <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{prop.description}</p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs font-bold text-white">{prop.currency === "GBP" ? "£" : prop.currency}{prop.price}/{prop.period === "monthly" ? "mo" : "one-off"}</p>
                  {prop.setupPrice > 0 && (
                    <p className="text-[9px] text-white/30 mt-0.5">+{prop.currency === "GBP" ? "£" : prop.currency}{prop.setupPrice} setup</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Objection Handlers */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6 space-y-4"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Objection Overrides (AI Copilot overrides)</h2>
          </div>
          <button
            onClick={addObjection}
            className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl hover:bg-sky-500/20 transition-all shrink-0"
          >
            <Plus className="size-3.5" /> Add Objection
          </button>
        </div>

        <div className="space-y-4">
          {objections.length === 0 ? (
            <p className="text-xs text-white/20 italic p-3 text-center border border-dashed border-white/5 rounded-xl">
              No objection overrides. The AI will draft general positive replies.
            </p>
          ) : (
            objections.map((obj, idx) => (
              <div 
                key={idx} 
                className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4.5 space-y-3.5 relative group/objection"
              >
                <button 
                  onClick={() => setObjections(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-3.5 right-3.5 opacity-0 group-hover/objection:opacity-100 p-1.5 text-white/25 hover:text-red-400/80 transition-all rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/10"
                >
                  <Trash2 className="size-4" />
                </button>
                <div className="space-y-1.5 max-w-xl">
                  <label className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider">Prospect Objection</label>
                  <input
                    value={obj.objection}
                    onChange={e => updateObjection(idx, "objection", e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-xs text-white/70 bg-black/25 border border-white/5 outline-none focus:border-white/15 placeholder:text-white/10"
                    placeholder="e.g. Already have an agency manager..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-sky-400/80 uppercase tracking-wider">Override Response strategy / AI Guidelines</label>
                  <textarea
                    value={obj.response}
                    onChange={e => updateObjection(idx, "response", e.target.value)}
                    className="w-full min-h-[55px] rounded-xl px-4 py-2 text-xs text-white/60 bg-black/25 border border-white/5 outline-none focus:border-white/15 resize-none font-sans leading-relaxed placeholder:text-white/10"
                    placeholder="e.g. Work alongside existing manager to handle specialized visual production..."
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
