"use client"

import { Rocket, Search, Share2, TrendingUp, Layout, DollarSign, ArrowRight } from "lucide-react"
import { ChatBubbleIcon } from "@/components/ui/chat-bubble-icon"
import { CtaLink } from "@/components/landing/cta-link"

export function Verticals() {
  const workspaces = [
    {
      id: "sales",
      title: "Sales OS (Outbound Closer)",
      job: "Book qualified discovery meetings on autopilot",
      icon: Rocket,
      accent: "#818cf8",
      tags: ["B2B SaaS", "Consulting", "Recruitment"],
      persona: "AI Closer",
    },
    {
      id: "seo",
      title: "SEO OS (Audit & Search)",
      job: "Spot businesses losing organic rank & generate audit hooks",
      icon: Search,
      accent: "#34d399",
      tags: ["Dental & Legal", "Roofing & HVAC", "E-commerce"],
      persona: "AI SEO Analyst",
    },
    {
      id: "social_media",
      title: "Social OS (Creative Engine)",
      job: "Synthesize 30-day viral content calendars & DM hooks",
      icon: Share2,
      accent: "#fb7185",
      tags: ["MedSpas & Beauty", "Gyms", "Real Estate"],
      persona: "AI Creative Director",
    },
    {
      id: "ppc",
      title: "PPC OS (Media Buyer)",
      job: "Calculate break-even ROAS targets & high-intent ad angles",
      icon: TrendingUp,
      accent: "#38bdf8",
      tags: ["D2C Brands", "Cosmetics", "Home Services"],
      persona: "AI Media Buyer",
    },
    {
      id: "web_design",
      title: "Web Studio (UX & Redesign)",
      job: "Diagnose site friction, low trust, and generate redesign proposals",
      icon: Layout,
      accent: "#a78bfa",
      tags: ["Tech Startups", "Boutique Law", "Fine Dining"],
      persona: "AI UX Consultant",
    },
    {
      id: "finance",
      title: "CFO OS (Retainer Health)",
      job: "Track client runway, gross margins, and churn danger signals",
      icon: DollarSign,
      accent: "#fbbf24",
      tags: ["Funded Seed Startups", "Agencies", "Healthcare"],
      persona: "AI Fractional CFO",
    },
  ]

  return (
    <section className="relative bg-[#0b0c10] py-24 lg:py-32 overflow-hidden" id="workspaces">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[450px] bg-violet-600/[0.02] blur-[160px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md shadow-sm">
            <ChatBubbleIcon className="size-3.5" />
            <span>Specialized Agency Workspaces</span>
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl font-luxury-sans">
            Calibrated for your exact{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d5b8]">
              agency service line.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed">
            Galien switches AI specialist personas, voice guidelines, and objection playbooks to match the specific service you deliver.
          </p>
        </div>

        {/* 6 Workspace Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map(ws => {
            const Icon = ws.icon
            return (
              <div
                key={ws.id}
                className="group relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="p-2.5 rounded-xl border shadow-md flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${ws.accent}15`,
                        borderColor: `${ws.accent}30`,
                        color: ws.accent,
                      }}
                    >
                      <Icon className="size-5" />
                    </div>

                    <span
                      className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${ws.accent}10`,
                        color: ws.accent,
                        borderColor: `${ws.accent}20`,
                        borderWidth: "1px",
                      }}
                    >
                      {ws.persona}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white">{ws.title}</h3>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">{ws.job}</p>
                  </div>

                  {/* Niche Tag Cloud */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ws.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}