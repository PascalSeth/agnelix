/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  AgencyTrainingCommandCenter,
  type AgentGoal,
} from "@/components/agency-training-command-center"
import { Loader2 } from "lucide-react"

export default function AutopilotPage() {
  const { status } = useSession()
  const [goal, setGoal] = useState<AgentGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingGoal, setSavingGoal] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/agent/goals")
      .then(r => r.json())
      .then(res => {
        setGoal(res as AgentGoal)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  async function saveGoal(partial: Partial<AgentGoal>) {
    if (!goal) return
    const next = { ...goal, ...partial }
    setGoal(next)
    setSavingGoal(true)
    try {
      const res = await fetch("/api/agent/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      })
      if (!res.ok) throw new Error("Failed")
      const updated = await res.json()
      // Merge user back in since PATCH doesn't return included relations currently
      setGoal({ ...updated, user: goal.user })
      toast.success("AI Configuration & Strategy saved")
    } catch {
      toast.error("Failed to save agent configuration")
      setGoal(goal)
    } finally {
      setSavingGoal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-white/30">
        <Loader2 className="size-6 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="size-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.9)]" />
          <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-white/30">
            Company AI Command Center
          </span>
        </div>
        <h1 className="text-[28px] font-black tracking-tight leading-none text-white/95">
          AI Training & Autopilot Settings
        </h1>
        <p className="mt-2 text-[13px] text-white/40 font-medium max-w-2xl">
          Train the AI on your company&apos;s specific sales SOPs, objection scripts, pricing policies, and dispatch speeds. Your company procedures override default templates everywhere in your account.
        </p>
      </div>

      {/* Main Interactive Command Center */}
      <AgencyTrainingCommandCenter
        playbookType={goal?.user?.playbookType}
        goal={goal}
        onSaveGoal={saveGoal}
        savingGoal={savingGoal}
      />
    </div>
  )
}
