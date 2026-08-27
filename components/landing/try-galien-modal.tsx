"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Globe2, Building2, ArrowRight, Loader2, Send,
  Shield, Gauge, Zap, Eye, Clock, CheckCircle2, XCircle,
  Bot, Sparkles, ChevronDown, ChevronUp, Mail, Target, CalendarCheck, HelpCircle, RefreshCw
} from "lucide-react"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

export interface CompanyOverview {
  whatTheyDo: string
  whatTheyOffer: string[]
  targetMarket: string
  positioning: string
  strategicAngles: {
    idealProspects: string[]
    personalizedHook: string
    howGalienHelps: string[]
  }
  sampleOpeningPitch: string
  initialChatGreeting: string
}

type AuditResult = {
  ssl: boolean
  speed: number
  mobile: boolean
  googleAnalytics: boolean
  pixel: boolean
  noMetaDesc: boolean
}

type DemoMessage = { role: "galien" | "user"; text: string }

type Phase = "loading" | "cooldown" | "form" | "running" | "result" | "error"

function formatCountdown(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${m}m`
}

const QUICK_PROMPTS = [
  "How will you find leads for our specific business?",
  "What if a prospect says 'we already have a vendor'?",
  "Write an opening email for our top service",
  "How do you book meetings to my Google or Outlook calendar?",
]

export function TryGalienModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: session } = useSession()
  const [phase, setPhase] = useState<Phase>("form")
  const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [website, setWebsite] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [overview, setOverview] = useState<CompanyOverview | null>(null)
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatting, setChatting] = useState(false)
  const [showPitchPreview, setShowPitchPreview] = useState(false)
  const [showOverviewDetails, setShowOverviewDetails] = useState(true)
  const [scanningStep, setScanningStep] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => Date.now())
  const [trialsLeft, setTrialsLeft] = useState(5)

  const checkEligibility = useCallback(() => {
    fetch("/api/try-galien")
      .then(r => r.json())
      .then(data => {
        if (typeof data.trialsLeft === "number") setTrialsLeft(data.trialsLeft)
        if (data.eligible) {
          setPhase(prev => (prev === "result" ? "result" : "form"))
        } else {
          setNextAvailableAt(data.nextAvailableAt)
          setPhase("cooldown")
        }
      })
      .catch(() => setPhase("form"))
  }, [])

  useEffect(() => {
    if (open) checkEligibility()
  }, [open, checkEligibility])

  useEffect(() => {
    if (phase !== "cooldown") return
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [phase])

  // Scanning progress steps animation
  useEffect(() => {
    if (phase !== "running") return
    setScanningStep(0)
    const t1 = setTimeout(() => setScanningStep(1), 1200)
    const t2 = setTimeout(() => setScanningStep(2), 2600)
    const t3 = setTimeout(() => setScanningStep(3), 4200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [phase])

  useEffect(() => {
    if (phase === "result") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, phase, chatting])

  async function runTrial() {
    if (!companyName.trim() || !website.trim()) return
    setPhase("running")
    setErrorMsg("")
    try {
      const res = await fetch("/api/try-galien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, website }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setNextAvailableAt(data.nextAvailableAt)
          setPhase("cooldown")
          return
        }
        setErrorMsg(data.error || "Could not analyze website. Please check the URL and try again.")
        setPhase("error")
        return
      }

      setOverview(data.overview)
      setAudit(data.audit)
      if (typeof data.trialsLeft === "number") setTrialsLeft(data.trialsLeft)
      
      const greeting = data.overview?.initialChatGreeting || `Hey! I just analyzed ${companyName}. I've mapped out what you offer and how I can help scale your client acquisition.\n\nAsk me anything — test my outreach strategy, ask how I find leads, or test how I handle prospect objections!`
      setMessages([{ role: "galien", text: greeting }])
      setPhase("result")
    } catch {
      setErrorMsg("Something went wrong. Please check the website and try again.")
      setPhase("error")
    }
  }

  async function handleSendMessage(promptText?: string) {
    const text = (promptText || chatInput).trim()
    if (!text || !overview || chatting) return
    const next: DemoMessage[] = [...messages, { role: "user", text }]
    setMessages(next)
    setChatInput("")
    setChatting(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/try-galien/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          website,
          overview,
          conversation: next,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || "Galien couldn't reply — try again.")
        return
      }
      setMessages([...next, { role: "galien", text: data.text }])
    } catch {
      setErrorMsg("Failed to connect with Galien. Try again.")
    } finally {
      setChatting(false)
    }
  }

  const cooldownMs = nextAvailableAt ? new Date(nextAvailableAt).getTime() - now : 0

  const handleReset = useCallback(() => {
    setPhase("form")
    setCompanyName("")
    setWebsite("")
    setOverview(null)
    setAudit(null)
    setMessages([])
    setChatInput("")
    setChatting(false)
    setErrorMsg("")
    setShowPitchPreview(false)
    setShowOverviewDetails(true)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-2xl w-[95vw] rounded-3xl border p-0 overflow-hidden max-h-[92vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(18, 20, 28, 0.98) 0%, rgba(10, 11, 16, 0.99) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 30px 90px rgba(0, 0, 0, 0.8), 0 0 50px rgba(197, 168, 128, 0.05)",
        }}
      >
        <DialogTitle className="sr-only">Try Galien Live Assistant</DialogTitle>
        <DialogDescription className="sr-only">Experience live AI company research and interactive sales strategy</DialogDescription>

        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-[#c5a880]/15 border border-[#c5a880]/30 flex items-center justify-center text-[#c5a880]">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-tight text-white flex items-center gap-1.5">
                Galien AI Assistant
                <span className="inline-flex items-center gap-1 rounded-full bg-[#728972]/20 border border-[#728972]/30 px-2 py-0.2 text-[9px] text-[#728972] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#728972] animate-pulse" /> Live Simulator
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-6">
            {phase === "result" && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[10.5px] font-semibold text-slate-300 transition-colors cursor-pointer"
                title="Analyze a different company"
              >
                <RefreshCw className="size-3 text-[#c5a880]" />
                <span>Switch Company</span>
              </button>
            )}

            <div className="text-[11px] text-slate-400 font-medium">
              {trialsLeft > 0 ? (
                <span className="text-slate-400">{trialsLeft} free {trialsLeft === 1 ? "session" : "sessions"} left today</span>
              ) : (
                <span className="text-amber-400/80">Daily limit reached</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* ── PHASE 1: FORM INPUT ── */}
          {phase === "form" && (
            <div className="space-y-5 py-2">
              <div className="text-center max-w-lg mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-[#c5a880]" />
                  See Galien Analyze Your Business Live
                </div>
                <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                  Experience Galien on <span className="font-luxury-serif italic text-gradient-gold font-normal">your business.</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Enter your company and website. Galien will research your offerings, identify ideal paying clients, and launch an interactive conversation so you can test its outbound sales brain.
                </p>
              </div>

              <div className="space-y-3 max-w-md mx-auto pt-2">
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-white/[0.02] border border-white/[0.08] focus-within:border-[#c5a880]/50 transition-colors">
                  <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Company name (e.g. Apex Creative Studio)"
                    className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-white/[0.02] border border-white/[0.08] focus-within:border-[#c5a880]/50 transition-colors">
                  <Globe2 className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="Website (e.g. apexcreativestudio.com)"
                    className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                </div>

                <button
                  onClick={runTrial}
                  disabled={!companyName.trim() || !website.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-xs font-bold text-black transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-30 shadow-lg cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#ffffff,#cbd5e1)" }}
                >
                  <Sparkles className="h-4 w-4 text-black" />
                  Run Live Intelligence & Outbound Demo
                </button>

                {/* Example Quick-Filler */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setCompanyName("Luxe Hospitality Design")
                      setWebsite("https://luxehospitality.design")
                    }}
                    className="text-[11px] text-slate-500 hover:text-[#c5a880] transition-colors underline underline-offset-4"
                  >
                    Or try with sample company: Luxe Hospitality Design
                  </button>
                </div>
              </div>

              {/* Value Feature Highlights */}
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-4 border-t border-white/[0.06] text-center">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] font-bold text-slate-200">🔍 Deep Site Audit</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Scrapes offerings & ICP</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] font-bold text-[#c5a880]">✉️ Custom Pitch</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Non-templated outreach</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] font-bold text-[#728972]">💬 Live Q&A Chat</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Test objections in real-time</div>
                </div>
              </div>
            </div>
          )}

          {/* ── PHASE 2: RUNNING / SCANNING ── */}
          {phase === "running" && (
            <div className="flex flex-col items-center justify-center py-14 gap-6 text-center max-w-md mx-auto">
              <div className="relative flex size-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-[#c5a880]/50 animate-spin" style={{ animationDuration: "8s" }} />
                <div className="absolute -inset-2 rounded-full bg-[#c5a880]/10 blur-md animate-pulse" />
                <Bot className="size-7 text-[#c5a880]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">Galien is analyzing {companyName}...</h3>
                
                <div className="space-y-1.5 text-[12px] text-slate-400 font-mono transition-all">
                  <div className={`flex items-center justify-center gap-2 ${scanningStep >= 0 ? "text-emerald-400" : "opacity-30"}`}>
                    <CheckCircle2 className="size-3.5" /> Scanning {website} & core services
                  </div>
                  <div className={`flex items-center justify-center gap-2 ${scanningStep >= 1 ? "text-emerald-400" : "opacity-30"}`}>
                    <CheckCircle2 className="size-3.5" /> Synthesizing target buyer personas & ICP
                  </div>
                  <div className={`flex items-center justify-center gap-2 ${scanningStep >= 2 ? "text-emerald-400" : "opacity-30"}`}>
                    <CheckCircle2 className="size-3.5" /> Crafting high-converting outbound pitch strategy
                  </div>
                  <div className={`flex items-center justify-center gap-2 ${scanningStep >= 3 ? "text-emerald-400" : "opacity-30"}`}>
                    <Loader2 className="size-3.5 animate-spin text-[#c5a880]" /> Initializing live Galien sales conversation
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PHASE 3: COOLDOWN ── */}
          {phase === "cooldown" && (
            <div className="space-y-4 py-6 max-w-md mx-auto text-center">
              <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <Clock className="size-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Daily Session Limit Reached</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                To ensure fair access across all users, live simulator sessions reset every 24 hours. Next session unlocks in:
              </p>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-center">
                <span className="text-2xl font-mono font-bold text-white tabular-nums">{formatCountdown(cooldownMs)}</span>
              </div>
              <Link
                href="/sign-in"
                className="inline-flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-xs font-bold text-black transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#ffffff,#cbd5e1)" }}
              >
                Skip the wait — start your 7-day free trial <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* ── PHASE 4: ERROR ── */}
          {phase === "error" && (
            <div className="space-y-4 py-8 max-w-md mx-auto text-center">
              <div className="size-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <XCircle className="size-6" />
              </div>
              <p className="text-sm text-rose-300 font-medium">{errorMsg}</p>
              <button
                onClick={() => setPhase("form")}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-white transition-all hover:bg-white/10"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── PHASE 5: RESULTS & LIVE CONVERSATION ── */}
          {phase === "result" && overview && (
            <div className="space-y-4">
              
              {/* ── Executive Company Overview Accordion ── */}
              <div className="rounded-2xl border border-white/10 bg-[#14161f]/90 backdrop-blur-xl overflow-hidden shadow-lg transition-all">
                <div
                  onClick={() => setShowOverviewDetails(!showOverviewDetails)}
                  className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-[#c5a880]/15 border border-[#c5a880]/30 flex items-center justify-center text-[#c5a880]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white flex items-center gap-2">
                        {companyName} — Strategic Intelligence Overview
                        <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">({website})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReset()
                      }}
                      className="flex items-center gap-1 text-[10.5px] font-semibold text-[#c5a880] hover:text-white bg-[#c5a880]/10 hover:bg-[#c5a880]/20 border border-[#c5a880]/30 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                      title="Analyze a different company"
                    >
                      <RefreshCw className="size-2.5" />
                      <span>Change Company</span>
                    </button>
                    <div className="text-slate-400">
                      {showOverviewDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </div>
                  </div>
                </div>

                {showOverviewDetails && (
                  <div className="p-4 pt-0 space-y-3 text-xs border-t border-white/[0.06]">
                    
                    {/* What they do */}
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 text-slate-300 leading-relaxed">
                      <span className="text-white font-semibold">What You Do: </span>
                      {overview.whatTheyDo}
                    </div>

                    {/* Offerings tags */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Core Offerings Identified:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {overview.whatTheyOffer?.map((offering, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 text-[11px] text-slate-200">
                            <span className="h-1 w-1 rounded-full bg-[#c5a880]" />
                            {offering}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* How Galien Automates Client Acquisition */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#c5a880] mb-1">
                          <Target className="size-3" /> Target ICP Sourced
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          {overview.targetMarket || "High-value commercial clients"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#728972] mb-1">
                          <Mail className="size-3" /> Outbound Hook
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          {overview.strategicAngles?.personalizedHook || "Targeted pain-point outreach"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-white mb-1">
                          <CalendarCheck className="size-3" /> Calendar Autopilot
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          Handles replies & books calls directly to your calendar
                        </p>
                      </div>
                    </div>

                    {/* Toggle Sample Pitch */}
                    {overview.sampleOpeningPitch && (
                      <div>
                        <button
                          onClick={() => setShowPitchPreview(!showPitchPreview)}
                          className="text-[11px] font-semibold text-[#c5a880] hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          <Mail className="size-3" />
                          {showPitchPreview ? "Hide Sample Outbound Email" : "View Sample Email Galien Writes For You"}
                        </button>
                        {showPitchPreview && (
                          <div className="mt-2 rounded-xl bg-black/40 border border-white/10 p-3 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {overview.sampleOpeningPitch}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Interactive Live Chat Interface ── */}
              <div className="rounded-2xl border border-white/10 bg-[#0e1017]/90 backdrop-blur-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#728972] animate-pulse" />
                    <span className="text-[11px] font-bold text-white">Live Conversation with Galien</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Ask any sales or strategy question</span>
                </div>

                {/* Messages Feed */}
                <div className="space-y-3 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          m.role === "user"
                            ? "bg-white/10 text-white border border-white/15 rounded-br-none"
                            : "bg-[#171a24] text-slate-200 border border-white/10 rounded-bl-none shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {m.role === "galien" ? (
                            <>
                              <Bot className="size-3 text-[#c5a880]" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#c5a880]">Galien</span>
                            </>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">You</span>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap text-[12px] font-sans">{m.text}</div>
                      </div>
                    </div>
                  ))}

                  {chatting && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-none px-4 py-2.5 bg-[#171a24] border border-white/10 flex items-center gap-2">
                        <Loader2 className="size-3.5 text-[#c5a880] animate-spin" />
                        <span className="text-[11px] text-slate-400">Galien is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Prompt Suggestions */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    <span>Quick Questions:</span>
                    <button
                      onClick={handleReset}
                      className="text-[#c5a880] hover:underline normal-case flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="size-2.5" />
                      Test a different company
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        disabled={chatting}
                        className="rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] px-2.5 py-1 text-[10.5px] text-slate-300 text-left transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 focus-within:border-[#c5a880]/50 transition-colors">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Ask Galien anything about finding clients or sales strategy..."
                      disabled={chatting}
                      className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!chatInput.trim() || chatting}
                    className="flex size-9 items-center justify-center rounded-xl bg-white text-black hover:brightness-110 active:scale-95 disabled:opacity-30 transition-all shrink-0 cursor-pointer"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </div>

              {/* ── Irresistible Conversion CTA Banner ── */}
              <div className="rounded-2xl border border-[#c5a880]/30 bg-gradient-to-r from-[#171a24] via-[#1a1c29] to-[#171a24] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white">Ready to automate your sales pipeline?</div>
                  <div className="text-[11px] text-slate-400">Launch Galien for {companyName} • Connects to Gmail & Outlook</div>
                </div>

                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-xs font-bold text-black transition-all hover:brightness-110 shadow-md shrink-0 w-full sm:w-auto"
                  style={{ background: "linear-gradient(135deg,#ffffff,#cbd5e1)" }}
                >
                  Start Free 7-Day Trial
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </div>

            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
