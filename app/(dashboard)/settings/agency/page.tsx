"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Loader2, Upload, Save, Mail, CheckCircle2, XCircle,
  ExternalLink, AlertCircle, ChevronDown, ChevronUp,
  ShieldCheck, Copy, Check, Info, User, Eye, EyeOff,
  Send, Sparkles as SparklesIcon, Target, Award, Globe,
  Calendar, DollarSign, ArrowUpRight
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { CustomSelect } from "@/components/ui/custom-select"
import { toast } from "sonner"
import { initials } from "@/lib/utils"
import { CURRENCY_OPTIONS } from "@/lib/currency"

type FlagshipOffer = {
  name: string
  transformation: string
  deliverable: string
}

type UserProfile = {
  agencyName: string | null
  fromEmail: string | null
  smtpPass: string | null
  smtpHost: string | null
  smtpPort: number | null
  companyDesc: string | null
  title: string | null
  tone: string | null
  agencyLogo: string | null
  calendarLink: string | null
  currency?: string | null
  playbookType?: string | null
  flagshipOffer?: FlagshipOffer | null
}

const TONES = ["Professional", "Friendly", "Direct", "Consultative"]

const PLAYBOOK_OPTIONS = [
  { value: "general_b2b", label: "General B2B Outbound" },
  { value: "local_seo", label: "Local SEO & Map Pack" },
  { value: "medical_clinics", label: "Clinics & Medical Centers" },
  { value: "b2b_saas", label: "B2B SaaS & Tech" },
  { value: "consulting", label: "High-Ticket Consulting & Advisory" },
  { value: "lead_generation", label: "Growth & Lead Gen Agency" },
  { value: "recruiting", label: "Recruiting & Staffing" },
]

const card = {
  background: "linear-gradient(135deg, rgba(22, 24, 35, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)",
  border: "1px solid rgba(255,255,255,.07)",
  boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,.04)",
  backdropFilter: "blur(24px)",
}

const inputClass = "w-full rounded-xl px-4 py-2.5 text-[13px] text-white/85 outline-none placeholder:text-white/20 border border-white/[0.08] bg-black/25 focus:border-indigo-500/50 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.15)] transition-all"

