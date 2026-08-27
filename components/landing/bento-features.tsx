"use client"

import { MapPin, Brain, Bot, BarChart3, Zap, Swords, Mail, User, Crosshair, FileUp, ShieldCheck, Globe, Sparkles } from "lucide-react"
import { ChatBubbleIcon } from "@/components/ui/chat-bubble-icon"

export function BentoFeatures() {
  return (
    <section className="relative bg-[#0d0e12] py-24 lg:py-32 overflow-hidden" id="features">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-[#c5a880]/[0.03] blur-[140px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md shadow-sm">
            <ChatBubbleIcon className="size-3.5" />
            <span>Autonomous Agency Capabilities</span>
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl font-luxury-sans">
            Every pipeline tool you need,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d5b8]">
              in one autonomous OS.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed">
            Eliminate disconnected scrapers, template plugins, and clunky CRMs. Galien discovers leads, drafts direct-response hooks, overcomes objections, and tracks revenue.
          </p>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5">
          {/* Card 1: Verified Lead Discovery */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-7 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <Crosshair className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                  Discovery Engine
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">Verified Lead Discovery</h3>
              <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed">
                Extract high-intent decision-makers, direct emails, phone numbers, and buying signals across Google Maps, LinkedIn, and local business directories with zero bounce risk.
              </p>
            </div>
          </div>

          {/* Card 2: Direct-Response Copywriting */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-7 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Brain className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  Sales Psychology
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">Direct-Response Copywriting</h3>
              <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed">
                Trained on proven direct-response frameworks (Pain-Proof-Plan, Tactical Empathy, High-Status Positioning). Galien crafts emails that command attention without looking like generic AI.
              </p>
            </div>
          </div>

          {/* Card 3: PDF Sales SOP Ingestion */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-7 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <FileUp className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                  Company Memory
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">PDF Sales SOP Ingestion</h3>
              <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed">
                Drag and drop your company handbooks, pricing decks, or onboarding SOPs. Galien dynamically extracts strict company rules and enforces them across your entire team.
              </p>
            </div>
          </div>

          {/* Card 4: 24/7 Autopilot Objection Handling */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-7 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Bot className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Smart Rebuttal
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">24/7 Objection Rebuttals</h3>
              <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed">
                When a prospect replies with pricing pushback or &quot;send more info&quot;, Galien uses calm consulting authority to reframe the value and book the call on your calendar.
              </p>
            </div>
          </div>

          {/* Card 5: Pipeline & Telemetry Insights */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-7 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <BarChart3 className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                  Pipeline Intelligence
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">Telemetry & Insights Hub</h3>
              <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed">
                Visual funnel drop-off charts, 7-day reply trends, objection heatmaps, and 1-click Galien AI strategic briefings to unblock pipeline bottlenecks instantly.
              </p>
            </div>
          </div>

          {/* Card 6: White-Label Client Portals */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-7 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                  <Globe className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                  Agency Scale
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">White-Label Client Portals</h3>
              <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed">
                Deliver custom-branded client dashboards, real-time ROI reports, and dedicated proposals under your own domain to impress retainers and scale enterprise contracts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}