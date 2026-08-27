/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Swords,
  Loader2,
  ExternalLink,
  Trash2,
  Globe,
  Building2,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Plus,
  Info,
  Search,
  Copy,
  Check,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  LayoutGrid,
  TableProperties,
  ArrowRight,
  HelpCircle,
  Eye,
  MapPin
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { Competitor, parseCompetitorAnalysis } from "@/lib/competitor-utils"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  firstName: string | null
  lastName: string | null
  company: string | null
  email: string
  industry: string | null
  website: string | null
  companyDesc: string | null
  competitorAnalysis: string | null
  rating?: number | null
  userRatingCount?: number | null
  notes?: string | null
  sourceQuery?: string | null
}

function getLeadName(l: { firstName: string | null; lastName: string | null; company: string | null; email: string }) {
  return l.company || [l.firstName, l.lastName].filter(Boolean).join(" ") || l.email
}

function extractLocationFromLead(lead: Lead | null): string {
  if (!lead) return ""
  if (lead.notes) {
    const lines = lead.notes.split("\n")
    for (const line of lines) {
      if (line.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|USA|UK|United Kingdom|London|Manchester|Birmingham|Toronto|Vancouver|Canada|Sydney|Melbourne|Brisbane|Australia|Auckland|New Zealand|Dublin|Ireland)\b/i)) {
        return line.trim()
      }
      if (line.match(/\b(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Suite|Ste|Floor|Fl)\b/i) && line.includes(",")) {
        return line.trim()
      }
    }
  }

  if (lead.sourceQuery) {
    const match = lead.sourceQuery.match(/\b(?:in|near|around|for)\s+([A-Za-z0-9\s,.-]+)/i)
    if (match && match[1]?.trim()) {
      return match[1].trim()
    }
  }

  if (lead.website) {
    if (lead.website.endsWith(".co.uk") || lead.website.includes(".co.uk/")) return "United Kingdom"
    if (lead.website.endsWith(".com.au") || lead.website.includes(".com.au/")) return "Australia"
    if (lead.website.endsWith(".ca") || lead.website.includes(".ca/")) return "Canada"
    if (lead.website.endsWith(".de") || lead.website.includes(".de/")) return "Germany"
    if (lead.website.endsWith(".fr") || lead.website.includes(".fr/")) return "France"
  }

  return ""
}

