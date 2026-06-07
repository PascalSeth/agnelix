"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { GitBranch, Plus, Trash2, Loader2, Pencil, Sparkles, X, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

type Sequence = {
  id: string
  name: string
  isDefault: boolean
  createdAt: string
  steps: { stepNumber: number; delayDays: number; subjectTemplate?: string | null; bodyTemplate?: string | null }[]
}

type StepInput = {
  stepNumber: number
  delayDays: number
  label: string
  bodyTemplate: string
  aiPrompt: string
  expandedRules: boolean
}

export default function SequencesPage() {
  const { status } = useSession()
  const [sequences, setSequences]     = useState<Sequence[]>([])
  const [name, setName]               = useState("")
  const [creating, setCreating]       = useState(false)
  const [loading, setLoading]         = useState(true)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [aiLoading, setAiLoading]     = useState<Record<number, boolean>>({})

  // Dynamic steps for creation/editing
  const [newSteps, setNewSteps] = useState<StepInput[]>([
    { stepNumber: 1, delayDays: 0, label: "Initial Outreach", bodyTemplate: "", aiPrompt: "", expandedRules: false },
    { stepNumber: 2, delayDays: 3, label: "Follow-up", bodyTemplate: "", aiPrompt: "", expandedRules: false },
    { stepNumber: 3, delayDays: 7, label: "Final Attempt", bodyTemplate: "", aiPrompt: "", expandedRules: false },
  ])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/sequences")
      .then((r) => r.json())
      .then((data) => { setSequences(data); setLoading(false) })
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
        expandedRules: false
      }
    ])
  }

  function removeStep(idx: number) {
    if (newSteps.length <= 1) return
    const filtered = newSteps.filter((_, i) => i !== idx)
    setNewSteps(filtered.map((s, i) => ({ ...s, stepNumber: i + 1 })))
  }

  // Update specific step attributes
  function updateStep(idx: number, key: keyof StepInput, val: string | number | boolean) {
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
          bodyTemplate: s.bodyTemplate?.trim() || null
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
      aiPrompt: "",
      expandedRules: !!s.bodyTemplate
    })))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function startCreate() {
    setIsAddingNew(true)
    setEditingId(null)
    setName("")
    setNewSteps([
      { stepNumber: 1, delayDays: 0, label: "Initial Outreach", bodyTemplate: "", aiPrompt: "", expandedRules: false },
      { stepNumber: 2, delayDays: 3, label: "Follow-up", bodyTemplate: "", aiPrompt: "", expandedRules: false },
      { stepNumber: 3, delayDays: 7, label: "Final Attempt", bodyTemplate: "", aiPrompt: "", expandedRules: false },
    ])
  }

  function cancelEdit() {
    setEditingId(null)
    setIsAddingNew(false)
    setName("")
    setNewSteps([
      { stepNumber: 1, delayDays: 0, label: "Initial Outreach", bodyTemplate: "", aiPrompt: "", expandedRules: false },
      { stepNumber: 2, delayDays: 3, label: "Follow-up", bodyTemplate: "", aiPrompt: "", expandedRules: false },
      { stepNumber: 3, delayDays: 7, label: "Final Attempt", bodyTemplate: "", aiPrompt: "", expandedRules: false },
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
                        placeholder="e.g. Case Study Follow-up"
                        className="bg-transparent text-[13px] font-bold text-white/80 outline-none placeholder:text-white/15 w-full md:w-64"
                      />
                    </div>

                    <div className="flex items-center gap-3 justify-between md:justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Delay</span>
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
                  {s.expandedRules && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-white/25 uppercase tracking-wide">
                          Step Guidelines / Base Template
                        </label>
                        <textarea
                          value={s.bodyTemplate}
                          onChange={(e) => updateStep(idx, "bodyTemplate", e.target.value)}
                          placeholder="e.g. Introduce a dentist case study. Keep it under 3 sentences. Offer to send a free PDF."
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
                            placeholder={s.stepNumber === 1 
                              ? "Pitch site speed optimization, offer free 10-minute speed audit..."
                              : `Write a follow-up on day ${s.delayDays} referencing a dental case study...`
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
                  <div className="mt-4 border-t border-white/5 pt-4 pl-6 relative space-y-4">
                    {/* Vertical dashed line */}
                    <div className="absolute left-[13px] top-6 bottom-6 w-px border-l border-dashed border-white/10" />
                    
                    {seq.steps.map((step, sIdx) => (
                      <div key={sIdx} className="relative space-y-1">
                        {/* Timeline dot */}
                        <div className="absolute left-[-21px] top-1.5 size-2 rounded-full bg-violet-400" />
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black text-white/35">Step {step.stepNumber}</span>
                          <span className="text-[12px] font-bold text-white/80">{step.subjectTemplate}</span>
                          <span className="text-[9.5px] text-white/45 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5">Day {step.delayDays}</span>
                        </div>
                        {step.bodyTemplate && (
                          <div className="rounded-lg p-2.5 bg-black/20 border border-white/5 text-[10.5px] text-white/50 max-w-xl leading-relaxed mt-1 font-mono">
                            {step.bodyTemplate}
                          </div>
                        )}
                      </div>
                    ))}
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
