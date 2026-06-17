"use client"

import { Mail, Bot, MapPin, Workflow, ArrowRight, CheckCircle2, Zap } from "lucide-react"
import { CtaLink } from "@/components/landing/cta-link"
import dynamic from "next/dynamic"

// Dynamically import the 3D model component to disable SSR rendering of WebGL Canvas
const OnboardingRobot3D = dynamic(() => import("@/components/onboarding-robot-3d"), {
  ssr: false
})

export function FinalCTA() {
  return (
    <section className="relative py-28 lg:py-36 overflow-hidden bg-[#0A0B0E]">
      
      {/* Grand Finale Background Glows */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute h-[800px] w-[800px] rounded-full bg-gradient-to-tr from-[#c5a880]/10 to-transparent blur-[120px]" />
        <div className="absolute h-[400px] w-[400px] rounded-full bg-[#c5a880]/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        
        {/* The Glass Capsule */}
        <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#16181D]/60 backdrop-blur-2xl p-8 py-16 lg:p-20 shadow-[0_0_80px_rgba(197,168,128,0.05)] transition-all duration-700 hover:border-[#c5a880]/30 hover:shadow-[0_0_100px_rgba(197,168,128,0.1)]">
          
          {/* Internal Top Glow */}
          <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-[#c5a880]/50 to-transparent" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-[80%] rounded-full bg-[#c5a880]/10 blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Text & CTA Button */}
            <div className="lg:col-span-7 text-left space-y-6">
              
              {/* Status Badge */}
              <div className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-300" style={{ animationDelay: "0.1s" }}>
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
              <p className="anim-fade-up text-base lg:text-lg text-slate-400 font-medium leading-relaxed" style={{ animationDelay: "0.3s" }}>
                Stop searching for leads and writing emails by hand. Galien finds businesses, writes the emails, and replies to interested leads — <span className="text-white font-semibold">you just wake up to a full calendar.</span>
              </p>

              {/* Action Button and Micro Trust */}
              <div className="anim-fade-up flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-4" style={{ animationDelay: "0.4s" }}>
                <div className="relative group shrink-0">
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

                <div className="flex flex-col text-xs font-semibold text-slate-500">
                  <span>Free 7-day trial.</span>
                  <span className="text-slate-400">No credit card required.</span>
                </div>
              </div>

            </div>

            {/* Right Column: 3D Model with dancing animation */}
            <div className="lg:col-span-5 h-[360px] lg:h-[460px] relative w-full flex items-center justify-center rounded-[2.5rem] bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 shadow-2xl overflow-hidden group/canvas">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,168,128,0.08)_0%,transparent_70%)] pointer-events-none" />
              <div className="w-full h-full absolute inset-0">
                <OnboardingRobot3D 
                  animationState="dancing" 
                  hideBackground={true} 
                  scale={0.025}
                  posY={-0.45}
                  cameraZ={4.5}
                />
              </div>

              {/* Glassy Overlay HUD */}
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/5 bg-black/45 backdrop-blur-md px-4 py-2 flex items-center justify-between text-[10px] font-mono text-white/50 tracking-wider">
                <span>GALIEN-BOT // ACTIVE</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  HIP-HOP DANCING
                </span>
              </div>
            </div>

          </div>

          {/* Trust/Feature Checkmarks */}
          <div className="mt-12 flex flex-wrap items-center justify-start gap-x-8 gap-y-4 pt-8 border-t border-white/5">
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
    </section>
  )
}