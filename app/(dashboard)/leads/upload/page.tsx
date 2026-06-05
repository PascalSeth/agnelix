"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CSVUpload } from "@/components/csv-upload"
import Link from "next/link"
import { ArrowLeft, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import type { ParsedLead } from "@/lib/csv-parser"

export default function UploadPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<ParsedLead[]>([])
  const [uploading, setUploading] = useState(false)

  async function handleImport() {
    if (!leads.length) return
    setUploading(true)
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leads),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      toast.success(`${data.count ?? leads.length} leads imported`)
      router.push("/leads")
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
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
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
