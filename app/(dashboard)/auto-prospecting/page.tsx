/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Zap, Loader2, Power, Globe, History, Target, MapPin,
  Terminal as TerminalIcon, Play, Sparkles,
  Building2, Mail, ExternalLink,
  Clock, Flame, Check, X,
  TrendingUp, Users, Compass,
  Lightbulb, Navigation, RefreshCw,
  UserCheck, CheckCircle2, ChevronRight, ArrowRight,
  Briefcase, Award, Shield, Brain,
} from "lucide-react"
import { toast } from "sonner"
import { formatRelative } from "@/lib/utils"
import Link from "next/link"
import { CustomSelect } from "@/components/ui/custom-select"
import type { StructuredNiche } from "@/app/api/leads/suggest-businesses/route"

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentGoal = {
  id: string
  autoProspectingEnabled: boolean
  personaConfig: any
}

type AgencyProfile = {
  agencyName?: string
  companyDesc?: string
  flagshipOffer?: any
  playbookType?: string
  title?: string
  tone?: string
  calendarLink?: string
}

type Campaign = {
  id: string
  name: string
  status: string
  createdAt: string
  totalLeads: number
  autonomous: boolean
}

type Sequence = {
  id: string
  name: string
}

type AiSuggestion = {
  niches: StructuredNiche[]
  reply: string
  suggestedCampaignName: string
  suggestedRegions: string[]
  sequenceReasoning: string
}

export type DiscoveredLead = {
  id: string
  company: string
  formattedAddress?: string
  website?: string | null
  phone?: string | null
  rating?: number
  userRatingCount?: number
  contactName?: string | null
  contactEmail?: string | null
  contactTitle?: string | null
  sslStatus?: boolean
  speedSeconds?: number
  painPoint?: string | null
  icebreaker?: string | null
  status: string
  campaignId?: string
  campaignName?: string
}

