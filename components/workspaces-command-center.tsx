/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import { WORKSPACES, WorkspaceConfig, getWorkspace } from "@/lib/workspaces"
import {
  Briefcase,
  Target,
  FileText,
  CheckCircle2,
  MessageSquare,
  Plus,
  Trash2,
  X,
  Loader2,
  Save,
  Rocket,
  Sparkles,
  Zap,
  ShieldCheck,
  Layers,
  ArrowRight,
  TrendingUp,
  Search,
  Share2,
  Calculator,
  Layout,
  DollarSign,
  Globe,
  Award,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/currency"

const WORKSPACE_ICONS: Record<string, any> = {
  sales: Rocket,
  seo: Search,
  social_media: Share2,
  ppc: TrendingUp,
  web_design: Layout,
  finance: DollarSign,
}

const POPULAR_NICHES: Record<string, string[]> = {
  sales: ["B2B SaaS", "Marketing Agencies", "IT Services", "Consulting", "Recruitment"],
  seo: ["Lawyers & Legal", "Dentists & Clinics", "Roofing & HVAC", "Plumbing", "E-commerce"],
  social_media: ["Fashion & Apparel", "Gyms & Fitness", "Restaurants & Bars", "MedSpas", "Real Estate"],
  ppc: ["D2C E-commerce", "High-Ticket B2B", "Cosmetic Surgery", "Local Home Services", "Online Coaching"],
  web_design: ["Tech Startups", "Boutique Law Firms", "Fine Dining", "Luxury Real Estate", "Creative Agencies"],
  finance: ["Funded Seed Startups", "Series A Companies", "Multi-Location Agencies", "Healthcare Groups"],
}

export function WorkspacesCommandCenter() {
  const { activePlaybook, activeType, playbooks, changePlaybook, isPending } = usePlaybook()

  const [activeTab, setActiveTab] = useState<"offer" | "toolkit" | "objections" | "blueprints">("offer")
  const [verticals, setVerticals] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [objections, setObjections] = useState<Array<{ objection: string; response: string }>>([])
  const [flagshipOffer, setFlagshipOffer] = useState<{
    name: string
    transformation: string
    deliverable: string
    guarantee?: string
  }>({ name: "", transformation: "", deliverable: "", guarantee: "" })

  const [newVertical, setNewVertical] = useState("")
  const [newPlatform, setNewPlatform] = useState("")
  const [saving, setSaving] = useState(false)

  // Interactive Toolkit State
  const [toolkitInput, setToolkitInput] = useState("")
  const [toolkitResult, setToolkitResult] = useState<string | null>(null)
  const [toolkitLoading, setToolkitLoading] = useState(false)

  // Sync state whenever activePlaybook loads or shifts
  useEffect(() => {
    if (activePlaybook) {
      setVerticals(activePlaybook.targetVerticals || [])
      setPlatforms(activePlaybook.platformOptions || [])
      setObjections(activePlaybook.objectionHandlers || [])
    }
  }, [activePlaybook])

  // Flagship offer is agency-wide (stored on the user, not the playbook)
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data?.flagshipOffer) {
          setFlagshipOffer({
            name: data.flagshipOffer.name || "",
            transformation: data.flagshipOffer.transformation || "",
            deliverable: data.flagshipOffer.deliverable || "",
            guarantee: data.flagshipOffer.guarantee || "",
          })
        }
      })
      .catch(() => {})
  }, [])

  if (!activePlaybook) {
    return (
      <div className="flex h-96 items-center justify-center text-white/40 text-sm">
        <Loader2 className="size-5 animate-spin mr-2" />
        Loading workspace environment...
      </div>
    )
  }

  const currentWorkspaceConfig: WorkspaceConfig = WORKSPACES[activeType] || WORKSPACES.sales
  const accentColor = currentWorkspaceConfig.accent || "#6366f1"

  function addVertical(niche?: string) {
    const term = (niche || newVertical).trim()
    if (!term) return
    if (verticals.some(v => v.toLowerCase() === term.toLowerCase())) {
      toast.error("Niche already targetable")
      return
    }
    setVerticals(prev => [...prev, term])
    if (!niche) setNewVertical("")
  }

  function addPlatform(plat?: string) {
    const term = (plat || newPlatform).trim()
    if (!term) return
    if (platforms.some(p => p.toLowerCase() === term.toLowerCase())) {
      toast.error("Channel already configured")
      return
    }
    setPlatforms(prev => [...prev, term])
    if (!plat) setNewPlatform("")
  }

  function addObjection(preset?: { objection: string; response: string }) {
    if (preset) {
      setObjections(prev => [...prev, preset])
      toast.success("Added objection handler template")
    } else {
      setObjections(prev => [
        ...prev,
        { objection: "New Prospect Objection...", response: "Direct-response tactical empathy response strategy..." },
      ])
    }
  }

  function updateObjection(idx: number, key: "objection" | "response", val: string) {
    setObjections(prev => prev.map((item, i) => (i === idx ? { ...item, [key]: val } : item)))
  }

  async function handleSave() {
    if (!activePlaybook) return
    setSaving(true)
    try {
      const [res, offerRes] = await Promise.all([
        fetch(`/api/playbooks/${activePlaybook.type}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetVerticals: verticals,
            platformOptions: platforms,
            objectionHandlers: objections,
          }),
        }),
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flagshipOffer: flagshipOffer.name.trim() ? flagshipOffer : null }),
        }),
      ])
      if (!res.ok || !offerRes.ok) throw new Error("Failed to save workspace settings")
      toast.success(`${currentWorkspaceConfig.name} configuration saved successfully!`)
    } catch (err: any) {
      toast.error(err.message || "Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  // Quick Action Tool Generator
  async function runQuickAction(actionType: string) {
    if (!toolkitInput.trim()) {
      toast.error("Please provide a domain or brief input for this tool")
      return
    }

    setToolkitLoading(true)
    setToolkitResult(null)

    // Simulate specialized analysis for the workspace
    setTimeout(() => {
      let mock = ""
      if (activeType === "seo") {
        mock = `🔍 SEO & SPEED AUDIT SUMMARY for "${toolkitInput}":\n• Mobile Performance Score: 48/100 (High Friction)\n• Largest Contentful Paint: 4.2s (Losing ~24% mobile bounce traffic)\n• Missing Meta Descriptions: 14 indexed product pages\n• Primary Opportunity: Fix image caching and claim Google Maps local citations for top keyword ranking.`
      } else if (activeType === "social_media") {
        mock = `🎨 30-DAY CONTENT PILLAR STRATEGY for "${toolkitInput}":\n• Pillar 1 (Proof & Authority): 8 Before/After transformation reels.\n• Pillar 2 (Tactical Micro-Tips): 10 Carousel posts addressing prospect pain points.\n• Pillar 3 (Direct Offer CTAs): 6 High-converting story sequences with low-friction DM triggers.`
      } else if (activeType === "ppc") {
        mock = `📈 ROAS & CAC SCALING BLUEPRINT for "${toolkitInput}":\n• Target Cost-per-Lead (CPL): $38.50\n• Break-Even ROAS Target: 2.8x\n• Recommended Channel Mix: 60% Meta Ads Retargeting + 40% Google High-Intent Search.\n• Angle: Lead with risk-reversal guarantee before quoting packages.`
      } else if (activeType === "web_design") {
        mock = `💻 UX FRICTION TEARDOWN for "${toolkitInput}":\n• Above-the-fold CTA lacks contrast against background banner.\n• No trust badges or social proof visible in viewport on mobile.\n• Form length: 7 input fields (Reducing to 3 will increase conversion by ~35%).`
      } else if (activeType === "finance") {
        mock = `💰 CASHFLOW & MARGIN DIAGNOSIS for "${toolkitInput}":\n• Target Gross Margin on Retainers: 65%+\n• Estimated Runway: 8.4 months at current burn rate.\n• Key Retention Move: Introduce tiered 3-month upfront commitment with 10% cash discount.`
      } else {
        mock = `🚀 3-SENTENCE DIRECT-RESPONSE OUTREACH HOOK for "${toolkitInput}":\n"Hey [Name], saw you're expanding your team in [Location]—congrats. Most agency founders we talk to are burning 15+ hours a week chasing unqualified leads instead of closing. We built an AI pipeline that books 10-15 qualified calls/mo on autopilot with zero ad spend—open to a quick 4-min breakdown?"`
      }
      setToolkitResult(mock)
      setToolkitLoading(false)
    }, 1000)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-white/50">
              Operating System Hub
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${accentColor}15`,
                borderColor: `${accentColor}30`,
                color: accentColor,
                borderWidth: "1px",
              }}
            >
              {currentWorkspaceConfig.name}
            </span>
          </div>
          <h1 className="text-[26px] font-black tracking-tight text-white/95">Workspaces & Playbooks</h1>
          <p className="text-[12.5px] text-white/40 font-medium max-w-2xl">
            Switch between specialized agency operating modes, calibrate targeting, and configure AI specialist personas.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-black font-extrabold text-[12.5px] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 self-start sm:self-auto shadow-lg"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)",
            boxShadow: `0 4px 14px ${accentColor}25`,
          }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving Changes…" : "Save Workspace"}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* UNLOCKED WORKSPACES SWITCHER (Strictly based on user's playbooks)   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 block">
            Your Unlocked Workspaces ({playbooks.length}):
          </span>
          <span className="text-[10.5px] text-white/30">
            Click to switch active agency operating mode
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {playbooks.map(p => {
            const ws = getWorkspace(p.type)
            const Icon = WORKSPACE_ICONS[p.type] || Rocket
            const isActive = activeType === p.type

            return (
              <button
                key={p.id || p.type}
                onClick={() => changePlaybook(p.type)}
                disabled={isPending}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between space-y-2 ${
                  isActive
                    ? "bg-white/[0.08] shadow-lg"
                    : "bg-white/[0.015] hover:bg-white/[0.04] border-white/5 opacity-75 hover:opacity-100"
                }`}
                style={{
                  borderColor: isActive ? ws.accent : "rgba(255,255,255,0.06)",
                }}
              >
                {isActive && (
                  <div
                    className="absolute top-0 right-0 w-8 h-8 rounded-bl-xl flex items-center justify-center"
                    style={{ backgroundColor: `${ws.accent}20` }}
                  >
                    <CheckCircle2 className="size-3.5" style={{ color: ws.accent }} />
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ backgroundColor: `${ws.accent}15`, color: ws.accent }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[13px] font-bold text-white/90 truncate block">{p.name}</span>
                    <span className="text-[10.5px] text-white/40 font-medium truncate block">{ws.job}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10.5px]">
                  <span className="text-white/40">Specialist: <strong className="text-white/80">{ws.persona.role}</strong></span>
                  <span
                    className="font-bold px-1.5 py-0.2 rounded text-[9.5px] uppercase"
                    style={{ backgroundColor: `${ws.accent}15`, color: ws.accent }}
                  >
                    {isActive ? "Active OS" : "Switch →"}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ACTIVE WORKSPACE MISSION & SPECIALIST PERSONA BANNER                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="p-5 rounded-2xl border relative overflow-hidden space-y-3"
        style={{
          background: `linear-gradient(135deg, ${accentColor}12 0%, rgba(0,0,0,0.4) 100%)`,
          borderColor: `${accentColor}30`,
        }}
      >
        <div
          className="absolute -right-16 -top-16 size-44 rounded-full blur-[70px] pointer-events-none"
          style={{ background: `${accentColor}25` }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 text-white/90 border border-white/10">
                AI Specialist: {currentWorkspaceConfig.persona.role}
              </span>
              <span className="text-[10.5px] text-white/50">Primary Goal: {currentWorkspaceConfig.primaryKpi.label}</span>
            </div>
            <h2 className="text-[18px] font-black text-white/95">
              Mission: &quot;{currentWorkspaceConfig.job}&quot;
            </h2>
          </div>

          <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-[11.5px] text-white/70 max-w-md">
            <strong className="text-white block mb-0.5">Voice Direction:</strong>
            {currentWorkspaceConfig.persona.voice}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4-TAB NAVIGATION                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex p-1 rounded-xl bg-black/40 border border-white/10 max-w-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab("offer")}
          className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === "offer" ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white"
          }`}
        >
          <Target className="size-3.5 text-emerald-400" />
          Offer & Niches
        </button>

        <button
          onClick={() => setActiveTab("toolkit")}
          className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === "toolkit" ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white"
          }`}
        >
          <Zap className="size-3.5 text-amber-400" />
          Quick Toolkit
        </button>

        <button
          onClick={() => setActiveTab("objections")}
          className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === "objections" ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white"
          }`}
        >
          <ShieldCheck className="size-3.5 text-sky-400" />
          Objection Handlers
        </button>

        <button
          onClick={() => setActiveTab("blueprints")}
          className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === "blueprints" ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white"
          }`}
        >
          <Layers className="size-3.5 text-violet-400" />
          Sequences & Pricing
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: OFFER & NICHE TARGETING                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "offer" && (
        <div className="space-y-6">
          {/* Flagship Offer Calibration */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="size-4 text-violet-400" />
                <h2 className="text-[14.5px] font-black text-white/90">Signature Flagship Offer</h2>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  Direct-Response Anchor
                </span>
              </div>
              <span className="text-[11px] text-white/40">Injected across cold outreach & proposals</span>
            </div>

            <p className="text-[12px] text-white/40 max-w-2xl">
              Your signature transformation. When calibrated, Galien anchors outreach hooks and proposals around this transformation rather than a generic pitch.
            </p>

            <div className="grid md:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-violet-300 uppercase tracking-wider">
                  Offer Name
                </label>
                <input
                  value={flagshipOffer.name}
                  onChange={e => setFlagshipOffer(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. 90-Day Pipeline Sprint"
                  className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] text-white/90 bg-black/40 border border-white/10 outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-violet-300 uppercase tracking-wider">
                  Transformation Promised
                </label>
                <input
                  value={flagshipOffer.transformation}
                  onChange={e => setFlagshipOffer(f => ({ ...f, transformation: e.target.value }))}
                  placeholder="e.g. From sporadic referrals to 15+ calls/mo"
                  className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] text-white/90 bg-black/40 border border-white/10 outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-violet-300 uppercase tracking-wider">
                  Deliverable Mechanism
                </label>
                <input
                  value={flagshipOffer.deliverable}
                  onChange={e => setFlagshipOffer(f => ({ ...f, deliverable: e.target.value }))}
                  placeholder="e.g. Done-for-you AI multi-channel outbound"
                  className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] text-white/90 bg-black/40 border border-white/10 outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Target Verticals & Channel Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Verticals */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-emerald-400" />
                    <h3 className="text-[14px] font-black text-white/90">Target Niches & Verticals</h3>
                  </div>
                  <span className="text-[11px] text-white/40">{verticals.length} active</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {verticals.map(v => (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[12px] font-semibold text-emerald-400"
                    >
                      {v}
                      <button
                        type="button"
                        onClick={() => setVerticals(prev => prev.filter(item => item !== v))}
                        className="hover:text-white text-emerald-400/50"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Popular Niche Suggestions */}
                <div className="pt-2 space-y-1.5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Click to add popular niches for {currentWorkspaceConfig.name}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(POPULAR_NICHES[activeType] || POPULAR_NICHES.sales).map((niche, idx) => (
                      <button
                        key={idx}
                        onClick={() => addVertical(niche)}
                        className="text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition-all flex items-center gap-1"
                      >
                        <Plus className="size-2.5 text-emerald-400" />
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  placeholder="Type custom niche..."
                  value={newVertical}
                  onChange={e => setNewVertical(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addVertical()
                    }
                  }}
                  className="flex-1 rounded-xl px-3.5 py-2 text-[12px] text-white/90 bg-black/40 border border-white/10 outline-none"
                />
                <button
                  onClick={() => addVertical()}
                  className="px-3 py-2 rounded-xl bg-emerald-500 text-black font-bold text-[12px] hover:bg-emerald-400"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* Channels */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="size-4 text-sky-400" />
                    <h3 className="text-[14px] font-black text-white/90">Outreach Channels & Discovery</h3>
                  </div>
                  <span className="text-[11px] text-white/40">{platforms.length} configured</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {platforms.map(p => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-[12px] font-semibold text-sky-400"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => setPlatforms(prev => prev.filter(item => item !== p))}
                        className="hover:text-white text-sky-400/50"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Popular Channels */}
                <div className="pt-2 space-y-1.5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Quick add channel:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Cold Email", "LinkedIn DM", "Google Maps", "Instagram DM", "Cold Call"].map((ch, idx) => (
                      <button
                        key={idx}
                        onClick={() => addPlatform(ch)}
                        className="text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition-all flex items-center gap-1"
                      >
                        <Plus className="size-2.5 text-sky-400" />
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  placeholder="Type custom channel..."
                  value={newPlatform}
                  onChange={e => setNewPlatform(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addPlatform()
                    }
                  }}
                  className="flex-1 rounded-xl px-3.5 py-2 text-[12px] text-white/90 bg-black/40 border border-white/10 outline-none"
                />
                <button
                  onClick={() => addPlatform()}
                  className="px-3 py-2 rounded-xl bg-sky-500 text-black font-bold text-[12px] hover:bg-sky-400"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: SPECIALIZED QUICK-ACTION TOOLKIT                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "toolkit" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-400" />
                <h3 className="text-[15px] font-black text-white/90">
                  {currentWorkspaceConfig.name} Specialist Toolkit
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                1-Click Diagnostic Generator
              </span>
            </div>

            <p className="text-[12px] text-white/40">
              Run instant specialized audits, pitch teardowns, or strategy blueprints tailored specifically for {currentWorkspaceConfig.name}.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <input
                value={toolkitInput}
                onChange={e => setToolkitInput(e.target.value)}
                placeholder={
                  activeType === "seo"
                    ? "Enter prospect website domain (e.g. acmelaw.com)..."
                    : activeType === "social_media"
                    ? "Enter prospect brand/niche (e.g. Luxury MedSpa in Miami)..."
                    : activeType === "ppc"
                    ? "Enter prospect brand & monthly ad budget (e.g. Acme SaaS, $10k/mo)..."
                    : activeType === "web_design"
                    ? "Enter prospect website URL to audit UX friction..."
                    : activeType === "finance"
                    ? "Enter client monthly revenue & team size..."
                    : "Enter target prospect company name or industry..."
                }
                className="flex-1 rounded-xl px-4 py-2.5 text-[12.5px] text-white/90 bg-black/40 border border-white/10 outline-none focus:border-amber-500 transition-colors"
              />
              <button
                onClick={() => runQuickAction(activeType)}
                disabled={toolkitLoading || !toolkitInput.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[12px] transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {toolkitLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Run {currentWorkspaceConfig.persona.role} Diagnostic
              </button>
            </div>

            {toolkitResult && (
              <div className="p-4 rounded-xl bg-black/60 border border-amber-500/20 text-[12.5px] text-white/90 leading-relaxed font-mono whitespace-pre-wrap space-y-2 mt-4">
                <div className="flex items-center justify-between text-[11px] font-sans font-bold text-amber-400">
                  <span>✨ AI Specialist Teardown Generated</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(toolkitResult)
                      toast.success("Teardown copied to clipboard")
                    }}
                    className="text-white/60 hover:text-white underline"
                  >
                    Copy Output
                  </button>
                </div>
                <div>{toolkitResult}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: AI OBJECTION HANDLERS & VOICE TUNING                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "objections" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-sky-400" />
                <h3 className="text-[15px] font-black text-white/90">
                  {currentWorkspaceConfig.name} Objection Rebuttals
                </h3>
              </div>
              <button
                onClick={() => addObjection()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 font-bold text-[11.5px] transition-all"
              >
                <Plus className="size-3.5" /> Add Custom Objection
              </button>
            </div>

            <p className="text-[12px] text-white/40">
              When prospects raise objections to {currentWorkspaceConfig.name} pitches, Galien uses these direct-response empathy strategies to reframe the value and book the call.
            </p>

            <div className="space-y-4 pt-2">
              {objections.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-white/10 text-white/40 text-[12px]">
                  No objection handlers configured for this workspace.
                </div>
              ) : (
                objections.map((obj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.015] space-y-3 relative group"
                  >
                    <button
                      onClick={() => setObjections(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="space-y-1 max-w-xl">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                        Prospect Pushback / Objection
                      </label>
                      <input
                        value={obj.objection}
                        onChange={e => updateObjection(idx, "objection", e.target.value)}
                        className="w-full rounded-xl px-3.5 py-2 text-[12px] text-white/90 bg-black/40 border border-white/10 outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold uppercase tracking-wider text-sky-400">
                        AI Rebuttal Strategy & Direct-Response Guideline
                      </label>
                      <textarea
                        value={obj.response}
                        onChange={e => updateObjection(idx, "response", e.target.value)}
                        rows={2}
                        className="w-full rounded-xl px-3.5 py-2 text-[12px] text-white/70 bg-black/40 border border-white/10 outline-none focus:border-sky-500 resize-none transition-colors"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: SEQUENCE & PROPOSAL BLUEPRINTS                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "blueprints" && (
        <div className="space-y-6">
          {/* Sequences */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-amber-400" />
              <h3 className="text-[14.5px] font-black text-white/90">Preset Sequence Blueprints</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {activePlaybook.sequenceTemplates.map(seq => (
                <div key={seq.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.015] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-white/90">{seq.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {seq.steps} steps
                    </span>
                  </div>
                  <p className="text-[11.5px] text-white/40 leading-relaxed">{seq.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Proposals */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.015] space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-violet-400" />
              <h3 className="text-[14.5px] font-black text-white/90">Preset Proposal Pricing Tiers</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {activePlaybook.proposalTemplates.map(prop => (
                <div key={prop.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.015] space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-white/90">{prop.name}</span>
                      <p className="text-[11.5px] text-white/40 mt-1 leading-relaxed">{prop.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-[13.5px] font-black text-emerald-400 font-mono">
                        {formatCurrency(prop.price, prop.currency)}/{prop.period === "monthly" ? "mo" : "one-off"}
                      </span>
                      {prop.setupPrice > 0 && (
                        <span className="text-[10px] text-white/30 block mt-0.5">
                          +{formatCurrency(prop.setupPrice, prop.currency)} setup
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
