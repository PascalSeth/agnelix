"use client"

import { X, MapPin, Search, Calendar, ArrowRight, ShieldCheck, Mail, Sparkles as SparklesLucide } from "lucide-react"
import { ChatBubbleIcon } from "@/components/ui/chat-bubble-icon"

export function ProblemSolution() {
  const cards = [
    {
      id: "prospecting",
      badge: "Targeting & Discovery",
      uiOverlay: (
        <div className="absolute inset-0 flex items-center justify-center p-5">
          <div className="w-full max-w-[220px] rounded-xl border border-white/20 bg-black/75 backdrop-blur-md p-3 shadow-2xl space-y-2">
            <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
              <Search className="size-3 text-sky-400" />
              <span className="text-[10px] font-bold text-white">Target: B2B SaaS in Austin, TX</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded bg-emerald-500/10 px-2 py-1 border border-emerald-500/20">
                <span className="text-[9.5px] font-bold text-emerald-400">142 verified decision-makers</span>
                <MapPin className="size-3 text-emerald-400" />
              </div>
              <span className="text-[8.5px] text-white/40 block">99.2% Deliverability Verified</span>
            </div>
          </div>
        </div>
      ),
      problem: "You spend hours scraping Google Maps, buying outdated stale lists, and bouncing on generic info@ emails.",
      solution: "Galien identifies decision-makers, scrapes verified work emails, and checks active buying signals in seconds."
    },
    {
      id: "writing",
      badge: "Direct-Response Copywriting",
      uiOverlay: (
        <div className="absolute inset-0 flex items-center justify-center p-5">
          <div className="w-full max-w-[220px] rounded-xl border border-white/20 bg-black/75 backdrop-blur-md p-3 shadow-2xl space-y-1.5">
            <div className="flex items-center gap-1.5 pb-1 border-b border-white/10">
              <ChatBubbleIcon className="size-3.5" />
              <span className="text-[10px] font-bold text-white">Direct-Response Hook</span>
            </div>
            <p className="text-[9px] text-white/80 leading-relaxed">
              &quot;Hey John, noticed your client onboarding cycle is taking 14+ days. We built a sprint that cuts it to 48h...&quot;
            </p>
            <div className="flex justify-between items-center pt-1 text-[8.5px]">
              <span className="text-emerald-400 font-bold">✓ High Status / No Fluff</span>
              <span className="text-white/40">Step 1 Hook</span>
            </div>
          </div>
        </div>
      ),
      problem: "Generic templates get ignored or filtered to spam. Prospects can spot ChatGPT fluff within 2 seconds.",
      solution: "Galien reads the prospect's actual site and writes direct-response hooks using the Pain-Proof-Plan framework."
    },
    {
      id: "closing",
      badge: "24/7 Autopilot Rebuttal & Booking",
      uiOverlay: (
        <div className="absolute inset-0 flex items-center justify-center p-5">
          <div className="w-full max-w-[220px] rounded-xl border border-white/20 bg-black/75 backdrop-blur-md p-3 shadow-2xl space-y-2">
            <div className="rounded-lg bg-white/10 p-2 text-[9px] text-white/90">
              &quot;We already have an agency for this.&quot;
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="size-3 text-amber-400" />
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[9px] text-emerald-300 font-medium">
              <span className="font-bold block text-emerald-400 mb-0.5">Tactical Empathy Reframe:</span>
              &quot;Makes sense! We actually co-pilot alongside existing teams to handle the heavy sprint...&quot;
            </div>
          </div>
        </div>
      ),
      problem: "When a lead replies with an objection, slow response times or apologetic replies kill the deal before you can pitch.",
      solution: "Galien's smart timing matrix counters objections with tactical empathy and books calls on your calendar 24/7."
    }
  ]

  return (
    <section className="relative bg-gradient-to-b from-[#111216] via-[#161822] to-[#111216] py-24 lg:py-32 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-600/[0.03] blur-[150px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md shadow-sm">
            <ChatBubbleIcon className="size-3.5" />
            <span>The Old Way vs. The Autonomous System</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl font-luxury-sans">
            Stop losing agency pipeline to <span className="text-rose-400 line-through decoration-white/30">manual grunt work</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed">
            Replace fragmented scrapers, generic copy-paste templates, and slow follow-ups with an autonomous direct-response revenue machine.
          </p>
        </div>

        {/* 3 Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(card => (
            <div
              key={card.id}
              className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-xl group"
            >
              {/* Top Graphic Banner with UI Overlay */}
              <div className="relative h-48 w-full bg-gradient-to-b from-white/[0.04] to-black/40 border-b border-white/5 flex items-center justify-center">
                {card.uiOverlay}
              </div>

              {/* Problem vs Solution Content */}
              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between bg-[#14161f]/80">
                <div className="space-y-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/5 inline-block">
                    {card.badge}
                  </span>

                  {/* Problem */}
                  <div className="border-l-2 border-rose-500/40 pl-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-rose-400 uppercase tracking-wider">
                      <X className="size-3.5" /> The Broken Way
                    </div>
                    <p className="text-[12.5px] text-white/50 leading-relaxed">{card.problem}</p>
                  </div>

                  {/* Solution */}
                  <div className="border-l-2 border-emerald-500/60 pl-3 space-y-1 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider">
                      <ChatBubbleIcon className="size-3.5" /> With Galien OS
                    </div>
                    <p className="text-[13px] font-bold text-white/95 leading-relaxed">{card.solution}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}