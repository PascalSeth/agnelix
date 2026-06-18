/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import { 
  FileText, CheckCircle2, Sparkles, Loader2, Target, 
  MessageSquare, Plus, Trash2, X, Save 
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function TemplatesPage() {
  const { activePlaybook } = usePlaybook()
  const router = useRouter()

  const [agencyName, setAgencyName] = useState("")
  const [hasDesc, setHasDesc] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [suggestingTargeting, setSuggestingTargeting] = useState(false)

  // Local editable states synced from activePlaybook
  const [verticals, setVerticals] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [objections, setObjections] = useState<Array<{ objection: string; response: string }>>([])
  const [sequences, setSequences] = useState<Array<{ id: string; name: string; steps: number; description: string }>>([])
  const [proposals, setProposals] = useState<Array<{ id: string; name: string; description: string; price: number; setupPrice: number; period: string; currency: string }>>([])

  const [newVertical, setNewVertical] = useState("")
  const [newPlatform, setNewPlatform] = useState("")

  const steps = [
    { label: "01 Targeting", desc: "Niches & channels" },
    { label: "02 Campaigns", desc: "Outbound sequences" },
    { label: "03 Response Playbook", desc: "AI objection counters" },
    { label: "04 Closing Proposals", desc: "Pricing Packages" }
  ]

  // Fetch agency settings
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data) {
          setAgencyName(data.agencyName || "")
          setHasDesc(!!data.companyDesc)
        }
      })
      .catch(() => {})
  }, [])

  // Sync state whenever activePlaybook loads
  useEffect(() => {
    if (activePlaybook) {
      setVerticals(activePlaybook.targetVerticals || [])
      setPlatforms(activePlaybook.platformOptions || [])
      setObjections(activePlaybook.objectionHandlers || [])
      setSequences(activePlaybook.sequenceTemplates || [])
      setProposals(activePlaybook.proposalTemplates || [])
    }
  }, [activePlaybook])

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
          objectionHandlers: objections,
          sequenceTemplates: sequences,
          proposalTemplates: proposals
        })
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Pipeline configuration saved successfully!")
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save settings"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateTemplates() {
    if (!hasDesc) {
      toast.error("Please configure your Agency Description in settings first.")
      router.push("/settings/agency")
      return
    }
    setGenerating(true)
    const toastId = toast.loading("AI is generating your custom pipeline templates...")
    try {
      const res = await fetch("/api/playbooks/generate-templates", {
        method: "POST"
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate templates")
      }
      toast.success("AI pipeline custom templates generated!", { id: toastId })
      
      // Update local states immediately
      setVerticals(data.targetVerticals || [])
      setPlatforms(data.platformOptions || [])
      setObjections(data.objectionHandlers || [])
      setSequences(data.sequenceTemplates || [])
      setProposals(data.proposalTemplates || [])
      
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Template generation failed."
      toast.error(msg, { id: toastId })
    } finally {
      setGenerating(false)
    }
  }
  async function handleSuggestTargeting() {
    if (!hasDesc) {
      toast.error("Please configure your Agency Description in settings first.")
      router.push("/settings/agency")
      return
    }
    setSuggestingTargeting(true)
    const toastId = toast.loading("AI is suggesting ideal niches and channels...")
    try {
      const res = await fetch("/api/playbooks/suggest-targeting", {
        method: "POST"
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to suggest targeting")
      }
      
      // Merge unique suggested values into the local state
      if (Array.isArray(data.verticals)) {
        setVerticals(prev => {
          const merged = [...prev]
          data.verticals.forEach((v: string) => {
            if (!merged.includes(v)) merged.push(v)
          })
          return merged
        })
      }
      if (Array.isArray(data.platformOptions)) {
        setPlatforms(prev => {
          const merged = [...prev]
          data.platformOptions.forEach((p: string) => {
            if (!merged.includes(p)) merged.push(p)
          })
          return merged
        })
      }
      
      toast.success("AI suggested targeting options added!", { id: toastId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to suggest targeting options."
      toast.error(msg, { id: toastId })
    } finally {
      setSuggestingTargeting(false)
    }
  }

  // Verticals
  function addVertical() {
    const val = newVertical.trim().toLowerCase()
    if (!val) return
    if (verticals.includes(val)) {
      toast.error("Niche already added")
      return
    }
    setVerticals(prev => [...prev, val])
    setNewVertical("")
  }

  // Platforms
  function addPlatform() {
    const val = newPlatform.trim()
    if (!val) return
    if (platforms.includes(val)) {
      toast.error("Platform already added")
      return
    }
    setPlatforms(prev => [...prev, val])
    setNewPlatform("")
  }

  if (!activePlaybook) {
    return (
      <div className="flex h-96 items-center justify-center text-white/40 text-sm">
        <Loader2 className="size-5 animate-spin mr-2" />
        Loading pipeline details...
      </div>
    )
  }

  return (
    <div className="space-y-8 relative pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 6px rgba(139,92,246,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">
              Acquisition Engine
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">
            {activePlaybook.name} Pipeline
          </h1>
          <p className="mt-2 text-[13px] text-white/40 font-medium">
            Manage your entire flow from lead segmenting to outreach sequences, AI negotiation, and pricing retainers.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || generating}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-bold text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)",
            boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)"
          }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving Changes…" : "Save Configuration"}
        </button>
      </div>

      {/* AI Template Customizer Box */}
      <div className="relative overflow-hidden rounded-2xl p-6"
           style={{
             background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.03) 100%)",
             border: "1px solid rgba(139, 92, 246, 0.15)",
             backdropFilter: "blur(12px)"
           }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Template Customizer</h2>
            </div>
            <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
              Regenerate the entire acquisition pipeline (sequences, objection overrides, and proposal pricing) using AI, tailored to: <strong className="text-white">{agencyName || "your agency profile"}</strong>.
            </p>
          </div>
          <button
            onClick={handleGenerateTemplates}
            disabled={generating || saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-xs font-semibold px-4 py-2.5 border border-violet-500/30 transition-all disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Generating custom pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Rewrite Pipeline with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Funnel Pipeline Stepper tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, idx) => {
          const active = activeStep === idx
          return (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "flex flex-col items-start text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group",
                active 
                  ? "bg-white/[0.04] border-white/[0.12] text-white shadow-lg" 
                  : "bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.02] text-white/50"
              )}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-pink-500/5 pointer-events-none" />
              )}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex items-center justify-center size-6 rounded-full text-[10px] font-bold border transition-colors",
                  active ? "bg-violet-500/20 border-violet-400 text-violet-300 animate-pulse" : "bg-white/5 border-white/10 text-white/40 group-hover:border-white/20"
                )}>
                  {idx + 1}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">{step.label.slice(3)}</span>
              </div>
              <p className="text-[10px] text-white/30 mt-2 font-medium">{step.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Stepper Content */}
      <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 lg:p-8" style={{ backdropFilter: "blur(12px)" }}>
        
        {/* Step 1: Targeting */}
        {activeStep === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="size-4 text-emerald-400" />
                <span>Targeting &amp; Lead Discovery</span>
              </h2>
              <p className="text-[11px] text-white/30 mt-1">Define which niches and channels Galien targets during lead discovery.</p>
            </div>

            {/* AI Targeting Copilot Box */}
            <div className="rounded-xl p-4.5 space-y-3"
                 style={{
                   background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)",
                   border: "1px solid rgba(16, 185, 129, 0.1)"
                 }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI Targeting Copilot</span>
                </div>
                <button
                  type="button"
                  onClick={handleSuggestTargeting}
                  disabled={suggestingTargeting}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-bold text-white transition-all disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)",
                    border: "1px solid rgba(16, 185, 129, 0.2)"
                  }}
                >
                  {suggestingTargeting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  <span>Generate Niches &amp; Channels with AI</span>
                </button>
              </div>
              <p className="text-[11px] text-white/45">
                Let the AI analyze your agency description and value proposition to automatically generate and merge the best target customer niches and lead discovery channels.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Verticals */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 space-y-3">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Target Niches / Verticals</span>
                <div className="flex flex-wrap gap-2">
                  {verticals.length === 0 ? (
                    <p className="text-xs text-white/20 italic">No target niches defined.</p>
                  ) : (
                    verticals.map((v) => (
                      <span key={v} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 capitalize">
                        {v}
                        <button type="button" onClick={() => setVerticals(prev => prev.filter(item => item !== v))} className="hover:text-emerald-200 text-emerald-400/50 transition-colors">
                          <X className="size-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="flex gap-2 mt-4 max-w-sm">
                  <input
                    placeholder="Add niche (e.g. spas)..."
                    value={newVertical}
                    onChange={e => setNewVertical(e.target.value)}
                    className="flex-1 rounded-xl px-3 py-1.5 text-xs text-white bg-black/30 border border-white/5 outline-none placeholder:text-white/10"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addVertical(); } }}
                  />
                  <button onClick={addVertical} className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors shrink-0">
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Platform Options */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 space-y-3">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Target Channels / Mediums</span>
                <div className="flex flex-wrap gap-2">
                  {platforms.length === 0 ? (
                    <p className="text-xs text-white/20 italic">No search channels defined.</p>
                  ) : (
                    platforms.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white/60">
                        {p}
                        <button type="button" onClick={() => setPlatforms(prev => prev.filter(item => item !== p))} className="hover:text-white text-white/20 transition-colors">
                          <X className="size-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="flex gap-2 mt-4 max-w-sm">
                  <input
                    placeholder="Add channel (e.g. Yelp)..."
                    value={newPlatform}
                    onChange={e => setNewPlatform(e.target.value)}
                    className="flex-1 rounded-xl px-3 py-1.5 text-xs text-white bg-black/30 border border-white/5 outline-none placeholder:text-white/10"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPlatform(); } }}
                  />
                  <button onClick={addPlatform} className="p-2 rounded-xl bg-white/10 border border-white/10 text-white/60 hover:bg-white/15 transition-colors shrink-0">
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Campaigns */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-amber-400" />
                  <span>Campaign Outreach presets</span>
                </h2>
                <p className="text-[11px] text-white/30 mt-1">Templates for outbound messages scheduled over multiple steps.</p>
              </div>
              <button
                onClick={() => setSequences(prev => [...prev, { id: `seq_${Date.now()}`, name: "New Campaign Hook", steps: 3, description: "Pitch details..." }])}
                className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl hover:bg-amber-500/20 transition-all shrink-0"
              >
                <Plus className="size-3.5" /> Add Preset
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {sequences.map((seq, idx) => (
                <div key={seq.id || idx} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4.5 space-y-3.5 relative group/seq">
                  <button 
                    onClick={() => setSequences(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-3.5 right-3.5 opacity-0 group-hover/seq:opacity-100 p-1.5 text-white/20 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10 border border-transparent"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <div className="grid gap-3 grid-cols-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Campaign Name</label>
                      <input
                        value={seq.name}
                        onChange={e => setSequences(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                        className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white bg-black/25 border border-white/5 outline-none focus:border-white/15"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Outreach Steps</label>
                      <input
                        type="number"
                        value={seq.steps}
                        onChange={e => setSequences(prev => prev.map((item, i) => i === idx ? { ...item, steps: parseInt(e.target.value) || 0 } : item))}
                        className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white bg-black/25 border border-white/5 outline-none focus:border-white/15"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Outreach Angle / Lead Pitch</label>
                    <textarea
                      value={seq.description}
                      onChange={e => setSequences(prev => prev.map((item, i) => i === idx ? { ...item, description: e.target.value } : item))}
                      rows={4}
                      className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white/70 bg-black/25 border border-white/5 outline-none focus:border-white/15 resize-y leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Response Playbook */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="size-4 text-sky-400" />
                  <span>Response Playbook (AI Objection Handlers)</span>
                </h2>
                <p className="text-[11px] text-white/30 mt-1">AI negotiation overrides used when prospect replies express objections.</p>
              </div>
              <button
                onClick={() => setObjections(prev => [...prev, { objection: "New objection text", response: "Strategic response outline..." }])}
                className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl hover:bg-sky-500/20 transition-all shrink-0"
              >
                <Plus className="size-3.5" /> Add Objection
              </button>
            </div>

            <div className="space-y-4">
              {objections.length === 0 ? (
                <p className="text-xs text-white/20 italic p-3 text-center border border-dashed border-white/5 rounded-xl">No overrides. AI drafts general replies.</p>
              ) : (
                objections.map((obj, idx) => (
                  <div key={idx} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 space-y-3 relative group/obj">
                    <button 
                      onClick={() => setObjections(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-3.5 right-3.5 opacity-0 group-hover/obj:opacity-100 p-1.5 text-white/20 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10 border border-transparent"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-rose-400/80 uppercase tracking-wider">Prospect Objection</label>
                        <input
                          value={obj.objection}
                          onChange={e => setObjections(prev => prev.map((item, i) => i === idx ? { ...item, objection: e.target.value } : item))}
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white bg-black/25 border border-white/5 outline-none focus:border-white/15"
                          placeholder="e.g. Too expensive"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-sky-400/80 uppercase tracking-wider">AI Response Strategy</label>
                        <textarea
                          value={obj.response}
                          onChange={e => setObjections(prev => prev.map((item, i) => i === idx ? { ...item, response: e.target.value } : item))}
                          rows={3}
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white/70 bg-black/25 border border-white/5 outline-none focus:border-white/15 resize-y leading-relaxed"
                          placeholder="e.g. Highlight ROI and custom trial packages..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 4: Closing Proposals */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="size-4 text-pink-400" />
                  <span>Proposal Models &amp; Pricing Packages</span>
                </h2>
                <p className="text-[11px] text-white/30 mt-1">Preset proposal package retainers and setup fees used when closing leads.</p>
              </div>
              <button
                onClick={() => setProposals(prev => [...prev, { id: `prop_${Date.now()}`, name: "New Plan", description: "Deliverables...", price: 1000, setupPrice: 500, period: "monthly", currency: proposals[0]?.currency || "GBP" }])}
                className="flex items-center gap-1.5 text-[11px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 rounded-xl hover:bg-pink-500/20 transition-all shrink-0"
              >
                <Plus className="size-3.5" /> Add Model
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {proposals.map((prop, idx) => (
                <div key={prop.id || idx} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4.5 space-y-3.5 relative group/prop">
                  <button 
                    onClick={() => setProposals(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-3.5 right-3.5 opacity-0 group-hover/prop:opacity-100 p-1.5 text-white/20 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10 border border-transparent"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Package Name</label>
                      <input
                        value={prop.name}
                        onChange={e => setProposals(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                        className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white bg-black/25 border border-white/5 outline-none focus:border-white/15"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Price ({prop.currency === "GBP" ? "£" : prop.currency})</label>
                        <input
                          type="number"
                          value={prop.price}
                          onChange={e => setProposals(prev => prev.map((item, i) => i === idx ? { ...item, price: parseFloat(e.target.value) || 0 } : item))}
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white bg-black/25 border border-white/5 outline-none focus:border-white/15"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Setup ({prop.currency === "GBP" ? "£" : prop.currency})</label>
                        <input
                          type="number"
                          value={prop.setupPrice || 0}
                          onChange={e => setProposals(prev => prev.map((item, i) => i === idx ? { ...item, setupPrice: parseFloat(e.target.value) || 0 } : item))}
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white bg-black/25 border border-white/5 outline-none focus:border-white/15"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Billing Period</label>
                      <select
                        value={prop.period}
                        onChange={e => setProposals(prev => prev.map((item, i) => i === idx ? { ...item, period: e.target.value } : item))}
                        className="w-full rounded-lg px-2 py-1.5 text-xs text-white bg-black/25 border border-white/5 outline-none focus:border-white/15"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="one-off">One-off</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Currency</label>
                      <input
                        value={prop.currency}
                        onChange={e => setProposals(prev => prev.map((item, i) => i === idx ? { ...item, currency: e.target.value } : item))}
                        className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white bg-black/25 border border-white/5 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Deliverables / Retainer Details</label>
                    <textarea
                      value={prop.description}
                      onChange={e => setProposals(prev => prev.map((item, i) => i === idx ? { ...item, description: e.target.value } : item))}
                      rows={4}
                      className="w-full rounded-lg px-2.5 py-1.5 text-xs text-white/70 bg-black/25 border border-white/5 outline-none focus:border-white/15 resize-y leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
