/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePlaybook } from "@/lib/playbook-context"
import {
  FileText,
  Plus,
  Loader2,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  TrendingUp,
  ExternalLink,
  DollarSign,
  AlertCircle,
  X,
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { CustomSelect } from "@/components/ui/custom-select"
import { formatCurrency, getCurrencySymbol, CURRENCY_OPTIONS } from "@/lib/currency"

type Lead = {
  id: string
  firstName: string | null
  lastName: string | null
  company: string | null
  email: string
  industry?: string | null
  dealCurrency?: string | null
}

type Proposal = {
  id: string
  title: string
  status: string
  totalValue: number | null
  currency: string
  createdAt: string
  signedAt: string | null
  lead: {
    id: string
    firstName: string | null
    lastName: string | null
    company: string | null
    email: string
  }
}

const card = {
  background: "linear-gradient(145deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.01) 100%)",
  border: "1px solid rgba(255,255,255,.07)",
}

const STATUS_STYLE: Record<string, { text: string; bg: string; border: string; icon: any }> = {
  DRAFT: { text: "text-white/50", bg: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.1)", icon: Clock },
  SENT: { text: "text-sky-300", bg: "rgba(125,211,252,.12)", border: "rgba(125,211,252,.25)", icon: Clock },
  VIEWED: { text: "text-amber-300", bg: "rgba(251,191,36,.12)", border: "rgba(251,191,36,.25)", icon: Eye },
  SIGNED: { text: "text-emerald-400", bg: "rgba(52,211,153,.15)", border: "rgba(52,211,153,.3)", icon: CheckCircle2 },
  EXPIRED: { text: "text-red-400", bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.25)", icon: XCircle },
  DECLINED: { text: "text-rose-400", bg: "rgba(244,63,94,.12)", border: "rgba(244,63,94,.25)", icon: XCircle },
}

function leadName(l: { firstName: string | null; lastName: string | null; company: string | null; email: string }) {
  if (!l) return "Unknown Client"
  return l.company || [l.firstName, l.lastName].filter(Boolean).join(" ") || l.email
}

export default function ProposalsPage() {
  const { activePlaybook } = usePlaybook()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedLead, setSelectedLead] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("USD")
  const [generating, setGenerating] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  async function load() {
    setLoading(true)
    try {
      const [pRes, lRes] = await Promise.all([
        fetch("/api/proposals").then((r) => r.json()),
        fetch("/api/leads").then((r) => r.json()),
      ])
      setProposals(Array.isArray(pRes) ? pRes : [])
      setLeads(Array.isArray(lRes) ? lRes : Array.isArray(lRes?.leads) ? lRes.leads : [])
    } catch {
      toast.error("Failed to load proposals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function handleSelectLead(leadId: string) {
    setSelectedLead(leadId)
    const targetLead = leads.find((l) => l.id === leadId)
    if (targetLead?.dealCurrency) {
      setSelectedCurrency(targetLead.dealCurrency)
    }
  }

  async function handleGenerate() {
    if (!selectedLead) {
      toast.error("Please choose a lead first")
      return
    }
    setGenerating(true)
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead,
          templateId: selectedTemplate || undefined,
          currency: selectedCurrency || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate proposal")
      toast.success("AI Proposal generated successfully!")
      setShowCreate(false)
      setSelectedLead("")
      setSelectedTemplate("")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Proposal generation failed")
    } finally {
      setGenerating(false)
    }
  }

  // Calculate metrics
  const totalProposals = proposals.length
  const signedProposals = proposals.filter((p) => p.status === "SIGNED")
  const wonValue = signedProposals.reduce((sum, p) => sum + (p.totalValue || 0), 0)
  const baseCurrency = proposals[0]?.currency || "USD"
  const winRate = totalProposals > 0 ? Math.round((signedProposals.length / totalProposals) * 100) : 0
  const inPipelineCount = proposals.filter((p) => p.status === "SENT" || p.status === "VIEWED" || p.status === "DRAFT").length

  // Filtered proposals
  const filtered = proposals.filter((p) => {
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter
    const name = leadName(p.lead).toLowerCase()
    const title = (p.title || "").toLowerCase()
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q || name.includes(q) || title.includes(q)
    return matchesStatus && matchesSearch
  })

  // Safely extract playbook templates
  const templateOptions = Array.isArray(activePlaybook?.proposalTemplates)
    ? activePlaybook.proposalTemplates
    : []

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400">
              <FileText className="size-3.5" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-pink-400">
              Closing &amp; Retainers
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/95">
            Proposals &amp; Closing Deals
          </h1>
          <p className="text-[13px] text-white/40 mt-1.5 max-w-2xl">
            AI-generated client proposals built from your active playbook retainers, pricing packages, and prospect research.
          </p>
        </div>

        <button
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-[12.5px] font-bold px-4 py-2.5 shadow-lg shadow-pink-500/20 transition-all shrink-0"
        >
          <Plus className="size-4" />
          <span>New Proposal</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl p-4.5 space-y-1.5" style={card}>
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Proposals</span>
            <FileText className="size-4 text-pink-400" />
          </div>
          <p className="text-[24px] font-black text-white">{totalProposals}</p>
          <p className="text-[11px] text-white/30">{inPipelineCount} active in pipeline</p>
        </div>

        <div className="rounded-2xl p-4.5 space-y-1.5" style={card}>
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[11px] font-bold uppercase tracking-wider">Signed Deals (Won)</span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <p className="text-[24px] font-black text-emerald-400">{signedProposals.length}</p>
          <p className="text-[11px] text-white/30">Fully closed agreements</p>
        </div>

        <div className="rounded-2xl p-4.5 space-y-1.5" style={card}>
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[11px] font-bold uppercase tracking-wider">Won Revenue</span>
            <DollarSign className="size-4 text-amber-400" />
          </div>
          <p className="text-[24px] font-black text-white">
            {formatCurrency(wonValue, baseCurrency)}
          </p>
          <p className="text-[11px] text-white/30">Closed contract value</p>
        </div>

        <div className="rounded-2xl p-4.5 space-y-1.5" style={card}>
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[11px] font-bold uppercase tracking-wider">Win Rate</span>
            <TrendingUp className="size-4 text-indigo-400" />
          </div>
          <p className="text-[24px] font-black text-indigo-300">{winRate}%</p>
          <p className="text-[11px] text-white/30">Proposal-to-close conversion</p>
        </div>
      </div>

      {/* Creation Box (Drawer) */}
      {showCreate && (
        <div
          className="rounded-2xl p-6 space-y-5 animate-in fade-in duration-200"
          style={{
            background: "linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)",
            border: "1px solid rgba(236, 72, 153, 0.2)",
          }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-pink-400 animate-pulse" />
              <h2 className="text-[14px] font-black text-white uppercase tracking-wider">
                Generate Proposal with AI
              </h2>
            </div>
            <button
              onClick={() => setShowCreate(false)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-white/50 uppercase tracking-wider">
                1. Select Target Lead
              </label>
              {leads.length === 0 ? (
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.08] text-[12px] text-white/40 flex items-center justify-between">
                  <span>No leads in database yet.</span>
                  <Link href="/leads/find" className="text-pink-400 hover:text-pink-300 font-bold underline">
                    Find Leads
                  </Link>
                </div>
              ) : (
                <CustomSelect
                  value={selectedLead}
                  onChange={handleSelectLead}
                  placeholder="Choose a lead from database..."
                  options={leads.map((l) => ({
                    value: l.id,
                    label: `${leadName(l)}${l.industry ? ` (${l.industry})` : ""}`,
                  }))}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-white/50 uppercase tracking-wider">
                2. Select Retainer Model
              </label>
              <CustomSelect
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                placeholder={templateOptions[0]?.name || "Default Growth Model"}
                options={templateOptions.map((t: any) => ({
                  value: t.id || t.name,
                  label: `${t.name} — ${formatCurrency(t.price, t.currency)}/${t.period === "monthly" ? "mo" : "one-off"}`,
                }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-white/50 uppercase tracking-wider">
                3. Proposal Currency
              </label>
              <CustomSelect
                value={selectedCurrency}
                onChange={setSelectedCurrency}
                options={CURRENCY_OPTIONS.map((c) => ({
                  value: c.code,
                  label: c.label,
                }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11.5px] text-white/40">
              Gale will synthesize the lead&apos;s pain points, company research, and proposal packages into a 4-section executive pitch.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedLead}
              className="flex items-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-[12.5px] font-bold px-5 py-2.5 shadow-lg shadow-pink-500/25 transition-all disabled:opacity-40 shrink-0"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Drafting Proposal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Generate Full Proposal</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06]">
          {[
            { id: "ALL", label: "All Proposals" },
            { id: "DRAFT", label: "Draft" },
            { id: "SENT", label: "Sent" },
            { id: "VIEWED", label: "Viewed" },
            { id: "SIGNED", label: "Signed (Won)" },
            { id: "DECLINED", label: "Declined" },
          ].map((tab) => {
            const isActive = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  isActive
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="size-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client or proposal..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-1.5 text-[12.5px] text-white placeholder:text-white/20 focus:outline-none focus:border-pink-500/50"
          />
        </div>
      </div>

      {/* Proposals List Table / Cards */}
      <div className="rounded-2xl overflow-hidden" style={card}>
        <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-pink-400" />
            <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">
              Proposal Pipeline ({filtered.length})
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30">
            <Loader2 className="size-6 animate-spin text-pink-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-8 py-20 gap-3">
            <FileText className="size-10 text-white/15" />
            <p className="text-[14px] font-bold text-white/40">No proposals found</p>
            <p className="text-[12px] text-white/25 max-w-sm">
              {searchQuery
                ? "No proposals match your search criteria."
                : "Click 'New Proposal' above to generate your first client proposal with AI."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((p) => {
              const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.DRAFT
              const Icon = style.icon
              return (
                <Link
                  key={p.id}
                  href={`/proposals/${p.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4.5 hover:bg-white/[0.025] transition-colors group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-white/95 group-hover:text-pink-300 transition-colors truncate">
                        {p.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-white/40">
                      <span>Client: <strong className="text-white/70 font-semibold">{leadName(p.lead)}</strong></span>
                      <span>·</span>
                      <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {p.totalValue != null && (
                      <span className="text-[13px] font-black text-white/85">
                        {formatCurrency(p.totalValue, p.currency)}
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${style.text}`}
                      style={{ background: style.bg, borderColor: style.border }}
                    >
                      <Icon className="size-3" />
                      <span>{p.status}</span>
                    </span>

                    <ChevronRight className="size-4 text-white/20 group-hover:text-white/60 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
