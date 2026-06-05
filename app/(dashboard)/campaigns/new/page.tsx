"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { ArrowLeft, Loader2, Check, Zap } from "lucide-react"
import { CustomSelect } from "@/components/ui/custom-select"
import { toast } from "sonner"

type Sequence = { id: string; name: string; isDefault: boolean }

const fieldStyle = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
}

export default function NewCampaignPage() {
  const { status } = useSession()
  const router = useRouter()

  const [name, setName]             = useState("")
  const [sequenceId, setSequenceId] = useState("")
  const [autonomous, setAutonomous] = useState(false)
  const [sequences, setSequences]   = useState<Sequence[]>([])
  const [loading, setLoading]       = useState(false)
  const [fetching, setFetching]     = useState(true)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/sequences")
      .then(r => r.json())
      .then(seqs => {
        setSequences(seqs)
        const def = seqs.find((s: Sequence) => s.isDefault)
        if (def) setSequenceId(def.id)
        setFetching(false)
      })
  }, [status])

  async function handleCreate() {
    if (!name.trim()) { toast.error("Enter a campaign name"); return }
    if (!sequenceId)  { toast.error("Select a sequence"); return }

    setLoading(true)
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sequenceId, autonomous }),
      })
      if (!res.ok) throw new Error(await res.text())
      const campaign = await res.json()
      toast.success("Campaign created")
      router.push(`/campaigns/${campaign.id}?new=1`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const WIZARD_STEPS = ["Details", "Add Leads", "Launch"]

  return (
    <div className="mx-auto max-w-lg space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4 pt-2">
        <Link
          href="/campaigns"
          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:text-white/70"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="size-1.5 rounded-full bg-sky-400" style={{ boxShadow: "0 0 6px rgba(125,211,252,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">New Campaign</span>
          </div>
          <h1 className="text-[24px] font-black tracking-tight leading-none text-white/90">Campaign Details</h1>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0">
        {WIZARD_STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                style={i === 0
                  ? { background: "rgba(255,255,255,.9)", color: "#1a1c24" }
                  : { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.2)" }
                }
              >
                {i + 1}
              </span>
              <span className={`text-[12px] font-bold ${i === 0 ? "text-white/70" : "text-white/20"}`}>
                {label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className="flex-1 mx-3 h-px" style={{ background: "rgba(255,255,255,.07)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 space-y-5"
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
        }}
      >
        <div className="absolute top-0 inset-x-6 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

        {/* Name */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wide">
            Campaign Name
          </label>
          <input
            placeholder="e.g. Q3 Dental Outreach"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
            style={fieldStyle}
          />
        </div>

        {/* Sequence */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wide">
            Email Sequence
          </label>
          {fetching ? (
            <div className="h-10 rounded-xl animate-pulse" style={fieldStyle} />
          ) : sequences.length === 0 ? (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.07)" }}
            >
              <p className="text-[12px] text-white/30">No sequences yet.</p>
              <Link href="/sequences" className="text-[12px] font-semibold text-white/50 hover:text-white/75 transition-colors">
                Create one first →
              </Link>
            </div>
          ) : (
            <CustomSelect
              value={sequenceId}
              onChange={setSequenceId}
              placeholder="Select a sequence…"
              options={sequences.map(s => ({
                value: s.id,
                label: s.name,
                badge: s.isDefault ? "default" : undefined,
              }))}
            />
          )}
        </div>

        {/* Autopilot toggle */}
        <button
          type="button"
          onClick={() => setAutonomous(a => !a)}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
          style={{
            background: autonomous ? "rgba(52,211,153,.05)" : "rgba(255,255,255,.02)",
            border: `1px solid ${autonomous ? "rgba(52,211,153,.18)" : "rgba(255,255,255,.07)"}`,
          }}
        >
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-xl transition-all"
            style={{
              background: autonomous ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.04)",
              border: `1px solid ${autonomous ? "rgba(52,211,153,.2)" : "rgba(255,255,255,.08)"}`,
            }}
          >
            <Zap className={`size-3.5 ${autonomous ? "text-emerald-400" : "text-white/25"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-bold ${autonomous ? "text-emerald-300/80" : "text-white/40"}`}>
              Autopilot
            </p>
            <p className="text-[11px] text-white/25 mt-0.5">
              {autonomous
                ? "Emails queue and send automatically as leads are added"
                : "Enable to auto-launch when leads are enrolled"}
            </p>
          </div>
          <div
            className="relative flex size-5 shrink-0 items-center justify-center rounded-full transition-all"
            style={autonomous
              ? { background: "rgba(52,211,153,.85)" }
              : { border: "1.5px solid rgba(255,255,255,.15)" }}
          >
            {autonomous && <Check className="size-3 text-black" strokeWidth={3} />}
          </div>
        </button>

        {/* Create */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
        >
          {loading ? <><Loader2 className="size-4 animate-spin" /> Creating…</> : "Create Campaign"}
        </button>
      </div>

    </div>
  )
}
