"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Play, Pause, Zap, Rocket } from "lucide-react"
import { toast } from "sonner"

interface CampaignControlsProps {
  id: string
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"
  autonomous: boolean
  hasLeads: boolean
  isEnriching?: boolean
  onLaunched?: () => void
  onAutonomousChange?: (v: boolean) => void
  onStatusChange?: (s: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED") => void
}

export function CampaignControls({
  id, status, autonomous, hasLeads, isEnriching = false,
  onLaunched, onAutonomousChange, onStatusChange,
}: CampaignControlsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<"launch" | "autopilot" | null>(null)
  const [currentStatus, setCurrentStatus] = useState(status)
  const [currentAutonomous, setCurrentAutopilot] = useState(autonomous)

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error("Failed")
  }

  async function toggleAutopilot() {
    setLoading("autopilot")
    try {
      const next = !currentAutonomous
      await patch({ autonomous: next })
      setCurrentAutopilot(next)
      onAutonomousChange?.(next)
      toast.success(next ? "Autopilot on — emails send automatically" : "Manual mode — you approve each send")
      router.refresh()
    } catch {
      toast.error("Failed to update autopilot")
    } finally {
      setLoading(null)
    }
  }

  async function launch() {
    if (!hasLeads) { toast.error("Add leads to this campaign first"); return }
    if (isEnriching) { toast.error("Wait for lead enrichment to finish"); return }

    setLoading("launch")
    try {
      const res = await fetch(`/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id }),
      })
      if (!res.ok) {
        const text = await res.text()
        let message = text
        try { message = JSON.parse(text).error || text } catch { /* plain text */ }
        throw new Error(message || "Launch failed")
      }

      setCurrentStatus("ACTIVE")
      onStatusChange?.("ACTIVE")
      onLaunched?.()

      const data = await res.json() as { autonomous?: boolean; leadCount?: number }
      if (data.autonomous) {
        toast.success(`Campaign live — writing and sending emails for ${data.leadCount ?? ""} lead${data.leadCount !== 1 ? "s" : ""}`)
      } else {
        toast.success("Campaign launched — review drafts below, then approve to send")
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Launch failed")
    } finally {
      setLoading(null)
    }
  }

  async function togglePause() {
    setLoading("launch")
    try {
      const next = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE"
      await patch({ status: next })
      setCurrentStatus(next as typeof currentStatus)
      onStatusChange?.(next as typeof currentStatus)
      toast.success(next === "PAUSED" ? "Campaign paused" : "Campaign resumed")
      router.refresh()
    } catch {
      toast.error("Failed")
    } finally {
      setLoading(null)
    }
  }

  const launchLabel = currentAutonomous ? "Launch & Send" : "Launch"
  const launchDisabled = loading !== null || isEnriching

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={toggleAutopilot}
        disabled={loading !== null || currentStatus === "COMPLETED"}
        title={currentAutonomous ? "Autopilot: emails send automatically" : "Manual: you approve each send"}
        className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all text-[12px] font-bold"
        style={{
          background: currentAutonomous
            ? "linear-gradient(135deg,rgba(52,211,153,.15),rgba(52,211,153,.06))"
            : "rgba(255,255,255,.04)",
          border: currentAutonomous
            ? "1px solid rgba(52,211,153,.3)"
            : "1px solid rgba(255,255,255,.08)",
          color: currentAutonomous ? "#34d399" : "rgba(255,255,255,.4)",
        }}
      >
        {loading === "autopilot"
          ? <Loader2 className="size-3.5 animate-spin" />
          : <Zap className={`size-3.5 ${currentAutonomous ? "fill-current" : ""}`} />
        }
        <span className="hidden sm:inline">{currentAutonomous ? "Autopilot" : "Manual"}</span>
        <div
          className="relative w-7 h-4 rounded-full transition-all"
          style={{ background: currentAutonomous ? "rgba(52,211,153,.6)" : "rgba(255,255,255,.1)" }}
        >
          <div
            className="absolute top-0.5 size-3 rounded-full bg-white transition-all duration-200 shadow-sm"
            style={{ left: currentAutonomous ? "15px" : "2px" }}
          />
        </div>
      </button>

      {currentStatus === "DRAFT" && (
        <button
          onClick={launch}
          disabled={launchDisabled}
          title={isEnriching ? "Waiting for lead enrichment" : undefined}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#10b981,#059669)",
            color: "#fff",
            boxShadow: "0 2px 12px rgba(16,185,129,.3)",
          }}
        >
          {loading === "launch"
            ? <Loader2 className="size-4 animate-spin" />
            : currentAutonomous ? <Rocket className="size-4" /> : <Play className="size-4 fill-current" />
          }
          {loading === "launch" ? "Launching…" : launchLabel}
        </button>
      )}

      {(currentStatus === "ACTIVE" || currentStatus === "PAUSED") && (
        <button
          onClick={togglePause}
          disabled={loading !== null}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-50"
          style={{
            background: currentStatus === "ACTIVE"
              ? "rgba(251,191,36,.12)"
              : "linear-gradient(135deg,#10b981,#059669)",
            color: currentStatus === "ACTIVE" ? "#fbbf24" : "#fff",
            border: currentStatus === "ACTIVE" ? "1px solid rgba(251,191,36,.25)" : "none",
            boxShadow: currentStatus === "PAUSED" ? "0 2px 12px rgba(16,185,129,.3)" : "none",
          }}
        >
          {loading === "launch"
            ? <Loader2 className="size-4 animate-spin" />
            : currentStatus === "ACTIVE" ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />
          }
          {currentStatus === "ACTIVE" ? "Pause" : "Resume"}
        </button>
      )}
    </div>
  )
}