export default function CompetitorIntelPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeadId, setSelectedLeadId] = useState<string>("")
  const [searchLeadQuery, setSearchLeadQuery] = useState("")
  const [leadFilter, setLeadFilter] = useState<"all" | "analyzed" | "unscanned">("all")

  // Geographic & Niche Target Scope for accurate discovery
  const [regionInput, setRegionInput] = useState("")
  const [nicheInput, setNicheInput] = useState("")

  // View mode: Battle Cards Grid vs Comparison Matrix Table
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards")

  // Manual adding state
  const [manualCompetitorName, setManualCompetitorName] = useState("")
  const [manualCompetitorWebsite, setManualCompetitorWebsite] = useState("")
  const [manualCompetitorNotes, setManualCompetitorNotes] = useState("")
  const [manualAdding, setManualAdding] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)

  // Auto discovery state
  const [discovering, setDiscovering] = useState(false)

  // Competitor list state for selected lead
  const [competitorList, setCompetitorList] = useState<Competitor[]>([])
  const [copiedHookId, setCopiedHookId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        const leadArray = Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : []
        setLeads(leadArray)
        if (leadArray.length > 0 && !selectedLeadId) {
          const firstWithAnalysis = leadArray.find((l: Lead) => l.competitorAnalysis)
          setSelectedLeadId(firstWithAnalysis ? firstWithAnalysis.id : leadArray[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || null
  }, [leads, selectedLeadId])

  // Sync competitor list & geographic inputs when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      setCompetitorList(parseCompetitorAnalysis(selectedLead.competitorAnalysis))
      const autoLoc = extractLocationFromLead(selectedLead)
      setRegionInput(autoLoc)
      setNicheInput(selectedLead.industry || "Local Business")
    } else {
      setCompetitorList([])
      setRegionInput("")
      setNicheInput("")
    }
  }, [selectedLead])

  // Filtered leads list for selector sidebar
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const name = getLeadName(l).toLowerCase()
      const industry = (l.industry || "").toLowerCase()
      const matchesSearch =
        searchLeadQuery === "" ||
        name.includes(searchLeadQuery.toLowerCase()) ||
        industry.includes(searchLeadQuery.toLowerCase())

      const hasAnalysis = Boolean(l.competitorAnalysis && l.competitorAnalysis.length > 5)
      const matchesFilter =
        leadFilter === "all" ||
        (leadFilter === "analyzed" && hasAnalysis) ||
        (leadFilter === "unscanned" && !hasAnalysis)

      return matchesSearch && matchesFilter
    })
  }, [leads, searchLeadQuery, leadFilter])

  // Global Pipeline Stats
  const stats = useMemo(() => {
    const analyzedCount = leads.filter((l) => l.competitorAnalysis && l.competitorAnalysis.length > 5).length
    let totalCompetitors = 0
    leads.forEach((l) => {
      if (l.competitorAnalysis) {
        const comps = parseCompetitorAnalysis(l.competitorAnalysis)
        totalCompetitors += comps.length
      }
    })
    return {
      totalLeads: leads.length,
      analyzedCount,
      totalCompetitors,
    }
  }, [leads])

  // Auto-Discover Competitors via AI & Google Maps (Region-Anchored)
  async function handleDiscover() {
    if (!selectedLeadId) {
      toast.error("Please select a lead prospect first.")
      return
    }
    setDiscovering(true)
    const targetLoc = regionInput.trim() || "local market"
    const toastId = toast.loading(`Scanning real competitors in ${targetLoc}...`)
    try {
      const res = await fetch("/api/leads/competitor-analysis/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadId,
          regionOverride: regionInput.trim() || undefined,
          nicheOverride: nicheInput.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Discovery failed")

      setCompetitorList(data.competitors)
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLeadId ? { ...l, competitorAnalysis: JSON.stringify(data.competitors) } : l
        )
      )
      toast.success(`Competitors mapped for ${data.targetRegion || targetLoc}!`, { id: toastId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Discovery failed"
      toast.error(msg, { id: toastId })
    } finally {
      setDiscovering(false)
    }
  }

  // Add Custom Competitor
  async function handleManualAdd() {
    if (!selectedLeadId || !manualCompetitorName.trim()) {
      toast.error("Please enter a competitor name")
      return
    }
    setManualAdding(true)
    const toastId = toast.loading(`Scraping & analyzing ${manualCompetitorName.trim()}...`)
    try {
      const res = await fetch("/api/leads/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadId,
          competitorName: manualCompetitorName.trim(),
          competitorWebsite: manualCompetitorWebsite.trim() || undefined,
          competitorNotes: manualCompetitorNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Analysis failed")

      setCompetitorList(data.competitors)
      setLeads((prev) =>
        prev.map((l) => (l.id === selectedLeadId ? { ...l, competitorAnalysis: data.text } : l))
      )

      setManualCompetitorName("")
      setManualCompetitorWebsite("")
      setManualCompetitorNotes("")
      setShowManualModal(false)
      toast.success(`${manualCompetitorName.trim()} added to competitor profile!`, { id: toastId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed"
      toast.error(msg, { id: toastId })
    } finally {
      setManualAdding(false)
    }
  }

  // Delete Competitor
  async function handleDelete(competitorName: string) {
    if (!selectedLeadId) return
    if (!confirm(`Are you sure you want to remove ${competitorName}?`)) return

    try {
      const res = await fetch(
        `/api/leads/competitor-analysis?leadId=${selectedLeadId}&competitorName=${encodeURIComponent(
          competitorName
        )}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete competitor")

      setCompetitorList(data.competitors)
      setLeads((prev) =>
        prev.map((l) => (l.id === selectedLeadId ? { ...l, competitorAnalysis: data.text } : l))
      )
      toast.success(`${competitorName} removed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete competitor")
    }
  }

  // Copy cold outreach hook
  function handleCopyHook(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedHookId(id)
    toast.success("Attack hook copied! Ready to paste into cold sequence or DM.")
    setTimeout(() => setCopiedHookId(null), 2500)
  }

  // Copy full competitive brief for proposal
  function handleCopyBrief() {
    if (!selectedLead || competitorList.length === 0) return
    const leadTitle = getLeadName(selectedLead)
    const brief = `# Competitive Landscape Analysis for ${leadTitle}
Region: ${regionInput || "Local Market"} | Niche: ${nicheInput || "Core Services"}

${competitorList
  .map(
    (c, i) => `### ${i + 1}. ${c.name} (${c.marketPosition || "Competitor"})
- Website: ${c.website || "N/A"}
- Review Profile: ${c.reviewProfile || "Standard"}
- Positioning: ${c.summary || "Active Player"}
- Shortcomings:
${(c.shortcomings || []).map((s) => `  * ${s}`).join("\n")}
- Strategic Leverage:
${(c.leverage || []).map((l) => `  * ${l}`).join("\n")}
- Cold Outreach Angle:
  "${c.coldOutreachHook || ""}"
`
  )
  .join("\n---\n\n")}`

    navigator.clipboard.writeText(brief)
    toast.success("Full competitive brief copied to clipboard!")
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      {/* ── Top Header & Stats ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Swords className="size-3.5 text-rose-400" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-rose-400">
              Geographic &amp; Niche Competitive Intelligence
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/95">
            Competitor Intel &amp; Displace Engine
          </h1>
          <p className="mt-2 text-[13px] text-white/40 max-w-2xl leading-relaxed">
            Uncover actual local competitors in your prospect&apos;s exact territory, benchmark review ratings and ad channels, and weaponize cold pitch hooks to win deals.
          </p>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-[12.5px] font-bold px-4 py-2.5 border border-white/[0.08] transition-all"
          >
            <Plus className="size-4 text-white/60" />
            <span>Add Custom Competitor</span>
          </button>
        </div>
      </div>

      {/* ── Metric Ribbon ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 block">
            Prospects Analyzed
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[24px] font-black text-white">{stats.analyzedCount}</span>
            <span className="text-[12px] text-white/40">of {stats.totalLeads} in pipeline</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/[0.03] border border-rose-500/20 space-y-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-400/80 block">
            Competitors Tracked
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[24px] font-black text-rose-300">{stats.totalCompetitors}</span>
            <span className="text-[11px] text-rose-400/60 font-medium">Regional &amp; Local Peers</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 block">
            Outreach Attack Hooks
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[24px] font-black text-emerald-300">
              {competitorList.filter((c) => c.coldOutreachHook).length} Ready
            </span>
            <span className="text-[11px] text-white/40">For active lead</span>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column War Room Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: Prospect Lead Selector & Geo-Targeting (4 cols) ─── */}
        <div className="lg:col-span-4 space-y-4">
          <div
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4 shadow-xl backdrop-blur-md"
            style={{ backdropFilter: "blur(16px)" }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-rose-400" />
                <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">Select Prospect</h3>
              </div>
              <span className="text-[11px] font-bold text-white/30">{filteredLeads.length} leads</span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search prospect or niche..."
                value={searchLeadQuery}
                onChange={(e) => setSearchLeadQuery(e.target.value)}
                className="w-full rounded-xl pl-8 pr-3 py-2 text-[12px] text-white placeholder:text-white/25 bg-black/40 border border-white/[0.08] focus:border-rose-500/50 outline-none transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLeadFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all",
                  leadFilter === "all" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setLeadFilter("analyzed")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all",
                  leadFilter === "analyzed"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "text-white/40 hover:text-white"
                )}
              >
                Analyzed ({stats.analyzedCount})
              </button>
              <button
                type="button"
                onClick={() => setLeadFilter("unscanned")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all",
                  leadFilter === "unscanned" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                )}
              >
                Needs Scan
              </button>
            </div>

            {/* Leads List Scroll Area */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-white/30">
                <Loader2 className="size-5 animate-spin text-rose-400 mr-2" />
                <span className="text-[12px]">Loading pipeline leads...</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-[12px]">No leads match your filter.</div>
            ) : (
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredLeads.map((lead) => {
                  const isSelected = lead.id === selectedLeadId
                  const hasIntel = Boolean(lead.competitorAnalysis && lead.competitorAnalysis.length > 5)
                  const comps = parseCompetitorAnalysis(lead.competitorAnalysis)

                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1 group relative",
                        isSelected
                          ? "bg-gradient-to-r from-rose-500/15 via-rose-500/[0.05] to-transparent border-rose-500/35 shadow-lg"
                          : "bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-[13px] font-bold truncate transition-colors",
                            isSelected ? "text-white" : "text-white/80 group-hover:text-white"
                          )}
                        >
                          {getLeadName(lead)}
                        </span>
                        {hasIntel ? (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 shrink-0">
                            {comps.length} competitors
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-white/20 shrink-0">Unscanned</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-white/40">
                        <span className="truncate">{lead.industry || "B2B Business"}</span>
                        {lead.website && (
                          <span className="text-[10px] text-sky-400/70 truncate max-w-[110px]">
                            {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected Lead Geo-Targeting & Scan Inspector */}
          {selectedLead && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-white/40">
                  Target Scope &amp; Geo Anchor
                </span>
                <Link
                  href={`/leads/${selectedLead.id}`}
                  className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  Lead Profile <ExternalLink className="size-3" />
                </Link>
              </div>

              <div className="space-y-1">
                <h4 className="text-[14px] font-black text-white">{getLeadName(selectedLead)}</h4>
                <p className="text-[11.5px] text-white/50">{selectedLead.industry || "General Business"}</p>
              </div>

              {/* Geographic Region Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  <MapPin className="size-3" />
                  Target City / Operating Region
                </label>
                <input
                  type="text"
                  placeholder="e.g. Austin, TX or London, UK"
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-rose-500/50 px-3 py-2 text-[12px] text-white placeholder:text-white/20 outline-none transition-colors"
                />
                <p className="text-[10px] text-white/30 leading-tight">
                  Guarantees AI scans actual local competitors in this city instead of matching company names.
                </p>
              </div>

              {/* Service Niche Input */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-white/40">
                  Service Niche
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cosmetic Dentistry, Roofing, HVAC"
                  value={nicheInput}
                  onChange={(e) => setNicheInput(e.target.value)}
                  className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-rose-500/50 px-3 py-2 text-[12px] text-white placeholder:text-white/20 outline-none transition-colors"
                />
              </div>

              {/* Scan Trigger */}
              <button
                type="button"
                onClick={handleDiscover}
                disabled={discovering}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-black text-black bg-gradient-to-r from-rose-400 to-amber-300 hover:brightness-110 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-40"
              >
                {discovering ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-black" />
                    <span>Scanning {regionInput || "Local Market"}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-black fill-current" />
                    <span>Auto-Discover Local Competitors</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Competitor Teardown Hub (8 cols) ──────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedLead ? (
            <div className="p-16 rounded-3xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center space-y-3">
              <Swords className="size-10 text-white/20 mx-auto" />
              <h3 className="text-base font-bold text-white">No Prospect Selected</h3>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Select a lead from the left pipeline to inspect competitors or run a live market scan.
              </p>
            </div>
          ) : competitorList.length === 0 ? (
            <div
              className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-12 text-center space-y-5 shadow-2xl"
              style={{ backdropFilter: "blur(16px)" }}
            >
              <div className="relative size-16 mx-auto flex items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Swords className="size-8 text-rose-400" />
                <Sparkles className="size-4 absolute -top-1 -right-1 text-amber-300 animate-pulse" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-white">
                  No Competitors Analyzed for {getLeadName(selectedLead)}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Run a local market scan to identify their top direct competitors in{" "}
                  <strong className="text-white">{regionInput || "their operating area"}</strong>, review volume gaps, ad footprints, and custom attack angles.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDiscover}
                  disabled={discovering}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-black text-black bg-gradient-to-r from-rose-400 to-amber-300 hover:brightness-110 shadow-xl shadow-rose-500/20 transition-all disabled:opacity-40"
                >
                  {discovering ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-black" />
                      <span>Scanning Market Signals...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 text-black fill-current" />
                      <span>Scan Local Competitors Now</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualModal(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-[12.5px] font-bold text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
                >
                  <Plus className="size-4" />
                  <span>Add Manually</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Header with View Toggle & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-black text-white">
                      Competitive Teardown ({competitorList.length} Competitors)
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      {regionInput ? `📍 ${regionInput}` : "Local Battle Matrix"}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/40">
                    Benchmarked against <strong className="text-white">{getLeadName(selectedLead)}</strong> in {regionInput || "Local Market"}
                  </p>
                </div>

                {/* View Switcher & Copy Brief */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all",
                        viewMode === "cards"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "text-white/40 hover:text-white"
                      )}
                    >
                      <LayoutGrid className="size-3.5" />
                      <span>Battle Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("matrix")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all",
                        viewMode === "matrix"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "text-white/40 hover:text-white"
                      )}
                    >
                      <TableProperties className="size-3.5" />
                      <span>Head-to-Head Matrix</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyBrief}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.08] transition-colors"
                    title="Copy full markdown brief for proposal"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>

              {/* ── VIEW 1: HEAD-TO-HEAD MATRIX ───────────────────────────── */}
              {viewMode === "matrix" && (
                <div className="rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <th className="p-3.5 font-bold text-white/40 uppercase text-[10px] tracking-wider">
                            Entity
                          </th>
                          <th className="p-3.5 font-bold text-white/40 uppercase text-[10px] tracking-wider">
                            Market Archetype
                          </th>
                          <th className="p-3.5 font-bold text-white/40 uppercase text-[10px] tracking-wider">
                            Review Standing
                          </th>
                          <th className="p-3.5 font-bold text-white/40 uppercase text-[10px] tracking-wider">
                            Ad Footprint
                          </th>
                          <th className="p-3.5 font-bold text-white/40 uppercase text-[10px] tracking-wider">
                            Prime Vulnerability
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {/* Target Lead Row */}
                        <tr className="bg-emerald-500/[0.04]">
                          <td className="p-3.5 font-bold text-white flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-400" />
                            <span>{getLeadName(selectedLead)} (Target)</span>
                          </td>
                          <td className="p-3.5 text-emerald-300 font-semibold">Prospect Business</td>
                          <td className="p-3.5 text-white/80">
                            {selectedLead.userRatingCount
                              ? `${selectedLead.userRatingCount} reviews (${selectedLead.rating || 4.5}★)`
                              : "Local Profile"}
                          </td>
                          <td className="p-3.5 text-white/60">Evaluating Paid Ads</td>
                          <td className="p-3.5 text-emerald-300/80 font-medium">Ready for Outbound Pitch</td>
                        </tr>

                        {/* Competitors Rows */}
                        {competitorList.map((comp, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3.5 font-bold text-white">
                              <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-rose-400" />
                                <span>{comp.name}</span>
                                {comp.website && (
                                  <a
                                    href={comp.website.startsWith("http") ? comp.website : `https://${comp.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sky-400 hover:text-sky-300"
                                  >
                                    <ExternalLink className="size-3" />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-rose-300 font-medium">{comp.marketPosition || "Local Competitor"}</td>
                            <td className="p-3.5 text-white/70">{comp.reviewProfile || "120+ reviews"}</td>
                            <td className="p-3.5 text-white/60">{comp.adActivity || "Active Digital Ads"}</td>
                            <td className="p-3.5 text-rose-300/80 font-medium">
                              {comp.shortcomings[0] || "Slow mobile speed & rigid contracts"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── VIEW 2: BATTLE CARDS GRID ─────────────────────────────── */}
              {viewMode === "cards" && (
                <div className="space-y-5">
                  {competitorList.map((comp, idx) => {
                    const hookId = `hook_${idx}`
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl p-6 border border-white/[0.08] bg-gradient-to-br from-white/[0.025] via-black/40 to-transparent space-y-4 shadow-xl relative group transition-all duration-200 hover:border-rose-500/30"
                      >
                        {/* Top Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="flex size-7 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                <Swords className="size-4" />
                              </span>
                              <h3 className="text-[17px] font-black text-white">{comp.name}</h3>
                              {comp.marketPosition && (
                                <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/25">
                                  {comp.marketPosition}
                                </span>
                              )}
                            </div>

                            {comp.website && (
                              <a
                                href={comp.website.startsWith("http") ? comp.website : `https://${comp.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[12px] text-sky-400 hover:underline flex items-center gap-1 pl-9"
                              >
                                <span>{comp.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(comp.name)}
                            className="p-2 text-white/20 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Remove competitor"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        {/* Summary */}
                        {comp.summary && (
                          <p className="text-[12.5px] text-white/70 leading-relaxed border-l-2 border-rose-500/50 pl-3">
                            {comp.summary}
                          </p>
                        )}

                        {/* Market Footprint Chips */}
                        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                          {comp.reviewProfile && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.06] text-white/70">
                              <Star className="size-3 text-amber-400 fill-current" />
                              <span>{comp.reviewProfile}</span>
                            </div>
                          )}
                          {comp.estimatedMonthlyTraffic && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.06] text-white/70">
                              <TrendingUp className="size-3 text-sky-400" />
                              <span>Est. Traffic: {comp.estimatedMonthlyTraffic}</span>
                            </div>
                          )}
                          {comp.adActivity && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.06] text-white/70">
                              <Zap className="size-3 text-violet-400" />
                              <span>{comp.adActivity}</span>
                            </div>
                          )}
                        </div>

                        {/* 2-Column Strengths & Leverage Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                          {/* Shortcomings / Weaknesses */}
                          <div className="p-4 rounded-xl bg-rose-500/[0.03] border border-rose-500/15 space-y-2">
                            <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                              <AlertTriangle className="size-3" />
                              Their Operational Shortcomings
                            </span>
                            {comp.shortcomings?.length > 0 ? (
                              <ul className="space-y-1.5 text-[11.5px] text-white/75">
                                {comp.shortcomings.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-rose-400 font-bold shrink-0">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[11px] text-white/30 italic">No weaknesses logged.</p>
                            )}
                          </div>

                          {/* Agency Strategic Leverage */}
                          <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/15 space-y-2">
                            <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="size-3" />
                              Our Strategic Leverage Hook
                            </span>
                            {comp.leverage?.length > 0 ? (
                              <ul className="space-y-1.5 text-[11.5px] text-white/75">
                                {comp.leverage.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-emerald-400 font-bold shrink-0">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[11px] text-white/30 italic">No leverage hooks logged.</p>
                            )}
                          </div>
                        </div>

                        {/* Cold Email Pitch Attack Hook */}
                        {comp.coldOutreachHook && (
                          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/[0.08] via-purple-500/[0.05] to-black/40 border border-rose-500/25 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Flame className="size-3.5 text-rose-400" />
                                1-Click Cold Outreach Attack Hook
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyHook(comp.coldOutreachHook!, hookId)}
                                className="flex items-center gap-1 text-[11px] font-black text-rose-300 hover:text-white transition-colors"
                              >
                                {copiedHookId === hookId ? (
                                  <>
                                    <Check className="size-3 text-emerald-400" />
                                    <span className="text-emerald-300">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="size-3" />
                                    <span>Copy Hook</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-[12.5px] text-white/90 leading-relaxed font-sans italic">
                              &ldquo;{comp.coldOutreachHook}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Consultative Talking Points */}
                        {comp.talkingPoints && comp.talkingPoints.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">
                              Sales Call Consultative Questions
                            </span>
                            <ul className="space-y-1 text-[11.5px] text-white/70">
                              {comp.talkingPoints.map((tp, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <Info className="size-3 text-sky-400 shrink-0 mt-0.5" />
                                  <span>{tp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MANUAL COMPETITOR MODAL ────────────────────────────────────────── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#111216] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Swords className="size-4 text-rose-400" />
                <h3 className="text-[15px] font-black text-white">Add Custom Competitor</h3>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/40 uppercase">Competitor Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Health Partners"
                  value={manualCompetitorName}
                  onChange={(e) => setManualCompetitorName(e.target.value)}
                  className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-rose-500/50 p-3 text-[13px] text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/40 uppercase">Website URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. apexhealth.com"
                  value={manualCompetitorWebsite}
                  onChange={(e) => setManualCompetitorWebsite(e.target.value)}
                  className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-rose-500/50 p-3 text-[13px] text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/40 uppercase">Context or Known Flaws (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. they charge high monthly minimums and have 3-second mobile load lag..."
                  value={manualCompetitorNotes}
                  onChange={(e) => setManualCompetitorNotes(e.target.value)}
                  className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-rose-500/50 p-3 text-[12.5px] text-white outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-white/40 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualAdd}
                disabled={manualAdding || !manualCompetitorName.trim()}
                className="flex items-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-[12.5px] font-black px-6 py-2.5 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-40"
              >
                {manualAdding ? <Loader2 className="size-4 animate-spin text-black" /> : <Check className="size-4 text-black stroke-[3]" />}
                <span>{manualAdding ? "Scraping & Analyzing..." : "Analyze & Add"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Star({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
