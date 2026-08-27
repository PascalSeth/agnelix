/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import {
  FileText,
  CheckCircle2,
  Loader2,
  Target,
  MessageSquare,
  Plus,
  Trash2,
  X,
  Save,
  Compass,
  ArrowRight,
  Zap,
  Info,
  DollarSign,
  HelpCircle,
  Eye,
  Check,
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { CURRENCY_OPTIONS, getCurrencySymbol } from "@/lib/currency"

const card = {
  background: "linear-gradient(145deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.01) 100%)",
  border: "1px solid rgba(255,255,255,.07)",
}

const COMMON_OBJECTION_SUGGESTIONS = [
  {
    objection: "We already work with an agency / handled in-house",
    response: "Acknowledge and respect their existing team. Offer to share a 2-minute complimentary audit or benchmark without asking them to switch.",
  },
  {
    objection: "Too expensive / we don't have budget right now",
    response: "Validate their budget constraints. Propose a lower-tier starter package or a performance-tied trial to prove ROI first.",
  },
  {
    objection: "Send me some information / case studies first",
    response: "Agree immediately and provide a concise 2-sentence summary of a relevant client transformation, then ask if a 5-minute intro makes sense next Tuesday.",
  },
  {
    objection: "Bad timing / reach out in Q3 or next quarter",
    response: "Thank them, confirm the exact month to reconnect, and offer a quick value checklist they can use in the meantime.",
  },
]

export default function TemplatesPage() {
  const { activePlaybook } = usePlaybook()
  const router = useRouter()

  const [agencyName, setAgencyName] = useState("")
  const [hasDesc, setHasDesc] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [suggestingTargeting, setSuggestingTargeting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Local editable states synced from activePlaybook
  const [verticals, setVerticals] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [objections, setObjections] = useState<Array<{ objection: string; response: string }>>([])
  const [sequences, setSequences] = useState<Array<{ id: string; name: string; steps: number; description: string }>>([])
  const [proposals, setProposals] = useState<
    Array<{ id: string; name: string; description: string; price: number; setupPrice: number; period: string; currency: string }>
  >([])

  const [newVertical, setNewVertical] = useState("")
  const [newPlatform, setNewPlatform] = useState("")
  const [previewSeqIdx, setPreviewSeqIdx] = useState<number | null>(null)

  // AI Operations-to-Outreach Preset Generator State
  const [operationsInput, setOperationsInput] = useState("")
  const [operationalHook, setOperationalHook] = useState("Free Audit & Sample Teardown")
  const [operationalStepsCount, setOperationalStepsCount] = useState(3)
  const [operationalTone, setOperationalTone] = useState("Direct & Consultative")
  const [generatingOperationalPreset, setGeneratingOperationalPreset] = useState(false)
  const [generatedPresetResult, setGeneratedPresetResult] = useState<{
    name: string
    steps: number
    description: string
    operationalSummary?: string
    stepBreakdown?: Array<{ stepNumber: number; dayDelay: number; title: string; directive: string }>
  } | null>(null)

  const steps = [
    {
      id: "targeting",
      icon: Target,
      label: "Target Audiences",
      subtitle: "Niches & Discovery Channels",
      badge: `${verticals.length} niches`,
    },
    {
      id: "campaigns",
      icon: CheckCircle2,
      label: "Outreach Presets",
      subtitle: "Multi-Step Campaign Angles",
      badge: `${sequences.length} presets`,
    },
    {
      id: "objections",
      icon: MessageSquare,
      label: "AI Reply Playbook",
      subtitle: "Objection & Negotiation Rules",
      badge: `${objections.length} rules`,
    },
    {
      id: "proposals",
      icon: FileText,
      label: "Proposal Models",
      subtitle: "Retainers & Pricing Packages",
      badge: `${proposals.length} tiers`,
    },
  ]

  // Fetch agency settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
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
      setIsDirty(false)
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
          proposalTemplates: proposals,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Templates & playbook configuration saved!")
      setIsDirty(false)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save settings"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const [playbookStrategyFocus, setPlaybookStrategyFocus] = useState("Consultative Value Audits & Loom Teardowns")

  async function handleGenerateTemplates() {
    if (!hasDesc) {
      toast.error("Please configure your Agency Description in settings first.")
      router.push("/settings/agency")
      return
    }
    setGenerating(true)
    const toastId = toast.loading("AI is generating an elite, non-generic acquisition playbook with high-converting openers, closers, and pricing tiers...")
    try {
      const res = await fetch("/api/playbooks/generate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyFocus: playbookStrategyFocus,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate templates")
      }
      toast.success("Complete acquisition playbook successfully generated with anti-slop copy directives!", { id: toastId })

      // Update local states immediately
      setVerticals(data.targetVerticals || [])
      setPlatforms(data.platformOptions || [])
      setObjections(data.objectionHandlers || [])
      setSequences(data.sequenceTemplates || [])
      setProposals(data.proposalTemplates || [])
      setIsDirty(false)

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
    const toastId = toast.loading("AI is analyzing your agency bio for high-converting niches...")
    try {
      const res = await fetch("/api/playbooks/suggest-targeting", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to suggest targeting")
      }

      if (Array.isArray(data.verticals)) {
        setVerticals((prev) => {
          const merged = [...prev]
          data.verticals.forEach((v: string) => {
            if (!merged.includes(v)) merged.push(v)
          })
          return merged
        })
      }
      if (Array.isArray(data.platformOptions)) {
        setPlatforms((prev) => {
          const merged = [...prev]
          data.platformOptions.forEach((p: string) => {
            if (!merged.includes(p)) merged.push(p)
          })
          return merged
        })
      }

      setIsDirty(true)
      toast.success("AI suggested niches and channels added!", { id: toastId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to suggest targeting options."
      toast.error(msg, { id: toastId })
    } finally {
      setSuggestingTargeting(false)
    }
  }

  async function handleGenerateOperationalPreset() {
    if (!operationsInput.trim()) {
      toast.error("Please describe your agency's operations or fulfillment workflow.")
      return
    }

    setGeneratingOperationalPreset(true)
    const toastId = toast.loading("AI is translating your agency operations into a tailored sequence preset...")
    try {
      const res = await fetch("/api/playbooks/generate-operational-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationsOverview: operationsInput,
          primaryHook: operationalHook,
          preferredSteps: operationalStepsCount,
          tone: operationalTone,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate preset")
      }

      if (data.preset) {
        setGeneratedPresetResult(data.preset)
        toast.success("AI synthesized a custom outreach preset based on your operations!", { id: toastId })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operational preset generation failed."
      toast.error(msg, { id: toastId })
    } finally {
      setGeneratingOperationalPreset(false)
    }
  }

  function applyGeneratedPreset() {
    if (!generatedPresetResult) return

    const newSeq = {
      id: `seq_${Date.now()}`,
      name: generatedPresetResult.name,
      steps: generatedPresetResult.steps || operationalStepsCount || 3,
      description: generatedPresetResult.description,
    }

    setSequences((prev) => [newSeq, ...prev])
    setIsDirty(true)
    toast.success(`"${generatedPresetResult.name}" added to your active outreach presets! Click "Save Configuration" to persist.`)
    setGeneratedPresetResult(null)
  }

  function addVertical(val = newVertical) {
    const clean = val.trim().toLowerCase()
    if (!clean) return
    if (verticals.includes(clean)) {
      toast.error("Niche already added")
      return
    }
    setVerticals((prev) => [...prev, clean])
    setNewVertical("")
    setIsDirty(true)
  }

  function addPlatform(val = newPlatform) {
    const clean = val.trim()
    if (!clean) return
    if (platforms.includes(clean)) {
      toast.error("Channel already added")
      return
    }
    setPlatforms((prev) => [...prev, clean])
    setNewPlatform("")
    setIsDirty(true)
  }

  function addObjectionPreset(preset: { objection: string; response: string }) {
    if (objections.some((o) => o.objection.toLowerCase() === preset.objection.toLowerCase())) {
      toast.error("This objection rule already exists")
      return
    }
    setObjections((prev) => [...prev, preset])
    setIsDirty(true)
    toast.success("Added objection handler rule")
  }

  if (!activePlaybook) {
    return (
      <div className="flex h-96 items-center justify-center text-white/40 text-sm">
        <Loader2 className="size-5 animate-spin mr-2" />
        Loading templates studio...
      </div>
    )
  }

  return (
    <div className="space-y-8 relative pb-28">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Compass className="size-3.5" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-indigo-400">
              {activePlaybook.name} Playbook
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/95">
            Outreach Templates &amp; Strategy Studio
          </h1>
          <p className="mt-2 text-[13px] text-white/40 max-w-2xl leading-relaxed">
            Customize the targeting rules, cold sequence angles, AI objection handlers, and closing proposals used by
            Gale Bot to run your acquisition engine.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || generating}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{saving ? "Saving Changes..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>

      {/* AI One-Click Pipeline Customizer Card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 border shadow-xl space-y-4"
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 50%, rgba(15, 17, 26, 0.9) 100%)",
          borderColor: "rgba(99, 102, 241, 0.3)",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="size-4 text-indigo-400 animate-pulse" />
              </div>
              <h2 className="text-[14px] font-black text-white uppercase tracking-wider">
                AI Playbook Auto-Generator
              </h2>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Anti-Slop Engine
              </span>
            </div>
            <p className="text-[12.5px] text-white/70 leading-relaxed">
              Tailor your entire acquisition strategy (targeting, email sequences, objection counters, and pricing tiers) to:{" "}
              <strong className="text-white underline decoration-indigo-400/50">{agencyName || "your agency profile"}</strong>.
            </p>
          </div>

          <button
            onClick={handleGenerateTemplates}
            disabled={generating || saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 text-white text-xs font-black px-5 py-3 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all disabled:opacity-40 whitespace-nowrap shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin text-white" />
                <span>Crafting Elite Playbook...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-white fill-current" />
                <span>Rewrite Entire Playbook with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Strategy Focus Selector & Conversion Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="size-3" /> Acquisition Strategy Focus:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Consultative Value Audits & Loom Teardowns",
                "Direct ROI & Problem-First Outbound",
                "Competitor Benchmark & Ad Gap Analysis",
                "Performance-Based / Revenue Share",
                "High-Ticket Retainers ($2.5k–$5k/mo)",
              ].map((focus) => (
                <button
                  key={focus}
                  type="button"
                  onClick={() => setPlaybookStrategyFocus(focus)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-lg border transition-all font-medium",
                    playbookStrategyFocus === focus
                      ? "bg-indigo-500/25 text-white border-indigo-400/50 shadow-sm"
                      : "bg-white/[0.03] text-white/50 border-white/[0.06] hover:text-white/80"
                  )}
                >
                  {focus}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.05] space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-white/90 font-bold">
              <Check className="size-3.5 text-emerald-400" />
              <span>Conversion-Tuned Copy Standards:</span>
            </div>
            <p className="text-white/50 leading-relaxed">
              Every sequence is generated with <strong>observation-anchored openers</strong>, <strong>frictionless permission closers</strong> (e.g. &ldquo;Worth a quick look?&rdquo;), and <strong>Chris Voss tactical empathy</strong> for objection handling.
            </p>
          </div>
        </div>
      </div>

      {/* 4-Pillar Tab Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {steps.map((step, idx) => {
          const active = activeStep === idx
          const Icon = step.icon
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "flex flex-col items-start text-left p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group",
                active
                  ? "bg-white/[0.05] border-indigo-500/40 text-white shadow-xl"
                  : "bg-white/[0.015] border-white/[0.06] hover:bg-white/[0.03] text-white/50"
              )}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 pointer-events-none" />
              )}
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex items-center justify-center size-7 rounded-xl text-xs font-bold border transition-colors",
                      active
                        ? "bg-indigo-500/20 border-indigo-400 text-indigo-300"
                        : "bg-white/5 border-white/10 text-white/40 group-hover:border-white/20"
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-[13px] font-bold text-white/90">{step.label}</span>
                </div>
              </div>
              <p className="text-[11.5px] text-white/40 font-medium">{step.subtitle}</p>
              <div className="mt-3">
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                    active
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-white/5 text-white/30"
                  )}
                >
                  {step.badge}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Targeting & Niches */}
      {activeStep === 0 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* AI Helper Banner */}
          <div className="rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={card}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-emerald-400" />
                <h3 className="text-[13px] font-bold text-white">Target Niches &amp; Lead Discovery Channels</h3>
              </div>
              <p className="text-[12px] text-white/40">
                Gale Bot uses these target tags when scanning Google Places, Social feeds, and local registries.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSuggestTargeting}
              disabled={suggestingTargeting}
              className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all shrink-0 disabled:opacity-40"
            >
              {suggestingTargeting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              <span>Auto-Suggest Niches with AI</span>
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Target Niches */}
            <div className="rounded-2xl p-5 space-y-4" style={card}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-bold text-white">Target Niches / Verticals</h4>
                  <p className="text-[11px] text-white/40">Specific business types or consumer groups you serve.</p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  {verticals.length} Active
                </span>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                {verticals.length === 0 ? (
                  <p className="text-[12px] text-white/30 italic self-center">No niches added yet. Type below or click suggest.</p>
                ) : (
                  verticals.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[12px] font-semibold text-emerald-300 capitalize shadow-sm"
                    >
                      {v}
                      <button
                        type="button"
                        onClick={() => {
                          setVerticals((prev) => prev.filter((item) => item !== v))
                          setIsDirty(true)
                        }}
                        className="hover:text-emerald-100 text-emerald-400/60 transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Add custom niche (e.g. dental clinics, luxury transport, roofing)..."
                  value={newVertical}
                  onChange={(e) => setNewVertical(e.target.value)}
                  className="flex-1 rounded-xl px-3.5 py-2 text-[12.5px] text-white bg-black/40 border border-white/[0.08] outline-none focus:border-emerald-500/50 placeholder:text-white/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addVertical()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addVertical()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shrink-0"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* Quick Preset Chips */}
              <div className="pt-2 border-t border-white/[0.05]">
                <span className="text-[10.5px] font-bold text-white/30 uppercase tracking-wider block mb-2">
                  Quick Add Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["Dental Clinics", "Roofing Contractors", "Luxury Chauffeurs", "E-commerce Brands", "Real Estate Agents", "Med Spas"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addVertical(tag)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.07] text-white/60 hover:text-white border border-white/[0.05] transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Discovery Platforms */}
            <div className="rounded-2xl p-5 space-y-4" style={card}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-bold text-white">Lead Discovery Channels</h4>
                  <p className="text-[11px] text-white/40">Sources scanned by Gale for prospects and requests.</p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                  {platforms.length} Active
                </span>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                {platforms.length === 0 ? (
                  <p className="text-[12px] text-white/30 italic self-center">No channels added yet.</p>
                ) : (
                  platforms.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 text-[12px] font-semibold text-indigo-300 shadow-sm"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => {
                          setPlatforms((prev) => prev.filter((item) => item !== p))
                          setIsDirty(true)
                        }}
                        className="hover:text-indigo-100 text-indigo-400/60 transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Add custom channel (e.g. Google Maps, Reddit, Yelp)..."
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="flex-1 rounded-xl px-3.5 py-2 text-[12.5px] text-white bg-black/40 border border-white/[0.08] outline-none focus:border-indigo-500/50 placeholder:text-white/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addPlatform()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addPlatform()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* Quick Platform Chips */}
              <div className="pt-2 border-t border-white/[0.05]">
                <span className="text-[10.5px] font-bold text-white/30 uppercase tracking-wider block mb-2">
                  Popular Channels:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["Google Maps", "Reddit Forums", "LinkedIn", "Instagram", "Yelp", "Local Directories"].map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => addPlatform(plat)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.07] text-white/60 hover:text-white border border-white/[0.05] transition-colors"
                    >
                      + {plat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Campaigns & Sequences */}
      {activeStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* AI Operations-to-Outreach Preset Generator Hub */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 border shadow-xl"
            style={{
              background: "linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.03) 50%, rgba(15, 17, 26, 0.8) 100%)",
              borderColor: "rgba(251, 191, 36, 0.25)",
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Sparkles className="size-4 animate-pulse text-amber-400" />
                  </div>
                  <h3 className="text-[15px] font-black text-white uppercase tracking-wider">
                    AI Operations-to-Preset Generator
                  </h3>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Smart Flow
                  </span>
                </div>
                <p className="text-[13px] text-white/70 leading-relaxed">
                  Give AI an overview of how your agency fulfills services or audits prospects. AI will translate your real operational workflow into a tailored multi-step cold outreach preset that reflects how you actually operate.
                </p>

                {/* Operations Overview Input */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300/90 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="size-3 text-amber-400" /> Your Agency&apos;s Operations &amp; Delivery Flow:
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={operationsInput}
                    onChange={(e) => setOperationsInput(e.target.value)}
                    placeholder="e.g., We audit website speed and mobile responsiveness, record a 2-minute Loom teardown showing the 3 biggest conversion leaks, and offer a free fix for the hero layout. Then follow up with an e-commerce case study that boosted checkout conversions by 34%..."
                    className="w-full rounded-xl p-3.5 text-[12.5px] text-white placeholder:text-white/25 bg-black/50 border border-white/[0.1] focus:border-amber-500/60 outline-none leading-relaxed transition-all"
                  />
                </div>

                {/* 1-Click Operations Flow Inspirations */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    1-Click Operational Flow Inspirations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: "🎥 Loom Video & Teardown",
                        text: "We record a 90-second personalized Loom teardown showing 3 specific visual/UX bugs on their website, followed by a free Figma mockup sample and a case study."
                      },
                      {
                        label: "📊 Google Map Pack & SEO",
                        text: "We run a local ranking audit showing they are missing out on the top 3 Google Map pack spots to competitors, calculate their lost monthly calls, and offer a keyword roadmap."
                      },
                      {
                        label: "⚡ Page Speed & Checkout Leaks",
                        text: "We test their mobile page speed and checkout drop-off points, provide a 1-page speed diagnostics report, and guarantee a sub-2-second load time."
                      },
                      {
                        label: "💰 Performance Revenue-Share",
                        text: "We offer zero upfront cost lead generation where we set qualified appointments on their calendar and only take a percentage or fee per closed client."
                      },
                      {
                        label: "🤝 Competitor Benchmark",
                        text: "We benchmark their current ad creatives and offer against their 2 biggest local competitors, revealing the exact customer gaps their competitors are capitalizing on."
                      },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setOperationsInput(chip.text)}
                        className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-amber-500/15 border border-white/[0.07] hover:border-amber-500/30 transition-all"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy Customization Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Primary Hook</label>
                    <select
                      value={operationalHook}
                      onChange={(e) => setOperationalHook(e.target.value)}
                      className="w-full bg-black/50 border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/80 outline-none"
                    >
                      <option value="Free Audit & Sample Teardown">Free Audit &amp; Sample Teardown</option>
                      <option value="Missed Revenue & Leaks">Missed Revenue &amp; Leaks</option>
                      <option value="Competitor Benchmark">Competitor Benchmark</option>
                      <option value="Performance Guarantee">Performance Guarantee</option>
                      <option value="Fast Implementation">Fast Implementation (Under 7 Days)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Sequence Steps</label>
                    <select
                      value={operationalStepsCount}
                      onChange={(e) => setOperationalStepsCount(parseInt(e.target.value) || 3)}
                      className="w-full bg-black/50 border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/80 outline-none text-center"
                    >
                      <option value={3}>3 Steps (Standard Cadence)</option>
                      <option value={4}>4 Steps (High-Touch Cadence)</option>
                      <option value={5}>5 Steps (Comprehensive Cadence)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Tone &amp; Style</label>
                    <select
                      value={operationalTone}
                      onChange={(e) => setOperationalTone(e.target.value)}
                      className="w-full bg-black/50 border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/80 outline-none"
                    >
                      <option value="Direct & Consultative">Direct &amp; Consultative</option>
                      <option value="Casual & Peer-to-Peer">Casual &amp; Peer-to-Peer</option>
                      <option value="Analytical & ROI-Obsessed">Analytical &amp; ROI-Obsessed</option>
                      <option value="Bold & Visionary">Bold &amp; Visionary</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-col items-start lg:items-end justify-center shrink-0 self-center lg:self-start pt-2">
                <button
                  type="button"
                  onClick={handleGenerateOperationalPreset}
                  disabled={generatingOperationalPreset || !operationsInput.trim()}
                  className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-black text-black bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-110 shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                >
                  {generatingOperationalPreset ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-black" />
                      <span>Synthesizing Preset...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 text-black fill-current" />
                      <span>Generate Operational Preset</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Preset Result Preview Card */}
            {generatedPresetResult && (
              <div className="mt-6 p-5 rounded-2xl bg-black/60 border border-amber-500/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                      <h4 className="text-[15px] font-black text-white">
                        {generatedPresetResult.name}
                      </h4>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        {generatedPresetResult.steps} Steps
                      </span>
                    </div>
                    {generatedPresetResult.operationalSummary && (
                      <p className="text-[12px] text-amber-300/80 font-medium">
                        💡 {generatedPresetResult.operationalSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyGeneratedPreset}
                      className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-black text-black bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all"
                    >
                      <Plus className="size-3.5" />
                      <span>Apply &amp; Add to Presets</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">AI Strategy Directive</label>
                  <p className="text-[12.5px] text-white/80 leading-relaxed bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.04] font-sans">
                    {generatedPresetResult.description}
                  </p>
                </div>

                {generatedPresetResult.stepBreakdown && generatedPresetResult.stepBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Step-by-Step Cadence Flow</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {generatedPresetResult.stepBreakdown.map((sb) => (
                        <div key={sb.stepNumber} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-300">
                              Step {sb.stepNumber} ({sb.dayDelay === 0 ? "Immediate" : `+${sb.dayDelay}d`})
                            </span>
                          </div>
                          <p className="text-[12px] font-bold text-white/90 truncate">{sb.title}</p>
                          <p className="text-[11px] text-white/50 line-clamp-3 leading-relaxed">{sb.directive}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preset List Header */}
          <div className="rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={card}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-amber-400" />
                <h3 className="text-[13px] font-bold text-white">Active Outreach Presets</h3>
              </div>
              <p className="text-[12px] text-white/40">
                These core angles dictate how Gale Bot structures multi-step cold email and message sequences for each campaign.
              </p>
            </div>

            <button
              onClick={() => {
                setSequences((prev) => [
                  ...prev,
                  {
                    id: `seq_${Date.now()}`,
                    name: "New Value Proposition Angle",
                    steps: 3,
                    description: "Step 1: Point out a specific friction point on their site. Step 2: Show transformation proof. Step 3: Low-pressure closing call.",
                  },
                ])
                setIsDirty(true)
              }}
              className="flex items-center gap-1.5 text-[12px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 rounded-xl hover:bg-amber-500/25 transition-all shrink-0"
            >
              <Plus className="size-3.5" />
              <span>Add Custom Preset</span>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sequences.map((seq, idx) => (
              <div key={seq.id || idx} className="rounded-2xl p-5 space-y-4 relative group/seq" style={card}>
                <button
                  onClick={() => {
                    setSequences((prev) => prev.filter((_, i) => i !== idx))
                    setIsDirty(true)
                  }}
                  className="absolute top-4 right-4 p-1.5 text-white/20 hover:text-rose-400 transition-all rounded-lg hover:bg-rose-500/10 border border-transparent opacity-0 group-hover/seq:opacity-100"
                  title="Delete preset"
                >
                  <Trash2 className="size-3.5" />
                </button>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Campaign Name</label>
                    <input
                      value={seq.name}
                      onChange={(e) => {
                        const val = e.target.value
                        setSequences((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                        )
                        setIsDirty(true)
                      }}
                      className="w-full rounded-xl px-3 py-2 text-[12.5px] font-bold text-white bg-black/40 border border-white/[0.08] outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Outreach Steps</label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={seq.steps}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setSequences((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, steps: val } : item))
                        )
                        setIsDirty(true)
                      }}
                      className="w-full rounded-xl px-3 py-2 text-[12.5px] font-bold text-white bg-black/40 border border-white/[0.08] outline-none focus:border-amber-500/50 text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Core Angle &amp; Sequence Instructions
                  </label>
                  <textarea
                    value={seq.description}
                    onChange={(e) => {
                      const val = e.target.value
                      setSequences((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                      )
                      setIsDirty(true)
                    }}
                    rows={4}
                    className="w-full rounded-xl p-3 text-[12px] text-white/80 bg-black/40 border border-white/[0.08] outline-none focus:border-amber-500/50 resize-y leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
                  <span className="text-[11px] text-amber-400/80 flex items-center gap-1 font-semibold">
                    <Zap className="size-3" />
                    <span>Auto-injected into Step 1–{seq.steps} AI drafts</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setPreviewSeqIdx(previewSeqIdx === idx ? null : idx)}
                    className="flex items-center gap-1 text-[11px] font-bold text-white/50 hover:text-white transition-colors"
                  >
                    <Eye className="size-3" />
                    <span>{previewSeqIdx === idx ? "Hide Flow" : "View Step Flow"}</span>
                  </button>
                </div>

                {previewSeqIdx === idx && (
                  <div className="mt-3 p-3 rounded-xl bg-black/50 border border-amber-500/20 space-y-2 text-[11.5px]">
                    <div className="flex items-center gap-2 text-white/80 font-bold">
                      <span className="size-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">1</span>
                      <span>Day 0: Personalized Icebreaker + Core Angle</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80 font-bold">
                      <span className="size-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">2</span>
                      <span>Day 3: Proof / Value Asset Follow-up</span>
                    </div>
                    {seq.steps >= 3 && (
                      <div className="flex items-center gap-2 text-white/80 font-bold">
                        <span className="size-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">3</span>
                        <span>Day 6: Low-Friction Permission Close</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Response Playbook (AI Objection Handlers) */}
      {activeStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={card}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-sky-400" />
                <h3 className="text-[13px] font-bold text-white">AI Objection Handlers &amp; Reply Rules</h3>
              </div>
              <p className="text-[12px] text-white/40">
                When a lead replies with hesitation or pushback, Gale Bot applies these tactical counter-strategies.
              </p>
            </div>

            <button
              onClick={() => {
                setObjections((prev) => [
                  ...prev,
                  {
                    objection: "Competitor mention or price hesitation",
                    response: "Acknowledge their current position with tactical empathy. Offer a zero-risk 5-minute review without pressure.",
                  },
                ])
                setIsDirty(true)
              }}
              className="flex items-center gap-1.5 text-[12px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-3.5 py-2 rounded-xl hover:bg-sky-500/25 transition-all shrink-0"
            >
              <Plus className="size-3.5" />
              <span>Add Custom Objection</span>
            </button>
          </div>

          {/* Quick Common Objection Presets */}
          <div className="rounded-2xl p-4 space-y-2.5" style={card}>
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">
              1-Click Add Common Objection Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {COMMON_OBJECTION_SUGGESTIONS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addObjectionPreset(preset)}
                  className="text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all group"
                >
                  <p className="text-[11.5px] font-bold text-white/80 group-hover:text-sky-300 truncate">
                    + &ldquo;{preset.objection}&rdquo;
                  </p>
                  <p className="text-[10px] text-white/35 truncate mt-0.5">{preset.response}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Active Handlers List */}
          <div className="space-y-3.5">
            {objections.length === 0 ? (
              <div className="p-8 text-center rounded-2xl" style={card}>
                <MessageSquare className="size-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm font-bold text-white/70">No objection rules configured</p>
                <p className="text-xs text-white/30 mt-1">Gale Bot will use standard polite consulting replies.</p>
              </div>
            ) : (
              objections.map((obj, idx) => (
                <div key={idx} className="rounded-2xl p-4.5 relative group/obj" style={card}>
                  <button
                    onClick={() => {
                      setObjections((prev) => prev.filter((_, i) => i !== idx))
                      setIsDirty(true)
                    }}
                    className="absolute top-4 right-4 p-1.5 text-white/20 hover:text-rose-400 transition-all rounded-lg hover:bg-rose-500/10 border border-transparent opacity-0 group-hover/obj:opacity-100"
                    title="Delete objection rule"
                  >
                    <Trash2 className="size-3.5" />
                  </button>

                  <div className="grid gap-4 md:grid-cols-12">
                    <div className="md:col-span-4 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-rose-400" />
                        <label className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                          When Prospect Says
                        </label>
                      </div>
                      <input
                        value={obj.objection}
                        onChange={(e) => {
                          const val = e.target.value
                          setObjections((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, objection: val } : item))
                          )
                          setIsDirty(true)
                        }}
                        placeholder="e.g. Too expensive / We already have someone"
                        className="w-full rounded-xl p-2.5 text-[12.5px] font-bold text-white bg-black/40 border border-white/[0.08] outline-none focus:border-rose-500/50"
                      />
                    </div>

                    <div className="md:col-span-8 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-sky-400" />
                        <label className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">
                          Gale Bot Response Strategy
                        </label>
                      </div>
                      <textarea
                        value={obj.response}
                        onChange={(e) => {
                          const val = e.target.value
                          setObjections((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, response: val } : item))
                          )
                          setIsDirty(true)
                        }}
                        rows={2}
                        placeholder="e.g. Label their concern, offer a no-strings case study or pilot..."
                        className="w-full rounded-xl p-2.5 text-[12px] text-white/80 bg-black/40 border border-white/[0.08] outline-none focus:border-sky-500/50 resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Proposal Models & Pricing Packages */}
      {activeStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={card}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-pink-400" />
                <h3 className="text-[13px] font-bold text-white">Proposal Models &amp; Pricing Packages</h3>
              </div>
              <p className="text-[12px] text-white/40">
                Preset retainer tiers and pricing packages injected when generating digital client proposals.
              </p>
            </div>

            <button
              onClick={() => {
                setProposals((prev) => [
                  ...prev,
                  {
                    id: `prop_${Date.now()}`,
                    name: "Growth Retainer",
                    description: "Full monthly management, lead generation, and bi-weekly optimization reports.",
                    price: 1500,
                    setupPrice: 500,
                    period: "monthly",
                    currency: proposals[0]?.currency || "GBP",
                  },
                ])
                setIsDirty(true)
              }}
              className="flex items-center gap-1.5 text-[12px] font-bold text-pink-300 bg-pink-500/15 border border-pink-500/30 px-3.5 py-2 rounded-xl hover:bg-pink-500/25 transition-all shrink-0"
            >
              <Plus className="size-3.5" />
              <span>Add Package Tier</span>
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {proposals.map((prop, idx) => (
              <div key={prop.id || idx} className="rounded-2xl p-5 space-y-4 relative group/prop" style={card}>
                <button
                  onClick={() => {
                    setProposals((prev) => prev.filter((_, i) => i !== idx))
                    setIsDirty(true)
                  }}
                  className="absolute top-4 right-4 p-1.5 text-white/20 hover:text-rose-400 transition-all rounded-lg hover:bg-rose-500/10 border border-transparent opacity-0 group-hover/prop:opacity-100"
                  title="Delete tier"
                >
                  <Trash2 className="size-3.5" />
                </button>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Package Title</label>
                  <input
                    value={prop.name}
                    onChange={(e) => {
                      const val = e.target.value
                      setProposals((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                      )
                      setIsDirty(true)
                    }}
                    className="w-full rounded-xl px-3 py-2 text-[14px] font-black text-white bg-black/40 border border-white/[0.08] outline-none focus:border-pink-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      Price ({getCurrencySymbol(prop.currency)})
                    </label>
                    <input
                      type="number"
                      value={prop.price}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setProposals((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, price: val } : item))
                        )
                        setIsDirty(true)
                      }}
                      className="w-full rounded-xl px-3 py-2 text-[13px] font-bold text-emerald-400 bg-black/40 border border-white/[0.08] outline-none focus:border-pink-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      Setup Fee ({getCurrencySymbol(prop.currency)})
                    </label>
                    <input
                      type="number"
                      value={prop.setupPrice || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setProposals((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, setupPrice: val } : item))
                        )
                        setIsDirty(true)
                      }}
                      className="w-full rounded-xl px-3 py-2 text-[13px] font-bold text-white/70 bg-black/40 border border-white/[0.08] outline-none focus:border-pink-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Billing Frequency</label>
                    <select
                      value={prop.period}
                      onChange={(e) => {
                        const val = e.target.value
                        setProposals((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, period: val } : item))
                        )
                        setIsDirty(true)
                      }}
                      className="w-full rounded-xl px-2.5 py-2 text-[12px] text-white/90 bg-black/40 border border-white/[0.08] outline-none focus:border-pink-500/50"
                    >
                      <option value="monthly" className="bg-zinc-900 text-white">Monthly Retainer</option>
                      <option value="one-off" className="bg-zinc-900 text-white">One-Off Project</option>
                      <option value="quarterly" className="bg-zinc-900 text-white">Quarterly</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Currency</label>
                    <select
                      value={prop.currency || "USD"}
                      onChange={(e) => {
                        const val = e.target.value
                        setProposals((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, currency: val } : item))
                        )
                        setIsDirty(true)
                      }}
                      className="w-full rounded-xl px-2.5 py-2 text-[12px] font-bold text-white/90 bg-black/40 border border-white/[0.08] outline-none focus:border-pink-500/50"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code} className="bg-zinc-900 text-white">
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Deliverables Description</label>
                  <textarea
                    value={prop.description}
                    onChange={(e) => {
                      const val = e.target.value
                      setProposals((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                      )
                      setIsDirty(true)
                    }}
                    rows={3}
                    placeholder="List deliverables..."
                    className="w-full rounded-xl p-3 text-[12px] text-white/70 bg-black/40 border border-white/[0.08] outline-none focus:border-pink-500/50 resize-y leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Save Reminder Bar */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3.5 rounded-2xl bg-zinc-900/95 border border-indigo-500/40 shadow-2xl shadow-black/80 backdrop-blur-md animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[13px] font-bold text-white">You have unsaved changes in your templates</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activePlaybook) {
                  setVerticals(activePlaybook.targetVerticals || [])
                  setPlatforms(activePlaybook.platformOptions || [])
                  setObjections(activePlaybook.objectionHandlers || [])
                  setSequences(activePlaybook.sequenceTemplates || [])
                  setProposals(activePlaybook.proposalTemplates || [])
                  setIsDirty(false)
                  toast.info("Changes discarded")
                }
              }}
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white/60 hover:text-white transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[12.5px] shadow-lg shadow-indigo-500/30 transition-all"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
