/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowRight, Check, Loader2, Upload, Sparkles, Send,
  Pencil, SkipForward, Bot,
} from "lucide-react"
import { toast } from "sonner"
import { initials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ComboSelect } from "@/components/ui/combo-select"
import dynamic from "next/dynamic"

const OnboardingRobot3D = dynamic(
  () => import("@/components/onboarding-robot-3d").then((mod) => mod.OnboardingRobot3D),
  { ssr: false }
)
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

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
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
  )
}

export default function OnboardingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const fromEmail = session?.user?.email ?? ""

  const [agencyName, setAgencyName]     = useState("")
  const [title, setTitle]               = useState("")
  const [playbookName, setPlaybookName] = useState("Sales & B2B Lead Gen")
  const [companyDesc, setCompanyDesc]   = useState("")
  const [tone, setTone]                 = useState("Professional")
  const [calendarLink, setCalendarLink] = useState("")
  const [logoUrl, setLogoUrl]           = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const [step, setStep]         = useState(0)
  const [returnTo, setReturnTo] = useState<number | null>(null)
  const [aiTyping, setAiTyping] = useState(true)
  const [userTyping, setUserTyping] = useState(false)
  const [draft, setDraft]       = useState("")
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [countdown, setCountdown] = useState(3)

  const [descMode, setDescMode]           = useState<"write" | "url">("write")
  const [descUrl, setDescUrl]             = useState("")
  const [descGenerating, setDescGenerating] = useState(false)

  const [isMobile, setIsMobile]           = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        setIsInputFocused(true)
      }
    }
    const handleBlur = () => {
      setIsInputFocused(false)
    }

    document.addEventListener("focusin", handleFocus)
    document.addEventListener("focusout", handleBlur)
    return () => {
      document.removeEventListener("focusin", handleFocus)
      document.removeEventListener("focusout", handleBlur)
    }
  }, [])

  useEffect(() => {
    setAiTyping(true)
    const t = setTimeout(() => setAiTyping(false), 550)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    if (!draft && !descUrl) return
    setUserTyping(true)
    const t = setTimeout(() => setUserTyping(false), 1000)
    return () => clearTimeout(t)
  }, [draft, descUrl])

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
    setReturnTo(STEP_ORDER.length - 1)
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
  function submitTitle()    { goNext() }
  function submitPlaybook() { goNext() }

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

  function selectTone(t: string) { setTone(t); setTimeout(goNext, 250) }
  function submitCalendarLink(skip = false) {
    if (skip) {
      setCalendarLink("")
      setDraft("")
      goNext()
      return
    }
    const val = draft.trim()
    if (!val) {
      setCalendarLink("")
      setDraft("")
      goNext()
      return
    }
    try {
      const hasProtocol = val.startsWith("http://") || val.startsWith("https://")
      const urlStr = hasProtocol ? val : `https://${val}`
      const parsed = new URL(urlStr)
      if (!parsed.hostname.includes(".")) {
        throw new Error("Invalid domain")
      }
      setCalendarLink(urlStr)
      setDraft("")
      goNext()
    } catch {
      toast.error("Please enter a valid calendar link (e.g. https://calendly.com/your-name). The link must include a valid domain name like '.com' or '.co'.")
    }
  }
  function continueFromLogo() { goNext() }

  const currentStepKey = STEP_ORDER[step]

  const STEP_QUESTIONS: Record<StepKey, React.ReactNode> = {
    agencyName: <>Hey there 👋 I&apos;m your Galien AI. Let&apos;s get started — what&apos;s your agency called?</>,
    title:      <>Nice to meet <strong style={{ color: "#ffffff" }}>{agencyName}</strong>! What&apos;s your role there?</>,
    playbook:   <>What kind of agency do you run? Pick one or type your own — you can change it any time.</>,
    companyDesc: <>In your own words, what does <strong style={{ color: "#ffffff" }}>{agencyName}</strong> do for clients? Be specific — every AI email is built from this.</>,
    tone:       <>Got it. What tone should your outreach emails use?</>,
    calendarLink: <>Almost done! Got a Calendly or Cal.com link? I&apos;ll embed it straight into your emails.</>,
    logo:       <>Last step — want to add your logo? It shows up on your dashboard and email signature.</>,
    review:     <>Here&apos;s your profile — tap anything to edit, then launch when you&apos;re ready.</>,
  }

  return (
    <div className="onboarding-split-container" style={{ backgroundColor: "#05060a" }}>
      <style>{`
        .onboarding-split-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background-color: #05060a;
          overflow: hidden;
        }
        .onboarding-left-pane {
          position: relative;
          z-index: 20;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          width: 100%;
          height: 65%;
          padding: 4.5rem 1.5rem 1.5rem 1.5rem;
          overflow-y: auto;
          overflow-x: hidden;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background-color: #05060a;
          transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease;
        }
        .onboarding-left-pane.keyboard-active {
          height: 100%;
          border-bottom: none;
          padding-top: 3.5rem;
        }
        .onboarding-right-pane {
          position: relative;
          z-index: 10;
          flex: 1;
          height: 35%;
          background-color: #05060a;
          overflow: hidden;
          transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        }
        .onboarding-right-pane.keyboard-active {
          height: 0%;
          opacity: 0;
          pointer-events: none;
        }
        @media (min-width: 768px) {
          .onboarding-split-container {
            flex-direction: row;
          }
          .onboarding-left-pane {
            width: 45%;
            height: 100%;
            padding: 3rem 5rem;
            justify-content: center;
            border-bottom: none;
            border-right: 1px solid rgba(255, 255, 255, 0.05);
          }
          .onboarding-right-pane {
            height: 100%;
          }
        }
        .review-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          max-height: 28vh;
          overflow-y: auto;
          padding-right: 0.5rem;
          padding-bottom: 0.5rem;
        }
        .review-item-btn {
          width: 100%;
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 0.75rem;
          border-radius: 1rem;
          padding: 0.75rem 1rem;
          text-align: left;
          transition: background-color 0.2s;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
        }
        .review-item-btn:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.04);
        }
        .review-item-btn:disabled {
          cursor: default;
        }
        @media (min-width: 768px) {
          .review-grid {
            max-height: 40vh;
          }
          .review-item-btn {
            padding: 0.875rem 1.25rem;
          }
        }
        @keyframes bot-dot {
          0%, 60%, 100% { transform: translateY(0) scale(.85); opacity: .45; }
          30% { transform: translateY(-4px) scale(1.1); opacity: 1; }
        }
        @keyframes card-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes hud-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes aurora-drift {
          0%   { transform: translate(0%,   0%)   scale(1);    opacity: 0.7; }
          33%  { transform: translate(3%,   5%)   scale(1.08); opacity: 1;   }
          66%  { transform: translate(-2%,  3%)   scale(0.96); opacity: 0.75;}
          100% { transform: translate(0%,   0%)   scale(1);    opacity: 0.7; }
        }
        @keyframes aurora-drift2 {
          0%   { transform: translate(0%,   0%)   scale(1);    opacity: 0.5; }
          40%  { transform: translate(-4%,  -3%)  scale(1.1);  opacity: 0.8; }
          70%  { transform: translate(2%,   4%)   scale(0.94); opacity: 0.6; }
          100% { transform: translate(0%,   0%)   scale(1);    opacity: 0.5; }
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0px) scale(1);   opacity: 0.15; }
          50%      { transform: translateY(-18px) scale(1.06); opacity: 0.25; }
        }
      `}</style>

      {/* ── LEFT COLUMN (FORM PANE) ── */}
      <div className={`onboarding-left-pane scrollbar-none ${isMobile && isInputFocused ? "keyboard-active" : ""}`} style={{ backgroundColor: "#05060a" }}>
        
        {/* Top HUD progress */}
        {!done && (
          <div className="absolute top-6 left-6 md:left-12 flex items-center gap-3" style={{ animation: "hud-in 0.6s ease-out both" }}>
            {STEP_ORDER.map((k, i) => (
              <div
                key={k}
                className="h-[3px] rounded-full transition-all duration-500 ease-out"
                style={{
                  width: i === step ? 24 : 5,
                  background: i < step ? "rgba(124,131,253,0.65)" : i === step ? "#9ca3ff" : "rgba(255,255,255,0.12)",
                  boxShadow: i === step ? "0 0 10px rgba(124,131,253,1)" : "none",
                }}
              />
            ))}
            <span className="ml-2 text-[10px] font-bold tracking-widest uppercase text-white/25">
              {step + 1}/{STEP_ORDER.length}
            </span>
          </div>
        )}

        <div className="w-full max-w-md mx-auto my-auto">
          {done ? (
            /* ── Done screen ── */
            <div
              className="w-full text-center"
              style={{ animation: "card-rise 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              <div className="relative inline-block mb-6">
                <div
                  className="flex size-20 items-center justify-center rounded-3xl mx-auto"
                  style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.18)" }}
                >
                  <Check className="size-10 text-emerald-400" />
                </div>
                <div
                  className="absolute -inset-3 rounded-full opacity-25 animate-ping"
                  style={{ background: "radial-gradient(circle,rgba(52,211,153,.4) 0%,transparent 70%)" }}
                />
              </div>

              <h2 className="text-[28px] font-black tracking-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
                {agencyName || "Your agency"} is ready 🎉
              </h2>
              <p className="text-[15px] mt-3 max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
                Your AI is configured. Taking you to Sequences in&hellip;
              </p>

              <div className="mt-8 flex items-center justify-center gap-2">
                <span
                  className="flex size-12 items-center justify-center rounded-full text-[24px] font-black"
                  style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,0.8)" }}
                >
                  {Math.max(0, countdown)}
                </span>
              </div>
              <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.07)" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${((3 - countdown) / 3) * 100}%`,
                    background: "linear-gradient(90deg,rgba(52,211,153,.5),rgba(52,211,153,.8))",
                  }}
                />
              </div>

              <div className="mt-8 space-y-2.5">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-[14px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
                >
                  Go Now <ArrowRight className="size-4.5" />
                </button>
              </div>
            </div>
          ) : (
            /* ── Active step form ── */
            <div
              key={step}
              className="w-full"
              style={{ animation: "card-rise 0.48s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              {/* AI question header */}
              <div className="mb-8">
                {aiTyping ? (
                  <div className="h-8 flex items-center"><TypingDots /></div>
                ) : (
                  <p className="text-[20px] font-medium tracking-tight leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
                    {STEP_QUESTIONS[currentStepKey]}
                  </p>
                )}
              </div>

              {/* Step-specific input — only shown after typing animation */}
              {!aiTyping && (
                <div className="space-y-4">
                  {/* Agency name */}
                  {currentStepKey === "agencyName" && (
                    <div className="flex items-center gap-3">
                      <input
                        autoFocus
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && submitAgencyName()}
                        placeholder="e.g. Acme Marketing"
                        className="flex-1 bg-transparent border-b-2 px-1 py-4 text-[18px] outline-none placeholder:text-white/20 transition-colors"
                        style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.1)" }}
                      />
                      <button
                        onClick={submitAgencyName}
                        className="flex size-14 shrink-0 items-center justify-center rounded-2xl transition-all hover:brightness-110 active:scale-95 shadow-lg"
                        style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                      >
                        <Send className="size-5 text-white" />
                      </button>
                    </div>
                  )}

                  {/* Title */}
                  {currentStepKey === "title" && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <ComboSelect value={title} onChange={setTitle} options={TITLES} placeholder="Select or type your role…" dropUp />
                      </div>
                      <button
                        onClick={submitTitle}
                        className="flex h-14 shrink-0 items-center gap-1.5 rounded-2xl px-6 text-[14px] font-bold text-white/80 transition-all hover:bg-white/10"
                        style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)" }}
                      >
                        Continue <ArrowRight className="size-4" />
                      </button>
                    </div>
                  )}

                  {/* Playbook */}
                  {currentStepKey === "playbook" && (
                    <div className="flex items-center gap-3">
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
                        className="flex h-14 shrink-0 items-center gap-1.5 rounded-2xl px-6 text-[14px] font-bold text-white/80 transition-all hover:bg-white/10"
                        style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)" }}
                      >
                        Continue <ArrowRight className="size-4" />
                      </button>
                    </div>
                  )}

                  {/* Company description — write mode */}
                  {currentStepKey === "companyDesc" && descMode === "write" && (
                    <div className="space-y-4">
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        rows={4}
                        placeholder="We help dental practices grow their patient base through SEO and paid ads..."
                        className="w-full bg-transparent border-2 rounded-2xl px-5 py-4 text-[15px] outline-none resize-none transition-colors"
                        style={{ color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.1)" }}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setDescMode("url")}
                          className="text-[13px] font-semibold text-white/40 hover:text-white/70 transition-colors text-left"
                        >
                          ✨ Paste your website URL instead
                        </button>
                        <button
                          onClick={submitCompanyDesc}
                          className="flex shrink-0 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[14px] font-bold text-white transition-all hover:brightness-110 shadow-lg"
                          style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                        >
                          Continue <ArrowRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Company description — URL mode */}
                  {currentStepKey === "companyDesc" && descMode === "url" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          autoFocus
                          type="url"
                          value={descUrl}
                          onChange={e => setDescUrl(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && generateDescFromUrl()}
                          placeholder="https://your-agency.com"
                          className="flex-1 bg-transparent border-b-2 px-1 py-4 text-[18px] outline-none placeholder:text-white/20 transition-colors"
                          style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.1)" }}
                        />
                        <button
                          onClick={generateDescFromUrl}
                          disabled={descGenerating}
                          className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl px-6 text-[14px] font-bold text-white transition-all hover:brightness-110 shadow-lg disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                        >
                          {descGenerating ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : <><Sparkles className="size-4" /> Generate</>}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setDescMode("write")}
                          className="text-[13px] font-semibold text-white/40 hover:text-white/70 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tone */}
                  {currentStepKey === "tone" && (
                    <div className="grid grid-cols-2 gap-3">
                      {TONES.map(t => (
                        <button
                          key={t}
                          onClick={() => selectTone(t)}
                          className="flex items-center justify-center rounded-2xl py-4 text-[14px] font-bold transition-all hover:scale-[1.02]"
                          style={tone === t
                            ? { background: "linear-gradient(135deg,#7c83fd,#5a61d6)", color: "white", boxShadow: "0 4px 15px rgba(124,131,253,.3)" }
                            : { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.6)" }
                          }
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Calendar link */}
                  {currentStepKey === "calendarLink" && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <input
                        autoFocus
                        type="url"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && submitCalendarLink()}
                        placeholder="https://calendly.com/your-slug"
                        className="flex-1 bg-transparent border-b-2 px-1 py-4 text-[18px] outline-none placeholder:text-white/20 transition-colors"
                        style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.1)" }}
                      />
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <button
                          onClick={() => submitCalendarLink(true)}
                          className="flex h-14 shrink-0 items-center justify-center gap-1.5 rounded-2xl px-5 text-[14px] font-bold text-white/40 transition-all hover:text-white/70 hover:bg-white/5"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => submitCalendarLink(false)}
                          className="flex size-14 shrink-0 items-center justify-center rounded-2xl transition-all hover:brightness-110 active:scale-95 shadow-lg"
                          style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                        >
                          <Send className="size-5 text-white" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Logo */}
                  {currentStepKey === "logo" && (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                      <Avatar className="size-16 rounded-2xl shrink-0 border-2 border-white/10 shadow-xl">
                        <AvatarImage src={logoUrl ?? undefined} />
                        <AvatarFallback
                          className="rounded-2xl text-[16px] font-black text-white/50"
                          style={{ background: "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03))" }}
                        >
                          {initials(agencyName || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2 flex-1">
                        <label
                          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white/80 transition-all hover:bg-white/10"
                          style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)" }}
                        >
                          {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                          {logoUploading ? "Uploading…" : logoUrl ? "Change Logo" : "Upload Logo"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                        </label>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!logoUrl && (
                          <button
                            onClick={continueFromLogo}
                            className="flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-[13px] font-bold text-white/40 transition-all hover:text-white/70"
                          >
                            Skip
                          </button>
                        )}
                        <button
                          onClick={continueFromLogo}
                          disabled={logoUploading}
                          className="flex size-12 shrink-0 items-center justify-center rounded-xl transition-all hover:brightness-110 shadow-lg disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#7c83fd,#5a61d6)" }}
                        >
                          <ArrowRight className="size-5 text-white" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Review */}
                  {currentStepKey === "review" && (
                    <div className="space-y-6">
                      <div className="review-grid scrollbar-thin scrollbar-thumb-white/10">
                        {[
                          { label: "Agency",        value: agencyName,                    idx: 0 },
                          { label: "Role",           value: title || "Decision Maker",     idx: 1 },
                          { label: "Focus",          value: playbookName,                  idx: 2 },
                          { label: "Sending email",  value: fromEmail,                     idx: -1 },
                          { label: "About",          value: companyDesc,                   idx: 3, colSpan: 2 },
                          { label: "Tone",           value: tone,                          idx: 4 },
                          { label: "Calendar link",  value: calendarLink || "Not set",     idx: 5 },
                          { label: "Logo",           value: logoUrl ? "Uploaded" : "Not set", idx: 6, colSpan: 2 },
                        ].map((row) => (
                          <button
                            key={row.label}
                            type="button"
                            disabled={row.idx === -1}
                            onClick={() => row.idx !== -1 && editStep(row.idx)}
                            className={`review-item-btn ${row.colSpan ? "col-span-2" : ""}`}
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{row.label}</p>
                              <p className="text-[13px] font-medium line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>{row.value}</p>
                            </div>
                            {row.idx !== -1 && <Pencil className="size-3.5 shrink-0 text-white/20 mt-1" />}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-black text-black transition-all hover:brightness-110 active:scale-[.99] shadow-xl disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 4px 20px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,.8)" }}
                      >
                        {saving ? <Loader2 className="size-5 animate-spin" /> : <><Sparkles className="size-5" /> Launch Galien</>}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT COLUMN (ROBOT STAGE) ── */}
      <div className={`onboarding-right-pane ${isMobile && isInputFocused ? "keyboard-active" : ""}`} style={{ backgroundColor: "#05060a" }}>
        {/* ── AURORA BACKGROUND ── */}
        <div className="absolute pointer-events-none" style={{
          top: "-15%", left: "-10%",
          width: "120%", height: "70%",
          background: "radial-gradient(ellipse at center, rgba(100,60,220,0.25) 0%, rgba(80,40,180,0.08) 50%, transparent 75%)",
          filter: "blur(60px)",
          animation: "aurora-drift 12s ease-in-out infinite",
        }} />
        <div className="absolute pointer-events-none" style={{
          bottom: "-10%", right: "-5%",
          width: "100%", height: "65%",
          background: "radial-gradient(ellipse at center, rgba(55,80,220,0.2) 0%, rgba(40,60,180,0.07) 50%, transparent 75%)",
          filter: "blur(70px)",
          animation: "aurora-drift2 16s ease-in-out infinite",
        }} />
        <div className="absolute pointer-events-none" style={{
          top: "30%", left: "25%",
          width: "80%", height: "45%",
          background: "radial-gradient(ellipse at center, rgba(160,60,255,0.1) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "aurora-drift 20s ease-in-out infinite reverse",
        }} />

        {/* Floating glowing orbs */}
        <div className="absolute rounded-full pointer-events-none" style={{
          top: "15%", left: "15%",
          width: 200, height: 200,
          background: "radial-gradient(circle, rgba(124,131,253,0.15) 0%, transparent 70%)",
          filter: "blur(30px)",
          animation: "orb-float 7s ease-in-out infinite",
        }} />
        <div className="absolute rounded-full pointer-events-none" style={{
          top: "20%", right: "15%",
          width: 160, height: 160,
          background: "radial-gradient(circle, rgba(158,124,253,0.12) 0%, transparent 70%)",
          filter: "blur(25px)",
          animation: "orb-float 9s ease-in-out infinite 2s",
        }} />

        {/* Noise grain overlay for film texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "250px 250px",
        }} />

        {/* Bottom gradient vignette */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
          style={{
            height: "40%",
            background: "linear-gradient(to top, rgba(5,6,10,1) 10%, rgba(5,6,10,0.6) 40%, transparent 100%)",
          }}
        />

        {/* ── 3D ROBOT ── */}
        <OnboardingRobot3D 
          animation={
            done
              ? "waving"
              : currentStepKey === "review"
              ? "launch"
              : userTyping
              ? "looking"
              : "idle"
          } 
          positionY={isMobile ? -3.4 : -4.6} 
          scale={isMobile ? 0.05 : 0.07}
        />
      </div>

    </div>
  )
}
