/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Check, ArrowUpRight, GitBranch, Search, Megaphone, 
  Bot, Mail, Zap, ShieldCheck, HelpCircle, ArrowRight,
  Sliders, Sparkles, BookOpen, Clock, AlertCircle, ChevronRight,
  Layers, CheckCircle2, ChevronDown, ChevronUp, Eye
} from "lucide-react"
import Link from "next/link"

const ICON_MAP: Record<string, any> = {
  GitBranch,
  Search,
  Megaphone,
  Mail,
  Bot,
  Sliders,
  Zap,
}

export type Step = {
  key: string
  label: string
  desc: string
  href: string
  cta: string
  icon: string
  done: boolean
  priority?: "HIGH" | "MEDIUM" | "OPTIONAL"
  tag?: string
  timeEst?: string
}

interface GettingStartedModalProps {
  steps: Step[]
}

// ─── Main Guide Modal ─────────────────────────────────────────────────────────

export function GettingStartedModal({ steps }: GettingStartedModalProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"checklist" | "how-it-works" | "tips">("checklist")
  const [dismissed, setDismissed] = useState(true)

  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length
  const progressPct = Math.round((doneCount / steps.length) * 100)

  useEffect(() => {
    const isDismissed = localStorage.getItem("galien-guide-dismissed") === "true"
    setDismissed(isDismissed)

    // Auto open on first visit if core AI setup is incomplete
    const smtpStep = steps.find(s => s.key === "smtp")
    const isNewUser = (!smtpStep?.done || !allDone) && !isDismissed
    if (isNewUser) {
      setOpen(true)
    }
  }, [allDone, steps])

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) {
      localStorage.setItem("galien-guide-dismissed", "true")
      setDismissed(true)
    }
  }

  // Find next pending action
  const nextPendingStep = steps.find(s => !s.done)

  return (
    <>
      {/* Trigger Button in Dashboard Header */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border cursor-pointer group"
        style={{
          background: allDone
            ? "rgba(52,211,153,.08)"
            : "linear-gradient(135deg, rgba(124,131,253,.15) 0%, rgba(99,102,241,.06) 100%)",
          borderColor: allDone ? "rgba(52,211,153,.2)" : "rgba(124,131,253,.25)",
          color: allDone ? "#34d399" : "#c7d2fe",
          boxShadow: allDone ? "none" : "0 0 15px rgba(124,131,253,0.15)",
        }}
      >
        <Bot className={`size-3.5 ${allDone ? "text-emerald-400" : "text-indigo-300 animate-pulse"}`} />
        <span>{allDone ? "System Guide" : "AI Setup Guide"}</span>
        <span
          className="px-1.5 py-0.5 rounded-md text-[10px] font-black"
          style={{
            background: allDone ? "rgba(52,211,153,.2)" : "rgba(124,131,253,.25)",
            color: allDone ? "#34d399" : "#ffffff",
          }}
        >
          {doneCount}/{steps.length}
        </span>
      </button>

      {/* Guide Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[620px] max-h-[88vh] bg-[#0c0d14] border border-white/[0.08] p-0 overflow-hidden text-white rounded-2xl shadow-2xl flex flex-col">
          <div
            className="p-5 sm:p-6 flex flex-col max-h-[88vh] overflow-hidden"
            style={{
              background: "linear-gradient(160deg, rgba(26,28,42,0.92) 0%, rgba(10,11,18,0.98) 100%)",
            }}
          >
            {/* Header */}
            <DialogHeader className="mb-4 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300/80">
                      Quickstart Guide
                    </span>
                  </div>
                  <DialogTitle className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    Welcome to Galien AI
                    <Sparkles className="size-4 text-indigo-400 inline-block" />
                  </DialogTitle>
                  <p className="text-[12px] text-white/50 mt-0.5 leading-snug">
                    Follow these 4 essential steps to configure your AI agent, set autopilot rules, and launch automated outreach.
                  </p>
                </div>

                {/* Progress Circle Badge */}
                <div
                  className="shrink-0 flex flex-col items-center justify-center rounded-xl p-2 border"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "rgba(255,255,255,0.06)",
                    minWidth: 72,
                  }}
                >
                  <span className="text-[15px] font-black text-white leading-none">{progressPct}%</span>
                  <span className="text-[9px] font-semibold text-white/40 uppercase tracking-wider mt-0.5">
                    {doneCount}/{steps.length} done
                  </span>
                </div>
              </div>

              {/* Progress bar line */}
              <div className="w-full bg-white/[0.06] h-1 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #6366f1, #818cf8, #a78bfa)",
                  }}
                />
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 mt-3.5 border-b border-white/[0.06] pb-2">
                {[
                  { id: "checklist", label: "Setup Checklist", count: `${doneCount}/${steps.length}` },
                  { id: "how-it-works", label: "How the System Works" },
                  { id: "tips", label: "AI Tips & Deliverability" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    style={{
                      background: activeTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent",
                      color: activeTab === tab.id ? "#ffffff" : "rgba(255,255,255,0.45)",
                      border: activeTab === tab.id ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                    }}
                  >
                    <span>{tab.label}</span>
                    {tab.count && (
                      <span
                        className="px-1 py-0.2 rounded text-[9px] font-bold"
                        style={{
                          background: allDone ? "rgba(52,211,153,0.2)" : "rgba(124,131,253,0.2)",
                          color: allDone ? "#34d399" : "#c7d2fe",
                        }}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </DialogHeader>

            {/* TAB 1: SETUP CHECKLIST */}
            {activeTab === "checklist" && (
              <div className="overflow-y-auto max-h-[55vh] pr-1 space-y-2.5 scrollbar-thin">
                {steps.map((step, idx) => {
                  const Icon = ICON_MAP[step.icon] || Check
                  const isNext = !step.done && step.key === nextPendingStep?.key

                  return (
                    <div
                      key={step.key}
                      className="group relative flex flex-col gap-2 rounded-xl p-3.5 transition-all duration-150"
                      style={{
                        background: step.done
                          ? "rgba(52,211,153,.025)"
                          : isNext
                          ? "rgba(124,131,253,.06)"
                          : "rgba(255,255,255,.015)",
                        border: step.done
                          ? "1px solid rgba(52,211,153,.15)"
                          : isNext
                          ? "1px solid rgba(124,131,253,.25)"
                          : "1px solid rgba(255,255,255,.05)",
                      }}
                    >
                      {/* Top row: Icon + Title + Tag + CTA Button */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Icon badge */}
                          <div
                            className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background: step.done
                                ? "rgba(52,211,153,.15)"
                                : isNext
                                ? "rgba(124,131,253,.2)"
                                : "rgba(255,255,255,.05)",
                              border: step.done
                                ? "1px solid rgba(52,211,153,.3)"
                                : isNext
                                ? "1px solid rgba(124,131,253,.35)"
                                : "1px solid rgba(255,255,255,.06)",
                            }}
                          >
                            {step.done ? (
                              <Check className="size-3.5 text-emerald-400" />
                            ) : (
                              <Icon className={`size-3.5 ${isNext ? "text-indigo-300" : "text-white/40"}`} />
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-[13px] font-bold text-white/90">
                              {step.label}
                            </span>
                            {step.tag && (
                              <span
                                className="text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded"
                                style={{
                                  background: step.done
                                    ? "rgba(52,211,153,0.12)"
                                    : isNext
                                    ? "rgba(124,131,253,0.18)"
                                    : "rgba(255,255,255,0.04)",
                                  color: step.done ? "#34d399" : isNext ? "#c7d2fe" : "rgba(255,255,255,0.35)",
                                }}
                              >
                                {step.tag}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA action button */}
                        <Link
                          href={step.href}
                          onClick={() => handleOpenChange(false)}
                          className="shrink-0 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            background: step.done
                              ? "rgba(52,211,153,.08)"
                              : isNext
                              ? "linear-gradient(135deg,#7c83fd,#5a61d6)"
                              : "rgba(255,255,255,.04)",
                            color: step.done
                              ? "#34d399"
                              : isNext
                              ? "#ffffff"
                              : "rgba(255,255,255,.7)",
                            border: step.done
                              ? "1px solid rgba(52,211,153,.2)"
                              : isNext
                              ? "1px solid rgba(124,131,253,.4)"
                              : "1px solid rgba(255,255,255,.06)",
                          }}
                        >
                          {step.done ? "Settings" : step.cta}
                          <ArrowUpRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>

                      {/* Full un-truncated description */}
                      <p className="text-[12px] text-white/55 leading-relaxed pl-9.5">
                        {step.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* TAB 2: HOW THE SYSTEM WORKS */}
            {activeTab === "how-it-works" && (
              <div className="overflow-y-auto max-h-[55vh] pr-1 space-y-3 scrollbar-thin">
                {[
                  {
                    step: "01",
                    title: "1. Intelligent Prospecting",
                    icon: Search,
                    desc: "Galien surfaces high-fit prospective clients based on your agency focus, analyzes their market presence, and writes tailored AI icebreakers.",
                    accent: "#818cf8",
                  },
                  {
                    step: "02",
                    title: "2. Personalized Sequence Outreach",
                    icon: Mail,
                    desc: "Sends multi-step bespoke outreach sequences tailored to each prospect with high-deliverability timing.",
                    accent: "#38bdf8",
                  },
                  {
                    step: "03",
                    title: "3. Real-Time Reply Intelligence & Booking",
                    icon: Zap,
                    desc: "Monitors your conversations 24/7. When a prospect replies, Galien generates strategic battlecards and drafts intelligent responses to book meetings.",
                    accent: "#34d399",
                  },
                ].map(card => {
                  const Icon = card.icon
                  return (
                    <div
                      key={card.step}
                      className="rounded-xl p-3.5 border flex items-start gap-3"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        borderColor: "rgba(255,255,255,0.05)",
                      }}
                    >
                      <div
                        className="size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${card.accent}15`, border: `1px solid ${card.accent}25` }}
                      >
                        <Icon className="size-4" style={{ color: card.accent }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-bold text-white/90">{card.title}</p>
                          <span className="text-[10px] font-black text-white/20">{card.step}</span>
                        </div>
                        <p className="text-[12px] text-white/50 mt-1 leading-relaxed">{card.desc}</p>
                      </div>
                    </div>
                  )
                })}

                <div
                  className="rounded-xl p-3.5 border flex items-center justify-between gap-3"
                  style={{ background: "rgba(124,131,253,0.04)", borderColor: "rgba(124,131,253,0.12)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <Bot className="size-4.5 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[12.5px] font-bold text-white/90">Always-On Autonomous Engine</p>
                      <p className="text-[11.5px] text-white/45 leading-relaxed">
                        Galien operates seamlessly around the clock — outreach pacing, reply detection, and meeting coordination continue running even when you&apos;re offline.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/settings/autopilot"
                    onClick={() => handleOpenChange(false)}
                    className="shrink-0 text-[11.5px] font-bold text-indigo-300 hover:underline"
                  >
                    Autopilot →
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 3: AI TIPS & DELIVERABILITY */}
            {activeTab === "tips" && (
              <div className="overflow-y-auto max-h-[55vh] pr-1 space-y-2.5 scrollbar-thin">
                {[
                  {
                    title: "1. Connect an App Password for Gmail",
                    desc: "In Google Account → Security → 2-Step Verification, generate a 16-character App Password to allow Galien to send securely.",
                    link: "/settings/agency",
                    linkText: "Configure",
                  },
                  {
                    title: "2. Set a 15-Minute Review Window",
                    desc: "Autopilot holds reply drafts in a review queue so you can inspect them before auto-sending to prospective clients.",
                    link: "/settings/autopilot",
                    linkText: "Adjust",
                  },
                  {
                    title: "3. Use Personalization Tags",
                    desc: "Insert tags like {{company}}, {{firstName}}, and {{painPoint}} to let Galien dynamically personalize outreach copy for every lead.",
                    link: "/sequences",
                    linkText: "Sequences",
                  },
                  {
                    title: "4. Add Your Calendar Booking Link",
                    desc: "When leads express interest or ask for a call, Galien automatically embeds your tracked Calendly/Cal.com link in replies.",
                    link: "/settings/agency",
                    linkText: "Add Link",
                  },
                ].map(tip => (
                  <div
                    key={tip.title}
                    className="rounded-xl p-3.5 border flex items-start justify-between gap-3"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-white/85">{tip.title}</p>
                      <p className="text-[11.5px] text-white/45 mt-0.5 leading-relaxed">{tip.desc}</p>
                    </div>
                    <Link
                      href={tip.link}
                      onClick={() => handleOpenChange(false)}
                      className="shrink-0 text-[11.5px] font-bold text-indigo-300 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                    >
                      {tip.linkText} →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}

// ─── Persistent Dashboard Setup Banner ────────────────────────────────────────

interface AiQuickstartBannerProps {
  steps: Step[]
}

export function AiQuickstartBanner({ steps }: AiQuickstartBannerProps) {
  const [collapsed, setCollapsed] = useState(false)
  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length
  const progressPct = Math.round((doneCount / steps.length) * 100)

  // Find next pending action
  const nextPendingStep = steps.find(s => !s.done)
  const isSmtpMissing = !steps.find(s => s.key === "smtp")?.done

  // If all completed, hide banner automatically
  if (allDone) return null

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 border animate-fadeIn"
      style={{
        background: isSmtpMissing
          ? "linear-gradient(135deg, rgba(30, 24, 45, 0.75) 0%, rgba(15, 12, 25, 0.5) 100%)"
          : "linear-gradient(135deg, rgba(24, 28, 45, 0.7) 0%, rgba(12, 14, 25, 0.45) 100%)",
        borderColor: isSmtpMissing ? "rgba(244,63,94,0.25)" : "rgba(124,131,253,0.25)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{
                background: isSmtpMissing ? "rgba(244,63,94,0.15)" : "rgba(124,131,253,0.15)",
                color: isSmtpMissing ? "#fb7185" : "#a5b4fc",
                border: isSmtpMissing ? "1px solid rgba(244,63,94,0.3)" : "1px solid rgba(124,131,253,0.3)",
              }}
            >
              <Bot className="size-3 animate-pulse" />
              {isSmtpMissing ? "Step 1: Primary AI Setup Required" : "System Setup in Progress"}
            </span>
            <span className="text-[11px] font-bold text-white/40">
              {doneCount} of {steps.length} steps complete ({progressPct}%)
            </span>
          </div>

          <h3 className="text-[17px] font-black text-white/95 tracking-tight">
            {isSmtpMissing
              ? "Connect your sending email so Galien AI can reach prospects"
              : nextPendingStep
              ? `Next: ${nextPendingStep.label}`
              : "Complete your agency setup"}
          </h3>
          <p className="text-[12.5px] text-white/45 max-w-xl leading-relaxed">
            {isSmtpMissing
              ? "Connect your email sending account to activate automated outreach campaigns and 24/7 intelligent reply handling."
              : nextPendingStep?.desc || "Complete these quick steps to get full autonomous pipeline capabilities."}
          </p>
        </div>

        {/* Action Button & Progress */}
        <div className="flex items-center gap-3 shrink-0">
          {nextPendingStep && (
            <Link
              href={nextPendingStep.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-black text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
              style={{
                background: isSmtpMissing
                  ? "linear-gradient(135deg, #e11d48, #be123c)"
                  : "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: isSmtpMissing
                  ? "0 4px 20px rgba(225,29,72,0.35), inset 0 1px 0 rgba(255,255,255,0.3)"
                  : "0 4px 20px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
            >
              <Zap className="size-4 fill-white" />
              {nextPendingStep.cta}
              <ArrowRight className="size-4" />
            </Link>
          )}

          <GettingStartedModal steps={steps} />
        </div>
      </div>

      {/* Step Pills Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/[0.06]">
        {steps.map((s, idx) => (
          <Link
            key={s.key}
            href={s.href}
            className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-150 group/pill"
            style={{
              background: s.done ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.02)",
              border: s.done ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              className="size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
              style={{
                background: s.done ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)",
                color: s.done ? "#34d399" : "rgba(255,255,255,0.4)",
              }}
            >
              {s.done ? <Check className="size-3 text-emerald-400" /> : idx + 1}
            </div>
            <span
              className="text-[11.5px] font-bold truncate group-hover/pill:text-white transition-colors"
              style={{ color: s.done ? "#34d399" : "rgba(255,255,255,0.6)" }}
            >
              {s.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

