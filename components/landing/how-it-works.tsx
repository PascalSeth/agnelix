"use client"

import { MapPin, Search, Mail, Bot, ArrowRight, Upload, Layers, ShieldCheck, CalendarCheck } from "lucide-react"
import { ChatBubbleIcon } from "@/components/ui/chat-bubble-icon"

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: Layers,
      title: "Calibrate Playbook & SOPs",
      desc: "Select your operating workspace (Sales, SEO, Social, PPC, Web, CFO) or drag & drop your sales PDF handbook. Galien learns your company rules in seconds.",
      badge: "1. Calibration",
      accent: "#818cf8",
    },
    {
      step: "02",
      icon: Search,
      title: "Discover Verified Leads",
      desc: "Specify your dream ICP and location. Galien extracts real decision-makers, verified direct emails, and key buying signals without bounce risk.",
      badge: "2. Prospecting",
      accent: "#38bdf8",
    },
    {
      step: "03",
      icon: Mail,
      title: "Direct-Response Outreach",
      desc: "Galien drafts multi-step email sequences customized to each prospect's acute pain points using master sales psychology (Pain, Proof, Plan).",
      badge: "3. Copywriting",
      accent: "#34d399",
    },
    {
      step: "04",
      icon: CalendarCheck,
      title: "Autopilot Rebuttal & Booking",
      desc: "When leads reply with questions or objections, Galien applies tactical empathy reframing, overcomes pushback, and books meetings on your calendar 24/7.",
      badge: "4. Closing",
      accent: "#c5a880",
    },
  ]

  return (
    <section className="relative overflow-hidden bg-[#0e0f14] py-24 lg:py-32" id="how-it-works">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[85%] rounded-full bg-gradient-to-r from-violet-600/[0.03] to-[#c5a880]/[0.03] blur-[140px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10 space-y-20">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md shadow-sm">
            <ChatBubbleIcon className="size-3.5" />
            <span>Autonomous Pipeline Engine</span>
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl font-luxury-sans">
            From cold prospect to booked meeting in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d5b8]">
              four automated steps.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed">
            No messy spreadsheets. No rookie templates. One unified operating system takes your agency from zero to booked discovery calls.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-xl"
              >
                {/* Giant Background Step Number */}
                <span className="absolute -top-4 -right-1 text-7xl font-black text-white/[0.03] select-none font-mono group-hover:text-white/[0.06] transition-colors">
                  {item.step}
                </span>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div
                      className="p-3 rounded-2xl border shadow-md flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${item.accent}15`,
                        borderColor: `${item.accent}30`,
                        color: item.accent,
                      }}
                    >
                      <Icon className="size-6" />
                    </div>

                    <span
                      className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${item.accent}10`,
                        color: item.accent,
                        borderColor: `${item.accent}20`,
                        borderWidth: "1px",
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white font-luxury-sans group-hover:text-white/95 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}