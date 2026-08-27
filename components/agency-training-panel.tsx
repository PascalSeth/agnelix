"use client"

import { useEffect, useState } from "react"
import { BrainCircuit, GraduationCap, ListChecks, Loader2, Power, RefreshCw, Trash2 } from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { getWorkspace } from "@/lib/workspaces"

type Rule = {
  id: string
  surface: "ALL" | "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR"
  title: string
  instruction: string
  goodExample: string | null
  badExample: string | null
  enabled: boolean
  source: string
}

const SURFACES = [
  { value: "REPLY", label: "Reply drafts" },
  { value: "EMAIL", label: "Outreach emails" },
  { value: "PROPOSAL", label: "Proposals" },
  { value: "ADVISOR", label: "AI advisor chat" },
]

const fieldStyle = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
}

const inputClass = "w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20 resize-none"
const selectClass = "rounded-xl px-3 py-2 text-[12px] text-white/75 outline-none bg-black/25 border border-white/[0.08]"
const primaryBtn = "flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-white/90 disabled:opacity-50 bg-white"

export function AgencyTrainingPanel({ playbookType }: { playbookType?: string | null }) {
  const workspace = getWorkspace(playbookType)
  const [tab, setTab] = useState<"teach" | "lessons">("teach")
  const [rules, setRules] = useState<Rule[]>([])
  const [loadingRules, setLoadingRules] = useState(true)

  function loadRules() {
    fetch("/api/agent/training")
      .then(r => (r.ok ? r.json() : []))
      .then(data => setRules(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingRules(false))
  }

  useEffect(() => { loadRules() }, [])

  const [surface, setSurface] = useState("REPLY")
  const [scenario, setScenario] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [priorResponse, setPriorResponse] = useState("")
  const [correction, setCorrection] = useState("")
  const [feedback, setFeedback] = useState("")
  const [lastLesson, setLastLesson] = useState<{ title: string; instruction: string } | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [teaching, setTeaching] = useState(false)

  async function simulate(isRetry = false) {
    if (!scenario.trim()) { toast.error("Give the AI a scenario first"); return }
    setSimulating(true)
    if (isRetry) setPriorResponse(aiResponse)
    else { setPriorResponse(""); setLastLesson(null) }
    try {
      const res = await fetch("/api/agent/training/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface, scenario }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Simulation failed")
      setAiResponse(data.response)
      setCorrection("")
      setFeedback("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation failed")
    } finally {
      setSimulating(false)
    }
  }

  async function teach() {
    if (!correction.trim() && !feedback.trim()) {
      toast.error("Write a corrected version, feedback, or both")
      return
    }
    setTeaching(true)
    try {
      const res = await fetch("/api/agent/training/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface, scenario, aiResponse, correction, feedback }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Teaching failed")
      setLastLesson(data.lesson)
      setRules(prev => [data.rule, ...prev])
      toast.success("Lesson learned — retry the scenario to see the difference")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teaching failed")
    } finally {
      setTeaching(false)
    }
  }

  async function toggleRule(rule: Rule) {
    setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)))
    const res = await fetch(`/api/agent/training/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    }).catch(() => null)
    if (!res?.ok) {
      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)))
      toast.error("Toggle failed")
    }
  }

  async function deleteRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/agent/training/${id}`, { method: "DELETE" }).catch(() => {})
  }

  const surfaceLabel = (s: string) => SURFACES.find(x => x.value === s)?.label ?? s

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10" style={{ background: "rgba(255,255,255,.02)" }}>
      <div className="p-6 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/25">
            <BrainCircuit className="size-4 text-violet-300" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[.12em]">Train Your AI</p>
            <p className="text-[12px] text-white/35 mt-1">
              Correct a response and it learns the lesson for good — scoped to <span className="text-white/55 font-semibold">{workspace.name}</span>, your active playbook.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setTab("teach")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-all ${tab === "teach" ? "text-black bg-white/85" : "text-white/40 hover:text-white/70 border border-white/[0.08]"}`}>
            <GraduationCap className="size-3.5" /> Teach
          </button>
          <button onClick={() => setTab("lessons")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-all ${tab === "lessons" ? "text-black bg-white/85" : "text-white/40 hover:text-white/70 border border-white/[0.08]"}`}>
            <ListChecks className="size-3.5" /> Lessons ({rules.length})
          </button>
        </div>
      </div>

      {tab === "teach" && (
        <div className="p-6 space-y-4">
          <select value={surface} onChange={e => setSurface(e.target.value)} className={selectClass}>
            {SURFACES.map(s => <option key={s.value} value={s.value} className="bg-[#1a1b24]">{s.label}</option>)}
          </select>

          <label className="space-y-1 block">
            <span className="text-[11px] text-white/35">
              Scenario — {surface === "REPLY" ? "paste a prospect's reply" : surface === "EMAIL" ? "describe a prospect" : surface === "PROPOSAL" ? "describe the client & need" : "ask the advisor something"}
            </span>
            <textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={3}
              placeholder={surface === "REPLY" ? `"Thanks but we already work with an agency and honestly they're fine. What would you even do differently?"` : "e.g. A 12-person dental clinic, 3.4★ Google rating, site takes 6s to load…"}
              className={inputClass} style={fieldStyle} />
          </label>

          <button onClick={() => simulate(false)} disabled={simulating || teaching} className={primaryBtn}>
            {simulating && !priorResponse ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Ask the AI
          </button>

          {priorResponse && (
            <div className="rounded-xl p-4 opacity-60" style={fieldStyle}>
              <p className="text-[9.5px] font-black uppercase tracking-wider text-white/30 mb-2">Before the lesson</p>
              <pre className="text-[12px] text-white/50 whitespace-pre-wrap font-sans leading-relaxed">{priorResponse}</pre>
            </div>
          )}

          {aiResponse && (
            <div className="rounded-xl p-4" style={priorResponse ? { background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.15)" } : fieldStyle}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[9.5px] font-black uppercase tracking-wider ${priorResponse ? "text-emerald-300/80" : "text-white/30"}`}>
                  {priorResponse ? "After the lesson" : "The AI's response"}
                </p>
                {lastLesson && (
                  <button onClick={() => simulate(true)} disabled={simulating} className="flex items-center gap-1.5 text-[11px] font-bold text-violet-300/80 hover:text-violet-200 transition-colors">
                    {simulating ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Retry scenario
                  </button>
                )}
              </div>
              <pre className="text-[12.5px] text-white/75 whitespace-pre-wrap font-sans leading-relaxed">{aiResponse}</pre>
            </div>
          )}

          {aiResponse && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(168,85,247,.05)", border: "1px solid rgba(168,85,247,.15)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider text-violet-300/80">Correct it — the AI learns the underlying lesson, not just this edit</p>
              <label className="space-y-1 block">
                <span className="text-[11px] text-white/35">Your corrected version (optional)</span>
                <textarea value={correction} onChange={e => setCorrection(e.target.value)} rows={3}
                  placeholder="Rewrite the response the way it should have been…" className={inputClass} style={fieldStyle} />
              </label>
              <label className="space-y-1 block">
                <span className="text-[11px] text-white/35">What was wrong / what to learn (optional)</span>
                <input value={feedback} onChange={e => setFeedback(e.target.value)}
                  placeholder="e.g. Never offer a discount on the first objection — hold value first"
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20" style={fieldStyle} />
              </label>
              <button onClick={teach} disabled={teaching || simulating} className={primaryBtn}>
                {teaching ? <Loader2 className="size-3.5 animate-spin" /> : <GraduationCap className="size-3.5" />}
                Teach the AI
              </button>
            </div>
          )}

          {lastLesson && (
            <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.15)" }}>
              <p className="text-[9.5px] font-black uppercase tracking-wider text-emerald-300/80 mb-1">Lesson learned — now permanent</p>
              <p className="text-[13px] font-bold text-white/85">{lastLesson.title}</p>
              <p className="text-[12px] text-white/50 mt-1">{lastLesson.instruction}</p>
              <p className="text-[10.5px] text-white/30 mt-2">Applies to {surfaceLabel(surface)} in {workspace.name} only. Hit "Retry scenario" above to watch it apply.</p>
            </div>
          )}
        </div>
      )}

      {tab === "lessons" && (
        <div className="p-6 space-y-3">
          <p className="text-[11.5px] text-white/35">Everything you've taught your AI. Toggle off anything that misfires.</p>

          {loadingRules ? (
            <div className="flex items-center justify-center py-10 text-white/30"><Loader2 className="size-4 animate-spin" /></div>
          ) : rules.length === 0 ? (
            <p className="text-[12px] text-white/25 py-4 text-center border border-dashed border-white/[0.06] rounded-xl">
              Nothing taught yet — head to the Teach tab and correct a response.
            </p>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => (
                <div key={rule.id} className={`rounded-xl p-3.5 ${rule.enabled ? "" : "opacity-45"}`} style={fieldStyle}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[12.5px] font-bold text-white/85">{rule.title}</p>
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/40">{surfaceLabel(rule.surface)}</span>
                      </div>
                      <p className="text-[11.5px] text-white/45 mt-1 leading-relaxed">{rule.instruction}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleRule(rule)} title={rule.enabled ? "Disable" : "Enable"}
                        className={`p-1.5 rounded-lg transition-colors ${rule.enabled ? "text-emerald-400 hover:bg-emerald-500/10" : "text-white/25 hover:bg-white/5"}`}>
                        <Power className="size-3.5" />
                      </button>
                      <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg text-white/20 hover:text-red-400/80 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
