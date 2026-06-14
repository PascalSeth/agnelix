/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Zap, Loader2, Power, Globe, History, Target, MapPin, Terminal as TerminalIcon, Play } from "lucide-react"
import { toast } from "sonner"
import { formatRelative } from "@/lib/utils"
import Link from "next/link"

type AgentGoal = {
  id: string
  autoProspectingEnabled: boolean
  personaConfig: any
  user?: { agencyName: string | null; companyDesc: string | null }
}

type Campaign = {
  id: string
  name: string
  status: string
  createdAt: string
  totalLeads: number
  autonomous: boolean
}

const card = {
  background: "linear-gradient(145deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.01) 100%)",
  border: "1px solid rgba(255,255,255,.06)",
}

const field = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
}

export default function AutoProspectingPage() {
  const { status } = useSession()
  const [goal, setGoal] = useState<AgentGoal | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [targetRegions, setTargetRegions] = useState("")
  const [leadsPerCycle, setLeadsPerCycle] = useState<number>(1)

  // Terminal State
  const [logs, setLogs] = useState<string[]>([])
  const [isRunningLive, setIsRunningLive] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    refreshData()
  }, [status])

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  async function refreshData() {
    const [g, camps] = await Promise.allSettled([
      fetch("/api/agent/goals").then(r => r.json()),
      fetch("/api/campaigns").then(r => r.json()),
    ])
    if (g.status === "fulfilled") {
      setGoal(g.value)
      setTargetRegions(g.value.personaConfig?.targetRegions || "")
      setLeadsPerCycle(g.value.personaConfig?.leadsPerCycle || 1)
    }
    if (camps.status === "fulfilled" && Array.isArray(camps.value)) {
      setCampaigns(camps.value.filter((c: any) => c.autonomous))
    }
    setLoading(false)
  }

  async function toggleEngine() {
    if (!goal) return
    const nextState = !goal.autoProspectingEnabled
    setSaving(true)
    try {
      const res = await fetch("/api/agent/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoProspectingEnabled: nextState }),
      })
      if (!res.ok) throw new Error()
      
      setGoal({ ...goal, autoProspectingEnabled: nextState })
      toast.success(nextState ? "Autonomous engine started" : "Engine paused")

      // If turning ON, run the live sequence automatically
      if (nextState) {
        runLiveSequence()
      }
    } catch {
      toast.error("Failed to toggle engine")
    } finally {
      setSaving(false)
    }
  }

  async function runLiveSequence() {
    if (isRunningLive) return
    setIsRunningLive(true)
    setLogs([])

    try {
      const res = await fetch("/api/agent/engine/trigger", { method: "POST" })
      if (!res.body) {
        setIsRunningLive(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value)
          const lines = chunk.split("\n\n").filter(Boolean)
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const msg = line.replace("data: ", "")
              setLogs(prev => [...prev, msg])
            }
          }
        }
      }
      
      refreshData()
    } catch (err) {
      setLogs(prev => [...prev, "Connection lost. Engine will continue in background."])
    } finally {
      setIsRunningLive(false)
    }
  }

  async function saveConfig() {
    if (!goal) return
    setSaving(true)
    try {
      const nextConfig = { ...(goal.personaConfig || {}), targetRegions, leadsPerCycle }
      const res = await fetch("/api/agent/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaConfig: nextConfig }),
      })
      if (!res.ok) throw new Error()
      setGoal({ ...goal, personaConfig: nextConfig })
      toast.success("Configuration saved")
    } catch {
      toast.error("Failed to save configuration")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-white/20" /></div>

  const isEnabled = goal?.autoProspectingEnabled

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="size-1.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px rgba(34,211,238,.9)" }} />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Auto-Prospecting</span>
        </div>
        <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">Autonomous Engine</h1>
        <p className="mt-2 text-[13px] text-white/30 max-w-xl">
          The AI will continuously scour the web for leads matching your agency's profile, generate campaigns, and queue outreach entirely in the background.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Main Status / Toggle Card */}
        <div className="rounded-3xl p-8 relative overflow-hidden" style={card}>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Globe className="size-32" />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Engine Status</p>
                <div className="flex items-center gap-2">
                  {isEnabled 
                    ? <div className="size-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(52,211,153,.8)" }} /> 
                    : <div className="size-2 rounded-full bg-white/20" />
                  }
                  <span className={`text-[16px] font-bold tracking-tight ${isEnabled ? "text-emerald-400" : "text-white/40"}`}>
                    {isEnabled ? "Running" : "Paused"}
                  </span>
                </div>
              </div>
              
              <button
                onClick={toggleEngine}
                disabled={saving || isRunningLive}
                className={`flex size-14 items-center justify-center rounded-2xl transition-all ${
                  isEnabled 
                    ? "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 border border-emerald-400/20" 
                    : "bg-white/5 text-white/30 hover:bg-white/10 border border-white/10"
                }`}
              >
                {saving ? <Loader2 className="size-6 animate-spin" /> : <Power className="size-6" />}
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,.2)" }}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/20 mb-2">Current Strategy</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Target className="size-4 text-white/40 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-white/70">{goal?.user?.agencyName || "Your Agency"}</p>
                      <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed mt-0.5">
                        {goal?.user?.companyDesc || "No company description set. Please set this in onboarding."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="size-4 text-white/40 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-white/70">Target Regions</p>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        {goal?.personaConfig?.targetRegions ? goal.personaConfig.targetRegions : "AI is picking random global regions based on your market."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Configuration Card */}
        <div className="rounded-3xl p-8" style={card}>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6">Targeting Configuration</p>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40">
                Target Regions & Cities (Optional)
              </label>
              <p className="text-[11px] text-white/30 leading-relaxed">
                By default, the AI will pick random major cities to prospect in. If you only want leads from specific areas, list them here.
              </p>
              <textarea 
                value={targetRegions}
                onChange={e => setTargetRegions(e.target.value)}
                placeholder="e.g., London, Manchester, New York, Texas"
                className="w-full rounded-2xl px-4 py-3 text-[13px] text-white/80 placeholder:text-white/20 outline-none resize-none"
                rows={3}
                style={field}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40">
                Leads Per Cycle
              </label>
              <p className="text-[11px] text-white/30 leading-relaxed">
                How many leads should the AI process and enrich each time it runs? (Default is 1, max 20)
              </p>
              <input 
                type="number"
                min={1}
                max={20}
                value={leadsPerCycle}
                onChange={e => setLeadsPerCycle(parseInt(e.target.value) || 1)}
                className="w-full rounded-2xl px-4 py-3 text-[13px] text-white/80 outline-none"
                style={field}
              />
            </div>

            <button 
              onClick={saveConfig}
              disabled={saving || (targetRegions === (goal?.personaConfig?.targetRegions || "") && leadsPerCycle === (goal?.personaConfig?.leadsPerCycle || 1))}
              className="rounded-xl px-4 py-2 text-[11px] font-bold bg-white/10 text-white/60 hover:bg-white/15 disabled:opacity-50 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>

      </div>

      {/* Inline Live Terminal */}
      {isEnabled && (
        <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <TerminalIcon className="size-5 text-cyan-400" />
              <div>
                <h3 className="text-[13px] font-bold text-white/80 uppercase tracking-widest">Live Engine Output</h3>
                <p className="text-[11px] text-white/30 mt-0.5">The engine runs automatically in the background, but you can force a manual cycle here.</p>
              </div>
            </div>
            
            <button 
              onClick={runLiveSequence}
              disabled={isRunningLive}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                isRunningLive 
                  ? "bg-white/5 text-white/30 cursor-not-allowed" 
                  : "bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 border border-cyan-400/20"
              }`}
            >
              {isRunningLive ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              {isRunningLive ? "Running Cycle..." : "Trigger Manual Cycle"}
            </button>
          </div>

          <div className="p-6 font-mono text-[13px] text-emerald-400/90 h-[300px] overflow-y-auto space-y-2 relative" style={{ background: "#0a0a0a" }}>
            {logs.length === 0 && !isRunningLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                <TerminalIcon className="size-8 mb-3 opacity-20" />
                <p>Terminal standing by.</p>
                <p className="text-[11px] mt-1">Click "Trigger Manual Cycle" to watch the AI hunt in real-time.</p>
              </div>
            )}
            
            {logs.map((log, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-white/20 shrink-0 select-none">{String(i + 1).padStart(2, "0")}</span>
                <span>{log}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
            
            {isRunningLive && logs.length > 0 && !logs[logs.length - 1].includes("complete") && !logs[logs.length - 1].includes("lost") && (
              <div className="flex gap-4 animate-pulse">
                <span className="text-white/20 shrink-0 select-none">{String(logs.length + 1).padStart(2, "0")}</span>
                <span>_</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="rounded-3xl p-8" style={card}>
        <div className="flex items-center gap-2 mb-6">
          <History className="size-4 text-white/40" />
          <h2 className="text-[14px] font-bold text-white/80">Recent Autonomous Campaigns</h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,.05)" }}>
            <Zap className="size-8 text-white/10 mx-auto mb-3" />
            <p className="text-[13px] text-white/30">No autonomous campaigns generated yet.</p>
            <p className="text-[11px] text-white/20 mt-1">Turn on the engine to start hunting.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {campaigns.slice(0, 5).map(c => (
              <div key={c.id} className="py-4 flex items-center justify-between">
                <div>
                  <Link href={`/campaigns/${c.id}`} className="text-[13px] font-bold text-white/80 hover:text-white transition-colors">
                    {c.name}
                  </Link>
                  <p className="text-[11px] text-white/30 mt-1">
                    Created {formatRelative(new Date(c.createdAt))}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-white/80">{c.totalLeads}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Leads</p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase" 
                    style={{ background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.4)" }}>
                    {c.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
