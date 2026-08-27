/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Eye,
  CheckCircle2,
  FileSignature,
  Trash2,
  XCircle,
  Plus,
  Printer,
  Copy,
  Check,
  Building,
  DollarSign,
  Calendar,
  Layers,
  Coins,
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatCurrency, getCurrencySymbol, CURRENCY_OPTIONS, CurrencyCode } from "@/lib/currency"

interface ProposalSection {
  title: string
  content: string
}

interface PricingPackage {
  id: string
  name: string
  description?: string
  price: number
  setupPrice?: number
  period: string
  currency: string
}

interface Proposal {
  id: string
  title: string
  status: string
  executiveSummary: string | null
  contentJson: any
  pricingPackages: any
  totalValue: number | null
  currency: string
  signedAt: string | null
  sentAt: string | null
  viewedAt: string | null
  createdAt: string
  declineReason?: string | null
  lead: {
    id: string
    firstName: string | null
    lastName: string | null
    company: string | null
    email: string
    industry?: string | null
  }
}

const card = {
  background: "linear-gradient(145deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.01) 100%)",
  border: "1px solid rgba(255,255,255,.07)",
}

const STATUS_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  DRAFT: { text: "text-white/50", bg: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.1)" },
  SENT: { text: "text-sky-300", bg: "rgba(125,211,252,.12)", border: "rgba(125,211,252,.25)" },
  VIEWED: { text: "text-amber-300", bg: "rgba(251,191,36,.12)", border: "rgba(251,191,36,.25)" },
  SIGNED: { text: "text-emerald-400", bg: "rgba(52,211,153,.15)", border: "rgba(52,211,153,.3)" },
  EXPIRED: { text: "text-red-400", bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.25)" },
  DECLINED: { text: "text-rose-400", bg: "rgba(244,63,94,.12)", border: "rgba(244,63,94,.25)" },
}

