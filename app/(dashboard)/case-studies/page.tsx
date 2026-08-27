/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useMemo } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import {
  Briefcase,
  Plus,
  Loader2,
  Trash2,
  Quote,
  X,
  Star,
  Search,
  Copy,
  Check,
  Zap,
  Edit3,
  TrendingUp,
  Target,
  ArrowRight,
  HelpCircle,
  FileText,
  SlidersHorizontal
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CaseStudy {
  id: string
  clientName: string
  industry: string
  nicheTags: string[]
  challenge: string
  solution: string
  results: string
  testimonialQuote: string | null
  aiSummary: string | null
  usageCount: number
}

const EMPTY_FORM = {
  clientName: "",
  industry: "",
  nicheTags: "",
  challenge: "",
  solution: "",
  results: "",
  testimonialQuote: "",
  aiSummary: "",
}

const QUICK_INSPIRATIONS = [
  {
    label: "🦷 Dental Clinic Growth",
    text: "We helped Apex Dental scale their cosmetic implant bookings from 8 to 34 inquiries/month in 60 days by restructuring their Google Search campaigns and optimizing mobile booking speed.",
  },
  {
    label: "🛍️ E-Commerce CRO & Speed",
    text: "Redesigned checkout funnel and reduced mobile load time from 5.2s to 1.4s for Lumina Skincare, boosting conversion rate by 42% and generating an extra $38k in monthly recurring revenue.",
  },
  {
    label: "🏠 Roofing / Home Services",
    text: "Engineered a local Google Map pack & pay-per-lead system for Horizon Roofing, resulting in 47 qualified roof replacement estimates in the first 30 days at $32 cost-per-lead.",
  },
  {
    label: "💼 B2B SaaS Pipeline",
    text: "Built an outbound cold email acquisition engine for CloudScale Software that booked 28 qualified enterprise demo calls with VP of Engineering leads in 45 days.",
  },
  {
    label: "📍 Local SEO Map Pack #1",
    text: "Optimized local GMB profile, citations, and review velocity for CityLine Med Spa, pushing them from position #8 to #1 in local search and tripling their phone inquiries.",
  },
]

export default function CaseStudiesPage() {
  const { activePlaybook } = usePlaybook()
  const [items, setItems] = useState<CaseStudy[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreator, setShowCreator] = useState(false)
  const [creatorTab, setCreatorTab] = useState<"ai" | "presets" | "manual">("ai")

  // AI Extraction input state
  const [rawText, setRawText] = useState("")
  const [extracting, setExtracting] = useState(false)

  // Form & Editing state
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [filterVertical, setFilterVertical] = useState<string>("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/case-studies")
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const verticals = activePlaybook?.targetVerticals || []

  // AI Quick Extraction Handler
  async function handleAIExtract() {
    if (!rawText.trim()) {
      toast.error("Please paste a review, Slack note, or client summary first.")
      return
    }

    setExtracting(true)
    const toastId = toast.loading("AI is analyzing and structuring your case study...")
    try {
      const res = await fetch("/api/case-studies/extract-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Extraction failed")

      const data = json.data
      setForm({
        clientName: data.clientName || "",
        industry: data.industry || "",
        nicheTags: Array.isArray(data.nicheTags) ? data.nicheTags.join(", ") : "",
        challenge: data.challenge || "",
        solution: data.solution || "",
        results: data.results || "",
        testimonialQuote: data.testimonialQuote || "",
        aiSummary: data.aiSummary || "",
      })

      setCreatorTab("manual")
      toast.success("Case study structured! Review below and click Save.", { id: toastId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed"
      toast.error(msg, { id: toastId })
    } finally {
      setExtracting(false)
    }
  }

  // Create or Update Case Study
  async function handleSave() {
    if (!form.clientName.trim()) {
      toast.error("Please enter a Client Name")
      return
    }
    if (!form.results.trim()) {
      toast.error("Please enter the Results or Key Outcome")
      return
    }

    setSaving(true)
    try {
      const payload = {
        clientName: form.clientName.trim(),
        industry: form.industry.trim() || "B2B Business",
        nicheTags: form.nicheTags.split(",").map((t) => t.trim()).filter(Boolean),
        challenge: form.challenge.trim(),
        solution: form.solution.trim(),
        results: form.results.trim(),
        testimonialQuote: form.testimonialQuote.trim() || null,
        aiSummary: form.aiSummary.trim() || null,
      }

      if (editingId) {
        const res = await fetch(`/api/case-studies/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to update case study")
        toast.success("Case study updated!")
      } else {
        const res = await fetch("/api/case-studies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to create case study")
        toast.success("Case study saved and added to sales battle-cards!")
      }

      setForm(EMPTY_FORM)
      setRawText("")
      setEditingId(null)
      setShowCreator(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function startEdit(cs: CaseStudy) {
    setForm({
      clientName: cs.clientName,
      industry: cs.industry,
      nicheTags: cs.nicheTags?.join(", ") || "",
      challenge: cs.challenge,
      solution: cs.solution,
      results: cs.results,
      testimonialQuote: cs.testimonialQuote || "",
      aiSummary: cs.aiSummary || "",
    })
    setEditingId(cs.id)
    setCreatorTab("manual")
    setShowCreator(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this case study?")) return
    try {
      const res = await fetch(`/api/case-studies/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success("Case study deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  function handleCopySnippet(cs: CaseStudy) {
    const snippet = cs.aiSummary || `We helped ${cs.clientName} (${cs.industry}) achieve ${cs.results}.`
    navigator.clipboard.writeText(snippet)
    setCopiedId(cs.id)
    toast.success("Proof snippet copied to clipboard! Ready to paste into email or DM.")
    setTimeout(() => setCopiedId(null), 2500)
  }

  function isMatch(cs: CaseStudy) {
    if (!verticals.length) return false
    const hay = `${cs.industry} ${cs.nicheTags.join(" ")}`.toLowerCase()
    return verticals.some(
      (v) => hay.includes(v.toLowerCase()) || v.toLowerCase().includes(cs.industry.toLowerCase())
    )
  }

  // Filtered case studies
  const filteredItems = useMemo(() => {
    return items.filter((cs) => {
      const matchesSearch =
        searchQuery === "" ||
        cs.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cs.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cs.results.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cs.nicheTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesVertical =
        filterVertical === "all" ||
        (filterVertical === "matched" && isMatch(cs)) ||
        cs.industry.toLowerCase().includes(filterVertical.toLowerCase())

      return matchesSearch && matchesVertical
    })
  }, [items, searchQuery, filterVertical, verticals])

  const matchedCount = useMemo(() => items.filter(isMatch).length, [items, verticals])

  return (
    <div className="space-y-8 pb-20">
      {/* ── Top Header & Stats ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="size-3.5" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-emerald-400">
              Proof &amp; Social Ammunition Engine
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/95">
            Client Case Studies &amp; Results
          </h1>
          <p className="mt-2 text-[13px] text-white/40 max-w-2xl leading-relaxed">
            Record real client transformations. Gale Bot automatically pulls these success stories into cold outreach sequences, AI reply objection counters, and live sales battle cards.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              if (showCreator && !editingId) {
                setShowCreator(false)
              } else {
                setForm(EMPTY_FORM)
                setRawText("")
                setEditingId(null)
                setCreatorTab("ai")
                setShowCreator(true)
              }
            }}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-black text-black bg-gradient-to-r from-emerald-400 to-emerald-300 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {showCreator ? <X className="size-4 text-black" /> : <Plus className="size-4 text-black" />}
            <span>{showCreator && !editingId ? "Close Creator" : "Add Success Story"}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Bar ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 block">Total Cataloged Proof</span>
          <div className="flex items-center gap-2">
            <span className="text-[24px] font-black text-white">{items.length}</span>
            <span className="text-[12px] text-white/40">Case Studies</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-400/80 block">Active Playbook Matches</span>
          <div className="flex items-center gap-2">
            <span className="text-[24px] font-black text-emerald-300">{matchedCount}</span>
            <span className="text-[11px] text-emerald-400/60 font-medium">Ready for auto-injection</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 block">Target Verticals</span>
          <p className="text-[12px] text-white/70 font-semibold truncate">
            {verticals.length > 0 ? verticals.join(", ") : "All niches"}
          </p>
        </div>
      </div>

      {/* ── Fast Creator Studio (AI Smart Mode / Presets / Manual) ─────────── */}
      {showCreator && (
        <div
          className="relative overflow-hidden rounded-2xl p-6 border shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.04) 50%, rgba(15, 17, 26, 0.95) 100%)",
            borderColor: "rgba(16, 185, 129, 0.25)",
          }}
        >
          {/* Creator Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="size-4" />
                </div>
                <h2 className="text-[15px] font-black text-white uppercase tracking-wider">
                  {editingId ? "Edit Case Study" : "Effortless Case Study Creator"}
                </h2>
              </div>
              <p className="text-[12.5px] text-white/60">
                {editingId
                  ? "Update case study fields or refine the AI cold email hook."
                  : "Paste any raw notes or select a template — AI extracts everything in 1 second with zero tedious typing."}
              </p>
            </div>

            {/* Mode Switcher */}
            {!editingId && (
              <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08] shrink-0">
                <button
                  type="button"
                  onClick={() => setCreatorTab("ai")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all",
                    creatorTab === "ai"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-white/40 hover:text-white"
                  )}
                >
                  <Sparkles className="size-3.5" />
                  <span>AI Smart Extract</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreatorTab("presets")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all",
                    creatorTab === "presets"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-white/40 hover:text-white"
                  )}
                >
                  <Target className="size-3.5" />
                  <span>1-Click Presets</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreatorTab("manual")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all",
                    creatorTab === "manual"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-white/40 hover:text-white"
                  )}
                >
                  <Edit3 className="size-3.5" />
                  <span>Quick Form</span>
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: AI Quick Extract */}
          {creatorTab === "ai" && !editingId && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="size-3" /> Paste Raw Notes, Slack Snippet, Review, or Client Transformation:
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="e.g. Redesigned checkout funnel and reduced mobile load time from 5.2s to 1.4s for Lumina Skincare, boosting conversion rate by 42% and generating an extra $38k in monthly recurring revenue in 60 days..."
                  className="w-full rounded-xl p-3.5 text-[12.5px] text-white placeholder:text-white/25 bg-black/50 border border-white/[0.1] focus:border-emerald-500/60 outline-none leading-relaxed transition-all"
                />
              </div>

              {/* 1-Click Inspirations */}
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-bold text-white/40 uppercase tracking-wider block">
                  Quick Examples (Click to Try):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_INSPIRATIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setRawText(item.text)}
                      className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-emerald-500/15 border border-white/[0.07] hover:border-emerald-500/30 transition-all"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAIExtract}
                  disabled={extracting || !rawText.trim()}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-black text-black bg-gradient-to-r from-emerald-400 to-emerald-300 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-black" />
                      <span>Analyzing &amp; Structuring...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 text-black fill-current" />
                      <span>Auto-Extract with AI →</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 1-Click Presets */}
          {creatorTab === "presets" && !editingId && (
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Select a high-converting proven agency framework:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    clientName: "Apex Dental Center",
                    industry: "Cosmetic Dentistry",
                    nicheTags: "dental, local seo, google ads",
                    challenge: "Struggling with inconsistent cosmetic implant patient flow and high ad cost per lead.",
                    solution: "Restructured Google Ads campaigns, fixed mobile booking speed, and launched local geo-targeted landing page.",
                    results: "+34 qualified implant inquiries in 60 days at 40% lower cost-per-lead.",
                    testimonialQuote: "The most consistent flow of high-value consultations we have ever seen.",
                  },
                  {
                    clientName: "Lumina Glow Skin",
                    industry: "DTC E-Commerce",
                    nicheTags: "e-commerce, shopify, cro, speed",
                    challenge: "High cart abandonment and mobile site speed above 5.4 seconds.",
                    solution: "Complete mobile speed overhaul to 1.3s and 1-click checkout optimization.",
                    results: "+42% conversion rate increase, $38k added MRR in first 45 days.",
                    testimonialQuote: "Our conversion rate spiked literally within 48 hours of launch.",
                  },
                  {
                    clientName: "Horizon Roofing & Solar",
                    industry: "Roofing & Construction",
                    nicheTags: "roofing, home services, lead gen",
                    challenge: "Relied solely on word-of-mouth with empty crew schedules in Q2.",
                    solution: "Built storm-damage local lead generation funnel and automated SMS follow-up.",
                    results: "47 qualified residential replacement estimates in 30 days.",
                    testimonialQuote: "Our crews are fully booked for the next two months.",
                  },
                  {
                    clientName: "CloudScale Analytics",
                    industry: "B2B SaaS",
                    nicheTags: "saas, outbound email, enterprise",
                    challenge: "Cold outreach emails were getting 0.8% reply rates and no qualified pipeline.",
                    solution: "Engineered multi-step personalized cold sequence targeting VP Engineering leads.",
                    results: "28 enterprise demo calls booked in 45 days, 3 closed deals.",
                    testimonialQuote: "Completely transformed our outbound sales economics.",
                  },
                ].map((preset) => (
                  <div
                    key={preset.clientName}
                    className="p-4 rounded-xl bg-black/40 border border-white/[0.06] hover:border-emerald-500/40 transition-all space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-white">{preset.clientName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.05] text-emerald-400">
                          {preset.industry}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-white/50">{preset.results}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          clientName: preset.clientName,
                          industry: preset.industry,
                          nicheTags: preset.nicheTags,
                          challenge: preset.challenge,
                          solution: preset.solution,
                          results: preset.results,
                          testimonialQuote: preset.testimonialQuote,
                          aiSummary: `Helped ${preset.clientName} (${preset.industry}) achieve ${preset.results}`,
                        })
                        setCreatorTab("manual")
                        toast.success(`Loaded "${preset.clientName}" template! Customize and save.`)
                      }}
                      className="mt-2 text-left text-[11px] font-black text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                    >
                      Use This Template <ArrowRight className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3 / FORM VIEW: Review & Save */}
          {(creatorTab === "manual" || editingId) && (
            <div className="space-y-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-white/40 uppercase tracking-wider">
                    Client Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    placeholder="e.g. Apex Dental Center"
                    value={form.clientName}
                    onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                    className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-emerald-500/50 px-3.5 py-2.5 text-[13px] text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-white/40 uppercase tracking-wider">
                    Industry
                  </label>
                  <input
                    placeholder="e.g. Cosmetic Dentistry, DTC E-Commerce, Roofing"
                    value={form.industry}
                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-emerald-500/50 px-3.5 py-2.5 text-[13px] text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-white/40 uppercase tracking-wider">
                  Concrete Results / Transformation Metric <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. +34 booked consultations in 60 days, $38k added MRR, 40% lower cost per lead"
                  value={form.results}
                  onChange={(e) => setForm((f) => ({ ...f, results: e.target.value }))}
                  className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-emerald-500/50 p-3 text-[13px] text-emerald-300 font-semibold outline-none resize-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-white/40 uppercase tracking-wider">
                    Initial Challenge / Bottleneck <span className="text-white/20">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. High cost-per-click and low mobile booking conversion"
                    value={form.challenge}
                    onChange={(e) => setForm((f) => ({ ...f, challenge: e.target.value }))}
                    className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-emerald-500/50 p-3 text-[12.5px] text-white/80 outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-white/40 uppercase tracking-wider">
                    Strategy / Solution Provided <span className="text-white/20">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Rebuilt mobile landing page and restructured local Google search"
                    value={form.solution}
                    onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
                    className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-emerald-500/50 p-3 text-[12.5px] text-white/80 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-white/40 uppercase tracking-wider">
                    Niche Tags <span className="text-white/20">(comma separated)</span>
                  </label>
                  <input
                    placeholder="e.g. dental, implants, google ads, local seo"
                    value={form.nicheTags}
                    onChange={(e) => setForm((f) => ({ ...f, nicheTags: e.target.value }))}
                    className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-emerald-500/50 px-3.5 py-2.5 text-[12.5px] text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-white/40 uppercase tracking-wider">
                    Testimonial Quote <span className="text-white/20">(Optional)</span>
                  </label>
                  <input
                    placeholder="e.g. 'Our calendar has never been this full.'"
                    value={form.testimonialQuote}
                    onChange={(e) => setForm((f) => ({ ...f, testimonialQuote: e.target.value }))}
                    className="w-full rounded-xl bg-black/50 border border-white/[0.08] focus:border-emerald-500/50 px-3.5 py-2.5 text-[12.5px] text-white outline-none italic"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreator(false)
                    setEditingId(null)
                    setForm(EMPTY_FORM)
                  }}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold text-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-[12.5px] font-black px-6 py-2.5 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
                >
                  {saving ? <Loader2 className="size-4 animate-spin text-black" /> : <Check className="size-4 text-black stroke-[3]" />}
                  <span>{editingId ? "Update Case Study" : "Save Case Study"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search & Filter Controls ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search by client, industry, tags, or results metric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl pl-9 pr-4 py-2 text-[12.5px] text-white placeholder:text-white/25 bg-white/[0.03] border border-white/[0.06] focus:border-emerald-500/50 outline-none transition-all"
          />
        </div>

        {/* Vertical quick filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterVertical("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all",
              filterVertical === "all"
                ? "bg-white/10 text-white border border-white/20"
                : "bg-white/[0.02] text-white/40 hover:text-white border border-white/[0.04]"
            )}
          >
            All ({items.length})
          </button>
          {matchedCount > 0 && (
            <button
              onClick={() => setFilterVertical("matched")}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all",
                filterVertical === "matched"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/[0.02] text-white/40 hover:text-white border border-white/[0.04]"
              )}
            >
              <Star className="size-3 fill-current text-emerald-400" />
              <span>Playbook Matches ({matchedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Catalog Grid ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/30">
          <Loader2 className="size-6 animate-spin mr-2 text-emerald-400" />
          <span>Loading success stories...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-3xl p-16 text-center space-y-4 bg-white/[0.01]"
          style={{ backdropFilter: "blur(12px)" }}
        >
          <div className="size-14 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]">
            <Briefcase className="size-7 text-white/30" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-white">
              {searchQuery ? "No case studies match your search" : "No Case Studies Added Yet"}
            </h3>
            <p className="text-xs text-white/40 leading-relaxed">
              {searchQuery
                ? "Try adjusting your search terms or filters."
                : "Add client success stories to unlock instant social proof snippets in cold outreach emails, battle-cards, and proposals."}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => {
                setForm(EMPTY_FORM)
                setRawText("")
                setCreatorTab("ai")
                setShowCreator(true)
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-4 py-2.5 transition-all"
            >
              <Sparkles className="size-3.5" />
              <span>Paste First Success Story</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4.5 sm:grid-cols-2">
          {filteredItems.map((cs) => {
            const matched = isMatch(cs)
            return (
              <div
                key={cs.id}
                className={cn(
                  "rounded-2xl p-5 space-y-4 relative group/card transition-all duration-200",
                  matched
                    ? "bg-gradient-to-br from-emerald-500/[0.06] via-white/[0.02] to-transparent border border-emerald-500/25 shadow-lg shadow-emerald-500/5"
                    : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]"
                )}
                style={{ backdropFilter: "blur(12px)" }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-black text-white">{cs.clientName}</h3>
                      {matched && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Star className="size-2.5 fill-current" /> Active Match
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-white/50">{cs.industry}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover/card:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(cs)}
                      className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                      title="Edit case study"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cs.id)}
                      className="p-1.5 text-white/30 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete case study"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Key Results Badge */}
                <div className="rounded-xl bg-black/40 border border-emerald-500/20 p-3.5 space-y-1">
                  <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-wider block">
                    Verified Outcome
                  </span>
                  <p className="text-[13px] text-emerald-300 font-bold leading-relaxed">{cs.results}</p>
                </div>

                {/* AI Summary / Pitch Snippet */}
                {cs.aiSummary && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Cold Pitch Snippet</span>
                    <p className="text-[12px] text-white/70 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] font-sans">
                      &ldquo;{cs.aiSummary}&rdquo;
                    </p>
                  </div>
                )}

                {/* Challenge & Solution Breakdown */}
                {(cs.challenge || cs.solution) && (
                  <div className="grid grid-cols-2 gap-2 text-[11.5px] pt-1">
                    {cs.challenge && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-white/30 uppercase">Challenge:</span>
                        <p className="text-white/60 line-clamp-2 leading-snug">{cs.challenge}</p>
                      </div>
                    )}
                    {cs.solution && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-white/30 uppercase">Solution:</span>
                        <p className="text-white/60 line-clamp-2 leading-snug">{cs.solution}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Testimonial Quote */}
                {cs.testimonialQuote && (
                  <div className="flex gap-2 pt-1">
                    <Quote className="size-3.5 text-white/20 shrink-0 mt-0.5" />
                    <p className="text-[11.5px] text-white/40 italic leading-relaxed">
                      &ldquo;{cs.testimonialQuote}&rdquo;
                    </p>
                  </div>
                )}

                {/* Niche Tags & Copy Action Footer */}
                <div className="pt-2 flex items-center justify-between border-t border-white/[0.04] gap-2 flex-wrap">
                  <div className="flex flex-wrap gap-1">
                    {cs.nicheTags?.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] text-white/50">
                        {t}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopySnippet(cs)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 text-white/70 hover:text-emerald-200 border border-white/[0.08] hover:border-emerald-500/30 text-[11px] font-bold transition-all ml-auto"
                  >
                    {copiedId === cs.id ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy Pitch Hook</span>
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
  )
}
