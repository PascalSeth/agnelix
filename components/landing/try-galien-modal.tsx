"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Sparkles, Globe2, Building2, ArrowRight, Loader2,
  Shield, Gauge, Zap, Eye, Clock, CheckCircle2, XCircle,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

type AuditResult = {
  ssl: boolean
  speed: number
  mobile: boolean
  googleAnalytics: boolean
  pixel: boolean
  noMetaDesc: boolean
}

type Phase = "loading" | "signed-out" | "cooldown" | "form" | "running" | "result" | "error"

function formatCountdown(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${m}m`
}

export function TryGalienModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { status } = useSession()
  const [phase, setPhase] = useState<Phase>("loading")
  const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [website, setWebsite] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [result, setResult] = useState<{ audit: AuditResult; opener: string } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const checkEligibility = useCallback(() => {
    setPhase("loading")
    fetch("/api/try-galien")
      .then(r => r.json())
      .then(data => {
        if (data.eligible) setPhase("form")
        else { setNextAvailableAt(data.nextAvailableAt); setPhase("cooldown") }
      })
      .catch(() => setPhase("form"))
  }, [])

  useEffect(() => {
    if (!open) return
    if (status === "unauthenticated") { setPhase("signed-out"); return }
    if (status === "authenticated") checkEligibility()
  }, [open, status, checkEligibility])

  useEffect(() => {
    if (phase !== "cooldown") return
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("loading")
        setCompanyName("")
        setWebsite("")
        setResult(null)
        setErrorMsg("")
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  async function runTrial() {
    if (!companyName.trim() || !website.trim()) return
    setPhase("running")
    try {
      const res = await fetch("/api/try-galien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, website }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) { setNextAvailableAt(data.nextAvailableAt); setPhase("cooldown"); return }
        setErrorMsg(data.error || "Something went wrong"); setPhase("error"); return
      }
      setResult({ audit: data.audit, opener: data.opener })
      setPhase("result")
    } catch {
      setErrorMsg("Something went wrong. Try again."); setPhase("error")
    }
  }

  const cooldownMs = nextAvailableAt ? new Date(nextAvailableAt).getTime() - now : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-lg w-full rounded-3xl border p-0 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(20, 20, 30, .97) 0%, rgba(10, 10, 16, .99) 100%)",
          border: "1px solid rgba(255, 255, 255, .08)",
          boxShadow: "0 40px 100px rgba(0, 0, 0, .7)",
        }}
      >
        <DialogTitle className="sr-only">Try Galien</DialogTitle>
        <DialogDescription className="sr-only">Run a live AI demo on your own business</DialogDescription>

        <div className="px-6 py-7">
          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <div className="size-1.5 rounded-full bg-[#728972]" style={{ boxShadow: "0 0 6px rgba(114,137,114,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/30">Live AI Demo</span>
          </div>

          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="size-5 text-white/30 animate-spin" />
              <p className="text-[12px] text-white/30">Checking your access…</p>
            </div>
          )}

          {phase === "signed-out" && (
            <div className="space-y-4">
              <h2 className="text-xl font-light text-white">Try Galien on <span className="font-luxury-serif italic text-gradient-gold">your own business.</span></h2>
              <p className="text-[13px] text-slate-400 leading-relaxed">
                Tell Galien your company and website — it&apos;ll run a live audit and write the exact opening line it would use to win a client like you. Sign in to run it free (one try every 24 hours, so keep it real).
              </p>
              <Link
                href="/sign-in?callbackUrl=/"
                className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-xs font-bold text-black transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#ffffff,#cbd5e1)" }}
              >
                Sign in to try it free <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {phase === "cooldown" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-300/80">
                <Clock className="size-4" />
                <h2 className="text-base font-bold text-white">You&apos;ve already used today&apos;s try</h2>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed">
                To keep this fair for everyone, each account gets one live demo every 24 hours. Next try unlocks in:
              </p>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center">
                <span className="text-2xl font-bold text-white tabular-nums">{formatCountdown(cooldownMs)}</span>
              </div>
              <Link
                href="/sign-in"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.08]"
              >
                Skip the wait — start a free trial instead
              </Link>
            </div>
          )}

          {phase === "form" && (
            <div className="space-y-4">
              <h2 className="text-xl font-light text-white">See Galien <span className="font-luxury-serif italic text-gradient-gold">research you</span> live.</h2>
              <p className="text-[13px] text-slate-400 leading-relaxed">
                Give Galien your company name and website. It&apos;ll audit the site for real and write the opening line it would send to win you as a client.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <Building2 className="size-3.5 text-white/30 shrink-0" />
                  <input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Company name"
                    className="flex-1 min-w-0 bg-transparent text-[13px] text-white/85 placeholder:text-white/20 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <Globe2 className="size-3.5 text-white/30 shrink-0" />
                  <input
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="Website (e.g. yourcompany.com)"
                    className="flex-1 min-w-0 bg-transparent text-[13px] text-white/85 placeholder:text-white/20 outline-none"
                  />
                </div>
              </div>
              <button
                onClick={runTrial}
                disabled={!companyName.trim() || !website.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-black transition-all hover:brightness-110 disabled:opacity-30"
                style={{ background: "linear-gradient(135deg,#ffffff,#cbd5e1)" }}
              >
                <Sparkles className="size-3.5" /> Run my live demo
              </button>
              <p className="text-[10px] text-white/20 text-center">One free try every 24 hours per account</p>
            </div>
          )}

          {phase === "running" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="relative flex size-12 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-[#c5a880]/40" style={{ animation: "spin 6s linear infinite" }} />
                <Sparkles className="size-5 text-[#c5a880] animate-pulse" />
              </div>
              <p className="text-[12px] text-white/40">Auditing {website}…</p>
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-4">
              <p className="text-[13px] text-red-300/80">{errorMsg}</p>
              <button
                onClick={() => setPhase("form")}
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.08]"
              >
                Try again
              </button>
            </div>
          )}

          {phase === "result" && result && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white">Here&apos;s what Galien found on {companyName}</h2>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Shield, label: "SSL", ok: result.audit.ssl },
                  { icon: Gauge, label: `Speed ${(result.audit.speed / 1000).toFixed(1)}s`, ok: result.audit.speed < 2500 },
                  { icon: Zap, label: "Mobile", ok: result.audit.mobile },
                  { icon: Eye, label: "Analytics", ok: result.audit.googleAnalytics },
                ].map(({ icon: Icon, label, ok }) => (
                  <div key={label} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: ok ? "rgba(52,211,153,.06)" : "rgba(248,113,113,.06)", border: `1px solid ${ok ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"}` }}>
                    <Icon className={`size-3 ${ok ? "text-emerald-400" : "text-red-400"}`} />
                    <span className="text-[10px] font-bold text-white/60 flex-1">{label}</span>
                    {ok ? <CheckCircle2 className="size-3 text-emerald-400" /> : <XCircle className="size-3 text-red-400" />}
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
                <p className="text-[9px] font-black text-[#c5a880]/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-3" /> AI-Written Opener
                </p>
                <p className="text-[13px] text-white/75 leading-relaxed">{result.opener}</p>
              </div>

              <Link
                href="/sign-in"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-black transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#ffffff,#cbd5e1)" }}
              >
                That&apos;s real research, on real prospects. Start Free Trial <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
              <p className="text-[10px] text-white/20 text-center">Next free try available in 24 hours</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
