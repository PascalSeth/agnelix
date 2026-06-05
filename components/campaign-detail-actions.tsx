"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Pause, Play, CheckCircle2, Trash2, Pencil,
  Check, X, Loader2, Eye, Users,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

const STATUS_STYLE: Record<string, { text: string; dot: string; pulse?: boolean }> = {
  DRAFT:     { text: "text-white/40",    dot: "bg-white/25"    },
  ACTIVE:    { text: "text-emerald-300", dot: "bg-emerald-400", pulse: true },
  PAUSED:    { text: "text-amber-300",   dot: "bg-amber-400"   },
  COMPLETED: { text: "text-white/30",    dot: "bg-white/20"    },
}

interface Props {
  id: string
  name: string
  status: string
  sequenceName: string
  launchedAt: Date | null
  createdAt: Date
}

export function CampaignDetailActions({
  id, name: initName, status, sequenceName, launchedAt, createdAt,
}: Props) {
  const router = useRouter()
  const [renaming, setRenaming]   = useState(false)
  const [nameVal, setNameVal]     = useState(initName)
  const [busy, setBusy]           = useState<string | null>(null)

  const s = STATUS_STYLE[status] ?? STATUS_STYLE.DRAFT

  async function patchStatus(newStatus: string) {
    setBusy("status")
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Campaign ${newStatus.toLowerCase()}`)
      router.refresh()
    } catch {
      toast.error("Update failed")
    } finally {
      setBusy(null)
    }
  }

  async function saveName() {
    const trimmed = nameVal.trim()
    setRenaming(false)
    if (!trimmed || trimmed === initName) return
    setBusy("name")
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error()
      toast.success("Renamed")
      router.refresh()
    } catch {
      toast.error("Rename failed")
      setNameVal(initName)
    } finally {
      setBusy(null)
    }
  }

  async function del() {
    if (!confirm("Delete this campaign? This cannot be undone.")) return
    setBusy("delete")
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" })
      toast.success("Campaign deleted")
      router.push("/campaigns")
    } catch {
      toast.error("Delete failed")
      setBusy(null)
    }
  }

  return (
    <div className="flex items-start gap-4 pt-2">
      <div className="flex-1 min-w-0">

        {/* Name + status */}
        <div className="flex items-center gap-3 flex-wrap mb-1">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName()
                  if (e.key === "Escape") { setRenaming(false); setNameVal(initName) }
                }}
                className="text-[24px] font-black tracking-tight text-white/90 bg-transparent outline-none border-b border-white/20"
                style={{ minWidth: "10ch", width: `${Math.max(nameVal.length + 2, 12)}ch` }}
              />
              <button onClick={saveName} className="text-emerald-400/70 hover:text-emerald-400 transition-colors">
                <Check className="size-4" />
              </button>
              <button onClick={() => { setRenaming(false); setNameVal(initName) }}
                className="text-white/25 hover:text-white/50 transition-colors">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-[24px] font-black tracking-tight text-white/90 truncate">
                {initName}
              </h1>
              <button
                onClick={() => setRenaming(true)}
                className="shrink-0 text-white/20 hover:text-white/55 transition-colors"
              >
                <Pencil className="size-3.5" />
              </button>
            </>
          )}

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shrink-0 ${s.text}`}
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}
          >
            <span className={`size-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />
            {status}
          </span>
        </div>

        {/* Meta */}
        <p className="text-[12px] text-white/25 mb-4">
          Sequence: {sequenceName}
          {" · "}
          {launchedAt
            ? `Launched ${formatDate(launchedAt)}`
            : `Created ${formatDate(createdAt)}`}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {status === "DRAFT" && (
            <>
              <Link
                href={`/leads?campaignId=${id}`}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white/55 transition-all hover:text-white/80"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}
              >
                <Users className="size-3" />
                Manage Leads
              </Link>
              <Link
                href={`/campaigns/${id}/preview`}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-black transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 6px rgba(0,0,0,.2)" }}
              >
                <Eye className="size-3" />
                Preview & Launch
              </Link>
            </>
          )}

          {status === "ACTIVE" && (
            <button
              onClick={() => patchStatus("PAUSED")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-amber-300/70 transition-all hover:text-amber-300 disabled:opacity-40"
              style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.15)" }}
            >
              {busy === "status" ? <Loader2 className="size-3 animate-spin" /> : <Pause className="size-3" />}
              Pause
            </button>
          )}

          {status === "PAUSED" && (
            <button
              onClick={() => patchStatus("ACTIVE")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-emerald-300/70 transition-all hover:text-emerald-300 disabled:opacity-40"
              style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.15)" }}
            >
              {busy === "status" ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
              Resume
            </button>
          )}

          {status === "ACTIVE" && (
            <button
              onClick={() => patchStatus("COMPLETED")}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white/30 transition-all hover:text-white/60 disabled:opacity-40"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <CheckCircle2 className="size-3" />
              Mark Complete
            </button>
          )}

          <button
            onClick={del}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-red-400/50 transition-all hover:text-red-400 disabled:opacity-40"
            style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.12)" }}
          >
            {busy === "delete" ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            Delete Campaign
          </button>
        </div>

      </div>
    </div>
  )
}
