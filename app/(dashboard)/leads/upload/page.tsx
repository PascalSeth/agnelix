"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CSVUpload } from "@/components/csv-upload"
import Link from "next/link"
import { ArrowLeft, Loader2, Upload, Megaphone, Plus, GitBranch } from "lucide-react"
import { toast } from "sonner"
import { CustomSelect } from "@/components/ui/custom-select"
import type { ParsedLead } from "@/lib/csv-parser"

type Campaign = { id: string; name: string; status: string }
type Sequence  = { id: string; name: string }

export default function UploadPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<ParsedLead[]>([])
  const [uploading, setUploading] = useState(false)

  // Campaign state
  const [campaigns, setCampaigns]       = useState<Campaign[]>([])
  const [sequences, setSequences]       = useState<Sequence[]>([])
  const [campaignMode, setCampaignMode] = useState<"existing" | "new">("existing")
  const [campaignId, setCampaignId]     = useState("")
  const [newCampName, setNewCampName]   = useState("")
  const [newSeqId, setNewSeqId]         = useState("")
  const [loadingMeta, setLoadingMeta]   = useState(true)

  // Load campaign metadata
  useEffect(() => {
    Promise.all([
      fetch("/api/campaigns").then(r => r.json()),
      fetch("/api/sequences").then(r => r.json()),
    ]).then(([c, s]) => {
      setCampaigns(Array.isArray(c) ? c : [])
      setSequences(Array.isArray(s) ? s : [])
      if (Array.isArray(c) && c.length === 0) setCampaignMode("new")
    }).finally(() => setLoadingMeta(false))
  }, [])

  function canImport(): boolean {
    if (leads.length === 0) return false
    if (campaignMode === "existing") return !!campaignId
    return !!newCampName.trim() && !!newSeqId
  }

  async function handleImport() {
    if (!leads.length) return
    if (campaignMode === "existing" && !campaignId) { toast.error("Choose a campaign first"); return }
    if (campaignMode === "new" && (!newCampName.trim() || !newSeqId)) {
      toast.error("Enter a campaign name and choose a sequence"); return
    }

    setUploading(true)
    try {
      const formattedLeads = leads.map(l => ({
        email: l.email,
        firstName: l.firstName || null,
        lastName: l.lastName || null,
        title: l.title || null,
        company: l.company || null,
        companyDesc: l.companyDesc || null,
        industry: l.industry || null,
        website: l.website || null,
        notes: `Imported via CSV.`,
      }))

      const payload =
        campaignMode === "existing"
          ? { leads: formattedLeads, campaignId, enrichInBackground: true }
          : { leads: formattedLeads, newCampaign: { name: newCampName.trim(), sequenceId: newSeqId }, enrichInBackground: true }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      toast.success(`${data.count ?? leads.length} leads imported and queued for background enrichment`)
      router.push(`/campaigns/${data.campaignId ?? campaignId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4 pt-2">
        <Link
          href="/leads"
          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:text-white/70"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Upload className="size-3 text-violet-400" style={{ filter: "drop-shadow(0 0 4px rgba(167,139,250,.8))" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">CSV Import</span>
          </div>
          <h1 className="text-[24px] font-black tracking-tight leading-none text-white/90">Import Leads</h1>
        </div>
      </div>

      {/* Step 1: Campaign target */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-2xl p-6"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
        }}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <Megaphone className="size-3.5 text-white/25" />
          <span className="text-[11px] font-bold text-white/35 uppercase tracking-wide">Send CSV leads to</span>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,.04)" }}>
          {(["existing", "new"] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setCampaignMode(mode)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-all"
              style={campaignMode === mode
                ? { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.85)" }
                : { color: "rgba(255,255,255,.3)" }}
            >
              {mode === "existing" ? <Megaphone className="size-3" /> : <Plus className="size-3" />}
              {mode === "existing" ? "Existing" : "New campaign"}
            </button>
          ))}
        </div>

        {/* Campaign / sequence selectors */}
        {loadingMeta ? (
          <span className="text-[11px] text-white/25 flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Loading…
          </span>
        ) : campaignMode === "existing" ? (
          campaigns.length === 0 ? (
            <span className="text-[11px] text-white/30">
              No campaigns yet —{" "}
              <button type="button" onClick={() => setCampaignMode("new")} className="text-white/60 underline underline-offset-2">create one</button>
            </span>
          ) : (
            <CustomSelect
              value={campaignId}
              onChange={setCampaignId}
              placeholder="Choose campaign…"
              icon={<Megaphone className="size-3.5" />}
              options={campaigns.map(c => ({ value: c.id, label: c.name, badge: c.status }))}
              className="w-56"
            />
          )
        ) : (
          <div className="flex gap-2 flex-1 min-w-0">
            <input
              type="text"
              placeholder="Campaign name…"
              value={newCampName}
              onChange={e => setNewCampName(e.target.value)}
              className="flex-1 min-w-0 max-w-[180px] rounded-lg px-3 py-1.5 text-[12px] text-white/75 outline-none placeholder:text-white/20"
              style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)" }}
            />
            <CustomSelect
              value={newSeqId}
              onChange={setNewSeqId}
              placeholder="Sequence…"
              icon={<GitBranch className="size-3.5" />}
              options={sequences.map(s => ({ value: s.id, label: s.name }))}
              className="w-40"
            />
          </div>
        )}
      </div>

      {/* Upload panel */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 space-y-4"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
        }}
      >
        <div className="absolute top-0 inset-x-6 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

        <p className="text-[11px] font-bold text-white/35 uppercase tracking-[.12em]">Upload CSV</p>

        <CSVUpload onParsed={setLeads} />

        {leads.length > 0 && (
          <button
            onClick={handleImport}
            disabled={uploading || !canImport()}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-40"
            style={{
              background: canImport()
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "linear-gradient(135deg,#e2e5ed,#c8cdd8)",
              color: canImport() ? "#fff" : "#0f172a",
              boxShadow: canImport() ? "0 2px 12px rgba(16,185,129,.25)" : "none",
            }}
          >
            {uploading ? (
              <><Loader2 className="size-4 animate-spin" /> Importing…</>
            ) : (
              `Import ${leads.length} Leads`
            )}
          </button>
        )}
      </div>

      {/* Format guide panel */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
        }}
      >
        <div className="absolute top-0 inset-x-6 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

        <p className="text-[11px] font-bold text-white/35 uppercase tracking-[.12em] mb-4">CSV Format</p>
        <p className="text-[13px] text-white/40 mb-3">
          Required column:{" "}
          <code
            className="rounded px-1.5 py-0.5 text-[11px] font-mono text-white/60"
            style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}
          >
            email
          </code>
          . Optional columns:
        </p>
        <div
          className="rounded-xl px-4 py-3 font-mono text-[12px] text-white/40"
          style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
        >
          email,first_name,last_name,company,title,industry,website
        </div>
      </div>

    </div>
  )
}
