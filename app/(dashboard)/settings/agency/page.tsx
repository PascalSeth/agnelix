"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Loader2, Upload, Save, Mail, CheckCircle2, XCircle,
  ExternalLink, AlertCircle, ChevronDown, ChevronUp, Sparkles,
  ShieldCheck, Copy, Check, Info, User,
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

const card = {
  background: "linear-gradient(135deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.015) 100%)",
  border:     "1px solid rgba(255,255,255,.06)",
  boxShadow:  "0 15px 45px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,.03)",
  backdropFilter: "blur(24px)",
}

const inputClass = "w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20 border border-white/[0.08] bg-white/[0.02] focus:border-indigo-500/50 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.15)] transition-all"

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
  const [expandedDns, setExpandedDns] = useState<string | null>(null)
  const [troubleshootIssue, setTroubleshootIssue] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "smtp" | "dns">("profile")

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
    toast.success("Copied to clipboard")
  }

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
    let formattedCalendarLink = profile.calendarLink ? profile.calendarLink.trim() : ""
    if (formattedCalendarLink) {
      try {
        const hasProtocol = formattedCalendarLink.startsWith("http://") || formattedCalendarLink.startsWith("https://")
        const urlStr = hasProtocol ? formattedCalendarLink : `https://${formattedCalendarLink}`
        const parsed = new URL(urlStr)
        if (!parsed.hostname.includes(".")) {
          throw new Error("Invalid domain")
        }
        formattedCalendarLink = urlStr
      } catch {
        toast.error("Please enter a valid calendar link (e.g. https://calendly.com/your-name). The link must include a valid domain name like '.com' or '.co'.")
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        ...profile,
        calendarLink: formattedCalendarLink || null,
        smtpHost: "smtp.gmail.com",
        smtpPort: 465,
      }
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      
      setProfile(p => ({ ...p, calendarLink: payload.calendarLink }))
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
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, smtpHost: "smtp.gmail.com", smtpPort: 465 }),
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
    <div className="mx-auto max-w-4xl space-y-6 pb-12 animate-fadeIn">

      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="size-1.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 6px rgba(251,191,36,.9)" }} />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Settings Profile</span>
        </div>
        <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">Settings</h1>
        <p className="mt-2 text-[13px] text-white/25">
          Configure branding, outbound credentials, and spam-prevention records
        </p>
      </div>

      {/* ── Status overview checklist ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="px-5 py-3.5 flex items-center justify-between gap-6 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-4 pt-0.5">
              <div className="flex items-center gap-1.5">
                {identityOk
                  ? <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  : <AlertCircle  className="size-3.5 text-amber-400 shrink-0" />}
                <span className={`text-[11px] font-extrabold uppercase tracking-wide ${identityOk ? "text-white/40" : "text-white/75"}`}>
                  Identity: {identityOk ? "Setup OK" : "Incomplete"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isConnected
                  ? <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  : isPartial
                  ? <AlertCircle  className="size-3.5 text-amber-400 shrink-0" />
                  : <XCircle      className="size-3.5 text-red-400/60 shrink-0" />}
                <span className={`text-[11px] font-extrabold uppercase tracking-wide ${isConnected ? "text-white/40" : "text-white/75"}`}>
                  Gmail: {isConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-[10.5px] text-white/25 font-bold">
            {!identityOk && "Complete details in Profile"}
            {identityOk && !isConnected && "Provide Google App Password"}
            {identityOk && isConnected && "Outbox connection is operational"}
          </div>
        </div>
      </div>

      {/* ── Split-Pane Main Layout Container ── */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* Left Vertical Navigation Sidebar (1/4 Width) */}
        <div className="w-full md:w-60 shrink-0 flex flex-row md:flex-col gap-1.5 p-1.5 rounded-2xl bg-white/[0.01] border border-white/[0.04] overflow-x-auto md:overflow-x-visible shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          {[
            { id: "profile", label: "Agency Profile", desc: "Branding & description", icon: User },
            { id: "smtp", label: "SMTP Connection", desc: "Gmail outbox authentication", icon: Mail },
            { id: "dns", label: "DNS Deliverability", desc: "SPF/DKIM checklist", icon: ShieldCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as "profile" | "smtp" | "dns")}
                className={`flex-1 md:flex-initial flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer whitespace-nowrap md:whitespace-normal ${
                  isActive 
                    ? "text-white bg-white/[0.04] border border-white/[0.07] shadow-[0_4px_12px_rgba(0,0,0,0.3)] border-l-2 md:border-l-indigo-400 pl-3 md:pl-3.5" 
                    : "text-white/40 hover:text-white/60 hover:bg-white/[0.01] border border-transparent"
                }`}
              >
                <Icon className={`size-4 shrink-0 ${isActive ? "text-indigo-400" : "text-white/20"}`} />
                <div className="min-w-0">
                  <p className="text-[12px] font-black leading-none">{tab.label}</p>
                  <p className="text-[9px] text-white/20 mt-1 hidden md:block font-medium">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Details content Card (3/4 Width) */}
        <div className="flex-1 w-full relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 transition-all duration-300" style={card}>
          {/* Ambient Mesh Glows */}
          <div className="absolute -right-24 -bottom-24 size-48 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
          <div className="absolute -left-24 -top-24 size-48 rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

          {/* Tab Content Panel */}
          <div className="relative z-10 space-y-6">
            
            {/* TAB 1: Profile Details */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.04]">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    <User className="size-3.5 text-white/40" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-white/85">Agency Profile Branding</h3>
                    <p className="text-[10px] text-white/30">Your profile coordinates case studies, meetings, and AI signatures</p>
                  </div>
                </div>

                {/* Upload logo widget */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                  <Avatar className="size-16 rounded-xl shrink-0"
                    style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.06), 0 4px 12px rgba(0,0,0,.2)" }}>
                    <AvatarImage src={profile.agencyLogo ?? undefined} className="object-cover rounded-xl" />
                    <AvatarFallback className="rounded-xl text-lg font-black text-white/50"
                      style={{ background: "rgba(255,255,255,.05)" }}>
                      {initials(profile.agencyName ?? session?.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <p className="text-[12px] font-bold text-white/80">Agency Brand Logo</p>
                    <p className="text-[10px] text-white/20 leading-relaxed max-w-sm">
                      PNG or JPG, max 2MB. Displayed on public pages.
                    </p>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1.5 text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/5 border border-white/10 transition-all select-none">
                      {logoUploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                      {logoUploading ? "Uploading…" : "Upload logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                    </label>
                  </div>
                </div>

                {/* Names grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">Agency / Company Name</label>
                    <input type="text" placeholder="Acme Inc."
                      value={profile.agencyName ?? ""} onChange={e => set("agencyName", e.target.value)}
                      className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">Your Position</label>
                      <button
                        type="button"
                        onClick={refineTitle}
                        disabled={refiningTitle}
                        className="flex items-center gap-1 text-[9px] font-extrabold transition-all hover:brightness-110 disabled:opacity-50 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.2"
                      >
                        {refiningTitle ? <Loader2 className="size-2.5 animate-spin" /> : <Sparkles className="size-2.5" />}
                        AI Refine
                      </button>
                    </div>
                    <input type="text" placeholder="Founder & CEO"
                      value={profile.title ?? ""} onChange={e => set("title", e.target.value)}
                      className={inputClass} />
                  </div>
                </div>

                {/* Calendar */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">Calendar Booking Link</label>
                  <input type="url" placeholder="https://calendly.com/your-slug"
                    value={profile.calendarLink ?? ""} onChange={e => set("calendarLink", e.target.value)}
                    className={inputClass} />
                  <p className="text-[9.5px] text-white/20">Meetings booked are tracked in analytics dynamically</p>
                </div>

                {/* Business description text */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">What your business does</label>
                    <button
                      type="button"
                      onClick={refineDescription}
                      disabled={refining}
                      className="flex items-center gap-1 text-[9px] font-extrabold transition-all hover:brightness-110 disabled:opacity-50 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5"
                    >
                      {refining ? <Loader2 className="size-2.5 animate-spin" /> : <Sparkles className="size-2.5" />}
                      Refine description
                    </button>
                  </div>

                  <textarea
                    placeholder="Write rough notes here. AI will refine it to write personalized, contextual emails."
                    value={profile.companyDesc ?? ""}
                    onChange={e => { set("companyDesc", e.target.value); setShowDescPreview(false) }}
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-[13px] text-white/75 outline-none placeholder:text-white/20 resize-none leading-relaxed border border-white/[0.08] bg-white/[0.02] focus:border-indigo-500/50 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.15)] transition-all"
                  />

                  {showDescPreview && profile.companyDesc && (
                    <div className="rounded-xl p-3.5 space-y-1.5 animate-fadeIn"
                      style={{ background: "rgba(52,211,153,.04)", border: "1px solid rgba(52,211,153,.12)" }}>
                      <p className="text-[9px] font-black text-emerald-400/60 uppercase tracking-wide">
                        Outreach preview sample
                      </p>
                      <p className="text-[11.5px] text-white/55 leading-relaxed italic">
                        &quot;…I work with {profile.agencyName || "our company"} — {profile.companyDesc}&quot;
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-white/30 uppercase tracking-wide">Email Tone</label>
                  <CustomSelect value={profile.tone ?? "Professional"} onChange={v => set("tone", v)}
                    options={TONES.map(t => ({ value: t, label: t }))} />
                </div>
              </div>
            )}

            {/* TAB 2: Gmail SMTP */}
            {activeTab === "smtp" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.04]">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    <Mail className="size-3.5 text-white/40" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-white/85">Gmail SMTP connection credentials</h3>
                    <p className="text-[10px] text-white/30">Authenticate outbound parameters for Google mailboxes</p>
                  </div>
                </div>

                {/* Setup Steps Timeline */}
                <div className="space-y-3">
                  <div className="flex gap-3.5 rounded-xl p-4 bg-white/[0.01] border border-white/[0.04]">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-white/70">Verify 2-Step Authentication</p>
                      <p className="text-[10px] text-white/30 mt-0.5 mb-2">Must be active on Google account before app passwords work.</p>
                      <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors">
                        Google Security Settings <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3.5 rounded-xl p-4 bg-white/[0.01] border border-white/[0.04]">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-white/70">Create App Password for &quot;Mail&quot;</p>
                      <p className="text-[10px] text-white/30 mt-0.5 mb-2">Generate a dedicated 16-character code.</p>
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors">
                        Generate Google App Password <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3.5 rounded-xl p-4 bg-white/[0.01] border border-white/[0.04]">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      3
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <p className="text-[12px] font-bold text-white/70">Enter credentials</p>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-extrabold text-white/30 uppercase tracking-wide">Gmail Address</label>
                        <input type="email" placeholder="name@gmail.com"
                          value={profile.fromEmail ?? ""} onChange={e => set("fromEmail", e.target.value)}
                          className={inputClass} />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-extrabold text-white/30 uppercase tracking-wide">16-Character App Password</label>
                        <input type="password" placeholder="xxxx xxxx xxxx xxxx"
                          value={profile.smtpPass ?? ""} onChange={e => set("smtpPass", e.target.value)}
                          className={`${inputClass} font-mono tracking-widest`}
                          autoComplete="new-password" />
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button type="button" onClick={testConnection}
                          disabled={testingSmtp || !profile.fromEmail || !profile.smtpPass}
                          className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition-all hover:bg-white/5 border border-white/10 disabled:opacity-40"
                        >
                          {testingSmtp ? <Loader2 className="size-3 animate-spin" /> : <Mail className="size-3" />}
                          {testingSmtp ? "Testing…" : "Test Connection"}
                        </button>
                        {smtpStatus === "ok" && (
                          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-400">
                            <CheckCircle2 className="size-3.5" /> Gmail Authenticated ✓
                          </div>
                        )}
                        {smtpStatus === "error" && (
                          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-red-400">
                            <XCircle className="size-3.5" />
                            <span className="truncate max-w-60 text-[10px]">{smtpError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <button onClick={() => setShowHelp(h => !h)}
                    className="flex items-center gap-1.5 text-[10.5px] font-bold text-white/25 hover:text-white/45 transition-colors">
                    {showHelp ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    Why do I need an App Password?
                  </button>
                  {showHelp && (
                    <div className="mt-2.5 rounded-lg p-3.5 text-[11px] text-white/45 leading-relaxed bg-white/[0.01] border border-white/[0.04]">
                      Google blocks direct SMTP access with your primary password for security reasons. App Passwords provide a revocable 16-digit token to allow Galien to safely route campaign messages.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DNS & Deliverability */}
            {activeTab === "dns" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.04]">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    <ShieldCheck className="size-3.5 text-white/40" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-white/85">DNS Deliverability Records</h3>
                    <p className="text-[10px] text-white/30">Verify domain settings to guarantee inbox delivery</p>
                  </div>
                </div>

                {/* DNS checklist rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "spf",
                      title: "SPF Authentication",
                      badge: "DNS TXT",
                      desc: "Authorize Google's servers to send on your behalf.",
                      value: "v=spf1 include:_spf.google.com ~all",
                      host: "@",
                      guide: "Go to your DNS provider. Create a new TXT record. Set Host to '@' and Value to the SPF record. If you have an existing SPF record, merge them: add 'include:_spf.google.com' before the final directive (e.g. '~all')."
                    },
                    {
                      id: "dkim",
                      title: "DKIM Signature",
                      badge: "DNS TXT",
                      desc: "Cryptographically signs outbound emails to verify sender identity.",
                      value: "google._domainkey",
                      host: "google._domainkey",
                      guide: "Log in to your Google Admin Console. Navigate to Apps > Google Workspace > Gmail > Authenticate email. Click 'Generate new record' with key length 2048. Copy the generated host and text value, then publish them as a TXT record in your DNS manager."
                    },
                    {
                      id: "dmarc",
                      title: "DMARC Policy",
                      badge: "DNS TXT",
                      desc: "Specify how providers handle failed SPF/DKIM checks.",
                      value: "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@yourdomain.com",
                      host: "_dmarc",
                      guide: "Create a TXT record with Host '_dmarc'. The value tells receiving servers to quarantine messages that fail authentication. Replace 'dmarc@yourdomain.com' with your actual email to receive daily authentication reports."
                    },
                    {
                      id: "domain",
                      title: "Secondary Domain",
                      badge: "Strategy",
                      desc: "Isolate cold outreach from your primary corporate email domain.",
                      value: "Recommended",
                      host: "Outbound Risk Control",
                      guide: "Never send high volumes of outbound emails from your main business domain. Register lookalike domains like 'getdomain.com' or 'domain-sales.com' and point MX records to Google Workspace. This protects your primary brand communication reputation."
                    },
                    {
                      id: "warm",
                      title: "Inbox Warming",
                      badge: "Sending Rules",
                      desc: "Gradually build up your email domain's sender reputation.",
                      value: "14-Day Ramp-up",
                      host: "Volume Limit",
                      guide: "New email addresses must be warmed up. Start by sending 5-10 emails per day. After 1-2 weeks, increase this to 15-20. Never exceed 30-40 cold outbound emails per day from a single inbox to avoid spam filters."
                    }
                  ].map(item => {
                    const isExpanded = expandedDns === item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl p-3.5 space-y-2 transition-all duration-200"
                        style={{
                          background: isExpanded ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.01)",
                          border: isExpanded ? "1px solid rgba(255,255,255,.06)" : "1px solid rgba(255,255,255,.03)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-bold text-white/80">{item.title}</span>
                          </div>
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 uppercase tracking-wider">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/30 leading-snug">{item.desc}</p>
                        
                        <button
                          type="button"
                          onClick={() => setExpandedDns(expandedDns === item.id ? null : item.id)}
                          className="text-[9.5px] font-bold text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          {isExpanded ? "Hide instructions" : "Show instructions"}
                        </button>

                        {isExpanded && (
                          <div className="pt-2 mt-1 border-t border-white/5 space-y-2 text-[10px] transition-all">
                            {item.id !== "domain" && item.id !== "warm" && (
                              <div className="space-y-1.5 rounded-lg p-2 bg-black/40 border border-white/5">
                                <div className="flex justify-between items-center text-[9px] text-white/40">
                                  <span>Host</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(item.host, `${item.id}-host`)}
                                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                                  >
                                    {copiedText === `${item.id}-host` ? <Check className="size-2.5 text-emerald-400" /> : <Copy className="size-2.5" />}
                                    Copy
                                  </button>
                                </div>
                                <code className="block text-white/70 break-all font-mono">{item.host}</code>

                                <div className="flex justify-between items-center text-[9px] text-white/40 pt-1">
                                  <span>TXT Value</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(item.value, `${item.id}-val`)}
                                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                                  >
                                    {copiedText === `${item.id}-val` ? <Check className="size-2.5 text-emerald-400" /> : <Copy className="size-2.5" />}
                                    Copy
                                  </button>
                                </div>
                                <code className="block text-white/70 break-all font-mono">{item.value}</code>
                              </div>
                            )}
                            <div className="text-white/50 bg-white/2 rounded-lg p-2 border border-white/5 leading-relaxed">
                              {item.guide}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Troubleshooter Panel */}
                <div className="rounded-xl p-4 space-y-3 bg-white/[0.01] border border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Info className="size-3.5 text-sky-400" />
                    <p className="text-[12px] font-bold text-white/80">Spam Prevention Troubleshooter</p>
                  </div>
                  <p className="text-[10.5px] text-white/35">
                    Click an issue below to run a setup diagnostic:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "spam-folder", label: "Emails go directly to Spam" },
                      { id: "bounce", label: "My emails are bouncing / blocked" },
                      { id: "low-opens", label: "Low open rate (< 20%)" },
                      { id: "warmup-info", label: "How to warm up domain" }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTroubleshootIssue(troubleshootIssue === opt.id ? null : opt.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer"
                        style={{
                          background: troubleshootIssue === opt.id ? "rgba(125,211,252,.1)" : "rgba(255,255,255,.01)",
                          borderColor: troubleshootIssue === opt.id ? "rgba(125,211,252,.25)" : "rgba(255,255,255,.04)",
                          color: troubleshootIssue === opt.id ? "#7dd3fc" : "rgba(255,255,255,.55)"
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {troubleshootIssue && (
                    <div className="rounded-lg p-3.5 space-y-3 text-[10.5px] leading-relaxed transition-all bg-white/[0.01] border border-white/[0.05]">
                      {troubleshootIssue === "spam-folder" && (
                        <div className="space-y-2">
                          <p className="font-bold text-sky-400">Step-by-step fix for spam folders:</p>
                          <ol className="list-decimal list-inside space-y-1.5 text-white/50">
                            <li>Check credentials on the connection page.</li>
                            <li>Send a test email to <a href="https://www.mail-tester.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-0.5">Mail-Tester <ExternalLink className="size-2.5" /></a> and confirm score is 9+/10.</li>
                            <li>Prune words like &quot;Free&quot;, &quot;Buy Now&quot;, &quot;Guaranteed&quot; from subject lines.</li>
                            <li>Remove images and keep links below 1 in the initial cold email.</li>
                          </ol>
                        </div>
                      )}
                      {troubleshootIssue === "bounce" && (
                        <div className="space-y-2">
                          <p className="font-bold text-sky-400">Step-by-step fix for bounce backs:</p>
                          <ol className="list-decimal list-inside space-y-1.5 text-white/50">
                            <li>Go to SMTP settings, re-test connection (App Password might have expired).</li>
                            <li>Validate target emails before importing. Bounces must stay below 2% to protect status.</li>
                            <li>Limit sending to under 40 cold emails per mailbox per day.</li>
                          </ol>
                        </div>
                      )}
                      {troubleshootIssue === "low-opens" && (
                        <div className="space-y-2">
                          <p className="font-bold text-sky-400">Step-by-step fix for low open rates:</p>
                          <ol className="list-decimal list-inside space-y-1.5 text-white/50">
                            <li>Rework subject lines: use short, casual, lower-case subject lines (e.g. &quot;quick question&quot;).</li>
                            <li>Verify SPF, DKIM, DMARC alignments on registrar settings.</li>
                            <li>Ensure domain warmup duration was completed.</li>
                          </ol>
                        </div>
                      )}
                      {troubleshootIssue === "warmup-info" && (
                        <div className="space-y-2 text-white/50">
                          <p className="font-bold text-sky-400 mb-1">Domain Warming progression timeline:</p>
                          <p>Gradually scaling sending volume avoids spam trigger flags:</p>
                          <table className="w-full text-left mt-2 border-collapse text-[10px] font-mono">
                            <thead>
                              <tr className="border-b border-white/10 text-white/35 font-bold">
                                <th className="py-1">Week</th>
                                <th className="py-1">Limit / Day</th>
                                <th className="py-1">Guideline</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-white/5">
                                <td className="py-1">Week 1</td>
                                <td>5 emails</td>
                                <td>Plain text, verify inbound.</td>
                              </tr>
                              <tr className="border-b border-white/5">
                                <td className="py-1">Week 2</td>
                                <td>10 emails</td>
                                <td>Steady daily outputs.</td>
                              </tr>
                              <tr className="border-b border-white/5">
                                <td className="py-1">Week 3</td>
                                <td>20 emails</td>
                                <td>Enable replies/sequences.</td>
                              </tr>
                              <tr>
                                <td className="py-1 font-bold text-emerald-400">Week 4+</td>
                                <td className="font-bold text-emerald-400">30-40 emails</td>
                                <td>Outbound maximum threshold.</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ── Save Settings Button ── */}
      <button onClick={handleSave} disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-50 cursor-pointer"
        style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}>
        {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save Settings</>}
      </button>
    </div>
  )
}
