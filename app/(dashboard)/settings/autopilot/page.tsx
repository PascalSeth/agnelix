/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Loader2, Building2, UserCircle, Briefcase, Zap, Edit, Wand2, RefreshCcw, Bot, Clock } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

type AgentGoal = {
  meetingsPerMonth: number
  replyRateTarget: number
  dailyLeadCap: number
  autoSendEnabled: boolean
  reviewWindowMins: number
  maxAutoSendsPerDay: number
  minConfidence: "LOW" | "MEDIUM" | "HIGH"
  lowPriorityDelayMins: number
  highPriorityDelayMins: number
  personaConfig?: {
    proposalPriceRange?: string
    meetingAvailability?: string
    coreServices?: string
    additionalRules?: string
  } | null
  user?: {
    agencyName: string | null
    companyDesc: string | null
    title: string | null
    tone: string | null
    name: string | null
    fromEmail: string | null
  }
}

type SimulationResult = {
  subject: string
  body: string
}

const fieldStyle = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
}

export default function AutopilotPage() {
  const { status } = useSession()
  const [goal, setGoal]             = useState<AgentGoal | null>(null)
  const [savingGoal, setSavingGoal] = useState(false)

  // Simulator State
  const [simName, setSimName] = useState("Jane Doe")
  const [simCompany, setSimCompany] = useState("Acme Corp")
  const [simMessage, setSimMessage] = useState("This sounds interesting. What are your prices?")
  const [simIntent, setSimIntent] = useState("QUESTION")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/agent/goals")
      .then(r => r.json())
      .then(res => setGoal(res as AgentGoal))
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
      // Merge user back in since PATCH doesn't return included relations currently
      setGoal({ ...updated, user: goal.user })
    } catch {
      toast.error("Failed to save agent goals")
      setGoal(goal)
    } finally {
      setSavingGoal(false)
    }
  }

  function updatePersona(key: string, value: string) {
    if (!goal) return
    const nextConfig = { ...(goal.personaConfig || {}), [key]: value }
    setGoal({ ...goal, personaConfig: nextConfig })
  }

  function savePersonaConfig() {
    if (!goal) return
    saveGoal({ personaConfig: goal.personaConfig })
  }

  async function handleSimulate() {
    if (!simMessage.trim()) {
      toast.error("Please enter a prospect message")
      return
    }
    setIsSimulating(true)
    setSimResult(null)
    try {
      const res = await fetch("/api/agent/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectName: simName,
          prospectCompany: simCompany,
          messageBody: simMessage,
          intent: simIntent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to simulate")
      setSimResult(data.draft)
      toast.success(`Generated in ${data.latencyMs}ms`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="size-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 6px rgba(167,139,250,.9)" }} />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">AI Configuration</span>
        </div>
        <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">Autopilot Agent</h1>
        <p className="mt-2 text-[13px] text-white/25 font-medium">
          Configure how the AI agent handles replies and drafts outbound messages.
        </p>
      </div>

      {/* Goal & Delay controls */}
      {goal && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Goal planner */}
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

          {/* Response Delay Settings */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 space-y-4"
            style={{ background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.15)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-[.12em] flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Reply Delay Config
                </p>
                <p className="text-[12px] text-white/35 mt-1">Control AI response wait times. Set to 0 for immediate replies.</p>
              </div>
              {savingGoal && <Loader2 className="size-4 animate-spin text-white/30" />}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] text-white/35">Standard Delay (mins)</span>
                <input 
                  type="number" 
                  min={0} 
                  max={120} 
                  value={goal.lowPriorityDelayMins ?? 2} 
                  onChange={e => saveGoal({ lowPriorityDelayMins: Number(e.target.value) })} 
                  className="w-full rounded-xl px-3 py-2 text-[13px] text-white/75 outline-none" 
                  style={fieldStyle} 
                />
                {goal.lowPriorityDelayMins === 0 ? (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase mt-1 block">⚡ Immediate Reply</span>
                ) : (
                  <span className="text-[10px] text-white/30 mt-1 block">Delay: {goal.lowPriorityDelayMins} min{goal.lowPriorityDelayMins !== 1 ? 's' : ''}</span>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-white/35">High-Risk Delay (mins)</span>
                <input 
                  type="number" 
                  min={0} 
                  max={120} 
                  value={goal.highPriorityDelayMins ?? 15} 
                  onChange={e => saveGoal({ highPriorityDelayMins: Number(e.target.value) })} 
                  className="w-full rounded-xl px-3 py-2 text-[13px] text-white/75 outline-none" 
                  style={fieldStyle} 
                />
                {goal.highPriorityDelayMins === 0 ? (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase mt-1 block">⚡ Immediate Reply</span>
                ) : (
                  <span className="text-[10px] text-white/30 mt-1 block">Delay: {goal.highPriorityDelayMins} min{goal.highPriorityDelayMins !== 1 ? 's' : ''}</span>
                )}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Core Agency Info & Persona */}
      {goal && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Base User Identity */}
          <div className="md:col-span-1 rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <div className="flex items-center justify-between">
               <div>
                 <p className="text-[11px] font-bold text-white/35 uppercase tracking-[.12em]">Base Identity</p>
                 <p className="text-[12px] text-white/35 mt-1">Set during onboarding.</p>
               </div>
               <Link href="/settings/agency" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors">
                 <Edit className="size-3.5" />
               </Link>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-0.5"><Building2 className="size-4 text-white/20" /></div>
                <div>
                  <div className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Agency Name</div>
                  <div className="text-[13px] text-white/70 mt-0.5">{goal.user?.agencyName || "Not set"}</div>
                  <div className="text-[12px] text-white/40 mt-1 line-clamp-2">{goal.user?.companyDesc || "No description"}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-0.5"><UserCircle className="size-4 text-white/20" /></div>
                <div>
                  <div className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Sender</div>
                  <div className="text-[13px] text-white/70 mt-0.5">{goal.user?.name || "Not set"}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-0.5"><Briefcase className="size-4 text-white/20" /></div>
                <div>
                  <div className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Title</div>
                  <div className="text-[13px] text-white/70 mt-0.5">{goal.user?.title || "Not set"}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-0.5"><Zap className="size-4 text-white/20" /></div>
                <div>
                  <div className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Base Tone</div>
                  <div className="text-[13px] text-white/70 mt-0.5">{goal.user?.tone || "Not set"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Persona & Style */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl p-6 space-y-4" style={{ background: "rgba(168,85,247,.05)", border: "1px solid rgba(168,85,247,.15)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-white/35 uppercase tracking-[.12em]">AI Persona & Structuring</p>
                <p className="text-[12px] text-white/35 mt-1">Provide specific facts for the AI to use when talking to prospects.</p>
              </div>
              {savingGoal && <Loader2 className="size-4 animate-spin text-white/30" />}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] text-white/35">Proposal Price Range</span>
                <input
                  value={goal.personaConfig?.proposalPriceRange || ""}
                  onChange={e => updatePersona("proposalPriceRange", e.target.value)}
                  onBlur={savePersonaConfig}
                  placeholder="e.g. $2k - $5k / mo"
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
                  style={fieldStyle}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-white/35">Meeting Availability</span>
                <input
                  value={goal.personaConfig?.meetingAvailability || ""}
                  onChange={e => updatePersona("meetingAvailability", e.target.value)}
                  onBlur={savePersonaConfig}
                  placeholder="e.g. Tuesdays & Thursdays, 10am-2pm"
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
                  style={fieldStyle}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] text-white/35">Core Services</span>
                <input
                  value={goal.personaConfig?.coreServices || ""}
                  onChange={e => updatePersona("coreServices", e.target.value)}
                  onBlur={savePersonaConfig}
                  placeholder="e.g. Meta Ads, Google Ads, Landing Page Design"
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
                  style={fieldStyle}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] text-white/35">Additional Custom Rules</span>
                <textarea
                  value={goal.personaConfig?.additionalRules || ""}
                  onChange={e => updatePersona("additionalRules", e.target.value)}
                  onBlur={savePersonaConfig}
                  placeholder="e.g. Never mention setup fees. Always use the prospect's first name."
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-[13px] text-white/80 outline-none resize-none placeholder:text-white/20 leading-relaxed"
                  style={fieldStyle}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Sandbox */}
      {goal && (
        <div className="relative overflow-hidden rounded-2xl border border-white/10" style={{ background: "rgba(255,255,255,.02)" }}>
           <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-[.12em] flex items-center gap-2">
                  <Wand2 className="size-3.5 text-blue-400" />
                  Simulator Sandbox
                </p>
                <p className="text-[12px] text-white/35 mt-1">Test your AI persona by simulating prospect replies.</p>
              </div>
           </div>
           
           <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
              {/* Simulator Input */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[11px] text-white/35">Prospect Name</span>
                    <input value={simName} onChange={e => setSimName(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none" style={fieldStyle} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-white/35">Prospect Company</span>
                    <input value={simCompany} onChange={e => setSimCompany(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none" style={fieldStyle} />
                  </label>
                </div>
                
                <label className="space-y-1 block">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/35">Incoming Reply / Intent</span>
                    <select value={simIntent} onChange={e => setSimIntent(e.target.value)} className="bg-transparent text-[11px] text-white/50 outline-none cursor-pointer">
                      <option value="QUESTION">Question</option>
                      <option value="INTERESTED">Interested</option>
                      <option value="OBJECTION">Objection</option>
                      <option value="NOT_NOW">Not Now</option>
                    </select>
                  </div>
                  <textarea 
                    value={simMessage} 
                    onChange={e => setSimMessage(e.target.value)} 
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-[13px] text-white/80 outline-none resize-none" 
                    style={fieldStyle} 
                  />
                </label>

                <button 
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 transition-all"
                >
                  {isSimulating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                  Test AI Reply
                </button>
              </div>

              {/* Simulator Output */}
              <div className="p-6 bg-white/[0.01]">
                 <span className="text-[11px] text-white/35 mb-4 block">Generated Draft</span>
                 {simResult ? (
                    <div className="space-y-3">
                      <div className="rounded-xl p-3 bg-white/5 border border-white/5">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">Subject</span>
                        <div className="text-[13px] text-white/90 font-medium">{simResult.subject}</div>
                      </div>
                      <div className="rounded-xl p-4 bg-white/5 border border-white/5 min-h-[160px] whitespace-pre-wrap text-[13px] text-white/80 leading-relaxed">
                        {simResult.body}
                      </div>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center space-y-3 opacity-50">
                       <div className="size-12 rounded-full bg-white/5 flex items-center justify-center">
                          <Bot className="size-5 text-white/40" />
                       </div>
                       <p className="text-[12px] text-white/50 max-w-[200px]">Run a simulation to see how the AI responds using your settings.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
