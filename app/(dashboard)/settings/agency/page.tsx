"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Loader2, Upload, Save, Mail, CheckCircle2, XCircle,
  ExternalLink, AlertCircle, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react"
import { CustomSelect } from "@/components/ui/custom-select"
import { toast } from "sonner"
import { initials } from "@/lib/utils"

type UserProfile = {
  agencyName: string | null
  fromEmail:  string | null
  smtpPass:   string | null
  smtpHost:   string | null
  smtpPort:   number | null
  companyDesc: string | null
  title:      string | null
  tone:       string | null
  agencyLogo: string | null
  calendarLink: string | null
}

const TONES = ["Professional", "Friendly", "Direct", "Consultative"]

const field = {
  background: "rgba(255,255,255,.04)",
  border:     "1px solid rgba(255,255,255,.08)",
}

const card = {
  background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
  border:     "1px solid rgba(255,255,255,.07)",
}

export default function AgencySettingsPage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile>({
    agencyName: "", fromEmail: "", smtpPass: "", smtpHost: "",
    smtpPort: null, companyDesc: "", title: "", tone: "Professional", agencyLogo: null,
    calendarLink: "",
  })
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [logoUploading, setLogo]      = useState(false)
  const [testingSmtp, setTesting]     = useState(false)
  const [smtpStatus, setSmtpStatus]   = useState<"idle" | "ok" | "error">("idle")
  const [smtpError, setSmtpError]     = useState("")
  const [showHelp, setShowHelp]       = useState(false)
  const [refining, setRefining]         = useState(false)
  const [refiningTitle, setRefiningTitle] = useState(false)
  const [showDescPreview, setShowDescPreview] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false) })
  }, [status])

  // Derive connection state
  const isConnected = !!(profile.fromEmail && profile.smtpPass && smtpStatus === "ok")
  const isPartial   = !!(profile.fromEmail && profile.smtpPass && smtpStatus !== "ok")
  const identityOk  = !!(profile.agencyName && profile.companyDesc)

  function set(key: keyof UserProfile, val: string | number | null) {
    setSmtpStatus("idle")
    setProfile(p => ({ ...p, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Auto-fill Gmail SMTP defaults so users never see those fields
      const payload = {
        ...profile,
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
      }
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogo(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json()
      set("agencyLogo", url)
      toast.success("Logo uploaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLogo(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    setSmtpStatus("idle")
    // Save first so the test uses current values
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, smtpHost: "smtp.gmail.com", smtpPort: 587 }),
    })
    try {
      const res  = await fetch("/api/settings/smtp-test", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSmtpStatus("ok")
      toast.success("Gmail connected successfully")
    } catch (err) {
      setSmtpStatus("error")
      setSmtpError(err instanceof Error ? err.message : "Connection failed")
    } finally {
      setTesting(false)
    }
  }

  async function refineTitle() {
    if (!profile.title?.trim()) {
      toast.error("Add a rough title first — e.g. 'i run the company' or 'marketing'")
      return
    }
    setRefiningTitle(true)
    try {
      const res = await fetch("/api/settings/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode:           "title",
          agencyName:     profile.agencyName,
          rawTitle:       profile.title,
          rawDescription: profile.companyDesc,
        }),
      })
      if (!res.ok) throw new Error()
      const { refined } = await res.json()
      setProfile(p => ({ ...p, title: refined }))
      toast.success("Title refined")
    } catch {
      toast.error("Refinement failed")
    } finally {
      setRefiningTitle(false)
    }
  }

  async function refineDescription() {
    if (!profile.companyDesc?.trim()) {
      toast.error("Add a rough description first — even a few words is enough")
      return
    }
    setRefining(true)
    try {
      const res = await fetch("/api/settings/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName:     profile.agencyName,
          title:          profile.title,
          rawDescription: profile.companyDesc,
        }),
      })
      if (!res.ok) throw new Error()
      const { refined } = await res.json()
      setProfile(p => ({ ...p, companyDesc: refined }))
      setShowDescPreview(true)
      toast.success("Description refined")
    } catch {
      toast.error("Refinement failed — try again")
    } finally {
      setRefining(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-white/20" />
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">

      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="size-1.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 6px rgba(251,191,36,.9)" }} />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Configuration</span>
        </div>
        <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">Settings</h1>
        <p className="mt-2 text-[13px] text-white/25">
          Set up your identity and connect Gmail to start sending outreach
        </p>
      </div>

      {/* ── Setup checklist ── */}
      <div className="rounded-2xl overflow-hidden" style={card}>
        <div className="px-5 py-4">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Setup Status</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              {identityOk
                ? <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                : <AlertCircle  className="size-4 text-amber-400 shrink-0" />}
              <span className={`text-[13px] font-semibold ${identityOk ? "text-white/60" : "text-white/80"}`}>
                Identity & agency info
              </span>
              {!identityOk && (
                <span className="ml-auto text-[10px] text-amber-400/70">Fill in below</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {isConnected
                ? <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                : isPartial
                ? <AlertCircle  className="size-4 text-amber-400 shrink-0" />
                : <XCircle      className="size-4 text-red-400/60 shrink-0" />}
              <span className={`text-[13px] font-semibold ${isConnected ? "text-white/60" : "text-white/80"}`}>
                Gmail connected
              </span>
              {!isConnected && !isPartial && (
                <span className="ml-auto text-[10px] text-red-400/60">Required to send emails</span>
              )}
              {isPartial && (
                <span className="ml-auto text-[10px] text-amber-400/70">Click Test Connection below</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Identity panel ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 space-y-5" style={card}>
        <div className="absolute top-0 inset-x-6 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
            <span className="text-[14px]">👤</span>
          </div>
          <div>
            <p className="text-[13px] font-bold text-white/75">Your Identity</p>
            <p className="text-[11px] text-white/30">Used by AI to personalise every email it writes</p>
          </div>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4">
          <Avatar className="size-14 rounded-xl shrink-0"
            style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.08), 0 2px 12px rgba(0,0,0,.3)" }}>
            <AvatarImage src={profile.agencyLogo ?? undefined} />
            <AvatarFallback className="rounded-xl text-base font-black text-white/60"
              style={{ background: "rgba(255,255,255,.06)" }}>
              {initials(profile.agencyName ?? session?.user?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white/50 hover:text-white/70 transition-all"
              style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
              {logoUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {logoUploading ? "Uploading…" : "Upload Logo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
            </label>
            <p className="mt-1 text-[10px] text-white/20">PNG or JPG · max 2 MB</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">Agency / Company Name</label>
            <input type="text" placeholder="Acme Marketing"
              value={profile.agencyName ?? ""} onChange={e => set("agencyName", e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20" style={field} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">
                Your Position
              </label>
              <button
                type="button"
                onClick={refineTitle}
                disabled={refiningTitle}
                className="flex items-center gap-1 text-[10px] font-bold transition-all hover:brightness-110 disabled:opacity-50 rounded-lg px-2 py-0.5"
                style={{
                  background: "linear-gradient(135deg,rgba(52,211,153,.1),rgba(52,211,153,.04))",
                  border: "1px solid rgba(52,211,153,.18)",
                  color: "#34d399",
                }}
              >
                {refiningTitle ? <Loader2 className="size-2.5 animate-spin" /> : <Sparkles className="size-2.5" />}
                {refiningTitle ? "Refining…" : "Refine"}
              </button>
            </div>
            <input type="text" placeholder="e.g. Founder & CEO, Director, Head of Growth"
              value={profile.title ?? ""} onChange={e => set("title", e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20" style={field} />
            <p className="text-[10px] text-white/20">Used as your email sign-off — type anything, hit Refine to tidy it up</p>
          </div>
        </div>
        {/* Calendar Link field */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">Calendar Booking Link</label>
          <input type="url" placeholder="e.g. https://calendly.com/your-slug or https://cal.com/your-slug"
            value={profile.calendarLink ?? ""} onChange={e => set("calendarLink", e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20" style={field} />
          <p className="text-[10px] text-white/20">Your custom calendar link used to track meeting bookings per email sequence</p>
        </div>

        {/* What your business does — guided + AI refine */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">
              What your business does
            </label>
            <button
              type="button"
              onClick={refineDescription}
              disabled={refining}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all hover:brightness-110 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg,rgba(52,211,153,.12),rgba(52,211,153,.05))",
                border: "1px solid rgba(52,211,153,.2)",
                color: "#34d399",
              }}
            >
              {refining
                ? <Loader2 className="size-3 animate-spin" />
                : <Sparkles className="size-3" />}
              {refining ? "Refining…" : "Refine with AI"}
            </button>
          </div>

          {/* Guidance prompts */}
          <div className="rounded-xl px-4 py-3 space-y-1"
            style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-wide mb-2">
              The more specific you are, the better the AI writes
            </p>
            {[
              { q: "What do you sell or deliver?",             eg: "e.g. web design, SEO, bookkeeping, insurance" },
              { q: "Who are your ideal clients?",             eg: "e.g. dental practices, plumbers, estate agents, SaaS startups" },
              { q: "What result do you typically deliver?",   eg: "e.g. 3x more enquiries, 40% cost saving, rank on page 1" },
              { q: "What makes you different?",               eg: "e.g. AI-powered, local market specialist, fixed fee" },
            ].map(({ q, eg }) => (
              <div key={q} className="flex gap-2 text-[11px]">
                <span className="text-white/20 shrink-0">→</span>
                <div>
                  <span className="text-white/40 font-semibold">{q}</span>
                  <span className="text-white/20"> {eg}</span>
                </div>
              </div>
            ))}
          </div>

          <textarea
            placeholder={"Write anything — rough notes are fine. Hit \"Refine with AI\" and it will turn your notes into a professional description the AI can use.\n\ne.g. we do marketing for local businesses, mainly dentists and plumbers, help them get more leads online, we use ai to personalise everything"}
            value={profile.companyDesc ?? ""}
            onChange={e => { set("companyDesc", e.target.value); setShowDescPreview(false) }}
            rows={5}
            className="w-full rounded-xl px-4 py-3 text-[13px] text-white/75 outline-none placeholder:text-white/20 resize-none leading-relaxed"
            style={field}
          />

          {/* Preview of how AI uses this in emails */}
          {showDescPreview && profile.companyDesc && (
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.15)" }}>
              <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-wide">
                How this appears in outreach emails
              </p>
              <p className="text-[12px] text-white/55 leading-relaxed italic">
                "…I work with {profile.agencyName || "our company"} — {profile.companyDesc}"
              </p>
            </div>
          )}

          {!showDescPreview && (
            <p className="text-[10px] text-white/20">
              The AI uses this to personalise every email opening — the richer the description, the more relevant the outreach
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">Email Tone</label>
          <CustomSelect value={profile.tone ?? "Professional"} onChange={v => set("tone", v)}
            options={TONES.map(t => ({ value: t, label: t }))} />
        </div>
      </div>

      {/* ── Gmail setup panel ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 space-y-5" style={card}>
        <div className="absolute top-0 inset-x-6 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

        {/* Header with connection status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
              <Mail className="size-4 text-white/40" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white/75">Gmail Connection</p>
              <p className="text-[11px] text-white/30">Outreach emails send from your own Gmail account</p>
            </div>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.2)" }}>
              <div className="size-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 4px rgba(52,211,153,.8)" }} />
              <span className="text-[10px] font-bold text-emerald-400">Connected</span>
            </div>
          )}
        </div>

        {/* Step-by-step guide */}
        <div className="space-y-3">
          {/* Step 1 */}
          <div className="flex gap-3.5 rounded-xl p-4" style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)" }}>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
              style={{ background: "rgba(52,211,153,.15)", color: "#34d399", border: "1px solid rgba(52,211,153,.25)" }}>
              1
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white/65 mb-0.5">Enable 2-Step Verification on your Google account</p>
              <p className="text-[11px] text-white/30 mb-2">Required before you can create an App Password</p>
              <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-400/80 hover:text-sky-400 transition-colors">
                Open Google Security <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3.5 rounded-xl p-4" style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)" }}>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
              style={{ background: "rgba(125,211,252,.12)", color: "#7dd3fc", border: "1px solid rgba(125,211,252,.2)" }}>
              2
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white/65 mb-0.5">Create an App Password for "Mail"</p>
              <p className="text-[11px] text-white/30 mb-2">
                Go to App Passwords → Select app: <span className="text-white/50">Mail</span> → Select device: <span className="text-white/50">Windows Computer</span> → Generate
              </p>
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-400/80 hover:text-sky-400 transition-colors">
                Open App Passwords <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* Step 3: inputs */}
          <div className="flex gap-3.5 rounded-xl p-4" style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)" }}>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
              style={{ background: "rgba(167,139,250,.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,.2)" }}>
              3
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-[12px] font-bold text-white/65">Enter your Gmail credentials</p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider">Your Gmail address</label>
                <input type="email" placeholder="you@gmail.com"
                  value={profile.fromEmail ?? ""} onChange={e => set("fromEmail", e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20" style={field} />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider">App Password (16 characters)</label>
                <input type="password" placeholder="xxxx xxxx xxxx xxxx"
                  value={profile.smtpPass ?? ""} onChange={e => set("smtpPass", e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20 font-mono tracking-widest" style={field}
                  autoComplete="new-password" />
                <p className="text-[10px] text-white/20">This is NOT your Google password — it is stored encrypted and only used for sending</p>
              </div>

              {/* Test button + status */}
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={testConnection}
                  disabled={testingSmtp || !profile.fromEmail || !profile.smtpPass}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.65)" }}>
                  {testingSmtp ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                  {testingSmtp ? "Testing…" : "Test Connection"}
                </button>
                {smtpStatus === "ok" && (
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400">
                    <CheckCircle2 className="size-4" /> Gmail connected ✓
                  </div>
                )}
                {smtpStatus === "error" && (
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-red-400">
                    <XCircle className="size-4" />
                    <span className="truncate max-w-60 text-[11px]">{smtpError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help accordion */}
        <div>
          <button onClick={() => setShowHelp(h => !h)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white/25 hover:text-white/45 transition-colors">
            {showHelp ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            Why do I need an App Password?
          </button>
          {showHelp && (
            <div className="mt-3 rounded-xl p-4 space-y-2"
              style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
              <p className="text-[12px] text-white/50 leading-relaxed">
                Google doesn't allow third-party apps to use your regular password for security reasons.
                An App Password is a special 16-character code that gives Agnelix permission to send emails
                through your Gmail account — without ever seeing your actual Google password.
              </p>
              <p className="text-[12px] text-white/35 leading-relaxed">
                Your emails will appear to come from your Gmail address, so prospects reply directly to you.
                You can revoke access at any time from your Google Account settings.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Save ── */}
      <button onClick={handleSave} disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}>
        {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save Settings</>}
      </button>
    </div>
  )
}
