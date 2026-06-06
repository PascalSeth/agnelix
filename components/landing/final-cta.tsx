import { Mail, Bot, MapPin, Workflow, ArrowRight, CheckCircle2, Zap } from "lucide-react"
import Link from "next/link"

export function FinalCTA() {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden bg-[#0A0B0E]">
      
      {/* Grand Finale Background Glows */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute h-[800px] w-[800px] rounded-full bg-gradient-to-tr from-[#c5a880]/10 to-transparent blur-[120px]" />
        <div className="absolute h-[400px] w-[400px] rounded-full bg-[#c5a880]/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        
        {/* The Glass Capsule */}
        <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#16181D]/60 backdrop-blur-2xl p-10 py-20 lg:p-24 text-center shadow-[0_0_80px_rgba(197,168,128,0.05)] transition-all duration-700 hover:border-[#c5a880]/30 hover:shadow-[0_0_100px_rgba(197,168,128,0.1)]">
          
          {/* Internal Top Glow */}
          <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-[#c5a880]/50 to-transparent" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-[80%] rounded-full bg-[#c5a880]/10 blur-3xl" />

          {/* Status Badge */}
          <div className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-300 mb-8" style={{ animationDelay: "0.1s" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Agent ready for deployment
          </div>

          {/* Headline */}
          <h2 className="anim-fade-up text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl font-luxury-sans" style={{ animationDelay: "0.2s" }}>
            Ready to put your
            <br />
            <span className="font-luxury-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d5b8] font-normal">
              outreach on autopilot?
            </span>
          </h2>
          
          {/* Subheadline */}
          <p className="anim-fade-up mx-auto mt-8 max-w-2xl text-lg lg:text-xl text-slate-400 font-medium leading-relaxed" style={{ animationDelay: "0.3s" }}>
            Stop manually searching for leads and writing emails. Agnelix finds businesses, handles replies, and books meetings—<span className="text-white">you just wake up to a full calendar.</span>
          </p>

          <div className="anim-fade-up mt-12 flex flex-col items-center gap-6" style={{ animationDelay: "0.4s" }}>
            
            {/* The Ultimate CTA Button */}
            <div className="relative group">
              {/* Outer Button Glow */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#c5a880] via-[#e6d5b8] to-[#c5a880] opacity-40 blur-lg transition-all duration-500 group-hover:opacity-70 group-hover:blur-xl group-hover:duration-200" />
              
              <Link
                href="/sign-in"
                className="relative flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-[#0A0B0E] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[inset_0_-2px_10px_rgba(0,0,0,0.1)]"
              >
                <Zap className="h-5 w-5 fill-current" />
                Deploy Your AI Agent
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Micro Trust Copy */}
            <p className="text-xs font-semibold text-slate-500">
              Free 7-day trial. <span className="text-slate-400">No credit card required.</span>
            </p>

            {/* Trust/Feature Checkmarks */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-8 border-t border-white/5">
              {[
                { icon: MapPin, text: "Automated Lead Discovery" },
                { icon: Mail, text: "Connects to Gmail & Outlook" },
                { icon: Bot, text: "Autonomous Follow-ups" },
                { icon: Workflow, text: "CRM Pipeline Included" }
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
      </div>
    </section>
  )
}