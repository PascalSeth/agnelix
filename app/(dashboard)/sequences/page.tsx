/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { GitBranch, Plus, Trash2, Loader2, Pencil, Sparkles, X, ChevronDown, ChevronUp, Mail, UserPlus, MessageSquare, Hourglass, Lightbulb, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { usePlaybook } from "@/lib/playbook-context"

type Sequence = {
  id: string
  name: string
  isDefault: boolean
  createdAt: string
  steps: { 
    stepNumber: number; 
    delayDays: number; 
    subjectTemplate?: string | null; 
    bodyTemplate?: string | null;
    stepType?: string | null;
    aiPrompt?: string | null;
  }[]
}

type StepInput = {
  stepNumber: number
  delayDays: number
  label: string
  bodyTemplate: string
  aiPrompt: string
  expandedRules: boolean
  stepType: "EMAIL" | "LINKEDIN_CONNECT" | "LINKEDIN_MESSAGE" | "WAIT"
}

// ── Demo sequences — one per playbook type, showing how that kind of agency
// typically talks to prospects (angle, proof point, and offer).
const DEMO_SEQUENCES: Record<string, { name: string; angle: string; steps: Omit<StepInput, "expandedRules">[] }> = {
  social_media: {
    name: "Instagram Growth Outreach",
    angle: "Lead with a content/engagement gap you can see on their page, then prove it with results from a similar account, then make booking a call effortless.",
    steps: [
      { stepNumber: 1, delayDays: 0, label: "Spotted a content gap", bodyTemplate: "Draft a short, direct cold outreach email. Mention a content/reels inconsistency we noticed on their Instagram page. Pivot to the organic reach gap this leaves, and ask if they are open to seeing a content plan.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 2, delayDays: 3, label: "Proof from a similar account", bodyTemplate: "Draft a brief follow-up email. Cite a case study of a similar brand we helped grow from 2k to 11k followers in 90 days with Reels. Offer to share the exact plan we used.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 3, delayDays: 6, label: "Connect on LinkedIn", bodyTemplate: "Send a LinkedIn connection request. Reference our notes about their Instagram and suggest connecting to stay in touch.", aiPrompt: "", stepType: "LINKEDIN_CONNECT" },
      { stepNumber: 4, delayDays: 10, label: "Free content calendar offer", bodyTemplate: "Draft a final email. Offer to send a free, no-obligation 2-week content calendar tailored to their profile.", aiPrompt: "", stepType: "EMAIL" },
    ],
  },
  seo: {
    name: "Local SEO Audit Hook",
    angle: "Open with specific, visible problems on their site/Google profile, back it up with a quick-win case study, then offer a free audit to remove friction.",
    steps: [
      { stepNumber: 1, delayDays: 0, label: "3 things hurting your ranking", bodyTemplate: "Draft a short, direct cold email. Note a few specific SEO/ranking issues on their website (e.g. slow speed, mobile rendering, missing metadata). Ask if they want a breakdown of these issues.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 2, delayDays: 4, label: "Case study: similar business", bodyTemplate: "Draft a brief follow-up email. Highlight how we resolved similar ranking issues for a similar local business, helping them reach the top 3 of local maps in 8 weeks.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 3, delayDays: 8, label: "Free audit, final nudge", bodyTemplate: "Draft a final email. Offer to run a free, no-obligation custom SEO and speed audit.", aiPrompt: "", stepType: "EMAIL" },
    ],
  },
  ppc: {
    name: "Ad Spend Audit",
    angle: "Show you've done the research on their ad presence (or lack of it), quantify wasted spend with a benchmark, then offer a free teardown.",
    steps: [
      { stepNumber: 1, delayDays: 0, label: "What your competitors are spending", bodyTemplate: "Draft a short cold email. Mention that competitors are running campaigns for their keywords while their presence is low. Ask if they want a look at competitor ad spend data.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 2, delayDays: 3, label: "Where budget gets wasted", bodyTemplate: "Draft a brief follow-up email. Highlight that most ad accounts waste 20-30% on weak targeting, and offer a free teardown of their ad account strategy to identify wasted budget.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 3, delayDays: 6, label: "Connect on LinkedIn", bodyTemplate: "Send a LinkedIn connection request. Mention our competitor ad research and suggest connecting to continue the conversation.", aiPrompt: "", stepType: "LINKEDIN_CONNECT" },
      { stepNumber: 4, delayDays: 9, label: "Final offer: free teardown", bodyTemplate: "Draft a final email. Offer a free, no-obligation PPC account teardown.", aiPrompt: "", stepType: "EMAIL" },
    ],
  },
  sales: {
    name: "B2B Outreach Sequence",
    angle: "Lead with a specific pain point your buyer persona feels, follow with social proof, mix in LinkedIn touches, and close with a polite breakup that often re-engages.",
    steps: [
      { stepNumber: 1, delayDays: 0, label: "Pain point intro", bodyTemplate: "Draft a short cold email. Address the typical B2B prospecting pain point of spending hours on manual outreach. Ask how they currently handle outbound.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 2, delayDays: 3, label: "Case study / proof", bodyTemplate: "Draft a brief follow-up email. Mention that we helped a similar team automate prospecting to book 12 extra meetings a month, and offer to show how.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 3, delayDays: 6, label: "Connect on LinkedIn", bodyTemplate: "Send a LinkedIn connection request. Refer to our B2B outbound notes and suggest connecting.", aiPrompt: "", stepType: "LINKEDIN_CONNECT" },
      { stepNumber: 4, delayDays: 9, label: "LinkedIn nudge", bodyTemplate: "Send a LinkedIn follow-up message. Suggest a brief 15-minute call to see if our system is a fit.", aiPrompt: "", stepType: "LINKEDIN_MESSAGE" },
      { stepNumber: 5, delayDays: 13, label: "Breakup email", bodyTemplate: "Draft a polite breakup email closing the loop, leaving the door open for future collaboration.", aiPrompt: "", stepType: "EMAIL" },
    ],
  },
  finance: {
    name: "CFO Advisory Outreach",
    angle: "Speak to financial pain (cashflow, runway, tax) in plain terms, support with a results-based case study, then offer a low-friction financial health check.",
    steps: [
      { stepNumber: 1, delayDays: 0, label: "Cashflow visibility", bodyTemplate: "Draft a short cold email. Speak to the difficulty of cashflow visibility for founders. Ask if they currently use a rolling 13-week cashflow forecast.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 2, delayDays: 4, label: "Tax strategy case study", bodyTemplate: "Draft a brief follow-up email. Cite a case study of saving a client significant tax and cashflow overhead through forecasting. Offer to share details.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 3, delayDays: 8, label: "Free financial health check", bodyTemplate: "Draft a final email. Offer a free financial health check focusing on margins and runway.", aiPrompt: "", stepType: "EMAIL" },
    ],
  },
  web_design: {
    name: "Mobile/Speed Redesign Pitch",
    angle: "Point out a concrete, visible problem (mobile experience, load speed), show a before/after style proof, then offer a limited-time incentive.",
    steps: [
      { stepNumber: 1, delayDays: 0, label: "Mobile experience issue", bodyTemplate: "Draft a short cold email. Point out a slow load speed or hard-to-navigate mobile layout on their website. Ask if they want to see what is causing the gap.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 2, delayDays: 4, label: "Before/after example", bodyTemplate: "Share a before/after example of a clean redesign that boosted conversion rates for a similar brand.", aiPrompt: "", stepType: "EMAIL" },
      { stepNumber: 3, delayDays: 8, label: "Limited-time offer", bodyTemplate: "Draft a final email. Highlight a couple of open redesign slots with an early signup discount.", aiPrompt: "", stepType: "EMAIL" },
    ],
  },
}

export default function SequencesPage() {
  const { status } = useSession()
  const { activeType, activePlaybook } = usePlaybook()
  const [showInsights, setShowInsights] = useState(false)
  const [sequences, setSequences]     = useState<Sequence[]>([])
  const [name, setName]               = useState("")
  const [creating, setCreating]       = useState(false)
  const [loading, setLoading]         = useState(true)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [aiLoading, setAiLoading]     = useState<Record<number, boolean>>({})
  const [selectedPresetId, setSelectedPresetId] = useState("")
  const [importingPreset, setImportingPreset] = useState(false)

  async function handleImportPreset() {
    if (!selectedPresetId || !activePlaybook) return
    const preset = activePlaybook.sequenceTemplates.find(t => t.id === selectedPresetId)
    if (!preset) return

    setImportingPreset(true)
    const toastId = toast.loading(`AI is drafting sequence copy for "${preset.name}"...`)
    try {
      const res = await fetch("/api/sequences/generate-from-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetName: preset.name,
          presetDescription: preset.description,
          stepsCount: preset.steps,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Generation failed")
      
      setName(preset.name)
      setNewSteps(data.map((s: any) => ({
        stepNumber: s.stepNumber,
        delayDays: s.delayDays,
        label: s.label,
        bodyTemplate: s.bodyTemplate || "",
        aiPrompt: "",
        expandedRules: true,
        stepType: s.stepType || "EMAIL"
      })))
      
      toast.success(`AI drafted ${data.length} steps for "${preset.name}"!`, { id: toastId })
    } catch (err: any) {
      toast.error(err.message || "Failed to generate sequence preset.", { id: toastId })
    } finally {
      setImportingPreset(false)
    }
  }

  // Dynamic steps for creation/editing
  const [newSteps, setNewSteps] = useState<StepInput[]>([
    { stepNumber: 1, delayDays: 0, label: "Initial Outreach", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
    { stepNumber: 2, delayDays: 3, label: "Follow-up", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
    { stepNumber: 3, delayDays: 7, label: "Final Attempt", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
  ])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/sequences")
      .then((r) => r.json())
      .then((data) => {
        setSequences(data)
        setLoading(false)
      })
  }, [status])

  function addStep() {
    setNewSteps(prev => [
      ...prev,
      { 
        stepNumber: prev.length + 1, 
        delayDays: prev.length > 0 ? prev[prev.length - 1].delayDays + 3 : 0,
        label: `Step ${prev.length + 1}`,
        bodyTemplate: "",
        aiPrompt: "",
        expandedRules: false,
        stepType: "EMAIL"
      }
    ])
  }

  function removeStep(idx: number) {
    if (newSteps.length <= 1) return
    const filtered = newSteps.filter((_, i) => i !== idx)
    setNewSteps(filtered.map((s, i) => ({ ...s, stepNumber: i + 1 })))
  }

  // Update specific step attributes
  function updateStep(idx: number, key: keyof StepInput, val: any) {
    setNewSteps(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s))
  }

  async function handleCreateOrUpdate() {
    if (!name.trim()) { toast.error("Enter a sequence name"); return }
    setCreating(true)
    try {
      const payload = {
        name: name.trim(),
        steps: newSteps.map(s => ({ 
          stepNumber: s.stepNumber, 
          delayDays: s.delayDays,
          subjectTemplate: s.label.trim(),
          bodyTemplate: s.bodyTemplate?.trim() || null,
          stepType: s.stepType,
          aiPrompt: s.aiPrompt?.trim() || null
        })),
      }

      if (editingId) {
        const res = await fetch(`/api/sequences/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await res.text())
        const updated = await res.json()
        setSequences((prev) => prev.map(s => s.id === editingId ? updated : s))
        toast.success("Sequence updated")
        cancelEdit()
      } else {
        const res = await fetch("/api/sequences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await res.text())
        const created = await res.json()
        setSequences((prev) => [created, ...prev])
        toast.success("Sequence created")
        cancelEdit()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setCreating(false)
    }
  }

  function startEdit(seq: Sequence) {
    setEditingId(seq.id)
    setIsAddingNew(false)
    setName(seq.name)
    setNewSteps(seq.steps.map(s => ({
      stepNumber: s.stepNumber,
      delayDays: s.delayDays,
      label: s.subjectTemplate || `Step ${s.stepNumber}`,
      bodyTemplate: s.bodyTemplate || "",
      aiPrompt: s.aiPrompt || "",
      expandedRules: !!s.bodyTemplate || !!s.aiPrompt,
      stepType: (s.stepType as any) || "EMAIL"
    })))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function startCreate() {
    setIsAddingNew(true)
    setEditingId(null)
    setName("")
    setNewSteps([
      { stepNumber: 1, delayDays: 0, label: "Initial Outreach", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
      { stepNumber: 2, delayDays: 3, label: "Follow-up", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
      { stepNumber: 3, delayDays: 7, label: "Final Attempt", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
    ])
  }

  function loadDemoSequence() {
    const demo = DEMO_SEQUENCES[activeType] || DEMO_SEQUENCES.sales
    setIsAddingNew(true)
    setEditingId(null)
    setName(demo.name)
    setNewSteps(demo.steps.map(s => ({ ...s, expandedRules: false })))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Cancel edit
  function cancelEdit() {
    setEditingId(null)
    setIsAddingNew(false)
    setName("")
    setNewSteps([
      { stepNumber: 1, delayDays: 0, label: "Initial Outreach", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
      { stepNumber: 2, delayDays: 3, label: "Follow-up", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
      { stepNumber: 3, delayDays: 7, label: "Final Attempt", bodyTemplate: "", aiPrompt: "", expandedRules: false, stepType: "EMAIL" },
    ])
  }

  async function runAiAssist(idx: number) {
    const step = newSteps[idx]
    if (!step.aiPrompt?.trim()) {
      toast.error("Enter a prompt/instruction for the AI")
      return
    }

    setAiLoading(prev => ({ ...prev, [idx]: true }))
    try {
      const res = await fetch("/api/sequences/generate-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: step.aiPrompt,
          stepNumber: step.stepNumber,
          stepName: step.label,
        }),
      })
      if (!res.ok) throw new Error("AI Assist failed")
      const data = await res.json()
      
      updateStep(idx, "bodyTemplate", data.text)
      updateStep(idx, "aiPrompt", "")
      updateStep(idx, "expandedRules", true)
      toast.success("Guidelines generated by Agnel")
    } catch (err) {
      toast.error("Failed to generate instructions")
    } finally {
      setAiLoading(prev => ({ ...prev, [idx]: false }))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sequence? Campaigns using it will be affected.")) return
    try {
      const res = await fetch(`/api/sequences/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      setSequences((prev) => prev.filter((s) => s.id !== id))
      toast.success("Sequence deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const showEditor = isAddingNew || !!editingId

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 6px rgba(167,139,250,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">
              Automation
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">
            Sequences
          </h1>
          <p className="mt-2 text-[13px] text-white/25 font-medium">
            Define the timing and custom AI rules for your outreach — each step is personalized per lead
          </p>
        </div>

        {!showEditor && (
          <button
            onClick={startCreate}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.15) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.25)"
            }}
          >
            <Plus className="size-4" /> Create Sequence
          </button>
        )}
      </div>

      {/* Collapsed insights toggle */}
      {!showInsights && !showEditor && (
        <button
          onClick={() => setShowInsights(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-violet-300/70 hover:text-violet-300 transition-colors"
          style={{ background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.12)" }}
        >
          <Lightbulb className="size-3" /> How to plan a sequence + example for your agency
        </button>
      )}

      {/* Insights / how-to panel */}
      {showInsights && !showEditor && (
        <div
          className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
          style={{
            background: "linear-gradient(145deg,rgba(167,139,250,.06) 0%,rgba(255,255,255,.02) 100%)",
            border: "1px solid rgba(167,139,250,.15)",
          }}
        >
          <button
            onClick={() => setShowInsights(false)}
            className="absolute top-4 right-4 text-white/25 hover:text-white/60 transition-colors"
          >
            <X className="size-3.5" />
          </button>

          <div className="flex items-start gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(167,139,250,.12)", border: "1px solid rgba(167,139,250,.2)" }}
            >
              <Lightbulb className="size-4 text-violet-300" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-[13px] font-bold text-white/85">How to plan a sequence that converts</p>
                <p className="mt-1 text-[12px] text-white/40 leading-relaxed">
                  A sequence is a series of timed touchpoints (emails, LinkedIn connections/messages, or wait periods) sent automatically as your AI works a lead.
                  <span className="text-white/55 font-semibold"> Every type of agency talks to prospects differently</span> — an SEO agency leads with a technical audit,
                  a social media agency leads with a content gap, a fractional CFO leads with cashflow risk. Your sequence should reflect{" "}
                  <span className="text-white/55 font-semibold">your</span> angle: the specific problem you spot, proof that you can fix it, and a low-friction next step.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-300/80 mb-1">1. Hook</p>
                  <p className="text-[11px] text-white/45 leading-relaxed">Day 0 — point out a specific, visible problem you noticed about their business. Specific beats generic.</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-300/80 mb-1">2. Proof</p>
                  <p className="text-[11px] text-white/45 leading-relaxed">A few days later — back it up with a quick case study or result from a similar client. Mix in a LinkedIn touch if it fits.</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-300/80 mb-1">3. Easy next step</p>
                  <p className="text-[11px] text-white/45 leading-relaxed">Final step — make it effortless to say yes: a free audit, a quick call, or "just reply yes". Then a polite breakup.</p>
                </div>
              </div>

              {/* Playbook-tailored example */}
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(255,255,255,.06)" }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <p className="text-[11px] font-bold text-white/60">
                    Example for <span className="text-violet-300">{activePlaybook?.name || "your agency"}</span>
                  </p>
                  <button
                    onClick={loadDemoSequence}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-violet-300 hover:text-violet-200 transition-colors"
                    style={{ background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.2)" }}
                  >
                    <Wand2 className="size-3" /> Use this as a starting point
                  </button>
                </div>
                <p className="text-[11px] text-white/35 leading-relaxed mb-3">
                  {(DEMO_SEQUENCES[activeType] || DEMO_SEQUENCES.sales).angle}
                </p>
                <div className="space-y-1.5">
                  {(DEMO_SEQUENCES[activeType] || DEMO_SEQUENCES.sales).steps.map((s) => (
                    <div key={s.stepNumber} className="flex items-center gap-2 text-[11px]">
                      <span className="text-[9.5px] font-bold text-white/25 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 shrink-0">Day {s.delayDays}</span>
                      <span className="text-white/65 font-semibold shrink-0">{s.label}</span>
                      <span className="text-white/25 truncate">— {s.bodyTemplate}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-white/25 leading-relaxed">
                💡 Tip: Use the <span className="text-white/45 font-semibold">Agnel Step Copilot</span> on each step — describe the angle in a sentence
                (e.g. "pitch a free speed audit, mention their slow mobile site") and it will draft the message for you, in the tone you set in onboarding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Creator/Editor panel */}
      {showEditor && (
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
            border: "1px solid rgba(255,255,255,.07)",
            boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
          }}
        >
          <div className="absolute top-0 inset-x-6 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-bold text-white/60 uppercase tracking-[.12em]">
              {editingId ? "Modify Sequence" : "Create New Sequence"}
            </h2>
            <button 
              onClick={cancelEdit}
              className="flex items-center gap-1 text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors"
            >
              <X className="size-3.5" /> Cancel
            </button>
          </div>

          {/* Name input */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wide mb-2">
              Sequence Name
            </label>
            <input
              type="text"
              placeholder="e.g. Dental Outreach Sequence"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none transition-colors placeholder:text-white/20"
              style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            />
          </div>

          {/* Playbook Preset Import Box */}
          {!editingId && (
            <div className="mb-6 rounded-xl p-4.5 space-y-3"
                 style={{
                   background: "linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(236, 72, 153, 0.02) 100%)",
                   border: "1px solid rgba(139, 92, 246, 0.1)"
                 }}>
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-violet-400 animate-pulse" />
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">AI Playbook Preset Importer</span>
              </div>
              <p className="text-[11px] text-white/45">
                Import a campaign outreach preset from your active playbook and let the AI draft the complete multi-step copy customized to your agency services.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedPresetId}
                  onChange={e => setSelectedPresetId(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2 text-xs text-white/80 bg-black/30 border border-white/5 outline-none focus:border-white/15"
                >
                  <option value="">Choose a playbook preset...</option>
                  {activePlaybook?.sequenceTemplates.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#1a1b24] text-white">
                      {t.name} ({t.steps} steps)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleImportPreset}
                  disabled={!selectedPresetId || importingPreset}
                  className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)",
                    border: "1px solid rgba(139, 92, 246, 0.2)"
                  }}
                >
                  {importingPreset ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  <span>Generate Step Copy with AI</span>
                </button>
              </div>
            </div>
          )}

          {/* Steps Editor - Vertical Timeline */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between pl-6 mb-2">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[.15em]">
                Timeline Steps
              </p>
              <button
                onClick={addStep}
                className="flex items-center gap-1.5 text-[11px] font-bold text-violet-400/70 hover:text-violet-400 transition-colors"
              >
                <Plus className="size-3" /> Add Step
              </button>
            </div>

            {/* Vertical timeline connector lines */}
            <div className="relative pl-6 space-y-6">
              <div className="absolute left-[13px] top-6 bottom-6 w-px border-l border-dashed border-white/10" />

              {newSteps.map((s, idx) => (
                <div 
                  key={idx} 
                  className="relative rounded-xl p-4.5 space-y-3 transition-all duration-300 focus-within:border-indigo-500/30"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                  }}
                >
                  {/* Connector node dot */}
                  <div 
                    className="absolute left-[-22px] top-6 size-2.5 rounded-full border border-violet-400 bg-[#0c0c12]"
                    style={{ boxShadow: "0 0 8px rgba(167, 139, 250, 0.8)" }}
                  />

                  {/* Header of Step: Number + Label + Delay + Delete */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white/50"
                        style={{ background: "rgba(255, 255, 255, .08)", border: "1px solid rgba(255, 255, 255, .1)" }}
                      >
                        {s.stepNumber}
                      </div>
                      <input 
                        value={s.label}
                        onChange={(e) => updateStep(idx, "label", e.target.value)}
                        placeholder={s.stepType === "WAIT" ? "e.g. Wait Period" : "e.g. Case Study Follow-up"}
                        className="bg-transparent text-[13px] font-bold text-white/80 outline-none placeholder:text-white/15 w-full md:w-64"
                      />
                    </div>

                    <div className="flex items-center gap-3 justify-between md:justify-end flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Type</span>
                        <select
                          value={s.stepType}
                          onChange={(e) => updateStep(idx, "stepType", e.target.value)}
                          className="rounded-lg px-2 py-1 text-[11px] font-bold text-white/70 outline-none bg-black/40 border border-white/10"
                        >
                          <option value="EMAIL" className="bg-[#1a1b24] text-white">Email</option>
                          <option value="LINKEDIN_CONNECT" className="bg-[#1a1b24] text-white">LinkedIn Connection</option>
                          <option value="LINKEDIN_MESSAGE" className="bg-[#1a1b24] text-white">LinkedIn Message</option>
                          <option value="WAIT" className="bg-[#1a1b24] text-white">Wait</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">
                          {s.stepType === "WAIT" ? "Wait" : "Delay"}
                        </span>
                        <div className="flex items-center">
                          <input 
                            type="number"
                            value={s.delayDays}
                            onChange={(e) => updateStep(idx, "delayDays", parseInt(e.target.value) || 0)}
                            className="w-12 rounded-lg px-2 py-1 text-[11px] font-bold text-white/70 text-center outline-none"
                            style={{ background: "rgba(255, 255, 255, .05)", border: "1px solid rgba(255, 255, 255, .08)" }}
                          />
                          <span className="text-[11px] text-white/35 ml-1.5">days</span>
                        </div>
                      </div>

                      {s.stepType !== "WAIT" && (
                        <button 
                          onClick={() => updateStep(idx, "expandedRules", !s.expandedRules)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            s.expandedRules 
                              ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
                              : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                          }`}
                        >
                          {s.expandedRules ? "Hide Rules" : "Add Rules / AI Assist"}
                        </button>
                      )}

                      <button 
                        onClick={() => removeStep(idx)}
                        disabled={newSteps.length <= 1}
                        className="p-1.5 text-white/25 hover:text-red-400/80 transition-colors disabled:opacity-0"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Advanced guidelines / AI Copilot (Collapsible) */}
                  {s.expandedRules && s.stepType !== "WAIT" && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-white/25 uppercase tracking-wide">
                          {s.stepType === "EMAIL" && "Step Guidelines / Base Template"}
                          {s.stepType === "LINKEDIN_CONNECT" && "Connection Note (Max 300 chars)"}
                          {s.stepType === "LINKEDIN_MESSAGE" && "LinkedIn InMail / Message Template"}
                        </label>
                        <textarea
                          value={s.bodyTemplate}
                          onChange={(e) => updateStep(idx, "bodyTemplate", e.target.value)}
                          placeholder={
                            s.stepType === "EMAIL"
                              ? "e.g. Introduce a dentist case study. Keep it under 3 sentences. Offer to send a free PDF."
                              : s.stepType === "LINKEDIN_CONNECT"
                              ? "e.g. Hi {{firstName}}, saw your profile and loved your agency work. Let's connect!"
                              : "e.g. Hi {{firstName}}, following up on our connection. Wanted to share a recent design study..."
                          }
                          className="w-full min-h-[70px] rounded-xl px-4 py-3 text-[12px] text-white/70 bg-black/20 border border-white/5 outline-none focus:border-indigo-500/20 placeholder:text-white/10 resize-none font-sans leading-relaxed"
                        />
                      </div>

                      <div 
                        className="rounded-xl p-3 space-y-2 relative overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(236, 72, 153, 0.03) 100%)",
                          border: "1px solid rgba(99, 102, 241, 0.08)"
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="size-3 text-pink-400/80 animate-pulse" />
                          <span className="text-[9px] font-black text-pink-400/80 uppercase tracking-widest">Agnel Step Copilot</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={s.aiPrompt || ""}
                            onChange={(e) => updateStep(idx, "aiPrompt", e.target.value)}
                            placeholder={
                              s.stepType === "EMAIL"
                                ? "Pitch site speed optimization, offer free 10-minute speed audit..."
                                : s.stepType === "LINKEDIN_CONNECT"
                                ? "Write a short, friendly message suggesting we connect..."
                                : "Write a follow-up offering a brief 5-minute call..."
                            }
                            className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-[11px] text-white/70 bg-black/30 border border-white/5 outline-none placeholder:text-white/15"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !aiLoading[idx]) {
                                e.preventDefault()
                                runAiAssist(idx)
                              }
                            }}
                          />
                          <button
                            onClick={() => runAiAssist(idx)}
                            disabled={aiLoading[idx] || !s.aiPrompt?.trim()}
                            className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white transition-all disabled:opacity-30 disabled:scale-100 hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              background: "linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%)",
                              border: "1px solid rgba(236, 72, 153, 0.2)"
                            }}
                          >
                            {aiLoading[idx] ? (
                              <>
                                <Loader2 className="size-3 animate-spin" /> Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-3" /> Assist
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateOrUpdate}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : (editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />)}
              {creating ? "Saving…" : (editingId ? "Save Changes" : "Create Sequence")}
            </button>
            <button
              onClick={cancelEdit}
              className="px-5 py-2.5 text-[13px] font-bold text-white/50 hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sequence list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-white/80">Your Sequences</h2>
          {!loading && sequences.length > 0 && (
            <span className="text-[11px] text-white/25">{sequences.length} total</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="size-5 animate-spin text-white/20" />
          </div>
        ) : sequences.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-14 text-center"
            style={{ background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.07)" }}
          >
            <GitBranch className="size-8 text-white/15 mb-3" />
            <p className="text-[13px] font-bold text-white/30">No sequences yet</p>
            <p className="text-[11px] text-white/20 mt-1">Create one above to start building campaigns</p>
          </div>
        ) : (
          sequences.map((seq) => {
            const isExpanded = expandedId === seq.id
            const totalDelay = seq.steps.reduce((sum, s) => sum + s.delayDays, 0)
            
            return (
              <div
                key={seq.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl px-5 py-4 transition-all duration-200"
                style={{
                  background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
                  border: "1px solid rgba(255,255,255,.07)",
                  boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
                }}
              >
                {/* hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at top left,rgba(167,139,250,.04) 0%,transparent 65%)" }} />

                <div 
                  onClick={() => setExpandedId(isExpanded ? null : seq.id)}
                  className="flex items-center gap-4 relative z-10 cursor-pointer select-none"
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.15)" }}
                  >
                    <GitBranch className="size-4 text-violet-400/70" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[13.5px] text-white/85 truncate">{seq.name}</p>
                      {seq.isDefault && (
                        <span
                          className="rounded-full px-2 py-px text-[8.5px] font-bold text-white/35 uppercase tracking-wide"
                          style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}
                        >
                          default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-white/35 font-medium">
                      <span>{seq.steps.length} steps</span>
                      <span>·</span>
                      <span>{totalDelay} days total delay</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => startEdit(seq)}
                      className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1 text-[11px] font-bold bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-white/10 active:scale-[0.98]"
                    >
                      <Pencil className="size-3 text-violet-400/70" /> Edit
                    </button>

                    <button
                      onClick={() => handleDelete(seq.id)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-xl text-red-400/40 transition-all hover:text-red-400 hover:bg-red-500/10"
                      style={{ border: "1px solid rgba(239,68,68,.08)" }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : seq.id)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/20 hover:text-white/60 transition-all"
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Steps Timeline Summary */}
                {isExpanded && (
                  <div className="mt-4 border-t border-white/5 pt-4 pl-7 relative space-y-4">
                    {/* Vertical dashed line */}
                    <div className="absolute left-[14px] top-6 bottom-6 w-px border-l border-dashed border-white/10" />
                    
                    {seq.steps.map((step, sIdx) => {
                      const stepType = step.stepType || "EMAIL"
                      const Icon = stepType === "EMAIL" ? Mail : stepType === "LINKEDIN_CONNECT" ? UserPlus : stepType === "LINKEDIN_MESSAGE" ? MessageSquare : Hourglass
                      return (
                        <div key={sIdx} className="relative space-y-1">
                          {/* Timeline dot replaced with step type icon */}
                          <div className="absolute left-[-25px] top-1 p-0.5 rounded bg-[#0c0c12] border border-white/10 text-violet-400">
                            <Icon className="size-3" />
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-white/35">
                              Step {step.stepNumber} ({stepType.replace(/_/g, " ")})
                            </span>
                            <span className="text-[12px] font-bold text-white/80">{step.subjectTemplate}</span>
                            <span className="text-[9.5px] text-white/45 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5">Day {step.delayDays}</span>
                          </div>
                          {step.bodyTemplate && stepType !== "WAIT" && (
                            <div className="rounded-lg p-2.5 bg-black/20 border border-white/5 text-[10.5px] text-white/50 max-w-xl leading-relaxed mt-1 font-mono">
                              {step.bodyTemplate}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
