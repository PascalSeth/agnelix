"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */
import { Mail, Bot, MapPin, Workflow, ArrowRight, CheckCircle2, Zap, Calendar, Clock, Check } from "lucide-react"
import { CtaLink } from "@/components/landing/cta-link"
import dynamic from "next/dynamic"

const CtaRobot3D = dynamic(
  () => import("@/components/hero-robot-3d").then((mod) => {
    const { RobotScene } = mod
    return { default: () => <RobotScene modelPath="/model/robotmodel.draco.glb" animPath="/animations/low/Looking Around-low.fbx.glb" height="100%" rotate={false} orbitControls={false} scale={0.055} positionY={-2.5} /> }
  }),
  { ssr: false }
)

export function FinalCTA() {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden bg-[#0A0B0E]">
      
      {/* Grand Finale Background Glows */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute h-[800px] w-[800px] rounded-full bg-gradient-to-tr from-[#c5a880]/10 to-transparent blur-[120px]" />
        <div className="absolute h-[400px] w-[400px] rounded-full bg-[#c5a880]/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        
        {/* The Glass Capsule */}
        <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#16181D]/60 backdrop-blur-2xl p-8 py-16 lg:p-16 shadow-[0_0_80px_rgba(197,168,128,0.05)] transition-all duration-700 hover:border-[#c5a880]/30 hover:shadow-[0_0_100px_rgba(197,168,128,0.1)]">
          
          {/* Internal Top Glow */}
          <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-[#c5a880]/50 to-transparent" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-[80%] rounded-full bg-[#c5a880]/10 blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column (Content) */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Status Badge */}
              <div className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-300 mb-8" style={{ animationDelay: "0.1s" }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Ready when you are
              </div>

              {/* Headline */}
              <h2 className="anim-fade-up text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl font-luxury-sans leading-tight" style={{ animationDelay: "0.2s" }}>
                Ready to put your
                <br />
                <span className="font-luxury-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d5b8] font-normal">
                  sales on autopilot?
                </span>
              </h2>

              {/* Subheadline */}
              <p className="anim-fade-up mt-6 max-w-2xl text-base lg:text-lg text-slate-400 font-medium leading-relaxed" style={{ animationDelay: "0.3s" }}>
                Stop searching for leads and writing emails by hand. Galien finds businesses, writes the emails, and replies to interested leads — <span className="text-white">you just wake up to a full calendar.</span>
              </p>

              <div className="anim-fade-up mt-10 flex flex-col items-center lg:items-start gap-6 w-full" style={{ animationDelay: "0.4s" }}>
                
                {/* The Ultimate CTA Button */}
                <div className="relative group">
                  {/* Outer Button Glow */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#c5a880] via-[#e6d5b8] to-[#c5a880] opacity-40 blur-lg transition-all duration-500 group-hover:opacity-70 group-hover:blur-xl group-hover:duration-200" />
                  
                  <CtaLink
                    className="relative flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-[#0A0B0E] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[inset_0_-2px_10px_rgba(0,0,0,0.1)]"
                    authedChildren={<><Zap className="h-5 w-5 fill-current" /> Go to Dashboard <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>}
                  >
                    <Zap className="h-5 w-5 fill-current" />
                    Start Free Trial
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </CtaLink>
                </div>

                {/* Micro Trust Copy */}
                <p className="text-xs font-semibold text-slate-500">
                  Free 7-day trial. <span className="text-slate-400">No credit card required.</span>
                </p>

                {/* Trust/Feature Checkmarks */}
                <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-4 pt-6 border-t border-white/5 w-full">
                  {[
                    { icon: MapPin, text: "Finds leads automatically" },
                    { icon: Mail, text: "Connects to Gmail & Outlook" },
                    { icon: Bot, text: "Replies & books meetings" },
                    { icon: Workflow, text: "Tracks every deal" }
                  ].map(({ icon: Icon, text }) => (
                    <span key={text} className="flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 border border-white/10">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#c5a880]" />
                      </div>
                      {text}
                    </span>
                  ))}
                </div>

              </div>
            </div>

            {/* Right Column: 3D Robot — Looking Around */}
            <div className="lg:col-span-5 w-full flex items-end justify-center">
              <div className="relative w-full max-w-[550px] h-[480px] lg:h-[600px]">
                {/* Ambient glow behind the robot */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[10%] w-[300px] h-[300px] bg-[#c5a880]/[0.06] rounded-full blur-[100px] pointer-events-none z-0" />

                {/* 3D Robot Canvas (transparent, no bg, no cards) */}
                <div className="relative w-full h-full z-10">
                  <CtaRobot3D />
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}