export default function AgencySettingsPage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile>({
    agencyName: "",
    fromEmail: "",
    smtpPass: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    companyDesc: "",
    title: "",
    tone: "Professional",
    agencyLogo: null,
    calendarLink: "",
    currency: "USD",
    playbookType: "general_b2b",
    flagshipOffer: { name: "", transformation: "", deliverable: "" },
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState<"idle" | "ok" | "error">("idle")
  const [smtpError, setSmtpError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  
  // AI Refine states
  const [refiningTitle, setRefiningTitle] = useState(false)
  const [refiningDesc, setRefiningDesc] = useState(false)
  const [refiningOffer, setRefiningOffer] = useState(false)
  const [showDescPreview, setShowDescPreview] = useState(false)

  // Navigation & DNS state
  const [activeTab, setActiveTab] = useState<"profile" | "offer" | "smtp" | "dns">("profile")
  const [expandedDns, setExpandedDns] = useState<string | null>(null)
  const [troubleshootIssue, setTroubleshootIssue] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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
      .then(data => {
        setProfile({
          ...data,
          flagshipOffer: data.flagshipOffer || { name: "", transformation: "", deliverable: "" },
          smtpHost: data.smtpHost || "smtp.gmail.com",
          smtpPort: data.smtpPort || 465,
        })
        if (data.fromEmail && data.smtpPass) {
          setSmtpStatus("ok")
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  // Derive Health Indicators
  const isSmtpConfigured = !!(profile.fromEmail && profile.smtpPass)
  const isIdentityComplete = !!(profile.agencyName && profile.companyDesc && profile.title)
  const isOfferConfigured = !!(profile.flagshipOffer?.name && profile.flagshipOffer?.transformation)
  const isCalendarConfigured = !!profile.calendarLink

  function set<K extends keyof UserProfile>(key: K, val: UserProfile[K]) {
    if (key === "smtpPass" || key === "fromEmail") {
      setSmtpStatus("idle")
    }
    setProfile(p => ({ ...p, [key]: val }))
    setHasUnsavedChanges(true)
  }

  function setOffer(key: keyof FlagshipOffer, val: string) {
    setProfile(p => ({
      ...p,
      flagshipOffer: {
        ...(p.flagshipOffer || { name: "", transformation: "", deliverable: "" }),
        [key]: val,
      },
    }))
    setHasUnsavedChanges(true)
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
        toast.error("Please enter a valid calendar link (e.g. https://calendly.com/your-name).")
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
      setHasUnsavedChanges(false)
      toast.success("Agency settings saved successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

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
      set("agencyLogo", url)
      toast.success("Brand logo updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLogoUploading(false)
    }
  }

  async function testConnection() {
    setTestingSmtp(true)
    setSmtpStatus("idle")
    setSmtpError("")

    // Save credentials first before testing
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, smtpHost: "smtp.gmail.com", smtpPort: 465 }),
    }).catch(() => {})

    try {
      const res = await fetch("/api/settings/smtp-test", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSmtpStatus("ok")
      toast.success("Gmail SMTP connection verified successfully!")
    } catch (err) {
      setSmtpStatus("error")
      const msg = err instanceof Error ? err.message : "Connection failed"
      setSmtpError(msg)
      toast.error(`SMTP Test Failed: ${msg}`)
    } finally {
      setTestingSmtp(false)
    }
  }

  async function sendTestEmailToSelf() {
    setSendingTestEmail(true)
    try {
      const res = await fetch("/api/settings/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: profile.fromEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Test email delivered to ${profile.fromEmail}! Check your inbox.`)
    } catch (err: any) {
      toast.error(`Failed to send test email: ${err?.message || "Check your credentials"}`)
    } finally {
      setSendingTestEmail(false)
    }
  }

  async function refineTitle() {
    if (!profile.title?.trim()) {
      toast.error("Add a rough title first — e.g. 'founder' or 'marketing director'")
      return
    }
    setRefiningTitle(true)
    try {
      const res = await fetch("/api/settings/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "title",
          agencyName: profile.agencyName,
          rawTitle: profile.title,
          rawDescription: profile.companyDesc,
        }),
      })
      if (!res.ok) throw new Error()
      const { refined } = await res.json()
      set("title", refined)
      toast.success("Job title polished by AI")
    } catch {
      toast.error("Title refinement failed")
    } finally {
      setRefiningTitle(false)
    }
  }

  async function refineDescription() {
    if (!profile.companyDesc?.trim()) {
      toast.error("Add rough notes first — even a sentence is enough")
      return
    }
    setRefiningDesc(true)
    try {
      const res = await fetch("/api/settings/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName: profile.agencyName,
          title: profile.title,
          rawDescription: profile.companyDesc,
        }),
      })
      if (!res.ok) throw new Error()
      const { refined } = await res.json()
      set("companyDesc", refined)
      setShowDescPreview(true)
      toast.success("Company description refined by AI")
    } catch {
      toast.error("Description refinement failed")
    } finally {
      setRefiningDesc(false)
    }
  }

  async function generateFlagshipOffer() {
    if (!profile.companyDesc?.trim() && !profile.agencyName?.trim()) {
      toast.error("Please add your Agency Name & Description first.")
      return
    }
    setRefiningOffer(true)
    try {
      const res = await fetch("/api/settings/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "offer",
          agencyName: profile.agencyName,
          rawDescription: profile.companyDesc,
        }),
      })
      if (!res.ok) throw new Error()
      const { offer } = await res.json()
      if (offer && offer.name) {
        setProfile(p => ({
          ...p,
          flagshipOffer: {
            name: offer.name || "",
            transformation: offer.transformation || "",
            deliverable: offer.deliverable || "",
          },
        }))
        setHasUnsavedChanges(true)
        toast.success("AI Flagship Offer generated!")
      }
    } catch {
      toast.error("Offer generation failed")
    } finally {
      setRefiningOffer(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <Loader2 className="size-8 animate-spin text-indigo-400" />
      <p className="text-xs font-semibold text-white/40">Loading agency profile & engine credentials…</p>
    </div>
  )

  if (session?.user?.teamOwnerId) return (
    <div className="mx-auto max-w-lg py-20 text-center space-y-2">
      <p className="text-sm font-semibold text-white/60">Only the team owner can manage agency settings</p>
      <p className="text-xs text-white/30">Ask the team owner to update branding, SMTP, or calendar link.</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-16 animate-fadeIn">

      {/* ── Top Hero Header ── */}
      <div
        className="relative overflow-hidden rounded-3xl p-7 flex flex-col md:flex-row md:items-end justify-between gap-6"
        style={{
          background: "linear-gradient(135deg, rgba(30, 32, 48, 0.7) 0%, rgba(15, 16, 24, 0.5) 100%)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.05), 0 20px 40px rgba(0,0,0,0.35)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="absolute -left-16 -top-16 size-48 rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="absolute -right-16 -bottom-16 size-48 rounded-full bg-emerald-500/10 blur-[80px]" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] bg-white/[0.04] border border-white/[0.06] text-white/50">
            <span className="size-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]" />
            Agency Command Center
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white/95">
            Agency Settings
          </h1>
          <p className="text-xs text-white/40 max-w-lg leading-relaxed">
            Manage your agency brand, flagship offer, Google Workspace SMTP credentials, and inbox deliverability.
          </p>
        </div>

        {/* Action button */}
        <div className="relative z-10 flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 animate-pulse">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-black transition-all hover:scale-[1.02] active:scale-[.98] disabled:opacity-50 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{saving ? "Saving Changes…" : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* ── Health & Setup Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Identity */}
        <div
          onClick={() => setActiveTab("profile")}
          className={`group rounded-2xl p-4 transition-all cursor-pointer border ${
            isIdentityComplete
              ? "bg-emerald-500/[0.04] border-emerald-500/20 hover:border-emerald-500/40"
              : "bg-amber-500/[0.04] border-amber-500/20 hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">1. Identity</span>
            {isIdentityComplete ? (
              <CheckCircle2 className="size-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="size-3.5 text-amber-400" />
            )}
          </div>
          <p className="text-sm font-black text-white/90 truncate">{profile.agencyName || "Not configured"}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{isIdentityComplete ? "Branding & Bio Ready" : "Add name & description"}</p>
        </div>

        {/* 2. Flagship Offer */}
        <div
          onClick={() => setActiveTab("offer")}
          className={`group rounded-2xl p-4 transition-all cursor-pointer border ${
            isOfferConfigured
              ? "bg-indigo-500/[0.04] border-indigo-500/20 hover:border-indigo-500/40"
              : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">2. Flagship Offer</span>
            {isOfferConfigured ? (
              <CheckCircle2 className="size-3.5 text-indigo-400" />
            ) : (
              <Target className="size-3.5 text-white/30" />
            )}
          </div>
          <p className="text-sm font-black text-white/90 truncate">{profile.flagshipOffer?.name || "Unset Offer"}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{isOfferConfigured ? "AI Hunter Armed" : "Generate core offer"}</p>
        </div>

        {/* 3. SMTP Outbox */}
        <div
          onClick={() => setActiveTab("smtp")}
          className={`group rounded-2xl p-4 transition-all cursor-pointer border ${
            isSmtpConfigured
              ? "bg-emerald-500/[0.04] border-emerald-500/20 hover:border-emerald-500/40"
              : "bg-rose-500/[0.04] border-rose-500/20 hover:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">3. Outbox (SMTP)</span>
            {isSmtpConfigured ? (
              <CheckCircle2 className="size-3.5 text-emerald-400" />
            ) : (
              <XCircle className="size-3.5 text-rose-400" />
            )}
          </div>
          <p className="text-sm font-black text-white/90 truncate">{profile.fromEmail || "Not Connected"}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{isSmtpConfigured ? "Authenticated & Ready" : "Add App Password"}</p>
        </div>

        {/* 4. Calendar Link */}
        <div
          onClick={() => setActiveTab("profile")}
          className={`group rounded-2xl p-4 transition-all cursor-pointer border ${
            isCalendarConfigured
              ? "bg-sky-500/[0.04] border-sky-500/20 hover:border-sky-500/40"
              : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">4. Booking Link</span>
            {isCalendarConfigured ? (
              <CheckCircle2 className="size-3.5 text-sky-400" />
            ) : (
              <Calendar className="size-3.5 text-white/30" />
            )}
          </div>
          <p className="text-sm font-black text-white/90 truncate">{profile.calendarLink ? "Calendly / Cal.com" : "Unlinked"}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{isCalendarConfigured ? "Meeting tracker live" : "Add calendar URL"}</p>
        </div>
      </div>

      {/* ── Main Split-Pane Workspace ── */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* Left Navigation Sidebar */}
        <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/[0.06] shadow-xl backdrop-blur-xl overflow-x-auto md:overflow-x-visible">
          {[
            {
              id: "profile" as const,
              label: "Agency Brand & Bio",
              desc: "Logo, name, tone & currency",
              icon: User,
              badge: isIdentityComplete ? "Ready" : "Incomplete",
              badgeColor: isIdentityComplete ? "text-emerald-400 bg-emerald-500/10" : "text-amber-300 bg-amber-500/10",
            },
            {
              id: "offer" as const,
              label: "Flagship Offer & ICP",
              desc: "AI outbound value proposition",
              icon: Target,
              badge: isOfferConfigured ? "Active" : "Recommended",
              badgeColor: isOfferConfigured ? "text-indigo-400 bg-indigo-500/10" : "text-white/40 bg-white/5",
            },
            {
              id: "smtp" as const,
              label: "Outbox & Gmail SMTP",
              desc: "Credentials & test dispatch",
              icon: Mail,
              badge: isSmtpConfigured ? "Connected" : "Required",
              badgeColor: isSmtpConfigured ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10",
            },
            {
              id: "dns" as const,
              label: "DNS & Spam Shield",
              desc: "SPF, DKIM & deliverability",
              icon: ShieldCheck,
              badge: "Guide",
              badgeColor: "text-sky-400 bg-sky-500/10",
            },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-initial flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-white/[0.08] text-white border border-white/[0.12] shadow-lg border-l-2 md:border-l-indigo-400 pl-3 md:pl-3.5"
                    : "text-white/45 hover:text-white/80 hover:bg-white/[0.02] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`size-4 shrink-0 ${isActive ? "text-indigo-400" : "text-white/30"}`} />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold leading-none">{tab.label}</p>
                    <p className="text-[10px] text-white/30 mt-1 hidden md:block">{tab.desc}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md hidden md:inline-block ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right Details Workspace */}
        <div className="flex-1 w-full relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-7 transition-all duration-300" style={card}>
          <div className="absolute -right-24 -bottom-24 size-48 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
          <div className="absolute -left-24 -top-24 size-48 rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

          {/* ════════════════════════════════════════════════════════════════════
              TAB 1: Agency Brand & Profile
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <User className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90">Agency Identity & Branding</h3>
                    <p className="text-[11px] text-white/40">These details coordinate outbound signatures, tone, and public portals</p>
                  </div>
                </div>
              </div>

              {/* Logo Uploader */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-black/30 border border-white/[0.05]">
                <Avatar
                  className="size-20 rounded-2xl shrink-0"
                  style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.08), 0 8px 24px rgba(0,0,0,.4)" }}
                >
                  <AvatarImage src={profile.agencyLogo ?? undefined} className="object-cover rounded-2xl" />
                  <AvatarFallback className="rounded-2xl text-xl font-black text-white/60 bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                    {initials(profile.agencyName ?? session?.user?.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div>
                    <p className="text-xs font-bold text-white/90">Agency Brand Logo</p>
                    <p className="text-[11px] text-white/35 mt-0.5">Appears in proposal portals, reports, and optional email headers.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] transition-all select-none">
                    {logoUploading ? <Loader2 className="size-3.5 animate-spin text-indigo-400" /> : <Upload className="size-3.5" />}
                    <span>{logoUploading ? "Uploading Logo…" : "Upload Brand Logo"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                </div>
              </div>

              {/* Names grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                    Agency / Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Growth Studio"
                    value={profile.agencyName ?? ""}
                    onChange={e => set("agencyName", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                      Your Position / Title
                    </label>
                    <button
                      type="button"
                      onClick={refineTitle}
                      disabled={refiningTitle}
                      className="flex items-center gap-1 text-[10px] font-bold transition-all hover:brightness-125 disabled:opacity-40 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 cursor-pointer"
                    >
                      {refiningTitle ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                      <span>AI Refine</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Founder & Managing Director"
                    value={profile.title ?? ""}
                    onChange={e => set("title", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Calendar Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                    Calendar Booking Link
                  </label>
                  {profile.calendarLink && (
                    <a
                      href={profile.calendarLink.startsWith("http") ? profile.calendarLink : `https://${profile.calendarLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <span>Test Booking Link</span>
                      <ArrowUpRight className="size-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://calendly.com/your-name/30min"
                    value={profile.calendarLink ?? ""}
                    onChange={e => set("calendarLink", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <p className="text-[10px] text-white/30">
                  Meetings booked through this link are automatically tracked in campaign analytics.
                </p>
              </div>

              {/* Business Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                      What Your Business Does (Core Description)
                    </label>
                    <p className="text-[10px] text-white/30 mt-0.5">Used by AI to write personalized, consultative outbound hooks.</p>
                  </div>
                  <button
                    type="button"
                    onClick={refineDescription}
                    disabled={refiningDesc}
                    className="flex items-center gap-1.5 text-[10.5px] font-bold transition-all hover:brightness-125 disabled:opacity-40 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-3 py-1 cursor-pointer"
                  >
                    {refiningDesc ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    <span>AI Polish</span>
                  </button>
                </div>

                <textarea
                  placeholder="e.g. We help aesthetic and cosmetic clinics acquire 20+ high-ticket private patients per month through targeted Google Map pack optimization and localized cold email outreach."
                  value={profile.companyDesc ?? ""}
                  onChange={e => {
                    set("companyDesc", e.target.value)
                    setShowDescPreview(false)
                  }}
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 text-[13px] text-white/85 outline-none placeholder:text-white/20 resize-none leading-relaxed border border-white/[0.08] bg-black/25 focus:border-indigo-500/50 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.15)] transition-all"
                />

                {showDescPreview && profile.companyDesc && (
                  <div
                    className="rounded-2xl p-4 space-y-1.5 animate-fadeIn"
                    style={{ background: "rgba(52, 211, 153, 0.05)", border: "1px solid rgba(52, 211, 153, 0.15)" }}
                  >
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                      ✨ Cold Email Context Preview
                    </p>
                    <p className="text-[12px] text-white/70 leading-relaxed italic">
                      &quot;…I work with {profile.agencyName || "our team"} — {profile.companyDesc}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Tone & Currency */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                    Outbound Email Tone
                  </label>
                  <CustomSelect
                    value={profile.tone ?? "Professional"}
                    onChange={v => set("tone", v)}
                    options={TONES.map(t => ({ value: t, label: t }))}
                  />
                  <p className="text-[10px] text-white/30">Determines phrasing style in initial outreach and follow-ups.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                    Operating Currency
                  </label>
                  <CustomSelect
                    value={profile.currency ?? "USD"}
                    onChange={v => set("currency", v)}
                    options={CURRENCY_OPTIONS.map(c => ({ value: c.code, label: c.label }))}
                  />
                  <p className="text-[10px] text-white/30">Used for pipeline deal values, ROI estimations & proposals.</p>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 2: Flagship Offer & AI Engine
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === "offer" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Target className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90">Flagship Offer & Autonomous ICP</h3>
                    <p className="text-[11px] text-white/40">
                      The Autonomous AI Engine uses this offer to identify qualified targets and craft high-converting pitch angles
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={generateFlagshipOffer}
                  disabled={refiningOffer}
                  className="flex items-center gap-1.5 text-xs font-bold transition-all hover:brightness-125 disabled:opacity-40 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 px-3.5 py-1.5 cursor-pointer shadow-lg"
                >
                  {refiningOffer ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  <span>{refiningOffer ? "Architecting Offer…" : "✨ AI Generate Offer"}</span>
                </button>
              </div>

              {/* Offer Blueprint Box */}
              <div className="space-y-4 rounded-2xl p-5 bg-black/30 border border-white/[0.06]">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                    Flagship Offer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cosmetic Clinic Patient Acquisition Engine"
                    value={profile.flagshipOffer?.name ?? ""}
                    onChange={e => setOffer("name", e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-white/30">The primary solution or flagship program your agency pitches.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                    Core Transformation / Quantified Outcome
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Add $40k–$80k in monthly recurring private patient revenue without ad spend"
                    value={profile.flagshipOffer?.transformation ?? ""}
                    onChange={e => setOffer("transformation", e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-white/30">The metric-driven result your prospect cares about most.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                    Key Mechanism & Deliverable
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Done-for-you localized outbound campaigns + automated booking qualification"
                    value={profile.flagshipOffer?.deliverable ?? ""}
                    onChange={e => setOffer("deliverable", e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-white/30">How you fulfill and deliver the transformation.</p>
                </div>
              </div>

              {/* Primary Playbook Specialization */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wide">
                  Primary Niche Playbook
                </label>
                <CustomSelect
                  value={profile.playbookType ?? "general_b2b"}
                  onChange={v => set("playbookType", v)}
                  options={PLAYBOOK_OPTIONS}
                />
                <p className="text-[10px] text-white/30">
                  Selects the default objection-handling templates and sequence templates for new campaigns.
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 3: Outbox & Gmail SMTP
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === "smtp" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90">Gmail & Workspace Outbox Setup</h3>
                    <p className="text-[11px] text-white/40">
                      Connect your Google Workspace mailbox to send automated sequences with anti-spam pacing
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                {isSmtpConfigured && (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Sender</span>
                  </div>
                )}
              </div>

              {/* 3-Step Setup Card */}
              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex gap-4 p-4 rounded-2xl bg-black/30 border border-white/[0.05]">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    1
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-white/90">Enable 2-Step Verification on Google</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Google requires 2-Step Verification before allowing App Passwords.
                    </p>
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 mt-1"
                    >
                      <span>Open Google Security Settings</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 p-4 rounded-2xl bg-black/30 border border-white/[0.05]">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    2
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-white/90">Generate a 16-Character App Password</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Create an App Password specifically for &quot;Mail&quot; on your Mac/Windows device.
                    </p>
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 mt-1"
                    >
                      <span>Generate Google App Password</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                {/* Step 3: Enter credentials */}
                <div className="flex gap-4 p-4 rounded-2xl bg-black/30 border border-white/[0.05]">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    3
                  </div>
                  <div className="flex-1 space-y-3.5">
                    <p className="text-xs font-bold text-white/90">Enter Your Outbox Credentials</p>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-white/40 uppercase tracking-wide">
                        Sending Gmail / Google Workspace Address
                      </label>
                      <input
                        type="email"
                        placeholder="you@yourdomain.com"
                        value={profile.fromEmail ?? ""}
                        onChange={e => set("fromEmail", e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-white/40 uppercase tracking-wide">
                        16-Character App Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="xxxx xxxx xxxx xxxx"
                          value={profile.smtpPass ?? ""}
                          onChange={e => set("smtpPass", e.target.value)}
                          className={`${inputClass} font-mono tracking-widest pr-10`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={testConnection}
                        disabled={testingSmtp || !profile.fromEmail || !profile.smtpPass}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 transition-all disabled:opacity-40 cursor-pointer shadow-md"
                      >
                        {testingSmtp ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                        <span>{testingSmtp ? "Testing Connection…" : "🧪 Test SMTP Connection"}</span>
                      </button>

                      {isSmtpConfigured && (
                        <button
                          type="button"
                          onClick={sendTestEmailToSelf}
                          disabled={sendingTestEmail}
                          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all disabled:opacity-40 cursor-pointer"
                        >
                          {sendingTestEmail ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                          <span>{sendingTestEmail ? "Sending Test…" : "📤 Send Test Email to Me"}</span>
                        </button>
                      )}
                    </div>

                    {/* Status Feedback */}
                    {smtpStatus === "ok" && (
                      <div className="flex items-center gap-2 rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                        <span>Authentication Successful: Outbox is active on smtp.gmail.com:465 with 100/day safe pacing limit.</span>
                      </div>
                    )}

                    {smtpStatus === "error" && (
                      <div className="flex items-center gap-2 rounded-xl p-3 bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-300">
                        <XCircle className="size-4 text-rose-400 shrink-0" />
                        <span>Authentication Failed: {smtpError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Explainer Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowHelp(h => !h)}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                >
                  {showHelp ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  <span>Why do I need a Google App Password instead of my normal password?</span>
                </button>
                {showHelp && (
                  <div className="mt-2.5 rounded-2xl p-4 text-xs text-white/50 leading-relaxed bg-black/30 border border-white/[0.05]">
                    Google disables basic password logins on SMTP for security. An App Password is a dedicated 16-character authorization token that allows your Galien Outbound Engine to dispatch sequences directly through Google&apos;s verified servers without storing your primary account password.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 4: DNS & Deliverability Shield
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === "dns" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90">DNS Deliverability & Spam Shield</h3>
                    <p className="text-[11px] text-white/40">
                      Configure your domain records to guarantee inbox placement and protect sender reputation
                    </p>
                  </div>
                </div>
              </div>

              {/* DNS Records Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    id: "spf",
                    title: "SPF Record",
                    badge: "TXT",
                    desc: "Authorizes Google Workspace servers to send on behalf of your domain.",
                    value: "v=spf1 include:_spf.google.com ~all",
                    host: "@",
                    guide: "Add a TXT record with Host '@' and the value above in your registrar DNS (GoDaddy, Namecheap, Cloudflare). If you already have an SPF record, merge them by inserting 'include:_spf.google.com' before '~all'.",
                  },
                  {
                    id: "dkim",
                    title: "DKIM Signature",
                    badge: "TXT",
                    desc: "Cryptographically signs outbound emails to prove they weren't tampered with.",
                    value: "google._domainkey",
                    host: "google._domainkey",
                    guide: "In Google Admin Console, go to Apps > Google Workspace > Gmail > Authenticate email. Generate a 2048-bit key, then add the TXT record to your domain registrar.",
                  },
                  {
                    id: "dmarc",
                    title: "DMARC Policy",
                    badge: "TXT",
                    desc: "Instructs receiving mailboxes how to handle unauthenticated messages.",
                    value: "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@yourdomain.com",
                    host: "_dmarc",
                    guide: "Create a TXT record with Host '_dmarc'. Replace 'yourdomain.com' with your actual domain to receive deliverability reports.",
                  },
                  {
                    id: "secondary",
                    title: "Secondary Outbound Domain",
                    badge: "Best Practice",
                    desc: "Isolates cold outreach volume from your primary business domain.",
                    value: "Recommended",
                    host: "Outbound Strategy",
                    guide: "Never send large-volume outbound from your primary corporate email domain. Use a lookalike domain (e.g. getagency.com) pointing to Google Workspace to keep your primary domain spotless.",
                  },
                ].map(item => {
                  const isExpanded = expandedDns === item.id
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl p-4 space-y-2.5 transition-all bg-black/30 border border-white/[0.05]"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white/90">{item.title}</p>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/50 uppercase">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-snug">{item.desc}</p>

                      <button
                        type="button"
                        onClick={() => setExpandedDns(isExpanded ? null : item.id)}
                        className="text-[10px] font-bold text-indigo-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer pt-1"
                      >
                        {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        <span>{isExpanded ? "Hide Instructions" : "Show Setup Instructions"}</span>
                      </button>

                      {isExpanded && (
                        <div className="pt-2 border-t border-white/[0.06] space-y-2.5 text-xs animate-fadeIn">
                          {item.id !== "secondary" && (
                            <div className="space-y-2 rounded-xl p-3 bg-black/50 border border-white/[0.06]">
                              <div className="flex justify-between items-center text-[10px] text-white/40 font-semibold">
                                <span>Host</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item.host, `${item.id}-host`)}
                                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedText === `${item.id}-host` ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                  <span>Copy</span>
                                </button>
                              </div>
                              <code className="block text-white/80 font-mono text-[11px] break-all">{item.host}</code>

                              <div className="flex justify-between items-center text-[10px] text-white/40 font-semibold pt-1">
                                <span>TXT Value</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item.value, `${item.id}-val`)}
                                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedText === `${item.id}-val` ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                  <span>Copy</span>
                                </button>
                              </div>
                              <code className="block text-white/80 font-mono text-[11px] break-all">{item.value}</code>
                            </div>
                          )}

                          <p className="text-[11px] text-white/50 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                            {item.guide}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Spam Prevention Diagnostic Tool */}
              <div className="rounded-2xl p-5 space-y-3.5 bg-black/30 border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-sky-400" />
                  <p className="text-xs font-bold text-white/90">Spam Prevention & Troubleshooter</p>
                </div>
                <p className="text-[11px] text-white/40">Select an issue below to run an instant deliverability diagnostic:</p>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "spam-folder", label: "Emails landing in Spam" },
                    { id: "bounce", label: "Emails bouncing / rejected" },
                    { id: "low-opens", label: "Low open rate (< 25%)" },
                    { id: "warmup-info", label: "Domain Warmup Schedule" },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTroubleshootIssue(troubleshootIssue === opt.id ? null : opt.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        troubleshootIssue === opt.id
                          ? "bg-sky-500/15 border-sky-500/30 text-sky-200"
                          : "bg-white/[0.03] border-white/[0.07] text-white/55 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {troubleshootIssue && (
                  <div className="rounded-xl p-4 space-y-2.5 text-xs text-white/60 leading-relaxed bg-white/[0.02] border border-white/[0.06] animate-fadeIn">
                    {troubleshootIssue === "spam-folder" && (
                      <div className="space-y-2">
                        <p className="font-bold text-sky-300">How to fix Spam Placement:</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/50 text-[11.5px]">
                          <li>Verify SPF and DKIM records in DNS.</li>
                          <li>Remove spam trigger keywords (&quot;Guarantee&quot;, &quot;100% Free&quot;, &quot;Buy Now&quot;).</li>
                          <li>Limit links to at most 1 calendar link (avoid heavy HTML graphics).</li>
                        </ol>
                      </div>
                    )}
                    {troubleshootIssue === "bounce" && (
                      <div className="space-y-2">
                        <p className="font-bold text-sky-300">How to fix Bounces:</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/50 text-[11.5px]">
                          <li>Re-test SMTP connection in the Outbox tab (Google App Passwords can expire).</li>
                          <li>Ensure bounce rate stays strictly under 3% to protect domain health.</li>
                        </ol>
                      </div>
                    )}
                    {troubleshootIssue === "low-opens" && (
                      <div className="space-y-2">
                        <p className="font-bold text-sky-300">How to boost Open Rates:</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/50 text-[11.5px]">
                          <li>Use short, casual subject lines (e.g. &quot;quick question&quot; or &quot;[Company] growth bottleneck&quot;).</li>
                          <li>Send emails during standard business hours (8am–11am local prospect time).</li>
                        </ol>
                      </div>
                    )}
                    {troubleshootIssue === "warmup-info" && (
                      <div className="space-y-2">
                        <p className="font-bold text-sky-300">Recommended 4-Week Volume Ramp:</p>
                        <table className="w-full text-left text-[11px] font-mono mt-2 border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-white/40">
                              <th className="py-1">Week</th>
                              <th className="py-1">Daily Cap</th>
                              <th className="py-1">Pacing</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            <tr><td className="py-1">Week 1</td><td>5–10 emails</td><td>Test plain text</td></tr>
                            <tr><td className="py-1">Week 2</td><td>15–20 emails</td><td>Consistent daily flow</td></tr>
                            <tr><td className="py-1">Week 3</td><td>25–35 emails</td><td>Active follow-ups</td></tr>
                            <tr><td className="py-1 font-bold text-emerald-400">Week 4+</td><td className="font-bold text-emerald-400">40–60 emails</td><td>Autonomous Outbound</td></tr>
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

      {/* ── Bottom Save Action Bar ── */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/[0.06] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400 animate-ping" />
              You have unsaved changes
            </span>
          ) : (
            <span className="text-xs font-semibold text-white/35 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              All settings up to date
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-black transition-all hover:scale-[1.02] active:scale-[.98] disabled:opacity-50 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span>{saving ? "Saving Changes…" : "Save Settings"}</span>
        </button>
      </div>

    </div>
  )
}
