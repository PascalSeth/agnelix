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

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-32 bg-transparent">
      {/* Background soft lighting glow */}
      <div className="absolute top-[10%] left-[10%] w-[500px] h-[350px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">

          {/* Left Side: Copy & CTA (5 cols) */}
          <div className="max-w-2xl lg:col-span-6">
            {/* Badge */}
            <div className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-md mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#728972]/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#728972]" />
              </span>
              Meet Agnelix — Your AI Sales Assistant
              <Sparkles className="h-3.5 w-3.5 text-[#c5a880]" />
            </div>

            {/* Headline */}
            <h1 className="anim-fade-up font-luxury-sans text-5xl font-light tracking-tight text-white sm:text-6xl lg:text-[4rem] leading-[1.08]" style={{ animationDelay: "0.1s" }}>
              Find new clients. <br />
              Without lifting <br />
              <span className="font-luxury-serif italic text-gradient-gold font-normal">
                a finger.
              </span>
            </h1>

            {/* Description */}
            <p className="anim-fade-up mt-6 max-w-lg text-lg leading-relaxed text-slate-400 font-medium" style={{ animationDelay: "0.2s" }}>
              Agnelix finds local businesses, writes a personal email for each one, and follows up when they reply. <span className="text-white font-semibold">You just show up to the meetings.</span>
            </p>

            {/* CTA Buttons */}
            <div className="anim-fade-up mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.3s" }}>
              <div className="relative group">
                <div className="absolute -inset-1 rounded-xl bg-white/10 opacity-20 blur transition duration-500 group-hover:opacity-40" />
                <CtaLink
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[.98]"
                  style={{
                    background: "linear-gradient(135deg,#ffffff,#cbd5e1)",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)"
                  }}
                  authedChildren={<>Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></>}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </CtaLink>
              </div>
              <Link href="/playground" className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.08] hover:border-white/[0.12] shadow-sm">
                <Play className="h-4 w-4 text-[#c5a880] transition-transform group-hover:scale-110" />
                Watch Demo
              </Link>
            </div>

            {/* Trust Markers */}
            <div className="anim-fade-up mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500 font-semibold" style={{ animationDelay: "0.4s" }}>
              {["Free 7-day trial", "Connects to Gmail & Outlook", "No credit card required"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#728972]" /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right Side: Luxury Pedestal & Showcase (6 cols) */}
          <div className="anim-scale-in relative lg:col-span-6 flex items-center justify-center min-h-[440px] sm:min-h-[520px] w-full" style={{ animationDelay: "0.5s" }}>
            
            {/* Scaled Wrapper for Perfect Responsiveness & Creative Layout */}
            <div className="relative w-[440px] h-[480px] shrink-0 scale-[0.72] xs:scale-[0.85] sm:scale-95 md:scale-100 origin-center transition-all duration-300">
              
              {/* 1. Fluted wooden/slatted wall texture panel */}
              <div className="absolute right-[20px] bottom-[100px] w-[200px] h-[340px] fluted-texture opacity-[0.03] rounded-xl border-l border-white/[0.04] z-0" />
              
              {/* 2. Deep Slate-Grey Curved Panel */}
              <div 
                className="absolute right-[50px] bottom-[100px] w-[280px] h-[390px] rounded-t-[140px] shadow-[0_15px_35px_rgba(0,0,0,0.3)] transform rotate-6 origin-bottom z-0"
                style={{
                  background: "linear-gradient(180deg, #1f222b 0%, #16171d 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.04)"
                }}
              />
              
              {/* 3. Obsidian Arch with Silver Metallic Border */}
              <div 
                className="absolute right-[90px] bottom-[100px] w-[250px] h-[340px] rounded-t-[125px] shadow-[0_12px_30px_rgba(0,0,0,0.25)] border border-white/[0.06] transform -rotate-3 origin-bottom z-10"
                style={{
                  background: "linear-gradient(180deg, #181920 0%, #111216 100%)"
                }}
              />

              {/* 4. Swaying Metallic Silver-Chrome foliage */}
              <div className="absolute right-[60px] bottom-[200px] w-[150px] h-[280px] z-20 pointer-events-none anim-sway">
                <svg viewBox="0 0 150 280" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="silverLeaf" x1="0" y1="0" x2="150" y2="280" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                      <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#64748b" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  {/* Stem */}
                  <path d="M60,280 C65,190 80,120 105,40" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Leaves left side */}
                  <path d="M105,40 C95,30 75,35 80,45 C85,55 100,48 105,40 Z" fill="url(#silverLeaf)" stroke="#cbd5e1" strokeWidth="0.5" />
                  <path d="M100,65 C85,55 70,63 75,73 C80,83 95,73 100,65 Z" fill="url(#silverLeaf)" stroke="#cbd5e1" strokeWidth="0.5" />
                  <path d="M94,95 C77,90 62,100 68,110 C74,120 88,105 94,95 Z" fill="url(#silverLeaf)" stroke="#cbd5e1" strokeWidth="0.5" />
                  <path d="M88,128 C70,125 58,138 64,147 C70,155 82,138 88,128 Z" fill="url(#silverLeaf)" stroke="#94a3b8" strokeWidth="0.5" />
                  <path d="M82,165 C64,162 52,175 58,184 C64,192 76,175 82,165 Z" fill="url(#silverLeaf)" stroke="#94a3b8" strokeWidth="0.5" />
                  
                  {/* Leaves right side */}
                  <path d="M105,40 C115,30 135,35 130,45 C125,55 110,48 105,40 Z" fill="url(#silverLeaf)" stroke="#cbd5e1" strokeWidth="0.5" />
                  <path d="M99,72 C113,64 130,72 125,82 C120,92 105,82 99,72 Z" fill="url(#silverLeaf)" stroke="#cbd5e1" strokeWidth="0.5" />
                  <path d="M93,105 C108,99 123,109 117,119 C111,129 99,115 93,105 Z" fill="url(#silverLeaf)" stroke="#cbd5e1" strokeWidth="0.5" />
                  <path d="M87,142 C101,138 113,150 107,158 C101,166 91,152 87,142 Z" fill="url(#silverLeaf)" stroke="#94a3b8" strokeWidth="0.5" />
                  
                  {/* Top Leaf */}
                  <path d="M105,40 C107,20 101,5 95,10 C89,15 99,32 105,40 Z" fill="url(#silverLeaf)" stroke="#cbd5e1" strokeWidth="0.5" />
                </svg>
              </div>

              {/* 5. 3D Double-Tiered Obsidian Podium */}
              <div className="absolute right-[30px] bottom-[60px] w-[340px] h-[100px] z-20 flex flex-col items-center justify-end pointer-events-none">
                {/* Upper Tier */}
                <div 
                  className="w-[240px] h-[34px] rounded-full z-30 transform translate-y-[17px] bg-[#1f222b]" 
                  style={{
                    boxShadow: "0 4px 8px rgba(0,0,0,0.35), inset 0 1px 0.5px rgba(255, 255, 255, 0.05), 0 1px 1px rgba(0,0,0,0.2)",
                    borderBottom: "1.5px solid #2d313e"
                  }}
                />
                {/* Lower Tier */}
                <div 
                  className="w-[310px] h-[46px] rounded-full z-20 bg-[#16171d]" 
                  style={{
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1.5px 0.5px rgba(255, 255, 255, 0.05)",
                    borderBottom: "3px solid #cbd5e1"
                  }}
                />
              </div>

              {/* 6. Floating Agent Execution Card (Luxury Dark Glass) */}
              <div className="absolute left-[-20px] top-[30px] w-[250px] rounded-2xl glass-luxury border border-white/[0.06] p-4.5 shadow-xl anim-luxury-float z-30">
                <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2.5 mb-3">
                  <div className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center text-white border border-white/10">
                    <Bot className="h-3.5 w-3.5 text-[#cbd5e1]" />
                  </div>
                  <div className="text-[11px] font-bold text-white tracking-tight">Concierge Execution</div>
                  <div className="ml-auto flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#728972] animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#728972] animate-pulse" style={{ animationDelay: "200ms" }} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5 shadow-sm text-[11px] font-medium leading-relaxed text-slate-300">
                    &quot;Find <span className="text-[#c5a880] font-bold">boutique hotels in Austin</span>, and write bespoke service pitches.&quot;
                  </div>

                  <div className="pl-3.5 space-y-2.5 border-l border-white/10">
                    <div className="flex items-center gap-2">
                      <Search className="h-3 w-3 text-[#728972]" />
                      <span className="text-[10px] text-slate-400 font-semibold">Found 28 Austin hotels</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-[#c5a880]" />
                      <span className="text-[10px] text-slate-200 font-bold flex items-center gap-1">
                        Drafting custom emails 
                        <span className="flex gap-0.5">
                          <span className="h-1 w-1 bg-neutral-400 rounded-full animate-bounce" />
                          <span className="h-1 w-1 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: "150ms"}} />
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. Showcase Prize Card: "New Meeting Booked" (Floating over Podium) */}
              <div className="absolute right-[-20px] bottom-[110px] rounded-2xl bg-[#191a21] border border-white/[0.08] p-4 shadow-2xl anim-luxury-float-delayed z-40 text-white w-[240px]">
                <div className="flex items-start gap-3">
                  <div 
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c5a880]/15 border border-[#c5a880]/30 text-[#c5a880]"
                  >
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#c5a880] uppercase tracking-widest">Agnelix Result</div>
                    <div className="text-[13px] font-semibold mt-0.5 text-white">Meeting Booked!</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Director at Austin Grand Resort</div>
                    <div className="mt-2.5 inline-flex items-center gap-1 text-[9px] font-bold text-[#c5a880] hover:text-white transition-colors cursor-pointer uppercase tracking-wider">
                      Add to Google Calendar <ArrowRight className="h-2.5 w-2.5" />
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