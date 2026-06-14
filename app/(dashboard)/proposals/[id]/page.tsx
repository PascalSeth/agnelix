"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Send, Eye, CheckCircle2, FileSignature, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProposalSection { title: string; content: string }
interface PricingPackage { id: string; name: string; description?: string; price: number; setupPrice?: number; period: string; currency: string }
interface Proposal {
  id: string
  title: string
  status: string
  executiveSummary: string | null
  contentJson: { executiveSummary?: string; sections?: ProposalSection[] }
  pricingPackages: PricingPackage[]
  totalValue: number | null
  currency: string
  signedAt: string | null
  lead: { id: string; firstName: string | null; lastName: string | null; company: string | null; email: string }
}

const STATUS_FLOW = ["DRAFT", "SENT", "VIEWED", "SIGNED"]

const STATUS_STYLE: Record<string, { text: string; bg: string }> = {
  DRAFT:  { text: "text-white/40", bg: "rgba(255,255,255,.06)" },
  SENT:   { text: "text-sky-300", bg: "rgba(125,211,252,.1)" },
  VIEWED: { text: "text-amber-300", bg: "rgba(251,191,36,.1)" },
  SIGNED: { text: "text-emerald-400", bg: "rgba(52,211,153,.12)" },
  EXPIRED: { text: "text-red-400", bg: "rgba(239,68,68,.1)" },
}

export default function ProposalEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [sections, setSections] = useState<ProposalSection[]>([])
  const [pricing, setPricing] = useState<PricingPackage[]>([])

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then(r => r.json())
      .then((data: Proposal) => {
        setProposal(data)
        setTitle(data.title)
        setSummary(data.executiveSummary || data.contentJson?.executiveSummary || "")
        setSections(data.contentJson?.sections || [])
        setPricing(data.pricingPackages || [])
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
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function updatePricing(idx: number, patch: Partial<PricingPackage>) {
    setPricing(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  const totalValue = pricing.reduce((s, p) => s + (Number(p.price) || 0), 0)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          executiveSummary: summary,
          contentJson: { executiveSummary: summary, sections },
          pricingPackages: pricing,
          totalValue,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Proposal saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(status: string) {
    setBusy(status)
    try {
      await handleSave()
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Update failed")
      const updated = await res.json()
      setProposal(prev => prev ? { ...prev, status: updated.status, signedAt: updated.signedAt } : prev)
      if (status === "SIGNED") toast.success("Proposal signed — lead marked as Won")
      else toast.success(`Marked as ${status.toLowerCase()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this proposal?")) return
    try {
      const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Proposal deleted")
      router.push("/proposals")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/30">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  if (!proposal) {
    return <p className="text-sm text-white/40">Proposal not found.</p>
  }

  const style = STATUS_STYLE[proposal.status] ?? STATUS_STYLE.DRAFT
  const currentIdx = STATUS_FLOW.indexOf(proposal.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/proposals"
          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 hover:text-white/70 transition-colors"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-transparent text-xl font-bold tracking-tight text-white outline-none"
          />
          <p className="text-xs text-white/40">For {leadName()}</p>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${style.text}`} style={{ background: style.bg }}>
          {proposal.status}
        </span>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 border border-white/[0.08] transition-all disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </button>

        {currentIdx < 1 && (
          <button
            onClick={() => handleStatusChange("SENT")}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-xs font-semibold px-4 py-2 border border-sky-500/25 transition-all disabled:opacity-40"
          >
            {busy === "SENT" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Mark as Sent
          </button>
        )}
        {currentIdx >= 1 && currentIdx < 2 && (
          <button
            onClick={() => handleStatusChange("VIEWED")}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold px-4 py-2 border border-amber-500/25 transition-all disabled:opacity-40"
          >
            {busy === "VIEWED" ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
            Mark as Viewed
          </button>
        )}
        {proposal.status !== "SIGNED" && (
          <button
            onClick={() => handleStatusChange("SIGNED")}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold px-4 py-2 border border-emerald-500/25 transition-all disabled:opacity-40"
          >
            {busy === "SIGNED" ? <Loader2 className="size-3.5 animate-spin" /> : <FileSignature className="size-3.5" />}
            Sign &amp; Mark Won
          </button>
        )}
        {proposal.status === "SIGNED" && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="size-3.5" /> Signed {proposal.signedAt ? new Date(proposal.signedAt).toLocaleDateString() : ""}
          </span>
        )}

        <button
          onClick={handleDelete}
          className="ml-auto flex items-center gap-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold px-4 py-2 border border-red-500/20 transition-all"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      </div>

      {/* Executive summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-3" style={{ backdropFilter: "blur(12px)" }}>
        <h2 className="text-sm font-semibold text-white">Executive Summary</h2>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={3}
          className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-[13px] text-white/80 outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-3" style={{ backdropFilter: "blur(12px)" }}>
            <input
              value={section.title}
              onChange={e => updateSection(idx, { title: e.target.value })}
              className="bg-transparent text-sm font-semibold text-white outline-none w-full"
            />
            <textarea
              value={section.content}
              onChange={e => updateSection(idx, { content: e.target.value })}
              rows={5}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-[13px] text-white/70 outline-none resize-y leading-relaxed whitespace-pre-wrap"
            />
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4" style={{ backdropFilter: "blur(12px)" }}>
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
          <h2 className="text-sm font-semibold text-white">Pricing</h2>
          <span className="text-sm font-bold text-white/70">
            Total: {proposal.currency === "GBP" ? "£" : proposal.currency}{totalValue.toLocaleString()}
          </span>
        </div>
        <div className="space-y-3">
          {pricing.map((pkg, idx) => (
            <div key={pkg.id || idx} className="grid gap-2 sm:grid-cols-4 items-center rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
              <input
                value={pkg.name}
                onChange={e => updatePricing(idx, { name: e.target.value })}
                className="bg-transparent text-xs font-semibold text-white outline-none sm:col-span-2"
                placeholder="Package name"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-white/40">{pkg.currency === "GBP" ? "£" : pkg.currency}</span>
                <input
                  type="number"
                  value={pkg.price}
                  onChange={e => updatePricing(idx, { price: parseFloat(e.target.value) || 0 })}
                  className="w-20 bg-transparent text-xs font-bold text-white outline-none border-b border-white/10"
                />
              </div>
              <input
                value={pkg.period}
                onChange={e => updatePricing(idx, { period: e.target.value })}
                className="bg-transparent text-[11px] text-white/40 outline-none"
                placeholder="monthly / one-off"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
