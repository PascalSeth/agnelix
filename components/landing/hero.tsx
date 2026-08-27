"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react"
import {
  Play,
  CheckCircle2,
  Bot,
  Search,
  Mail,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck
} from "lucide-react"
import { CtaLink } from "@/components/landing/cta-link"
import { TryGalienModal } from "@/components/landing/try-galien-modal"
import dynamic from "next/dynamic"

const HeroRobot3D = dynamic(
  () => import("@/components/hero-robot-3d").then((mod) => {
    const { RobotScene } = mod
    return { default: () => <RobotScene modelPath="/model/robotmodel.draco.glb" animPath="/animations/low/Waving-low.fbx.glb" height="100%" scale={0.042} positionY={-2.0} rotate={false} orbitControls={false} /> }
  }),
  { ssr: false }
)

export function Hero() {
  const [tryOpen, setTryOpen] = useState(false)

  return (
    <section className="relative overflow-hidden pt-12 pb-10 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16 bg-transparent min-h-[75vh] flex items-center justify-center">
      {/* Background ambient lighting glows */}
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[350px] bg-white/[0.015] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[15%] right-[10%] w-[550px] h-[500px] bg-[#c5a880]/[0.06] blur-[160px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-12">

          {/* ── Left Column: Copy & CTA ── */}
          <div className="lg:col-span-6 w-full max-w-xl z-20 flex flex-col justify-center">
            {/* Status Badge */}
            <div className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 text-[11px] font-semibold text-slate-300 backdrop-blur-md mb-5 shadow-sm self-start">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#728972]/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#728972]" />
              </span>
              Meet Galien — Your Autonomous AI SDR
              <Sparkles className="h-3.5 w-3.5 text-[#c5a880]" />
            </div>

            {/* Headline */}
            <h1 className="anim-fade-up font-luxury-sans text-[2.4rem] sm:text-[3.25rem] lg:text-[3.65rem] font-light tracking-tight text-white leading-[1.08]" style={{ animationDelay: "0.1s" }}>
              Find clients. <br />
              Without lifting <br />
              <span className="font-luxury-serif italic text-gradient-gold font-normal">
                a finger.
              </span>
            </h1>

            {/* Description */}
            <p className="anim-fade-up mt-4 max-w-md text-slate-400 font-medium text-sm sm:text-base leading-relaxed" style={{ animationDelay: "0.2s" }}>
              Galien finds local businesses, writes a personal email for each one, and follows up when they reply. <span className="text-white font-semibold">You just show up to the meetings.</span>
            </p>

            {/* CTA Buttons */}
            <div className="anim-fade-up mt-6 flex flex-wrap items-center gap-3.5" style={{ animationDelay: "0.3s" }}>
              <div className="relative group">
                <div className="absolute -inset-1 rounded-xl bg-white/10 opacity-20 blur transition duration-500 group-hover:opacity-40" />
                <CtaLink
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3 text-xs font-bold text-black transition-all hover:brightness-110 active:scale-[.98]"
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
              <button
                onClick={() => setTryOpen(true)}
                className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-xs font-semibold text-slate-300 transition-all hover:bg-white/[0.06] hover:border-white/[0.15] shadow-sm backdrop-blur-md"
              >
                <Play className="h-3.5 w-3.5 text-[#c5a880] transition-transform group-hover:scale-110" />
                Try Galien
              </button>
            </div>

            {/* Trust Markers */}
            <div className="anim-fade-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 font-semibold" style={{ animationDelay: "0.4s" }}>
              {["Free 7-day trial", "Connects to Gmail & Outlook", "No credit card required"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#728972]" /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right Column: Holographic AI Nexus Stage ── */}
          <div className="lg:col-span-6 w-full flex items-center justify-center anim-scale-in" style={{ animationDelay: "0.4s" }}>
            <div className="relative w-full max-w-[500px] h-[380px] sm:h-[440px] lg:h-[480px] flex items-center justify-center">
              
              {/* 1. Volumetric Ambient Light Pool */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] bg-gradient-to-tr from-[#c5a880]/15 via-[#728972]/10 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />
              
              {/* 2. Holographic Ground Light Pedestal */}
              <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-[260px] sm:w-[320px] h-[50px] sm:h-[60px] bg-gradient-to-t from-[#c5a880]/20 to-transparent blur-xl rounded-[100%] pointer-events-none z-0" />
              
              {/* 3. Concentric Orbital Light Rings */}
              <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 w-[300px] sm:w-[360px] h-[70px] sm:h-[85px] border border-[#c5a880]/20 rounded-[100%] animate-[spin_35s_linear_infinite] pointer-events-none z-0" />
              <div className="absolute bottom-9 sm:bottom-12 left-1/2 -translate-x-1/2 w-[200px] sm:w-[250px] h-[45px] sm:h-[60px] border border-white/15 rounded-[100%] animate-pulse pointer-events-none z-0" />

              {/* 4. The 3D Robot Canvas */}
              <div className="relative w-full h-full z-10 pointer-events-auto">
                <HeroRobot3D />
              </div>

              {/* 5. Minimalist Holographic Orbital Signals (No Boxy Cards!) */}

              {/* Signal 1: Verified Leads Sourced (Upper Left) */}
              <div className="anim-luxury-float absolute top-8 sm:top-12 left-2 sm:-left-2 z-20 flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#14161f]/75 px-3.5 py-1.5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c5a880] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c5a880]" />
                </span>
                <span className="text-[11px] font-medium text-slate-200">Verified Leads</span>
                <span className="text-[10.5px] font-mono text-[#c5a880] font-bold">● 28 Sourced</span>
              </div>

              {/* Signal 2: Meeting Booked (Middle Right) */}
              <div className="anim-luxury-float-delayed absolute top-28 sm:top-32 right-1 sm:-right-3 z-20 flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#14161f]/75 px-3.5 py-1.5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#728972] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#728972]" />
                </span>
                <span className="text-[11px] font-medium text-slate-200">Meeting Confirmed</span>
                <CalendarCheck className="h-3 w-3 text-[#728972]" />
              </div>

              {/* Signal 3: Autopilot Live (Bottom Left) */}
              <div className="anim-luxury-float absolute bottom-14 sm:bottom-16 left-3 sm:left-1 z-20 flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#14161f]/75 px-3.5 py-1.5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <Bot className="h-3 w-3 text-[#c5a880]" />
                <span className="text-[11px] font-medium text-slate-300">Autopilot</span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">100% Autonomous</span>
              </div>

            </div>
          </div>

        </div>
      </div>

      <TryGalienModal open={tryOpen} onOpenChange={setTryOpen} />
    </section>
  )
}