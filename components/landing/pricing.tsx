"use client"

import { useState } from "react"
import { Check, ShieldCheck, ArrowRight } from "lucide-react"
import { ChatBubbleIcon } from "@/components/ui/chat-bubble-icon"
import { CtaLink } from "@/components/landing/cta-link"

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true)

  const tiers = [
    {
      name: "Starter",
      monthlyPrice: "$97",
      annualPrice: "$79",
      desc: "For solo agency founders launching outreach.",
      aiCredits: "1,000 AI Credits",
      leadCredits: "500 Leads / mo",
      workspaces: "1 Workspace OS",
      highlight: false,
      features: [
        "1,000 AI Generation Credits / mo",
        "500 Lead discovery credits / mo",
        "1 Specialized Workspace (e.g. Sales OS)",
        "Direct-response email templates",
        "AI inbox reply drafting",
        "1 user seat • 1 connected inbox",
      ],
    },
    {
      name: "Growth",
      monthlyPrice: "$297",
      annualPrice: "$247",
      desc: "For growing agencies scaling meetings & deals.",
      aiCredits: "5,000 AI Credits",
      leadCredits: "2,500 Leads / mo",
      workspaces: "3 Workspaces OS",
      highlight: true,
      badge: "Most Popular",
      features: [
        "5,000 AI Generation Credits / mo",
        "2,500 Lead discovery credits / mo",
        "3 Active Workspaces (Sales + SEO + Social)",
        "24/7 Smart Autopilot & Timing Matrix",
        "Plain-English AI Rule Synthesizer",
        "Visual Pipeline Insights Hub & Charts",
        "5 user seats • 5 connected inboxes",
      ],
    },
    {
      name: "Scale",
      monthlyPrice: "$697",
      annualPrice: "$597",
      desc: "For 6-figure agencies with multiple service lines.",
      aiCredits: "20,000 AI Credits",
      leadCredits: "10,000 Leads / mo",
      workspaces: "All 6 Workspaces",
      highlight: false,
      badge: "Full Scale",
      features: [
        "20,000 AI Generation Credits / mo",
        "10,000 Lead discovery credits / mo",
        "All 6 Workspaces Unlocked (Sales, SEO, Social, PPC, Web, CFO)",
        "Full PDF Sales SOP & Manual Ingestion",
        "White-Label Client Portals & Custom Domains",
        "15 user seats • Unlimited inboxes",
      ],
    },
    {
      name: "Enterprise",
      monthlyPrice: "$1,997+",
      annualPrice: "$1,597+",
      desc: "For high-volume agency networks & custom ops.",
      aiCredits: "100,000+ Credits",
      leadCredits: "50,000+ Leads / mo",
      workspaces: "Custom Workspaces",
      highlight: false,
      features: [
        "100,000+ AI Credits / mo (Auto-scaling)",
        "50,000+ Lead discovery credits / mo",
        "Custom trained AI models on your brand archive",
        "Dedicated Pipeline Strategist & Account Manager",
        "Full API & Webhook developer access",
        "Unlimited seats • Unlimited inboxes",
      ],
    },
  ]

  return (
    <section className="relative py-24 bg-[#0d0e12] overflow-hidden" id="pricing">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-r from-violet-600/[0.04] via-[#c5a880]/[0.03] to-emerald-600/[0.03] blur-[140px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10 space-y-12">
        {/* Clean, Focused Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md shadow-sm">
            <ChatBubbleIcon className="size-4" />
            <span>Galien Agency Pricing</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-luxury-sans">
            Simple, Transparent Plans
          </h2>

          <p className="text-sm sm:text-base text-white/50 font-medium">
            Dedicated AI generation credits, verified lead discovery, and specialized agency workspaces.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold transition-colors ${!isAnnual ? "text-white" : "text-white/40"}`}>
              Monthly
            </span>

            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-12 h-6.5 rounded-full p-0.5 bg-white/10 border border-white/15 transition-colors relative flex items-center cursor-pointer"
              aria-label="Toggle Annual Billing"
            >
              <div
                className={`size-5 rounded-full bg-[#c5a880] shadow-md transition-all duration-200 transform ${
                  isAnnual ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>

            <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isAnnual ? "text-white" : "text-white/40"}`}>
              Annual
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* 4 Clean Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map(tier => {
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice

            return (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 flex flex-col justify-between relative transition-all duration-200 ${
                  tier.highlight
                    ? "bg-[#141720] border-2 border-[#c5a880] shadow-[0_0_35px_rgba(197,168,128,0.12)] scale-[1.02] z-10"
                    : "bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[9.5px] font-black uppercase tracking-wider bg-[#c5a880] text-black shadow-md">
                    {tier.badge}
                  </span>
                )}

                <div className="space-y-4">
                  {/* Title & Price */}
                  <div>
                    <h3 className="text-lg font-black text-white">{tier.name}</h3>
                    <p className="text-xs text-white/40 mt-1 min-h-[32px] leading-relaxed">{tier.desc}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-white font-mono">{price}</span>
                      <span className="text-xs text-white/40 font-semibold">/month</span>
                    </div>
                  </div>

                  {/* 3 Core Metric Highlights */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-[11.5px]">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 flex items-center gap-1.5 font-medium">
                        <ChatBubbleIcon className="size-3.5" /> AI Credits:
                      </span>
                      <span className="text-amber-300 font-bold font-mono">{tier.aiCredits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 font-medium">👥 Leads:</span>
                      <span className="text-sky-300 font-bold font-mono">{tier.leadCredits}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-white/50 font-medium">🗂️ Workspaces:</span>
                      <span className="text-white font-bold">{tier.workspaces}</span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2 pt-1 text-[11.5px]">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-white/70 leading-tight">
                        <Check className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="pt-6">
                  {tier.name === "Enterprise" ? (
                    <a
                      href="mailto:hello@galien.com"
                      className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-white/5 text-white hover:bg-white/10 border border-white/10 block transition-all"
                    >
                      Contact Sales
                    </a>
                  ) : (
                    <CtaLink
                      className={`w-full py-2.5 rounded-xl text-center text-xs font-black block transition-all shadow-md ${
                        tier.highlight
                          ? "bg-[#ffffff] text-black hover:bg-[#e2e8f0]"
                          : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                      }`}
                      authedHref="/settings/agency"
                      authedChildren="Upgrade Plan"
                    >
                      Start Free 14-Day Trial
                    </CtaLink>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Clean Bottom Trust & Guarantee Bar */}
        <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.015] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">14-Day 100% Risk-Free Guarantee</p>
              <p className="text-[11.5px] text-white/40">
                Cancel anytime in 14 days for a full refund. Need extra AI credits? Top up anytime (1,000 for $29, 5,000 for $99).
              </p>
            </div>
          </div>

          <CtaLink
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 whitespace-nowrap transition-all"
            authedHref="/dashboard"
            authedChildren="Go to Workspace"
          >
            Get Started Now
          </CtaLink>
        </div>
      </div>
    </section>
  )
}
