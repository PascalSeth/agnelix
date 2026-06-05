"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowRight, Check, Loader2, Upload, Zap, Brain, Mail, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { initials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ComboSelect } from "@/components/ui/combo-select"

const TONES = ["Professional", "Friendly", "Direct", "Consultative"]
const TITLES = [
  "Founder", "Co-Founder", "CEO", "COO", "CMO", "CTO", "CFO",
  "President", "Managing Director", "Director", "Partner", "Owner",
  "VP of Sales", "VP of Marketing", "Head of Sales", "Head of Marketing",
  "Sales Manager", "Marketing Manager", "Account Executive", "Business Development Manager",
]

const FEATURES = [
  { icon: Brain,      label: "AI email personalisation", desc: "Agnelix AI writes cold emails using your agency context" },
  { icon: Mail,       label: "Gmail integration",        desc: "Sends from your inbox, tracks opens and replies" },
  { icon: Zap,        label: "Battle card generation",   desc: "Instant talking points when a prospect replies" },
  { icon: TrendingUp, label: "Pipeline management",      desc: "Kanban board tracks every deal from cold to won" },
]

const fieldStyle = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
}

export default function OnboardingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (!done) return
    const interval = setInterval(() => setCountdown(c => c - 1), 1000)
    const timeout  = setTimeout(() => router.push("/sequences"), 3000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [done, router])

  const [agencyName, setAgencyName]   = useState("")
  const [title, setTitle]             = useState("")
  const [companyDesc, setCompanyDesc] = useState("")
  const [tone, setTone]               = useState("Professional")
  const [logoUrl, setLogoUrl]         = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [calendarLink, setCalendarLink]   = useState("")

  const fromEmail = session?.user?.email ?? ""

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json()
      setLogoUrl(url)
      toast.success("Logo uploaded")
    } catch {
      toast.error("Logo upload failed")
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleSave() {
    if (!agencyName.trim())  { toast.error("Enter your agency name"); return }
    if (!companyDesc.trim()) { toast.error("Describe what your agency does"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyName, title, fromEmail, companyDesc, tone, onboardingDone: true, calendarLink }),
      })
      if (!res.ok) throw new Error(await res.text())
      setDone(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl"
      style={{ border: "1px solid rgba(255,255,255,.07)", boxShadow: "0 32px 80px rgba(0,0,0,.5)" }}
    >

      {/* ── Left: branding panel ───────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] shrink-0 p-9 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.02) 100%)",
          borderRight: "1px solid rgba(255,255,255,.07)",
        }}
      >
        {/* Top shine */}
        <div className="absolute top-0 inset-x-10 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)" }} />

        {/* Subtle corner glow */}
        <div className="absolute -top-20 -left-20 size-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(255,255,255,.04) 0%,transparent 70%)" }} />

        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/25 mb-8">
            Welcome to Agnelix
          </p>
          <h1 className="text-[26px] font-black leading-tight tracking-tight text-white/90 mb-3">
            Set up your agency in&nbsp;minutes
          </h1>
          <p className="text-[13px] text-white/35 leading-relaxed">
            Tell us about your business once. Every AI email, battle card, and reply draft is personalised using this context.
          </p>
        </div>

        <div className="relative space-y-5">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3.5">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-xl mt-0.5"
                style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}
              >
                <Icon className="size-3.5 text-white/40" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-white/65">{label}</p>
                <p className="text-[11px] text-white/30 mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative text-[10px] text-white/15 font-medium">
          Your data is never shared or used to train models.
        </p>
      </div>

      {/* ── Right: form / success ──────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col"
        style={{ background: "linear-gradient(160deg, rgba(255,255,255,.03) 0%, rgba(26,28,36,.95) 100%)" }}
      >
        {!done ? (
          <div className="flex-1 overflow-y-auto px-8 py-9 space-y-6">

            <div className="mb-2">
              <h2 className="text-[18px] font-black tracking-tight text-white/90">Your agency profile</h2>
              <p className="text-[12px] text-white/30 mt-1">Powers every AI email we generate for you</p>
            </div>

            {/* Logo + name + title */}
            <div
              className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
            >
              <div className="absolute top-0 inset-x-6 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)" }} />

              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/25">Identity</p>

              {/* Logo row */}
              <div className="flex items-center gap-4">
                <Avatar className="size-14 rounded-xl shrink-0"
                  style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.08)" }}>
                  <AvatarImage src={logoUrl ?? undefined} />
                  <AvatarFallback
                    className="rounded-xl text-base font-black text-white/50"
                    style={{ background: "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03))" }}
                  >
                    {initials(agencyName || "?")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <label
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold text-white/50 transition-all hover:text-white/70"
                    style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}
                  >
                    {logoUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    {logoUploading ? "Uploading…" : logoUrl ? "Change" : "Upload Logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                  <p className="mt-1 text-[10px] text-white/20">Optional · PNG or JPG</p>
                </div>
              </div>

              {/* Name + title row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wide">
                    Agency Name <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    placeholder="Acme Marketing"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
                    style={fieldStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wide">
                    Your Title
                  </label>
                  <ComboSelect value={title} onChange={setTitle} options={TITLES} placeholder="Select or type…" />
                </div>
              </div>
 
              {/* Calendar link */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wide">
                  Calendar Booking Link
                </label>
                <input
                  placeholder="e.g. https://calendly.com/your-slug or https://cal.com/your-slug"
                  value={calendarLink}
                  onChange={(e) => setCalendarLink(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
                  style={fieldStyle}
                  type="url"
                />
              </div>
            </div>

            {/* Email locked */}
            <div
              className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
            >
              <div className="absolute top-0 inset-x-6 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)" }} />

              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/25">Sending Email</p>

              <div className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}
              >
                <span className="text-[13px] text-white/50 flex-1 truncate">{fromEmail}</span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/25"
                  style={{ background: "rgba(255,255,255,.05)" }}>
                  Locked
                </span>
              </div>
              <p className="text-[11px] text-white/20 -mt-1">
                Set <code className="text-white/35">SMTP_USER</code> to this address in your environment variables
              </p>
            </div>

            {/* What you do + tone */}
            <div
              className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
            >
              <div className="absolute top-0 inset-x-6 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)" }} />

              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/25">AI Context</p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wide">
                  What your agency does <span className="text-red-400/60">*</span>
                </label>
                <textarea
                  placeholder="We help dental practices grow their patient base through SEO and paid ads. We specialise in local service businesses and typically get clients 15–30 new patients per month."
                  value={companyDesc}
                  onChange={(e) => setCompanyDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-[13px] text-white/75 outline-none placeholder:text-white/20 resize-none"
                  style={fieldStyle}
                />
                <p className="text-[11px] text-white/20">Be specific — more detail = better AI emails</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wide">
                  Email Tone
                </label>
                <div className="flex gap-1.5">
                  {TONES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all"
                      style={tone === t
                        ? { background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", color: "rgba(255,255,255,.85)" }
                        : { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.3)" }
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Launch Dashboard"}
              {!saving && <ArrowRight className="size-4" />}
            </button>
          </div>
        ) : (
          /* ── Success state ── */
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center space-y-6">
            <div className="relative">
              <div
                className="flex size-20 items-center justify-center rounded-3xl mx-auto"
                style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)" }}
              >
                <Check className="size-9 text-emerald-400" />
              </div>
              <div className="absolute -inset-3 rounded-full opacity-30 animate-ping"
                style={{ background: "radial-gradient(circle,rgba(52,211,153,.3) 0%,transparent 70%)" }} />
            </div>

            <div>
              <h2 className="text-[22px] font-black tracking-tight text-white/90">
                {agencyName || "Your agency"} is ready
              </h2>
              <p className="text-[13px] text-white/35 mt-2 max-w-xs mx-auto">
                Your AI is configured. Next up: create your first email sequence.
              </p>
            </div>

            {/* Redirect countdown */}
            <div
              className="w-full max-w-xs rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <p className="text-[11px] text-white/30 mb-2">Taking you to Sequences in…</p>
              <div className="flex items-center justify-center gap-2">
                <span
                  className="flex size-9 items-center justify-center rounded-full text-[18px] font-black text-white/80"
                  style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}
                >
                  {Math.max(0, countdown)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.07)" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${((3 - countdown) / 3) * 100}%`,
                    background: "linear-gradient(90deg,rgba(52,211,153,.5),rgba(52,211,153,.8))",
                  }}
                />
              </div>
            </div>

            <div className="w-full max-w-xs space-y-2.5">
              <button
                onClick={() => router.push("/sequences")}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
              >
                Go Now
                <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium text-white/40 transition-all hover:text-white/60"
                style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
              >
                Skip to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
