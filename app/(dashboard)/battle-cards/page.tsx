/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import {
  Zap,
  MessageSquare,
  Star,
  Swords,
  Quote,
  Copy,
  Check,
  Search,
  Loader2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Flame,
  Target,
  User,
  Building2,
  ExternalLink,
  ChevronRight
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { parseCompetitorAnalysis } from "@/lib/competitor-utils"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface CaseStudy {
  id: string
  clientName: string
  industry: string
  nicheTags: string[]
  results: string
  aiSummary: string | null
  testimonialQuote: string | null
}

interface Lead {
  id: string
  firstName: string | null
  lastName: string | null
  company: string | null
  industry: string | null
  painPoint: string | null
  recommendedApproach: string | null
  competitorAnalysis: string | null
  auditJson: string | null
  website: string | null
}

const COMMON_OBJECTION_CHIPS = [
  "We already handle this in-house",
  "We are currently working with another agency",
  "No budget / too expensive right now",
  "Send me some information or case studies first",
  "Bad timing / call me back in Q4",
  "We don't need marketing, we get all business by word-of-mouth",
]

const KILL_POINTS_MATRIX = [
  {
    category: "vs. Traditional / Big Agencies",
    badge: "Agility & Speed",
    competitorFlaw: "Bury clients in 6-month rigid contracts with slow turnarounds and junior account managers.",
    ourKillPoint: "We operate in agile 14-day sprints with direct founder access, performance-tied milestones, and weekly CRO optimizations.",
    punchline: "You get senior execution without the agency bloat and retainers.",
  },
  {
    category: "vs. In-House Teams",
    badge: "Capacity & Depth",
    competitorFlaw: "In-house marketers are stretched thin across 10 internal tasks and lack specialized testing tooling.",
    ourKillPoint: "We plug into your team as a dedicated specialized unit, handling the deep technical lifting and creative volume so your team stays focused.",
    punchline: "Full acquisition firepower for less than the cost of hiring 1 junior employee.",
  },
  {
    category: "vs. Cheap Freelancers / Offshore",
    badge: "Accountability & Strategy",
    competitorFlaw: "Order-takers with zero strategic ownership, communication delays, and inconsistent delivery.",
    ourKillPoint: "We take full strategic responsibility for pipeline revenue, provide verified tracking dashboards, and align incentives with your growth.",
    punchline: "A proven acquisition system, not unverified hourly tasks.",
  },
]

export default function BattleCardsPage() {
  const { activePlaybook } = usePlaybook()
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  // Active War Room Section
  const [activeTab, setActiveTab] = useState<"objections" | "proof" | "killpoints" | "dealprep">("objections")

  // Objection search & AI generator state
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedScript, setCopiedScript] = useState<string | null>(null)

  // AI Custom Rebuttal Generator State
  const [customObjection, setCustomObjection] = useState("")
  const [prospectContext, setProspectContext] = useState("")
  const [generatingRebuttal, setGeneratingRebuttal] = useState(false)
  const [generatedRebuttal, setGeneratedRebuttal] = useState<{
    tacticalEmpathyLabel: string
    pivotAndProof: string
    closingQuestion: string
    fullScript: string
  } | null>(null)

  // Lead-specific Deal Prep state
  const [selectedLeadId, setSelectedLeadId] = useState<string>("")

  useEffect(() => {
    Promise.all([
      fetch("/api/case-studies").then((r) => r.json()),
      fetch("/api/leads").then((r) => r.json()),
    ])
      .then(([cs, ls]) => {
        setCaseStudies(Array.isArray(cs) ? cs : [])
        setLeads(Array.isArray(ls) ? ls : [])
        if (Array.isArray(ls) && ls.length > 0) {
          setSelectedLeadId(ls[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const verticals = useMemo(() => {
    return (activePlaybook?.targetVerticals || []).map((v) => v.toLowerCase())
  }, [activePlaybook])

  const matchedCaseStudies = useMemo(() => {
    return caseStudies.filter((cs) => {
      const tags = [cs.industry, ...(Array.isArray(cs.nicheTags) ? cs.nicheTags : [])].map((t) =>
        String(t).toLowerCase()
      )
      return verticals.some((v) => tags.some((t) => t.includes(v) || v.includes(t)))
    })
  }, [caseStudies, verticals])

  const leadsWithIntel = useMemo(() => {
    return leads.filter((l) => l.competitorAnalysis)
  }, [leads])

  // Objection Handlers from Playbook
  const playbookObjections = activePlaybook?.objectionHandlers || []

  // Filtered Objections
  const filteredObjections = useMemo(() => {
    if (!searchQuery.trim()) return playbookObjections
    const q = searchQuery.toLowerCase()
    return playbookObjections.filter(
      (o) => o.objection.toLowerCase().includes(q) || o.response.toLowerCase().includes(q)
    )
  }, [playbookObjections, searchQuery])

  // Copy handler with visual feedback
  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedScript(id)
    toast.success("Script copied! Ready to speak on a call or paste into inbox reply.")
    setTimeout(() => setCopiedScript(null), 2500)
  }

  // Handle AI Rebuttal Generation
  async function handleGenerateCustomRebuttal() {
    if (!customObjection.trim()) {
      toast.error("Please enter the prospect objection or select a prompt chip.")
      return
    }

    setGeneratingRebuttal(true)
    const toastId = toast.loading("AI is engineering a Chris Voss tactical empathy rebuttal...")
    try {
      const res = await fetch("/api/battle-cards/ai-rebuttal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objection: customObjection,
          prospectContext,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate rebuttal")

      if (data.rebuttal) {
        setGeneratedRebuttal(data.rebuttal)
        toast.success("Custom rebuttal engineered! Review below.", { id: toastId })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rebuttal generation failed"
      toast.error(msg, { id: toastId })
    } finally {
      setGeneratingRebuttal(false)
    }
  }

  // Selected Lead for Deal Prep
  const currentLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || null
  }, [leads, selectedLeadId])

  return (
    <div className="space-y-8 pb-24">
      {/* ── Top Header & Stats ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Flame className="size-3.5 text-amber-400" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-amber-400">
              Sales War Room &amp; Deal Execution Hub
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/95">
            Sales Battle Cards &amp; Rebuttal Engine
          </h1>
          <p className="mt-2 text-[13px] text-white/40 max-w-2xl leading-relaxed">
            Arm yourself and Gale Bot with high-converting Chris Voss tactical empathy scripts, verified social proof ammunition, and competitor kill-points to win negotiations and close retainers.
          </p>
        </div>

        {/* Playbook indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] shrink-0">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[12px] font-bold text-white/70">
            Active: <strong className="text-white">{activePlaybook?.name || "Agency"} Playbook</strong>
          </span>
        </div>
      </div>

      {/* ── 4-Pillar War Room Navigation ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: "objections",
            icon: MessageSquare,
            label: "Objection War Room",
            sub: "Tactical Empathy Rebuttals",
            badge: `${playbookObjections.length} active rules`,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
          {
            id: "proof",
            icon: Star,
            label: "Proof Ammunition",
            sub: "Social Proof & Metrics",
            badge: `${matchedCaseStudies.length} matching stories`,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            id: "killpoints",
            icon: Swords,
            label: "Competitor Kill-Points",
            sub: "Differentiation Matrix",
            badge: "3 battle frameworks",
            color: "text-sky-400",
            bg: "bg-sky-500/10",
          },
          {
            id: "dealprep",
            icon: Target,
            label: "Deal Prep Card",
            sub: "Lead-Specific Intel",
            badge: `${leads.length} leads in pipeline`,
            color: "text-violet-400",
            bg: "bg-violet-500/10",
          },
        ].map((tab) => {
          const active = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex flex-col items-start text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group",
                active
                  ? "bg-white/[0.06] border-white/20 text-white shadow-xl"
                  : "bg-white/[0.015] border-white/[0.06] hover:bg-white/[0.03] text-white/50"
              )}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] to-transparent pointer-events-none" />
              )}
              <div className="flex items-center gap-2 mb-2 w-full">
                <span
                  className={cn(
                    "flex items-center justify-center size-7 rounded-xl text-xs font-bold border transition-colors",
                    active
                      ? `${tab.bg} border-white/20 ${tab.color}`
                      : "bg-white/5 border-white/10 text-white/40"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="text-[13px] font-bold text-white/90">{tab.label}</span>
              </div>
              <p className="text-[11.5px] text-white/40 font-medium">{tab.sub}</p>
              <div className="mt-2.5">
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                    active ? "bg-white/10 text-white border border-white/15" : "bg-white/5 text-white/30"
                  )}
                >
                  {tab.badge}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: OBJECTION WAR ROOM
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "objections" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* AI Live Rebuttal Generator Card */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 border shadow-xl space-y-4"
            style={{
              background: "linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.03) 50%, rgba(15, 17, 26, 0.9) 100%)",
              borderColor: "rgba(251, 191, 36, 0.25)",
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Sparkles className="size-4 animate-pulse text-amber-400" />
                  </div>
                  <h3 className="text-[14px] font-black text-white uppercase tracking-wider">
                    Live Chris Voss AI Rebuttal Generator
                  </h3>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Tactical Empathy
                  </span>
                </div>
                <p className="text-[12.5px] text-white/70 leading-relaxed">
                  Prospect hit you with unexpected pushback? Paste what they said below. AI will engineer a tactical empathy response that labels their constraint, dissolves sales friction, and opens the door for a micro-step.
                </p>

                {/* Input box */}
                <div className="pt-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Type or paste exact prospect pushback (e.g. 'We don't have budget until next fiscal year')..."
                    value={customObjection}
                    onChange={(e) => setCustomObjection(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGenerateCustomRebuttal()
                    }}
                    className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/25 bg-black/50 border border-white/[0.1] focus:border-amber-500/60 outline-none transition-all"
                  />

                  {/* 1-Click Common Objection Chips */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      Common Sales Pushbacks:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_OBJECTION_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setCustomObjection(chip)}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-amber-500/15 border border-white/[0.07] hover:border-amber-500/30 transition-all"
                        >
                          &ldquo;{chip}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex flex-col items-start lg:items-end justify-center shrink-0 self-center lg:self-start pt-2">
                <button
                  type="button"
                  onClick={handleGenerateCustomRebuttal}
                  disabled={generatingRebuttal || !customObjection.trim()}
                  className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-black text-black bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-110 shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                >
                  {generatingRebuttal ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-black" />
                      <span>Synthesizing Rebuttal...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 text-black fill-current" />
                      <span>Generate Tactical Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Rebuttal Output Card */}
            {generatedRebuttal && (
              <div className="mt-4 p-5 rounded-2xl bg-black/70 border border-amber-500/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[12px] font-black uppercase tracking-wider text-amber-300">
                      Engineered Tactical Empathy Response
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedRebuttal.fullScript, "gen_ai")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-black text-[11.5px] font-black hover:bg-amber-300 shadow-md shadow-amber-500/20 transition-all"
                  >
                    {copiedScript === "gen_ai" ? (
                      <>
                        <Check className="size-3 text-black stroke-[3]" />
                        <span>Copied Script!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                    <span className="text-[10px] font-bold text-amber-300 uppercase block">1. Label Constraint</span>
                    <p className="text-white/80 leading-relaxed italic">&ldquo;{generatedRebuttal.tacticalEmpathyLabel}&rdquo;</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                    <span className="text-[10px] font-bold text-amber-300 uppercase block">2. Pivot &amp; Micro-Step</span>
                    <p className="text-white/80 leading-relaxed italic">&ldquo;{generatedRebuttal.pivotAndProof}&rdquo;</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                    <span className="text-[10px] font-bold text-amber-300 uppercase block">3. Soft Closing Question</span>
                    <p className="text-white/80 leading-relaxed italic">&ldquo;{generatedRebuttal.closingQuestion}&rdquo;</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 flex items-center justify-between gap-3">
                  <p className="text-[13px] font-medium text-amber-200 leading-relaxed">
                    &ldquo;{generatedRebuttal.fullScript}&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Active Playbook Objection Library */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-[15px] font-black text-white">
                  Active Playbook Objection Rebuttal Matrix ({activePlaybook?.name})
                </h3>
                <p className="text-[12px] text-white/40">
                  Battle-tested counter-strategies Gale Bot uses when replying to objections in your inbox.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Filter objections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl pl-8 pr-3 py-1.5 text-[12px] text-white bg-white/[0.03] border border-white/[0.06] focus:border-amber-500/50 outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filteredObjections.map((obj, idx) => {
                const scriptId = `obj_${idx}`
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <ShieldAlert className="size-3.5" />
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                            Pushback #{idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(obj.response, scriptId)}
                          className="flex items-center gap-1 text-[11px] font-bold text-white/40 hover:text-white transition-colors"
                        >
                          {copiedScript === scriptId ? (
                            <>
                              <Check className="size-3 text-emerald-400" />
                              <span className="text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copy Script</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-[13.5px] font-bold text-white leading-snug">
                        &ldquo;{obj.objection}&rdquo;
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] space-y-1">
                      <span className="text-[10px] font-black text-amber-300/80 uppercase tracking-wider block">
                        Tactical Counter-Strategy
                      </span>
                      <p className="text-[12.5px] text-white/75 leading-relaxed font-sans">
                        &ldquo;{obj.response}&rdquo;
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: PROOF POINTS AMMUNITION
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "proof" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-black text-white">
                Active Social Proof &amp; Metric Ammunition ({matchedCaseStudies.length} Matches)
              </h3>
              <p className="text-[12px] text-white/40">
                Verified client results that automatically anchor your cold emails, LinkedIn DMs, and live objection calls.
              </p>
            </div>

            <Link
              href="/case-studies"
              className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              <span>Manage Case Studies</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/30">
              <Loader2 className="size-5 animate-spin mr-2 text-emerald-400" />
              <span>Loading proof points...</span>
            </div>
          ) : matchedCaseStudies.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center space-y-3">
              <Star className="size-8 text-white/20 mx-auto" />
              <p className="text-[13px] font-bold text-white">No proof points match your active playbook verticals</p>
              <p className="text-[12px] text-white/40 max-w-sm mx-auto">
                Add case studies in your Case Studies studio to equip your sales battle cards.
              </p>
              <Link
                href="/case-studies"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition-all"
              >
                + Add Case Study
              </Link>
            </div>
          ) : (
            <div className="grid gap-4.5 sm:grid-cols-2">
              {matchedCaseStudies.map((cs) => {
                const proofId = `proof_${cs.id}`
                return (
                  <div
                    key={cs.id}
                    className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500/[0.06] via-white/[0.02] to-transparent border border-emerald-500/25 space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14.5px] font-black text-white">{cs.clientName}</p>
                          <p className="text-[11.5px] text-white/50">{cs.industry}</p>
                        </div>
                        <span className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Star className="size-2.5 fill-current" /> Active Match
                        </span>
                      </div>

                      {cs.aiSummary && (
                        <p className="text-[12px] text-white/70 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                          &ldquo;{cs.aiSummary}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/20 space-y-1">
                      <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-wider block">
                        Verified Metric Outcome
                      </span>
                      <p className="text-[13px] text-emerald-300 font-bold leading-relaxed">{cs.results}</p>
                    </div>

                    {cs.testimonialQuote && (
                      <div className="flex gap-2 pt-1">
                        <Quote className="size-3.5 text-white/20 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-white/40 italic leading-relaxed">
                          &ldquo;{cs.testimonialQuote}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
                      <span className="text-[10px] text-white/30">Auto-injected in Cold Step 2 &amp; Battle Cards</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            cs.aiSummary || `We helped ${cs.clientName} (${cs.industry}) achieve ${cs.results}.`,
                            proofId
                          )
                        }
                        className="flex items-center gap-1.5 text-[11px] font-black text-emerald-300 hover:text-emerald-200"
                      >
                        {copiedScript === proofId ? (
                          <>
                            <Check className="size-3 text-emerald-400" />
                            <span>Copied Proof</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy Proof Snippet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: COMPETITOR KILL-POINTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "killpoints" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-0.5">
            <h3 className="text-[15px] font-black text-white">Competitor Kill-Points &amp; Differentiation Matrix</h3>
            <p className="text-[12px] text-white/40">
              How to instantly reframe competitors, in-house resistance, and low-cost alternatives during live pitch calls.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {KILL_POINTS_MATRIX.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] hover:border-sky-500/30 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-black text-white">{item.category}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/25">
                      {item.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                      Their Structural Flaw:
                    </span>
                    <p className="text-[12px] text-white/60 leading-relaxed">{item.competitorFlaw}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                      Our Reframe &amp; Kill-Point:
                    </span>
                    <p className="text-[12px] text-white/80 leading-relaxed font-semibold">{item.ourKillPoint}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sky-500/[0.08] border border-sky-500/20">
                  <span className="text-[10px] font-black text-sky-300 uppercase tracking-wider block mb-0.5">
                    Live Call Punchline:
                  </span>
                  <p className="text-[12px] text-sky-200 font-bold italic">&ldquo;{item.punchline}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>

          {/* Lead Competitor Reports List */}
          {leadsWithIntel.length > 0 && (
            <div className="pt-4 space-y-3">
              <h4 className="text-[13.5px] font-bold text-white">
                Prospects with Live Competitor Reports ({leadsWithIntel.length})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {leadsWithIntel.slice(0, 6).map((l) => {
                  const comps = parseCompetitorAnalysis(l.competitorAnalysis)
                  return (
                    <Link
                      key={l.id}
                      href={`/leads/${l.id}`}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <p className="text-[13px] font-bold text-white group-hover:text-sky-300 transition-colors">
                          {[l.firstName, l.lastName].filter(Boolean).join(" ") || "Lead"} · {l.company || l.industry}
                        </p>
                        <p className="text-[11.5px] text-white/40">
                          {comps.length > 0 ? `Competitors analyzed: ${comps.map((c) => c.name).join(", ")}` : "Teardown ready"}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-white/20 group-hover:text-white transition-colors" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: LEAD-SPECIFIC DEAL PREP CARD
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "dealprep" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-[15px] font-black text-white">Lead-Specific Deal Prep Card</h3>
              <p className="text-[12px] text-white/40">
                Select any enrolled prospect to review their pain points, audit findings, and opening conversation hooks before jumping on a call.
              </p>
            </div>

            {/* Lead Selector */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-white/40 uppercase">Select Lead:</label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-[12.5px] text-white outline-none focus:border-violet-500/50 min-w-[200px]"
              >
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.company || [l.firstName, l.lastName].filter(Boolean).join(" ") || l.industry || "Lead"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentLead ? (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/[0.07] via-white/[0.02] to-transparent border border-violet-500/25 space-y-6 shadow-xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-violet-400" />
                    <h4 className="text-[18px] font-black text-white">
                      {currentLead.company || "Company"}
                    </h4>
                    {currentLead.industry && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {currentLead.industry}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-white/50">
                    Contact: {[currentLead.firstName, currentLead.lastName].filter(Boolean).join(" ") || "Decision Maker"}
                  </p>
                </div>

                <Link
                  href={`/leads/${currentLead.id}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-[12px] font-bold border border-white/[0.08] transition-all shrink-0"
                >
                  <span>Open Full Profile</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {/* 3-Column Deal Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pain Points */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <span className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider block">
                    🎯 Suspected Pain Point
                  </span>
                  <p className="text-[12.5px] text-white/80 leading-relaxed">
                    {currentLead.painPoint || "Inconsistent pipeline and high client acquisition cost in their local market."}
                  </p>
                </div>

                {/* Technical / Audit Finding */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <span className="text-[10.5px] font-bold text-sky-400 uppercase tracking-wider block">
                    🔍 Recommended Angle
                  </span>
                  <p className="text-[12.5px] text-white/80 leading-relaxed capitalize">
                    {currentLead.recommendedApproach ? `${currentLead.recommendedApproach} Audit Angle` : "Website & Mobile Speed Optimization"}
                  </p>
                </div>

                {/* Best Matched Case Study */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider block">
                    ⭐ Matching Social Proof
                  </span>
                  <p className="text-[12.5px] text-emerald-300 font-bold leading-relaxed">
                    {matchedCaseStudies[0]?.results || "+34 qualified inquiries in 60 days"}
                  </p>
                </div>
              </div>

              {/* Call Opener Hook Box */}
              <div className="p-4 rounded-xl bg-violet-500/[0.08] border border-violet-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-violet-300 uppercase tracking-wider">
                    Recommended Live Call Opener:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `I noticed ${currentLead.company || "your company"} is growing in the ${currentLead.industry || "local"} space, but your site's mobile load time is past the threshold where most visitors drop off. We recently helped a similar platform fix this and boost conversions by 42%. Open to taking a quick look?`,
                        "deal_opener"
                      )
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-violet-300 hover:text-white"
                  >
                    {copiedScript === "deal_opener" ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy Opener</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[13px] text-white/90 leading-relaxed font-sans italic">
                  &ldquo;I noticed {currentLead.company || "your company"} is growing in the {currentLead.industry || "local"} space, but your mobile speed is leaving some room for competitors to capture search traffic. We recently helped a similar team fix this and add 34 consultations in 60 days. Worth a brief chat?&rdquo;
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center text-white/30">
              No leads currently enrolled in pipeline.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