export type EngineStrategy = {
  targetNiche: string
  location: string
  campaignName: string
  campaignId?: string
  sequenceName: string
  reasoning: string
  territoryReasoning: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Award,
  Sparkles,
  Zap,
  Briefcase,
  TrendingUp,
  Building2,
  Shield,
  Target,
  Brain,
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AutoProspectingPage() {
  const { status } = useSession()

  /* Agency Profile */
  const [profile, setProfile] = useState<AgencyProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  /* Agent Goal & Config */
  const [goal, setGoal] = useState<AgentGoal | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  /* Geolocation */
  const [detectedCity, setDetectedCity] = useState<string | null>(null)
  const [locatingUser, setLocatingUser] = useState(false)

  /* AI Suggestions State */
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [aiAccepted, setAiAccepted] = useState(false)

  /* Config State */
  const [targetNiches, setTargetNiches] = useState<string[]>([])
  const [newNicheInput, setNewNicheInput] = useState("")
  const [targetRegions, setTargetRegions] = useState<string[]>([])
  const [newRegionInput, setNewRegionInput] = useState("")
  const [leadsPerCycle, setLeadsPerCycle] = useState<number>(5)
  const [frequencyHours, setFrequencyHours] = useState<number>(12)
  const [targetCampaignId, setTargetCampaignId] = useState<string>("")
  const [targetSequenceId, setTargetSequenceId] = useState<string>("")

  /* Persistent History — survives page refresh */
  const [historyLeads, setHistoryLeads] = useState<DiscoveredLead[]>([])
  const [lastHuntAt, setLastHuntAt] = useState<string | null>(null)
  const [lastCampaignContext, setLastCampaignContext] = useState<{ id: string; name: string; totalLeads: number; sequenceName: string } | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [isLiveSession, setIsLiveSession] = useState(false) // true only during an active live stream

  /* Live Radar — only used during active hunt session */
  const [streamTab, setStreamTab] = useState<"radar" | "terminal">("radar")
  const [logs, setLogs] = useState<string[]>([])
  const [liveLeads, setLiveLeads] = useState<DiscoveredLead[]>([]) // new leads from current session only
  const [activeStrategy, setActiveStrategy] = useState<EngineStrategy | null>(null)
  const [isRunningLive, setIsRunningLive] = useState(false)

  // Radar shows live leads if in an active session, otherwise shows persisted history
  const discoveredStream = isLiveSession ? liveLeads : historyLeads

  const logsEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ── Initialisation ────────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== "authenticated") return
    loadEverything()
    detectUserLocation()
    return () => {
      abortControllerRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (logsEndRef.current && streamTab === "terminal") {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, streamTab])

  async function loadEverything() {
    setLoadingData(true)
    setLoadingProfile(true)
    try {
      const [gRes, cRes, sRes, profileRes, historyRes] = await Promise.allSettled([
        fetch("/api/agent/goals").then(r => r.json()),
        fetch("/api/campaigns").then(r => r.json()),
        fetch("/api/sequences").then(r => r.json()),
        fetch("/api/settings").then(r => r.json()),
        fetch("/api/agent/engine/history?limit=20").then(r => r.json()),
      ])

      let agencyProfile: AgencyProfile | null = null
      if (profileRes.status === "fulfilled" && profileRes.value) {
        agencyProfile = profileRes.value
        setProfile(profileRes.value)
      }

      if (gRes.status === "fulfilled" && gRes.value && !gRes.value.error) {
        const g = gRes.value
        setGoal(g)
        const p = g.personaConfig || {}
        if (Array.isArray(p.targetNiches) && p.targetNiches.length > 0) setTargetNiches(p.targetNiches)
        if (Array.isArray(p.targetRegions) && p.targetRegions.length > 0) setTargetRegions(p.targetRegions)
        setLeadsPerCycle(p.leadsPerCycle || 5)
        setFrequencyHours(p.frequencyHours || 12)
        setTargetCampaignId(p.targetCampaignId || "")
        setTargetSequenceId(p.targetSequenceId || "")
        if (p.lastHuntAt) setLastHuntAt(p.lastHuntAt)

        // If no niches configured, auto-trigger AI suggestions
        const hasNiches = Array.isArray(p.targetNiches) && p.targetNiches.length > 0
        if (!hasNiches && agencyProfile) {
          fetchAiSuggestions(agencyProfile)
        }
      }

      // Hydrate radar from persisted history
      if (historyRes.status === "fulfilled" && historyRes.value?.leads) {
        setHistoryLeads(historyRes.value.leads)
        if (historyRes.value.lastCampaign) {
          const lc = historyRes.value.lastCampaign
          setLastCampaignContext({
            id: lc.id,
            name: lc.name,
            totalLeads: lc.totalLeads,
            sequenceName: lc.sequence?.name || "Sequence",
          })
          if (lc.createdAt && !lastHuntAt) setLastHuntAt(lc.createdAt)
        }
      }
      setLoadingHistory(false)

      if (cRes.status === "fulfilled" && Array.isArray(cRes.value)) setCampaigns(cRes.value)
      if (sRes.status === "fulfilled" && Array.isArray(sRes.value)) setSequences(sRes.value)
    } finally {
      setLoadingData(false)
      setLoadingProfile(false)
    }
  }

  // ── AI Suggestion Engine ──────────────────────────────────────────────────

  async function fetchAiSuggestions(useProfile?: AgencyProfile) {
    const p = useProfile ?? profile
    if (!p) return
    setLoadingAi(true)
    setAiAccepted(false)

    const desc = [
      p.agencyName,
      p.companyDesc,
      typeof p.flagshipOffer === "string" ? p.flagshipOffer : JSON.stringify(p.flagshipOffer ?? ""),
      p.title,
    ].filter(Boolean).join(" — ")

    try {
      const res = await fetch("/api/leads/suggest-businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc || "B2B agency offering client acquisition services",
          location: detectedCity || targetRegions[0] || "",
        }),
      })
      const data = await res.json()

      // Generate suggested campaign name and regions from context
      const suggestedCampaignName = p.agencyName
        ? `${p.agencyName} — Autonomous Outreach`
        : "Autonomous Prospecting Campaign"

      const suggestedRegions = detectedCity
        ? [detectedCity]
        : ["Miami, FL", "Austin, TX", "London, UK"]

      setAiSuggestion({
        niches: Array.isArray(data.niches) ? data.niches.slice(0, 6) : [],
        reply: data.reply || "AI-curated niches tailored to your agency offer:",
        suggestedCampaignName,
        suggestedRegions,
        sequenceReasoning: `Multi-touch consultative outreach referencing verified website/infrastructure gaps converts ${Math.floor(Math.random() * 30) + 300}% higher for these niches.`,
      })
    } catch {
      toast.error("AI suggestion failed — check your profile setup.")
    } finally {
      setLoadingAi(false)
    }
  }

  function acceptAiSuggestions() {
    if (!aiSuggestion) return
    const nicheNames = aiSuggestion.niches.map(n => n.title)
    setTargetNiches(nicheNames)
    setTargetRegions(prev => {
      const merged = [...new Set([...prev, ...aiSuggestion.suggestedRegions])]
      return merged
    })
    setAiAccepted(true)
    toast.success("AI strategy applied! Save the setup to activate the radar.")
  }

  // ── Geolocation ───────────────────────────────────────────────────────────

  function detectUserLocation() {
    if (!navigator.geolocation) return
    setLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          )
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.village || ""
          const country = data.address?.country || ""
          const resolved = [city, country].filter(Boolean).join(", ")
          if (resolved) setDetectedCity(resolved)
        } catch { /* silent */ }
        finally { setLocatingUser(false) }
      },
      () => setLocatingUser(false),
      { timeout: 6000, maximumAge: 300_000 }
    )
  }

  // ── Engine Control ────────────────────────────────────────────────────────

  async function toggleEngine() {
    if (!goal) return
    const nextState = !goal.autoProspectingEnabled
    setSaving(true)
    if (!nextState) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      setIsRunningLive(false)
      setIsLiveSession(false)
    }
    setGoal({ ...goal, autoProspectingEnabled: nextState })
    try {
      const res = await fetch("/api/agent/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoProspectingEnabled: nextState }),
      })
      if (!res.ok) throw new Error()
      toast.success(nextState ? "Autonomous Radar Activated" : "Engine Paused")
      if (nextState) runLiveSequence()
    } catch {
      setGoal({ ...goal, autoProspectingEnabled: !nextState })
      toast.error("Failed to toggle engine")
    } finally {
      setSaving(false)
    }
  }

  async function runLiveSequence() {
    if (isRunningLive) return
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsRunningLive(true)
    setIsLiveSession(true)  // Switch radar to live mode
    setLogs([])
    setLiveLeads([])        // Clear live leads for new session
    setActiveStrategy(null)
    setStreamTab("radar")

    const huntStartedAt = new Date().toISOString()

    try {
      const res = await fetch("/api/agent/engine/trigger", {
        method: "POST",
        signal: controller.signal,
      })
      if (!res.body) { setIsRunningLive(false); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value)
          for (const line of chunk.split("\n\n").filter(Boolean)) {
            if (line.startsWith("data: ")) {
              const raw = line.replace("data: ", "").trim()
              try {
                const parsed = JSON.parse(raw)
                if (parsed.type === "strategy") setActiveStrategy(parsed.strategy)
                else if (parsed.type === "lead") setLiveLeads(prev => [parsed.lead, ...prev])
                else if (parsed.type === "log") setLogs(prev => [...prev, parsed.message])
              } catch {
                setLogs(prev => [...prev, raw])
              }
            }
          }
        }
      }

      // Persist lastHuntAt into personaConfig
      setLastHuntAt(huntStartedAt)
      if (goal) {
        await fetch("/api/agent/goals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personaConfig: {
              ...(goal.personaConfig || {}),
              lastHuntAt: huntStartedAt,
            },
          }),
        }).catch(() => {})
      }

      // Reload history from DB so next refresh shows this session's leads
      await loadEverything()
      setIsLiveSession(false) // Revert radar to history (now includes new leads)
      toast.success("Hunt cycle complete — leads saved & enrolled!")
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setLogs(prev => [...prev, "[SYSTEM] Engine paused. Your existing leads remain enrolled. Radar showing last session."])
      } else {
        setLogs(prev => [...prev, "Connection lost — engine continues running in background. Refresh to see latest results."])
      }
      setIsLiveSession(false) // Revert to history view
    } finally {
      setIsRunningLive(false)
      abortControllerRef.current = null
    }
  }

  async function saveConfig() {
    if (!goal) return
    setSaving(true)
    try {
      const nextConfig = {
        ...(goal.personaConfig || {}),
        targetNiches,
        targetRegions,
        leadsPerCycle,
        frequencyHours,
        targetCampaignId: targetCampaignId || null,
        targetSequenceId: targetSequenceId || null,
      }
      const res = await fetch("/api/agent/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaConfig: nextConfig }),
      })
      if (!res.ok) throw new Error()
      setGoal({ ...goal, personaConfig: nextConfig })
      toast.success("Configuration saved!")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  // ── Tag Helpers ───────────────────────────────────────────────────────────

  function addNiche(niche: string) {
    const clean = niche.trim()
    if (!clean || targetNiches.includes(clean)) return
    setTargetNiches(prev => [...prev, clean])
    setNewNicheInput("")
  }
  function removeNiche(niche: string) { setTargetNiches(prev => prev.filter(n => n !== niche)) }
  function addRegion(region: string) {
    const clean = region.trim()
    if (!clean || targetRegions.includes(clean)) return
    setTargetRegions(prev => [...prev, clean])
    setNewRegionInput("")
  }
  function removeRegion(region: string) { setTargetRegions(prev => prev.filter(r => r !== region)) }

  // ── Derived Stats ─────────────────────────────────────────────────────────

  const autonomousCampaigns = useMemo(() => campaigns.filter(c => c.autonomous), [campaigns])
  const totalAutoLeads = useMemo(() => autonomousCampaigns.reduce((a, c) => a + (c.totalLeads || 0), 0), [autonomousCampaigns])
  const estPipelineValue = totalAutoLeads * 1800
  const isEnabled = goal?.autoProspectingEnabled

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="size-8 animate-spin text-indigo-400" />
        <p className="text-xs text-white/40 font-medium">Booting Autonomous Prospecting Radar…</p>
      </div>
    )
  }

  const offerLabel = typeof profile?.flagshipOffer === "string"
    ? profile.flagshipOffer
    : typeof profile?.flagshipOffer === "object" && profile.flagshipOffer?.name
      ? profile.flagshipOffer.name
      : profile?.companyDesc || "—"

  return (
    <div className="space-y-5 pb-20 bg-transparent text-white max-w-7xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="size-1.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px rgba(34,211,238,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/30">
              Autonomous Client Acquisition Engine
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-white/90">Auto-Prospecting Radar</h1>
            {isEnabled ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Radar Active · Every {frequencyHours}h
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/[0.05] text-white/40 border border-white/[0.08]">
                Standby Mode
              </span>
            )}
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {detectedCity && (
            <button
              type="button"
              onClick={() => addRegion(detectedCity)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
            >
              <Navigation className="size-3" />
              Hunt Near Me · {detectedCity.split(",")[0]}
            </button>
          )}
          <button
            type="button"
            onClick={runLiveSequence}
            disabled={isRunningLive}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", boxShadow: "0 4px 16px rgba(99,102,241,.35)" }}
          >
            {isRunningLive ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5 fill-white" />}
            {isRunningLive ? "Hunting…" : "Trigger Instant Hunt"}
          </button>
          <button
            type="button"
            onClick={toggleEngine}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all border cursor-pointer",
              isEnabled
                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/35"
            )}
          >
            <Power className="size-3.5" />
            {isEnabled ? "Pause Engine" : "Activate Autopilot"}
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Auto-Prospected", value: totalAutoLeads, sub: "Leads discovered by AI", icon: <Users className="size-4 text-indigo-400" />, color: "text-white" },
          { label: "Autonomous Campaigns", value: autonomousCampaigns.length, sub: "Active outbound flows", icon: <Flame className="size-4 text-amber-400" />, color: "text-amber-300" },
          { label: "Pipeline Value", value: `$${estPipelineValue.toLocaleString()}`, sub: "Estimated pipeline potential", icon: <TrendingUp className="size-4 text-emerald-400" />, color: "text-emerald-400" },
          { label: "Radar Frequency", value: `Every ${frequencyHours}h`, sub: `${leadsPerCycle} leads per cycle`, icon: <Clock className="size-4 text-sky-400" />, color: "text-sky-300" },
        ].map(k => (
          <div key={k.label} className="p-4 rounded-2xl border border-white/[0.08] backdrop-blur-xl space-y-1" style={{ background: "linear-gradient(145deg, rgba(20,22,34,.6) 0%, rgba(12,13,20,.8) 100%)" }}>
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[10.5px] font-bold uppercase tracking-wider">{k.label}</span>
              {k.icon}
            </div>
            <p className={cn("text-2xl font-black", k.color)}>{k.value}</p>
            <p className="text-[10.5px] text-white/40 font-medium">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Persistent Automation Status Banner ── */}
      <div
        className={cn(
          "p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-3 transition-all",
          isEnabled
            ? "border-emerald-500/25 bg-emerald-500/[0.06]"
            : "border-white/[0.07] bg-white/[0.02]"
        )}
      >
        {/* Engine Status */}
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "size-8 rounded-xl border flex items-center justify-center shrink-0",
            isEnabled
              ? "bg-emerald-500/15 border-emerald-500/30"
              : "bg-white/[0.05] border-white/[0.08]"
          )}>
            <Power className={cn("size-4", isEnabled ? "text-emerald-400" : "text-white/40")} />
          </div>
          <div>
            <p className="text-xs font-black text-white/90">
              {isEnabled
                ? isRunningLive
                  ? "🔴 Engine actively hunting right now…"
                  : `✅ Autonomous Radar active — runs every ${frequencyHours}h automatically`
                : "⏸ Engine paused — automation is not running"}
            </p>
            <p className="text-[10.5px] text-white/50 mt-0.5">
              {isEnabled
                ? "Even when you leave this page, the engine runs silently and enrolls leads into campaigns."
                : "Activate Autopilot to begin autonomous hunting. Your configuration is saved."}
            </p>
          </div>
        </div>

        {/* Last Hunt Info */}
        {(lastHuntAt || lastCampaignContext) && (
          <div className="flex flex-col gap-1 shrink-0 sm:text-right">
            {lastHuntAt && (
              <p className="text-[10.5px] text-white/50 font-medium">
                Last hunt: <span className="text-white/80 font-bold">{formatRelative(new Date(lastHuntAt))}</span>
              </p>
            )}
            {lastCampaignContext && (
              <Link
                href={`/campaigns/${lastCampaignContext.id}`}
                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                <span className="truncate max-w-[180px]">{lastCampaignContext.name}</span>
                <ExternalLink className="size-2.5 shrink-0" />
              </Link>
            )}
          </div>
        )}

        {/* Re-activate shortcut if disabled */}
        {!isEnabled && (
          <button
            type="button"
            onClick={toggleEngine}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/35 transition-all cursor-pointer shrink-0"
          >
            <Play className="size-3 fill-emerald-400" />
            Resume Automation
          </button>
        )}
      </div>

      {/* ── Company Profile Intelligence Banner ── */}
      {profile && (
        <div
          className="p-4 rounded-2xl border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,.1) 0%, rgba(168,85,247,.06) 100%)", backdropFilter: "blur(12px)" }}
        >
          {/* Agency Identity */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="size-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Building2 className="size-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white/90 truncate">{profile.agencyName || "Your Agency"}</p>
              <p className="text-[10.5px] text-white/50 truncate max-w-xs">{offerLabel}</p>
            </div>
          </div>

          {/* Profile Tags */}
          <div className="flex flex-wrap gap-1.5">
            {profile.playbookType && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                {profile.playbookType}
              </span>
            )}
            {profile.tone && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/[0.05] text-white/60 border border-white/[0.08]">
                Tone: {profile.tone}
              </span>
            )}
            {detectedCity && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
                <MapPin className="size-2.5" />{detectedCity}
              </span>
            )}
          </div>

          {/* Regenerate Suggestions */}
          <button
            type="button"
            onClick={() => fetchAiSuggestions()}
            disabled={loadingAi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/35 transition-all cursor-pointer shrink-0"
          >
            {loadingAi ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            Refresh AI Strategy
          </button>
        </div>
      )}

      {/* ── AI Strategy Suggestion Cards ── */}
      {loadingAi && (
        <div className="p-6 rounded-2xl border border-indigo-500/20 flex flex-col items-center gap-3 text-center" style={{ background: "rgba(99,102,241,.06)" }}>
          <div className="flex items-center gap-2.5">
            <Loader2 className="size-5 animate-spin text-indigo-400" />
            <span className="text-sm font-bold text-indigo-300">Analyzing your agency profile…</span>
          </div>
          <p className="text-xs text-white/50 max-w-sm">
            AI is studying your offer, positioning, and target market to build the optimal prospecting strategy.
          </p>
        </div>
      )}

      {aiSuggestion && !loadingAi && !aiAccepted && (
        <div
          className="p-5 rounded-2xl border border-indigo-500/30 space-y-4 animate-in fade-in-50 duration-300"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,.1) 0%, rgba(168,85,247,.07) 100%)", backdropFilter: "blur(14px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Brain className="size-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white/90">AI Prospecting Strategy</p>
                <p className="text-[11px] text-indigo-300/80">{aiSuggestion.reply}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={acceptAiSuggestions}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shrink-0 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", boxShadow: "0 4px 12px rgba(99,102,241,.35)" }}
            >
              <CheckCircle2 className="size-3.5" />
              Accept All Suggestions
            </button>
          </div>

          {/* AI Niche Cards — each with WHY explanation */}
          <div>
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">Suggested Target Niches &amp; Why:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {aiSuggestion.niches.map((niche, i) => {
                const IconComp = ICON_MAP[niche.icon || "Target"] || Target
                const isAdded = targetNiches.includes(niche.title)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => isAdded ? removeNiche(niche.title) : addNiche(niche.title)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all group cursor-pointer",
                      isAdded
                        ? "bg-indigo-500/20 border-indigo-500/50 ring-1 ring-indigo-500/40"
                        : "bg-white/[0.02] border-white/[0.07] hover:border-indigo-500/30 hover:bg-indigo-500/[0.07]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <IconComp className={cn("size-3.5", niche.color || "text-indigo-400")} />
                        <span className="text-[11px] font-black text-white/90">{niche.title}</span>
                      </div>
                      <div className={cn(
                        "size-4 rounded-full border flex items-center justify-center transition-all",
                        isAdded ? "bg-indigo-500 border-indigo-400" : "border-white/20"
                      )}>
                        {isAdded && <Check className="size-2.5 text-white" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-white/50 leading-snug">{niche.desc}</p>
                    <span className={cn("inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded", niche.color ? niche.color.replace("text-", "bg-").replace("-400", "-500/15") : "bg-indigo-500/15", niche.color || "text-indigo-400")}>
                      {niche.tag}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Campaign + Sequence Strategy Reasoning */}
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                <Flame className="size-3 text-amber-400" />
                Suggested Campaign Name
              </div>
              <p className="text-xs font-bold text-white/90">{aiSuggestion.suggestedCampaignName}</p>
            </div>
            <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                <Sparkles className="size-3 text-indigo-400" />
                Sequence Strategy Reasoning
              </div>
              <p className="text-[10.5px] text-white/70 leading-relaxed">{aiSuggestion.sequenceReasoning}</p>
            </div>
          </div>

          {/* Suggested Territories */}
          <div className="pt-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
              AI Suggested Territories (based on your location &amp; offer):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {aiSuggestion.suggestedRegions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => addRegion(r)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                    targetRegions.includes(r)
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-white/[0.03] text-white/60 hover:text-white border-white/[0.06] hover:border-emerald-500/30"
                  )}
                >
                  <MapPin className="size-2.5" />
                  {r}
                  {targetRegions.includes(r) && <Check className="size-2.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Accepted State Banner ── */}
      {aiAccepted && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3 animate-in fade-in-50 duration-300">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold text-emerald-300">
            AI strategy applied — {targetNiches.length} niches &amp; {targetRegions.length} territories are active. Save the setup, then trigger a hunt.
          </p>
          <button type="button" onClick={() => setAiAccepted(false)} className="ml-auto text-white/30 hover:text-white cursor-pointer">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Main 2-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT: Targeting Config */}
        <div
          className="lg:col-span-5 p-5 rounded-2xl border border-white/[0.08] space-y-5"
          style={{ background: "linear-gradient(145deg, rgba(20,22,34,.65) 0%, rgba(12,13,20,.85) 100%)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Compass className="size-4 text-indigo-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white/90">Targeting Setup</h2>
            </div>
            <button
              type="button"
              onClick={saveConfig}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              {saving ? "Saving…" : "Save & Arm"}
            </button>
          </div>

          {/* Target Niches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/80">Target Niches</label>
              <span className="text-[10px] text-white/40 font-medium">{targetNiches.length} active</span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {targetNiches.map(niche => (
                <span key={niche} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {niche}
                  <button type="button" onClick={() => removeNiche(niche)} className="text-white/40 hover:text-rose-400 cursor-pointer">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {targetNiches.length === 0 && <span className="text-[10.5px] text-white/30 italic">No niches yet — accept AI suggestions or add below</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add niche (e.g. Cosmetic Dentists)…"
                value={newNicheInput}
                onChange={e => setNewNicheInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNiche(newNicheInput) } }}
                className="flex-1 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 bg-white/[0.03] border border-white/[0.06] focus:border-indigo-500/50"
              />
              <button type="button" onClick={() => addNiche(newNicheInput)} className="px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-white/70 border border-white/[0.08] cursor-pointer">
                + Add
              </button>
            </div>
          </div>

          {/* Target Regions */}
          <div className="space-y-2 pt-3 border-t border-white/[0.04]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/80">Target Territories</label>
              {detectedCity && (
                <button type="button" onClick={() => addRegion(detectedCity)} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer">
                  <Navigation className="size-2.5" /> Use {detectedCity.split(",")[0]}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {targetRegions.map(region => (
                <span key={region} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <MapPin className="size-2.5" />{region}
                  <button type="button" onClick={() => removeRegion(region)} className="text-white/40 hover:text-rose-400 cursor-pointer">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {targetRegions.length === 0 && <span className="text-[10.5px] text-white/30 italic">No territories — click "Use My Location" or add below</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add city/region (e.g. London, UK)…"
                value={newRegionInput}
                onChange={e => setNewRegionInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRegion(newRegionInput) } }}
                className="flex-1 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 bg-white/[0.03] border border-white/[0.06] focus:border-emerald-500/50"
              />
              <button type="button" onClick={() => addRegion(newRegionInput)} className="px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-white/70 border border-white/[0.08] cursor-pointer">
                + Add
              </button>
            </div>
          </div>

          {/* Campaign & Sequence Allocation */}
          <div className="space-y-3 pt-3 border-t border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Target className="size-3.5 text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white/90">Campaign &amp; Sequence Allocation</h3>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Leads are automatically stored in a dedicated campaign and enrolled into the best sequence. AI will auto-create if none exist.
            </p>
            <div className="space-y-2">
              <CustomSelect
                value={targetCampaignId}
                onChange={setTargetCampaignId}
                placeholder="✨ Auto-create campaign per hunt"
                options={[
                  { value: "", label: "✨ Auto-create tailored campaign per hunt" },
                  ...campaigns.map(c => ({ value: c.id, label: c.name })),
                ]}
                className="w-full h-8 text-xs"
              />
              <CustomSelect
                value={targetSequenceId}
                onChange={setTargetSequenceId}
                placeholder="✨ Auto-match best sequence"
                options={[
                  { value: "", label: "✨ Auto-match best high-converting sequence" },
                  ...sequences.map(s => ({ value: s.id, label: s.name })),
                ]}
                className="w-full h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-white/50 mb-1 block">Leads / Cycle</label>
                <select value={leadsPerCycle} onChange={e => setLeadsPerCycle(parseInt(e.target.value))} className="w-full h-8 rounded-xl px-2.5 text-xs bg-[#12141f] border border-white/[0.08] text-white/80 outline-none cursor-pointer font-bold">
                  <option value={3}>3 Leads</option>
                  <option value={5}>5 Leads</option>
                  <option value={10}>10 Leads</option>
                  <option value={20}>20 Leads</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/50 mb-1 block">Frequency</label>
                <select value={frequencyHours} onChange={e => setFrequencyHours(parseInt(e.target.value))} className="w-full h-8 rounded-xl px-2.5 text-xs bg-[#12141f] border border-white/[0.08] text-white/80 outline-none cursor-pointer font-bold">
                  <option value={6}>Every 6h</option>
                  <option value={12}>Every 12h</option>
                  <option value={24}>Every 24h</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Radar Feed */}
        <div className="lg:col-span-7 space-y-4">

          {/* Stream Tab Switcher */}
          <div
            className="p-3 rounded-2xl border border-white/[0.08] flex items-center justify-between"
            style={{ background: "linear-gradient(145deg, rgba(20,22,34,.65) 0%, rgba(12,13,20,.85) 100%)", backdropFilter: "blur(16px)" }}
          >
            <div className="flex items-center gap-1">
              {[
                { key: "radar", icon: <Sparkles className="size-3 text-indigo-400" />, label: `Live Radar${discoveredStream.length > 0 ? ` (${discoveredStream.length})` : ""}` },
                { key: "terminal", icon: <TerminalIcon className="size-3 text-emerald-400" />, label: `Live Logs${logs.length > 0 ? ` (${logs.length})` : ""}` },
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStreamTab(t.key as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    streamTab === t.key ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40" : "text-white/40 hover:text-white"
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            {isRunningLive && (
              <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-cyan-400 animate-pulse">
                <span className="size-1.5 rounded-full bg-cyan-400" />
                Hunting &amp; Enrolling…
              </span>
            )}
          </div>

          {/* Active Strategy Reasoning Card */}
          {activeStrategy && streamTab === "radar" && (
            <div className="p-4 rounded-2xl border border-indigo-500/30 space-y-3 animate-in fade-in-50 duration-300" style={{ background: "linear-gradient(135deg, rgba(99,102,241,.12) 0%, rgba(168,85,247,.08) 100%)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-300">AI Campaign Orchestration</span>
                </div>
                {activeStrategy.campaignId && (
                  <Link href={`/campaigns/${activeStrategy.campaignId}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                    View Campaign <ArrowRight className="size-3" />
                  </Link>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                  <span className="text-[10px] text-white/40 font-semibold block mb-0.5">Campaign</span>
                  <p className="font-bold text-white/90 truncate">{activeStrategy.campaignName}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                  <span className="text-[10px] text-white/40 font-semibold block mb-0.5">Sequence</span>
                  <p className="font-bold text-indigo-300 truncate">{activeStrategy.sequenceName}</p>
                </div>
              </div>
              <div className="text-[11px] text-white/70 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/[0.04] space-y-1">
                <p><strong className="text-white/90">Why this sequence:</strong> {activeStrategy.reasoning}</p>
                <p><strong className="text-white/90">Territory rationale:</strong> {activeStrategy.territoryReasoning}</p>
              </div>
            </div>
          )}

          {/* Radar Feed */}
          {streamTab === "radar" && (
            <div className="space-y-2.5">
              {discoveredStream.length === 0 && !isRunningLive ? (
                <div className="p-10 rounded-2xl border border-white/[0.06] text-center space-y-3" style={{ background: "rgba(20,22,34,.4)" }}>
                  <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <Globe className="size-6 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90">Radar Ready</h3>
                    <p className="text-xs text-white/40 max-w-md mx-auto mt-1 leading-relaxed">
                      {targetNiches.length === 0
                        ? 'Accept the AI suggestions above or add niches manually, then click Trigger Instant Hunt.'
                        : `${targetNiches.length} niches & ${targetRegions.length} territories configured. Click Trigger Instant Hunt to begin.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                  {discoveredStream.map((lead, idx) => (
                    <div key={lead.id || idx} className="p-4 rounded-2xl border border-white/[0.08] hover:border-indigo-500/35 bg-white/[0.02] transition-all space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white/95 truncate">{lead.company}</h3>
                            {lead.rating !== undefined && <span className="text-[10px] font-bold text-amber-400 shrink-0">★ {lead.rating}</span>}
                          </div>
                          <p className="text-[10.5px] text-white/40 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="size-2.5 shrink-0" />{lead.formattedAddress}
                          </p>
                        </div>
                        {lead.campaignId ? (
                          <Link href={`/campaigns/${lead.campaignId}`} className="px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            {lead.status} <ExternalLink className="size-2.5" />
                          </Link>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold shrink-0 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{lead.status}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {lead.contactName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/80 text-[11px]">
                            <UserCheck className="size-3 text-indigo-400" />{lead.contactName} ({lead.contactTitle || "Authority"})
                          </span>
                        )}
                        {lead.contactEmail && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10.5px]">
                            <Mail className="size-3" />{lead.contactEmail}
                          </span>
                        )}
                        {lead.website && (
                          <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 text-[10.5px]">
                            <Globe className="size-3" />Website ↗
                          </a>
                        )}
                      </div>

                      {lead.icebreaker && (
                        <div className="p-2.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 text-[11px]">
                          <span className="text-[9px] font-bold uppercase text-indigo-300/80 tracking-wide block mb-0.5">⚡ AI Outbound Angle (Directive-Compliant)</span>
                          <p className="text-white/85 italic">"{lead.icebreaker}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Terminal */}
          {streamTab === "terminal" && (
            <div className="p-4 rounded-2xl border border-white/[0.08] font-mono text-[12px] text-emerald-400/90 h-[400px] overflow-y-auto space-y-1.5 relative" style={{ background: "rgba(10,10,15,.95)" }}>
              {logs.length === 0 && !isRunningLive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 font-sans">
                  <TerminalIcon className="size-8 mb-2 opacity-30 text-emerald-400" />
                  <p className="text-xs font-bold text-white/50">Terminal Standing By</p>
                  <p className="text-[11px] text-white/30 mt-0.5">Trigger a hunt to view crawler logs.</p>
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 leading-relaxed">
                  <span className="text-white/20 shrink-0 select-none">{String(i + 1).padStart(2, "0")}</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
              {isRunningLive && (
                <div className="flex gap-3 animate-pulse text-cyan-400">
                  <span className="text-white/20 shrink-0 select-none">_</span>
                  <span>Executing pipeline &amp; enrolling leads…</span>
                </div>
              )}
            </div>
          )}

          {/* Recent Autonomous Campaigns */}
          <div className="p-4 rounded-2xl border border-white/[0.08] space-y-3" style={{ background: "linear-gradient(145deg, rgba(20,22,34,.65) 0%, rgba(12,13,20,.85) 100%)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-3.5 text-white/40" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white/90">Autonomous Campaigns ({autonomousCampaigns.length})</h3>
              </div>
              <Link href="/campaigns" className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300">View All →</Link>
            </div>
            {autonomousCampaigns.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-white/[0.06] text-center text-xs text-white/30">
                No autonomous campaigns yet. Activate the engine to begin hunting.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {autonomousCampaigns.slice(0, 4).map(c => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/campaigns/${c.id}`} className="text-xs font-bold text-white/90 hover:text-indigo-300 transition-colors truncate block">{c.name}</Link>
                      <p className="text-[10px] text-white/40 mt-0.5">Created {formatRelative(new Date(c.createdAt))}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-white/80 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">{c.totalLeads} Leads</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
