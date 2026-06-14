/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import {
  ArrowRight, Check, Loader2, Upload, Sparkles, Send,
  Pencil, SkipForward, Bot,
} from "lucide-react"
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
const PLAYBOOK_OPTIONS = [
  { type: "social_media", name: "Social Media Agency" },
  { type: "seo", name: "SEO Agency" },
  { type: "ppc", name: "PPC & Paid Ads Agency" },
  { type: "sales", name: "Sales & B2B Lead Gen" },
  { type: "finance", name: "Fractional CFO & Finance" },
  { type: "web_design", name: "Web Design & Development" },
]

type StepKey = "agencyName" | "title" | "playbook" | "companyDesc" | "tone" | "calendarLink" | "logo" | "review"
const STEP_ORDER: StepKey[] = ["agencyName", "title", "playbook", "companyDesc", "tone", "calendarLink", "logo", "review"]

const fieldStyle = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.1)",
}

function AiAvatar({ active = false }: { active?: boolean }) {
  return (
    <div className="relative shrink-0">
      {active && (
        <div
          className="absolute inset-0 rounded-xl"
          style={{ animation: "bot-pulse-ring 1.6s ease-out infinite", background: "rgba(124,131,253,.5)" }}
        />
      )}
      <div
        className="relative flex size-8 items-center justify-center rounded-xl"
        style={{
          background: "linear-gradient(135deg,#7c83fd,#5a61d6)",
          boxShadow: "0 4px 16px rgba(124,131,253,.35)",
          animation: `bot-float ${active ? "1.4s" : "3.4s"} ease-in-out infinite`,
        }}
      >
        <Bot className="size-4 text-white" />
      </div>
    </div>
  )
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5" style={{ animation: "message-in .35s ease-out both" }}>
      <AiAvatar />
      <div
        className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-[13px] leading-relaxed text-white/75"
        style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.07)" }}
      >
        {children}
      </div>
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end" style={{ animation: "message-in .35s ease-out both" }}>
      <div
        className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] leading-relaxed text-white/85"
        style={{ background: "rgba(124,131,253,.16)", border: "1px solid rgba(124,131,253,.28)" }}
      >
        {children}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5" style={{ animation: "message-in .35s ease-out both" }}>
      <AiAvatar active />
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3"
        style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.07)" }}
      >
        {[0, 0.15, 0.3].map(delay => (
          <span
            key={delay}
            className="size-2 rounded-full"
            style={{
              background: "linear-gradient(135deg,#9ca3ff,#7c83fd)",
              animation: `bot-dot 1.1s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const fromEmail = session?.user?.email ?? ""

  const [agencyName, setAgencyName]   = useState("")
  const [title, setTitle]             = useState("")
  const [playbookName, setPlaybookName] = useState("Sales & B2B Lead Gen")
  const [companyDesc, setCompanyDesc] = useState("")
  const [tone, setTone]               = useState("Professional")
  const [calendarLink, setCalendarLink] = useState("")
  const [logoUrl, setLogoUrl]         = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const [step, setStep]       = useState(0)
  const [returnTo, setReturnTo] = useState<number | null>(null)
  const [typing, setTyping]   = useState(true)
  const [draft, setDraft]     = useState("")
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [countdown, setCountdown] = useState(3)

  // Company description: write it yourself, or generate from a website URL
  const [descMode, setDescMode]   = useState<"write" | "url">("write")
  const [descUrl, setDescUrl]     = useState("")
  const [descGenerating, setDescGenerating] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  // Typing indicator whenever we move to a new step
  useEffect(() => {
    setTyping(true)
    const t = setTimeout(() => setTyping(false), 550)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [step, typing, done])

  useEffect(() => {
    if (!done) return
    const interval = setInterval(() => setCountdown(c => c - 1), 1000)
    const timeout  = setTimeout(() => router.push("/dashboard"), 3000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [done, router])

  function goNext() {
    if (returnTo !== null) {
      setStep(returnTo)
      setReturnTo(null)
    } else {
      setStep(s => Math.min(s + 1, STEP_ORDER.length - 1))
    }
  }

  function editStep(idx: number) {
    setReturnTo(STEP_ORDER.length - 1) // back to review afterward
    if (STEP_ORDER[idx] === "agencyName") setDraft(agencyName)
    if (STEP_ORDER[idx] === "companyDesc") setDraft(companyDesc)
    if (STEP_ORDER[idx] === "calendarLink") setDraft(calendarLink)
    setStep(idx)
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
      setLogoUrl(url)
      toast.success("Logo uploaded")
    } catch {
      toast.error("Logo upload failed")
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const matched = PLAYBOOK_OPTIONS.find(p => p.name.toLowerCase() === playbookName.trim().toLowerCase())
      const playbookType = matched
        ? matched.type
        : playbookName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "sales"

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyName, title, fromEmail, companyDesc, tone, onboardingDone: true, calendarLink, playbookType }),
      })
      if (!res.ok) throw new Error(await res.text())
      setDone(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function submitAgencyName() {
    if (!draft.trim()) { toast.error("Tell me your agency name to continue"); return }
    setAgencyName(draft.trim())
    setDraft("")
    goNext()
  }

  function submitTitle() {
    goNext()
  }

  function submitPlaybook() {
    goNext()
  }

  function submitCompanyDesc() {
    if (!draft.trim()) { toast.error("A quick description helps the AI a lot"); return }
    setCompanyDesc(draft.trim())
    setDraft("")
    setDescMode("write")
    goNext()
  }

  async function generateDescFromUrl() {
    if (!descUrl.trim()) { toast.error("Paste your website URL first"); return }
    setDescGenerating(true)
    try {
      const res = await fetch("/api/settings/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "url", websiteUrl: descUrl.trim(), agencyName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't generate a description")
      setDraft(data.refined)
      setDescMode("write")
      toast.success("Drafted from your website — feel free to edit it")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate a description")
    } finally {
      setDescGenerating(false)
    }
  }

  function selectTone(t: string) {
    setTone(t)
    setTimeout(goNext, 250)
  }

  function submitCalendarLink(skip = false) {
    setCalendarLink(skip ? "" : draft.trim())
    setDraft("")
    goNext()
  }

  function continueFromLogo() {
    goNext()
  }

  // ── Transcript history (steps before the current one) ─────────────────────
  const history: { key: StepKey; ai: React.ReactNode; user: React.ReactNode }[] = []

  if (step > 0) {
    history.push({
      key: "agencyName",
      ai: <>Hey there <span className="text-base">👋</span> I&rsquo;m the Agnelix AI assistant. Let&rsquo;s get your agency set up — what should I call it?</>,
      user: <>{agencyName}</>,
    })
  }
  if (step > 1) {
    history.push({
      key: "title",
      ai: <>Nice to meet <span className="text-white/95 font-bold">{agencyName}</span>! What&rsquo;s your role there? It helps me sign emails the right way.</>,
      user: <>{title || "Decision Maker"}</>,
    })
  }
  if (step > 2) {
    history.push({
      key: "playbook",
      ai: <>What kind of agency do you run? This sets up your dashboard with the right playbook — you can change it anytime in settings.</>,
      user: <>{playbookName}</>,
    })
  }
  if (step > 3) {
    history.push({
      key: "companyDesc",
      ai: <>Perfect. In your own words — what does <span className="text-white/95 font-bold">{agencyName}</span> do for clients? Be specific, this is the core context every AI email is built from.</>,
      user: <>{companyDesc}</>,
    })
  }
  if (step > 4) {
    history.push({
      key: "tone",
      ai: <>Got it — that&rsquo;s gold. What tone should your outreach emails use?</>,
      user: <>{tone}</>,
    })
  }
  if (step > 5) {
    history.push({
      key: "calendarLink",
      ai: <>Almost there. Got a Calendly or Cal.com link? I&rsquo;ll drop a booking button straight into your emails.</>,
      user: <>{calendarLink ? calendarLink : "Skipped — no calendar link yet"}</>,
    })
  }
  if (step > 6) {
    history.push({
      key: "logo",
      ai: <>Last thing — want to add your logo? It&rsquo;ll show up on your dashboard and in your email signature.</>,
      user: logoUrl ? <span className="flex items-center gap-2"><Avatar className="size-5 rounded-md"><AvatarImage src={logoUrl} /><AvatarFallback className="rounded-md text-[9px]">{initials(agencyName)}</AvatarFallback></Avatar> Logo uploaded</span> : <>Skipped for now</>,
    })
  }

  const currentStepKey = STEP_ORDER[step]

  return (
    <div className="relative w-full max-w-xl">
      <style>{`
        @keyframes bot-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(-4deg); }
        }
        @keyframes bot-pulse-ring {
          0% { transform: scale(1); opacity: .5; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes bot-dot {
          0%, 60%, 100% { transform: translateY(0) scale(.85); opacity: .45; }
          30% { transform: translateY(-4px) scale(1.1); opacity: 1; }
        }
        @keyframes message-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Ambient background image */}
      <div className="fixed inset-0 -z-10 overflow-hidden opacity-25 pointer-events-none">
        <Image
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover blur-3xl scale-110"
        />
      </div>

      <div
        className="flex flex-col overflow-hidden rounded-3xl h-[calc(100dvh-8.5rem)]"
        style={{ border: "1px solid rgba(255,255,255,.07)", boxShadow: "0 32px 80px rgba(0,0,0,.5)", background: "linear-gradient(160deg, rgba(30,32,42,.92) 0%, rgba(20,21,28,.96) 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 relative"
          style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div className="absolute top-0 inset-x-8 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)" }} />
          <AiAvatar />
          <div className="flex-1">
            <p className="text-[13px] font-black text-white/85">Agnelix Assistant</p>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Setting up your account</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
            <Sparkles className="size-3 text-amber-300/80" />
            <span className="text-[10px] font-bold text-white/40">AI-guided</span>
          </div>
        </div>

        {/* Step progress */}
        {!done && (
          <div className="flex items-center gap-1.5 px-6 pt-3">
            {STEP_ORDER.map((k, i) => (
              <div key={k} className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: i <= step ? "100%" : "0%",
                    background: "linear-gradient(90deg,#7c83fd,#5a61d6)",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Chat transcript */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
          {!done ? (
            <>
              {history.map((h, i) => (
                <div key={h.key + i} className="space-y-2.5">
                  <AiBubble>{h.ai}</AiBubble>
                  <UserBubble>{h.user}</UserBubble>
                </div>
              ))}

              {typing ? (
                <TypingBubble />
              ) : (
                <div className="space-y-3">
                  {currentStepKey === "agencyName" && (
                    <AiBubble>
                      Hey there <span className="text-base">👋</span> I&rsquo;m the Agnelix AI assistant. Let&rsquo;s get your agency set up — what should I call it?
                    </AiBubble>
                  )}
                  {currentStepKey === "title" && (
                    <AiBubble>
                      Nice to meet <span className="text-white/95 font-bold">{agencyName}</span>! What&rsquo;s your role there? It helps me sign emails the right way.
                    </AiBubble>
                  )}
                  {currentStepKey === "playbook" && (
                    <AiBubble>
                      What kind of agency do you run? This sets up your dashboard with the right playbook — pick one or type your own. You can change it anytime in settings.
                    </AiBubble>
                  )}
                  {currentStepKey === "companyDesc" && (
                    <AiBubble>
                      Perfect. In your own words — what does <span className="text-white/95 font-bold">{agencyName}</span> do for clients? Be specific, this is the core context every AI email is built from.
                      <br /><br />
                      Don&rsquo;t know what to write? Paste your website URL below and I&rsquo;ll write it for you.
                    </AiBubble>
                  )}
                  {currentStepKey === "tone" && (
                    <AiBubble>
                      Got it — that&rsquo;s gold. What tone should your outreach emails use?
                    </AiBubble>
                  )}
                  {currentStepKey === "calendarLink" && (
                    <AiBubble>
                      Almost there. Got a Calendly or Cal.com link? I&rsquo;ll drop a booking button straight into your emails.
                    </AiBubble>
                  )}
                  {currentStepKey === "logo" && (
                    <AiBubble>
                      Last thing — want to add your logo? It&rsquo;ll show up on your dashboard and in your email signature.
                    </AiBubble>
                  )}
                  {currentStepKey === "review" && (
                    <AiBubble>
                      <div className="space-y-3">
                        <p>Here&rsquo;s your profile — tap anything to edit, or launch when ready.</p>
                        <div className="rounded-xl overflow-hidden divide-y divide-white/[.06]" style={{ border: "1px solid rgba(255,255,255,.08)" }}>
                          {[
                            { label: "Agency", value: agencyName, idx: 0 },
                            { label: "Role", value: title || "Decision Maker", idx: 1 },
                            { label: "Focus", value: playbookName, idx: 2 },
                            { label: "Sending email", value: fromEmail, idx: -1 },
                            { label: "About", value: companyDesc, idx: 3 },
                            { label: "Tone", value: tone, idx: 4 },
                            { label: "Calendar link", value: calendarLink || "Not set", idx: 5 },
                            { label: "Logo", value: logoUrl ? "Uploaded" : "Not set", idx: 6 },
                          ].map(row => (
                            <button
                              key={row.label}
                              type="button"
                              disabled={row.idx === -1}
                              onClick={() => row.idx !== -1 && editStep(row.idx)}
                              className="w-full flex items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[.03] disabled:cursor-default"
                              style={{ background: "rgba(255,255,255,.02)" }}
                            >
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-white/25">{row.label}</p>
                                <p className="text-[12px] text-white/70 mt-0.5 line-clamp-2">{row.value}</p>
                              </div>
                              {row.idx !== -1 && <Pencil className="size-3 shrink-0 text-white/20 mt-1" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </AiBubble>
                  )}
                </div>
              )}

              <div ref={bottomRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-5">
              <div className="relative">
                <div
                  className="flex size-16 items-center justify-center rounded-3xl mx-auto"
                  style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)" }}
                >
                  <Check className="size-8 text-emerald-400" />
                </div>
                <div className="absolute -inset-3 rounded-full opacity-30 animate-ping"
                  style={{ background: "radial-gradient(circle,rgba(52,211,153,.3) 0%,transparent 70%)" }} />
              </div>

              <div>
                <h2 className="text-[20px] font-black tracking-tight text-white/90">
                  {agencyName || "Your agency"} is ready 🎉
                </h2>
                <p className="text-[13px] text-white/35 mt-2 max-w-xs mx-auto">
                  Your AI is configured. Next up: create your first email sequence.
                </p>
              </div>

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
                  onClick={() => router.push("/dashboard")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[13px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
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

        {/* Input area */}
        {!done && !typing && (
          <div className="px-6 py-4 relative" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
            {currentStepKey === "agencyName" && (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitAgencyName()}
                  placeholder="e.g. Acme Marketing"
                  className="flex-1 rounded-xl px-4 py-2.5 text-[13px] text-white/85 outline-none placeholder:text-white/20"
                  style={fieldStyle}
                />
                <button
                  onClick={submitAgencyName}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                >
                  <Send className="size-4 text-white" />
                </button>
              </div>
            )}

            {currentStepKey === "title" && (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ComboSelect value={title} onChange={setTitle} options={TITLES} placeholder="Select or type your role…" dropUp />
                </div>
                <button
                  onClick={submitTitle}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[12px] font-bold text-white/70 transition-all hover:brightness-110"
                  style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}
                >
                  Continue <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}

            {currentStepKey === "playbook" && (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ComboSelect
                    value={playbookName}
                    onChange={setPlaybookName}
                    options={PLAYBOOK_OPTIONS.map(p => p.name)}
                    placeholder="Select or type your agency type…"
                    dropUp
                  />
                </div>
                <button
                  onClick={submitPlaybook}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[12px] font-bold text-white/70 transition-all hover:brightness-110"
                  style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}
                >
                  Continue <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}

            {currentStepKey === "companyDesc" && descMode === "write" && (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={3}
                  placeholder="We help dental practices grow their patient base through SEO and paid ads. We typically get clients 15–30 new patients per month."
                  className="w-full rounded-xl px-4 py-3 text-[13px] text-white/85 outline-none placeholder:text-white/20 resize-none"
                  style={fieldStyle}
                />
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setDescMode("url")}
                    className="text-[11px] font-semibold text-white/30 hover:text-white/55 transition-colors text-left"
                  >
                    ✨ Paste your website URL instead — let AI write it
                  </button>
                  <button
                    onClick={submitCompanyDesc}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white transition-all hover:brightness-110"
                    style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                  >
                    Continue <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {currentStepKey === "companyDesc" && descMode === "url" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="url"
                    value={descUrl}
                    onChange={e => setDescUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !descGenerating && generateDescFromUrl()}
                    placeholder="https://youragency.com"
                    className="flex-1 rounded-xl px-4 py-2.5 text-[13px] text-white/85 outline-none placeholder:text-white/20"
                    style={fieldStyle}
                  />
                  <button
                    onClick={generateDescFromUrl}
                    disabled={descGenerating}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                  >
                    {descGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    {descGenerating ? "Reading site…" : "Write it for me"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDescMode("write")}
                  className="text-[11px] font-semibold text-white/30 hover:text-white/55 transition-colors"
                >
                  ← I&rsquo;ll write it myself
                </button>
              </div>
            )}

            {currentStepKey === "tone" && (
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => selectTone(t)}
                    className="rounded-xl py-2.5 text-[12px] font-bold transition-all"
                    style={tone === t
                      ? { background: "rgba(124,131,253,.18)", border: "1px solid rgba(124,131,253,.4)", color: "rgba(255,255,255,.9)" }
                      : { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", color: "rgba(255,255,255,.5)" }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {currentStepKey === "calendarLink" && (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="url"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitCalendarLink()}
                  placeholder="https://calendly.com/your-slug"
                  className="flex-1 rounded-xl px-4 py-2.5 text-[13px] text-white/85 outline-none placeholder:text-white/20"
                  style={fieldStyle}
                />
                <button
                  onClick={() => submitCalendarLink(true)}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-white/40 transition-all hover:text-white/60"
                  style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
                >
                  <SkipForward className="size-3.5" /> Skip
                </button>
                <button
                  onClick={() => submitCalendarLink(false)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                >
                  <Send className="size-4 text-white" />
                </button>
              </div>
            )}

            {currentStepKey === "logo" && (
              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-xl shrink-0" style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.08)" }}>
                  <AvatarImage src={logoUrl ?? undefined} />
                  <AvatarFallback className="rounded-xl text-[13px] font-black text-white/50"
                    style={{ background: "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03))" }}>
                    {initials(agencyName || "?")}
                  </AvatarFallback>
                </Avatar>
                <label
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold text-white/60 transition-all hover:text-white/80"
                  style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}
                >
                  {logoUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  {logoUploading ? "Uploading…" : logoUrl ? "Change" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                </label>
                <div className="flex-1" />
                {!logoUrl && (
                  <button
                    onClick={continueFromLogo}
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold text-white/40 transition-all hover:text-white/60"
                    style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
                  >
                    <SkipForward className="size-3.5" /> Skip
                  </button>
                )}
                <button
                  onClick={continueFromLogo}
                  disabled={logoUploading}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                >
                  <ArrowRight className="size-4 text-white" />
                </button>
              </div>
            )}

            {currentStepKey === "review" && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {saving ? "Setting things up…" : "Looks good — Launch Dashboard"}
                {!saving && <ArrowRight className="size-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
