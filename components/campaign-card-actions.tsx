"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pause, Play, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  id: string
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"
}

export function CampaignCardActions({ id, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null)

  async function toggle() {
    const next = status === "ACTIVE" ? "PAUSED" : "ACTIVE"
    setBusy("toggle")
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(next === "ACTIVE" ? "Campaign resumed" : "Campaign paused")
      router.refresh()
    } catch {
      toast.error("Update failed")
    } finally {
      setBusy(null)
    }
  }

  async function del() {
    if (!confirm("Delete this campaign? This cannot be undone.")) return
    setBusy("delete")
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" })
      toast.success("Deleted")
      router.refresh()
    } catch {
      toast.error("Delete failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-1 flex items-center gap-1.5">
      {status !== "COMPLETED" && (
        <button
          onClick={toggle}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-white/35 transition-all hover:text-white/65 disabled:opacity-40"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}
        >
          {busy === "toggle"
            ? <Loader2 className="size-3 animate-spin" />
            : status === "ACTIVE" ? <Pause className="size-3" /> : <Play className="size-3" />}
          {status === "ACTIVE" ? "Pause" : "Resume"}
        </button>
      )}
      <button
        onClick={del}
        disabled={busy !== null}
        className="flex size-7 shrink-0 items-center justify-center rounded-xl text-red-400/30 transition-all hover:text-red-400 disabled:opacity-40"
        style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
      >
        {busy === "delete" ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
      </button>
    </div>
  )
}