export default function ProposalEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [sections, setSections] = useState<ProposalSection[]>([])
  const [pricing, setPricing] = useState<PricingPackage[]>([])
  const [currency, setCurrency] = useState<string>("USD")
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState("")

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then((r) => r.json())
      .then((data: Proposal) => {
        if (!data || (data as any).error) {
          toast.error("Failed to load proposal")
          return
        }

        setProposal(data)
        setTitle(data.title || "Client Proposal")
        const propCurrency = data.currency || "USD"
        setCurrency(propCurrency)

        // Safely parse contentJson
        let content: any = data.contentJson
        if (typeof content === "string") {
          try {
            content = JSON.parse(content)
          } catch {
            content = {}
          }
        }
        setSummary(data.executiveSummary || content?.executiveSummary || "")
        setSections(Array.isArray(content?.sections) ? content.sections : [])

        // Safely parse pricingPackages
        let packages: any = data.pricingPackages
        if (typeof packages === "string") {
          try {
            packages = JSON.parse(packages)
          } catch {
            packages = []
          }
        }
        setPricing(Array.isArray(packages) ? packages : [])
      })
      .catch(() => toast.error("Failed to load proposal"))
      .finally(() => setLoading(false))
  }, [id])

  function leadName() {
    if (!proposal) return ""
    const l = proposal.lead
    return l.company || [l.firstName, l.lastName].filter(Boolean).join(" ") || l.email
  }

  function updateSection(idx: number, patch: Partial<ProposalSection>) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        title: "New Scope / Section",
        content: "Describe deliverables, milestones, or service specifications here...",
      },
    ])
    toast.success("Added new proposal section")
  }

  function removeSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx))
  }

  function updatePricing(idx: number, patch: Partial<PricingPackage>) {
    setPricing((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function addPricingPackage() {
    setPricing((prev) => [
      ...prev,
      {
        id: `tier_${Date.now()}`,
        name: "Additional Package / Add-on",
        price: 1000,
        setupPrice: 0,
        period: "monthly",
        currency: currency,
        description: "Package deliverables...",
      },
    ])
    toast.success("Added pricing tier")
  }

  function removePricingPackage(idx: number) {
    setPricing((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleCurrencyChange(newCurrency: string) {
    setCurrency(newCurrency)
    setPricing((prev) => prev.map((p) => ({ ...p, currency: newCurrency })))
    toast.success(`Proposal currency switched to ${newCurrency} (${getCurrencySymbol(newCurrency)})`)
  }

  const calculatedTotal = pricing.reduce(
    (s, p) => s + (Number(p.price) || 0) + (Number(p.setupPrice) || 0),
    0
  )

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          currency,
          executiveSummary: summary,
          contentJson: { executiveSummary: summary, sections },
          pricingPackages: pricing,
          totalValue: calculatedTotal,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      setProposal((prev) => (prev ? { ...prev, currency, totalValue: calculatedTotal } : prev))
      toast.success("Proposal updated successfully!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    setBusy(newStatus)
    try {
      await handleSave()
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Update failed")
      const updated = await res.json()
      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              signedAt: updated.signedAt,
              sentAt: updated.sentAt,
              viewedAt: updated.viewedAt,
            }
          : prev
      )
      if (newStatus === "SIGNED") toast.success("Proposal signed — Lead automatically marked as Won!")
      else toast.success(`Proposal marked as ${newStatus.toLowerCase()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed")
    } finally {
      setBusy(null)
    }
  }

  async function handleDecline() {
    setBusy("DECLINED")
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DECLINED",
          declineReason: declineReason.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("Update failed")
      const updated = await res.json()
      setProposal((prev) => (prev ? { ...prev, status: updated.status } : prev))
      setDeclineOpen(false)
      toast.success("Marked as declined. Feedback recorded for AI improvement.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this proposal?")) return
    try {
      const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Proposal deleted")
      router.push("/proposals")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  function handleCopySummary() {
    const text = `PROPOSAL: ${title}\nClient: ${leadName()}\nTotal Value: ${formatCurrency(calculatedTotal, currency)}\n\nEXECUTIVE SUMMARY:\n${summary}\n\nPRICING PACKAGES:\n${pricing.map((p) => `- ${p.name}: ${formatCurrency(p.price, currency)}/${p.period} (Setup: ${formatCurrency(p.setupPrice || 0, currency)})`).join("\n")}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Proposal summary copied to clipboard!")
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-white/40">
        <Loader2 className="size-8 animate-spin text-pink-400 mb-3" />
        <p className="text-sm font-semibold">Loading proposal details...</p>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="p-12 text-center rounded-2xl space-y-3" style={card}>
        <p className="text-base font-bold text-white/80">Proposal not found</p>
        <Link href="/proposals" className="text-xs font-bold text-pink-400 hover:underline">
          &larr; Back to Proposals
        </Link>
      </div>
    )
  }

  const style = STATUS_STYLE[proposal.status] ?? STATUS_STYLE.DRAFT

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-28">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <Link
            href="/proposals"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white/50 hover:text-white transition-colors"
            style={card}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-[22px] font-black tracking-tight text-white outline-none focus:border-b focus:border-pink-500/50"
            />
            <div className="flex items-center gap-2 text-[12px] text-white/40 mt-0.5">
              <span>Client: <strong className="text-white/75">{leadName()}</strong></span>
              <span>·</span>
              <span>Created {new Date(proposal.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Currency Switcher */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/[0.08]">
            <Coins className="size-3.5 text-amber-400" />
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-transparent text-[12px] font-bold text-white outline-none cursor-pointer"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code} className="bg-zinc-900 text-white">
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${style.text}`}
            style={{ background: style.bg, borderColor: style.border }}
          >
            <span>{proposal.status}</span>
          </span>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-[12px] font-semibold border border-white/[0.06] transition-colors"
            title="Print / Save as PDF"
          >
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-[12px] font-semibold border border-white/[0.06] transition-colors"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Action Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl" style={card}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-[12.5px] font-bold px-4 py-2 shadow-md shadow-pink-500/20 transition-all disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>{saving ? "Saving..." : "Save Proposal"}</span>
          </button>

          {proposal.status === "DRAFT" && (
            <button
              onClick={() => handleStatusChange("SENT")}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-[12px] font-bold px-3.5 py-2 border border-sky-500/30 transition-all disabled:opacity-40"
            >
              {busy === "SENT" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              <span>Mark as Sent</span>
            </button>
          )}

          {proposal.status === "SENT" && (
            <button
              onClick={() => handleStatusChange("VIEWED")}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[12px] font-bold px-3.5 py-2 border border-amber-500/30 transition-all disabled:opacity-40"
            >
              {busy === "VIEWED" ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
              <span>Mark as Viewed</span>
            </button>
          )}

          {proposal.status !== "SIGNED" && (
            <button
              onClick={() => handleStatusChange("SIGNED")}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[12px] font-bold px-3.5 py-2 border border-emerald-500/30 transition-all disabled:opacity-40"
            >
              {busy === "SIGNED" ? <Loader2 className="size-3.5 animate-spin" /> : <FileSignature className="size-3.5" />}
              <span>Sign &amp; Mark Won</span>
            </button>
          )}

          {proposal.status === "SIGNED" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-[12px] font-bold border border-emerald-500/30">
              <CheckCircle2 className="size-3.5" />
              <span>Won &amp; Signed {proposal.signedAt ? new Date(proposal.signedAt).toLocaleDateString() : ""}</span>
            </span>
          )}

          {proposal.status !== "SIGNED" && proposal.status !== "DECLINED" && (
            <button
              onClick={() => setDeclineOpen((o) => !o)}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[12px] font-bold px-3.5 py-2 border border-rose-500/20 transition-all disabled:opacity-40"
            >
              <XCircle className="size-3.5" />
              <span>Mark Declined</span>
            </button>
          )}
        </div>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 rounded-xl text-white/40 hover:text-rose-400 text-[12px] font-semibold px-3 py-2 transition-colors ml-auto"
        >
          <Trash2 className="size-3.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* Decline Feedback Banner */}
      {declineOpen && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.05] p-5 space-y-3 animate-in fade-in duration-200">
          <p className="text-[13px] font-bold text-rose-300">
            Why did the client decline? (This feedback trains Gale to improve future proposals)
          </p>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={2}
            placeholder="e.g. Budget constraints for Q3, decided to hire an internal team, or scope was too broad..."
            className="w-full rounded-xl bg-black/40 border border-white/[0.08] p-3 text-[12.5px] text-white outline-none resize-none focus:border-rose-400"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleDecline}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[12px] font-bold px-4 py-2 transition-all disabled:opacity-40"
            >
              {busy === "DECLINED" ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
              <span>Confirm Decline</span>
            </button>
            <button
              onClick={() => setDeclineOpen(false)}
              className="text-xs font-semibold text-white/40 hover:text-white px-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Executive Summary Card */}
      <div className="rounded-2xl p-6 space-y-3" style={card}>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-pink-400" />
          <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">Executive Summary</h2>
        </div>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Brief executive pitch summarizing client goals and how your agency delivers results..."
          className="w-full rounded-xl bg-black/30 border border-white/[0.06] p-3.5 text-[13px] text-white/90 outline-none leading-relaxed focus:border-pink-500/50 resize-y"
        />
      </div>

      {/* Dynamic Proposal Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-indigo-400" />
            <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">
              Proposal Content &amp; Scope Sections ({sections.length})
            </h2>
          </div>
          <button
            onClick={addSection}
            className="flex items-center gap-1 text-[11.5px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>Add Section</span>
          </button>
        </div>

        {sections.map((section, idx) => (
          <div key={idx} className="rounded-2xl p-6 space-y-3 relative group" style={card}>
            <button
              onClick={() => removeSection(idx)}
              className="absolute top-4 right-4 p-1.5 text-white/20 hover:text-rose-400 transition-all rounded-lg opacity-0 group-hover:opacity-100"
              title="Delete Section"
            >
              <Trash2 className="size-3.5" />
            </button>

            <input
              value={section.title}
              onChange={(e) => updateSection(idx, { title: e.target.value })}
              className="w-full bg-transparent text-[15px] font-bold text-white outline-none border-b border-transparent focus:border-white/20 pb-1"
              placeholder="Section Title (e.g. Scope of Work, Deliverables, Timeline)"
            />

            <textarea
              value={section.content}
              onChange={(e) => updateSection(idx, { content: e.target.value })}
              rows={4}
              className="w-full rounded-xl bg-black/30 border border-white/[0.06] p-3.5 text-[13px] text-white/80 outline-none leading-relaxed focus:border-indigo-500/50 resize-y whitespace-pre-wrap"
              placeholder="Write section content, specifications, or deliverables list..."
            />
          </div>
        ))}
      </div>

      {/* Pricing & Retainer Packages */}
      <div className="rounded-2xl p-6 space-y-5" style={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-[14px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="size-4 text-emerald-400" />
              <span>Investment &amp; Retainer Packages</span>
            </h2>
            <p className="text-[11.5px] text-white/40 mt-0.5">Recurring retainers and one-off setup fees for this proposal.</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[14px] font-black text-white">
              Total Contract Value:{" "}
              <strong className="text-emerald-400 font-black">
                {formatCurrency(calculatedTotal, currency)}
              </strong>
            </span>

            <button
              onClick={addPricingPackage}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11.5px] font-bold border border-emerald-500/30 transition-all"
            >
              <Plus className="size-3.5" />
              <span>Add Tier</span>
            </button>
          </div>
        </div>

        <div className="space-y-3.5">
          {pricing.map((pkg, idx) => (
            <div
              key={pkg.id || idx}
              className="rounded-xl p-4 space-y-3 bg-black/40 border border-white/[0.06] relative group/tier"
            >
              <button
                onClick={() => removePricingPackage(idx)}
                className="absolute top-3.5 right-3.5 p-1.5 text-white/20 hover:text-rose-400 transition-all rounded-lg opacity-0 group-tier:opacity-100"
                title="Delete Tier"
              >
                <Trash2 className="size-3.5" />
              </button>

              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Package Title</label>
                  <input
                    value={pkg.name}
                    onChange={(e) => updatePricing(idx, { name: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 text-[13px] font-bold text-white bg-black/30 border border-white/[0.08] outline-none focus:border-emerald-400"
                    placeholder="e.g. Full Growth Retainer"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Price ({getCurrencySymbol(currency)})
                  </label>
                  <input
                    type="number"
                    value={pkg.price}
                    onChange={(e) => updatePricing(idx, { price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl px-3 py-2 text-[13px] font-bold text-emerald-400 bg-black/30 border border-white/[0.08] outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Setup Fee ({getCurrencySymbol(currency)})</label>
                  <input
                    type="number"
                    value={pkg.setupPrice || 0}
                    onChange={(e) => updatePricing(idx, { setupPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl px-3 py-2 text-[13px] font-bold text-white/80 bg-black/30 border border-white/[0.08] outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Billing</label>
                  <select
                    value={pkg.period}
                    onChange={(e) => updatePricing(idx, { period: e.target.value })}
                    className="w-full rounded-xl px-2.5 py-2 text-[12px] text-white bg-black/30 border border-white/[0.08] outline-none"
                  >
                    <option value="monthly" className="bg-zinc-900 text-white">Monthly</option>
                    <option value="one-off" className="bg-zinc-900 text-white">One-off</option>
                    <option value="quarterly" className="bg-zinc-900 text-white">Quarterly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Deliverables / Retainer Details</label>
                <textarea
                  value={pkg.description || ""}
                  onChange={(e) => updatePricing(idx, { description: e.target.value })}
                  rows={2}
                  placeholder="Included deliverables and SLA commitments..."
                  className="w-full rounded-xl p-2.5 text-[12px] text-white/70 bg-black/30 border border-white/[0.08] outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
