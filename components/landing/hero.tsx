"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */
import { 
  Sparkles, 
  Play, 
  CheckCircle2, 
  Bot, 
  Search, 
  Mail, 
  CalendarCheck, 
  ArrowRight,
  User,
  Zap,
  Calendar
} from "lucide-react"
import { CtaLink } from "@/components/landing/cta-link"
import Link from "next/link"
import dynamic from "next/dynamic"

const HeroRobot3D = dynamic(
  () => import("@/components/hero-robot-3d").then((mod) => {
    const { RobotScene } = mod
    return { default: () => <RobotScene modelPath="/animations/Waving.fbx.glb" height="100%" scale={0.0363} positionY={-3.63} /> }
  }),
  { ssr: false }
)


export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-10 lg:pt-24 lg:pb-12 bg-transparent min-h-[70vh] flex items-center">
      {/* Background soft lighting glow */}
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[350px] bg-white/[0.015] blur-[120px] rounded-full pointer-events-none" />
      {/* Right side large glow behind robot */}
      <div className="absolute top-[10%] right-[5%] w-[600px] h-[600px] bg-[#c5a880]/[0.03] blur-[150px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 relative z-10 w-full">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">

          {/* Left Side: Copy & CTA (6 cols) */}
          <div className="max-w-2xl lg:col-span-6 z-20">
            {/* Badge */}
            <div className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur-md mb-4 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#728972]/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#728972]" />
              </span>
              Meet Galien — Your AI Sales Assistant
              <Sparkles className="h-3.5 w-3.5 text-[#c5a880]" />
            </div>

            {/* Headline */}
            <h1 className="anim-fade-up font-luxury-sans text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] font-light tracking-tight text-white leading-[1.1]" style={{ animationDelay: "0.1s" }}>
              Find clients. <br />
              Without lifting <br />
              <span className="font-luxury-serif italic text-gradient-gold font-normal">
                a finger.
              </span>
            </h1>

            {/* Description */}
            <p className="anim-fade-up mt-3.5 max-w-md text-slate-400 font-medium text-sm leading-relaxed" style={{ animationDelay: "0.2s" }}>
              Galien finds local businesses, writes a personal email for each one, and follows up when they reply. <span className="text-white font-semibold">You just show up to the meetings.</span>
            </p>

            {/* CTA Buttons */}
            <div className="anim-fade-up mt-5 flex flex-wrap items-center gap-3.5" style={{ animationDelay: "0.3s" }}>
              <div className="relative group">
                <div className="absolute -inset-1 rounded-xl bg-white/10 opacity-20 blur transition duration-500 group-hover:opacity-40" />
                <CtaLink
                  className="inline-flex items-center justify-center rounded-xl px-7 py-2.5 text-xs font-bold text-black transition-all hover:brightness-110 active:scale-[.98]"
                  style={{
                    background: "linear-gradient(135deg,#ffffff,#cbd5e1)",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)"
                  }}
                  authedChildren={<>Go to Dashboard <ArrowRight className="ml-2 h-3.5 w-3.5" /></>}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </CtaLink>
              </div>
              <Link href="/playground" className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-white/[0.06] hover:border-white/[0.15] shadow-sm backdrop-blur-md">
                <Play className="h-3.5 w-3.5 text-[#c5a880] transition-transform group-hover:scale-110" />
                Watch Demo
              </Link>
            </div>

            {/* Trust Markers */}
            <div className="anim-fade-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-slate-500 font-semibold" style={{ animationDelay: "0.4s" }}>
              {["Free 7-day trial", "Connects to Gmail & Outlook", "No credit card required"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#728972]" /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right Side: 3D Robot + Floating HUD Cards (6 cols) */}
          <div className="anim-scale-in relative lg:col-span-6 flex items-end justify-center w-full" style={{ animationDelay: "0.5s" }}>
            
            {/* Full-bleed robot canvas — NO card background */}
            <div className="relative w-full max-w-[550px] h-[480px] lg:h-[600px] mt-8 lg:mt-0">
              
              {/* Ambient glow behind the robot — anchored to bottom */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[10%] w-[360px] h-[360px] bg-[#c5a880]/[0.06] rounded-full blur-[100px] pointer-events-none z-0" />

              {/* 3D Robot Canvas (transparent, no bg) */}
              <div className="relative w-full h-full z-10 pointer-events-auto">
                <HeroRobot3D />
              </div>

              {/* ─── Floating HUD Cards ─── */}

              {/* Card 1: Concierge Execution Log — top-left */}
              <div className="absolute top-0 sm:top-2 left-0 sm:-left-4 z-0 w-[180px] sm:w-[210px] anim-fade-up scale-90 sm:scale-100 origin-top-left" style={{ animationDelay: "0.7s" }}>
                <div className="rounded-2xl border border-white/[0.08] bg-[#14161f]/80 backdrop-blur-xl p-3 sm:p-3.5 shadow-2xl">
                  <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1.5 mb-2.5">
                    <div className="h-5.5 w-5.5 rounded-lg bg-white/5 flex items-center justify-center text-white border border-white/10">
                      <Bot className="h-3 w-3 text-[#cbd5e1]" />
                    </div>
                    <div className="text-[10px] font-bold text-white tracking-tight">Concierge Execution</div>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#728972] animate-pulse ml-auto" />
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-2 text-[9.5px] font-medium leading-relaxed text-slate-300">
                      &quot;Find <span className="text-[#c5a880] font-bold">boutique hotels in Austin</span>...&quot;
                    </div>
                    <div className="space-y-1 pl-1">
                      <div className="flex items-center gap-2 text-[9px] text-slate-400">
                        <Search className="h-2.5 w-2.5 text-[#728972]" />
                        <span>Found 28 Austin hotels</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-200 font-bold">
                        <Mail className="h-2.5 w-2.5 text-[#c5a880]" />
                        <span className="flex items-center gap-1">
                          Drafting pitches
                          <span className="flex gap-0.5">
                            <span className="h-0.5 w-0.5 bg-slate-400 rounded-full animate-bounce" />
                            <span className="h-0.5 w-0.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Meeting Booked — bottom-right */}
              <div className="absolute bottom-2 sm:bottom-6 right-0 sm:-right-4 z-0 w-[160px] sm:w-[200px] anim-fade-up scale-90 sm:scale-100 origin-bottom-right" style={{ animationDelay: "0.9s" }}>
                <div className="rounded-2xl border border-white/[0.08] bg-[#14161f]/80 backdrop-blur-xl p-2.5 sm:p-3 shadow-2xl text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-[#728972]/15 border border-[#728972]/30 text-[#728972]">
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-[#728972] uppercase tracking-wider">Galien Result</div>
                      <div className="text-[12px] font-semibold mt-0.5 text-white">Meeting Booked!</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}