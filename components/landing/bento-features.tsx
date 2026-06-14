/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element */
import { MapPin, Brain, Bot, BarChart3, Zap, Swords, Mail, Sparkles, User, Crosshair } from "lucide-react"

export function BentoFeatures() {
  return (
    <section className="relative bg-[#111216] py-24 lg:py-32 overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-[#c5a880]/10 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="anim-fade-up text-center mb-16 lg:mb-24">
          <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl font-luxury-sans">
            Everything you need,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d5b8]">in one place.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 font-medium">
            No more juggling five different tools. Agnelix finds leads, writes emails, manages your deals, and follows up — all by itself.
          </p>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 auto-rows-[220px]">

          {/* 1. Lead Discovery - Large (2x2) */}
          <div className="anim-fade-up group relative col-span-1 md:col-span-2 row-span-2 overflow-hidden rounded-[2rem] bg-[#16181D] border border-white/5 transition-colors hover:bg-[#1A1C23] hover:border-[#c5a880]/30" style={{ animationDelay: "0.15s" }}>
            
            {/* Abstract Background Image */}
            <div className="absolute inset-0 h-[60%] overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop" 
                alt="Dark map" 
                className="w-full h-full object-cover opacity-20 mix-blend-screen transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#16181D] via-[#16181D]/80 to-transparent transition-colors group-hover:from-[#1A1C23]" />
              
              {/* Floating UI Overlay */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[80%] rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-3 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                  <MapPin className="h-3 w-3 text-[#c5a880]" />
                  <span className="text-xs font-semibold text-white">Targeting: Plumbers in Austin, TX</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center bg-[#c5a880]/10 rounded px-2 py-1">
                    <span className="text-[10px] text-[#c5a880]">Found 245 verified leads</span>
                    <Sparkles className="h-3 w-3 text-[#c5a880]" />
                  </div>
                  <div className="flex justify-between items-center bg-white/5 rounded px-2 py-1">
                    <span className="text-[10px] text-slate-400">Extracting emails & LinkedIn profiles...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 inset-x-0 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c5a880]/10 border border-[#c5a880]/20">
                  <MapPin className="h-5 w-5 text-[#c5a880]" />
                </div>
                <div className="rounded-full bg-[#c5a880]/10 border border-[#c5a880]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c5a880]">Core Engine</div>
              </div>
              <h3 className="text-2xl font-bold text-white font-luxury-sans">Lead Discovery</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400 font-medium max-w-md">
                Tell Agnelix the type of business and the city. It pulls their name, website, phone number, and ratings — then finds a direct email address for each one.
              </p>
            </div>
          </div>

          {/* 2. AI Email Writer (1x1) */}
          <div className="anim-fade-up group relative overflow-hidden rounded-[2rem] bg-[#16181D] border border-white/5 transition-colors hover:bg-[#1A1C23] hover:border-[#c5a880]/30 p-6 flex flex-col justify-between" style={{ animationDelay: "0.2s" }}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain className="h-24 w-24 text-[#c5a880]" />
            </div>
            <div className="relative z-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 mb-4">
                <Brain className="h-5 w-5 text-[#c5a880]" />
              </div>
              <h3 className="font-bold text-white font-luxury-sans text-lg">AI Email Writer</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400 font-medium">
                Reads each prospect&apos;s website and writes a personal email — not a generic template.
              </p>
            </div>
          </div>

          {/* 3. Autonomous Agent (1x1) */}
          <div className="anim-fade-up group relative overflow-hidden rounded-[2rem] bg-[#16181D] border border-white/5 transition-colors hover:bg-[#1A1C23] hover:border-[#c5a880]/30 p-6 flex flex-col justify-between" style={{ animationDelay: "0.25s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#c5a880]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c5a880]/10 border border-[#c5a880]/20 mb-4">
                <Bot className="h-5 w-5 text-[#c5a880]" />
              </div>
              <h3 className="font-bold text-white font-luxury-sans text-lg">Autonomous Agent</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400 font-medium">
                When a prospect replies, Agnelix reads it, responds, and can book the meeting — no extra work from you.
              </p>
            </div>
          </div>

          {/* 4. Pipeline & CRM - Wide (2x1) */}
          <div className="anim-fade-up group relative col-span-1 md:col-span-2 overflow-hidden rounded-[2rem] bg-[#16181D] border border-white/5 transition-colors hover:bg-[#1A1C23] hover:border-[#c5a880]/30 p-6" style={{ animationDelay: "0.3s" }}>
            <div className="flex h-full flex-col sm:flex-row gap-6 relative z-10">
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 mb-4">
                  <BarChart3 className="h-5 w-5 text-[#c5a880]" />
                </div>
                <h3 className="font-bold text-lg text-white font-luxury-sans">Pipeline &amp; CRM</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400 font-medium">
                  See every lead and deal in one place — from first email to closed deal — so you always know what&apos;s happening.
                </p>
              </div>
              {/* UI Mockup of Kanban */}
              <div className="hidden sm:flex flex-1 gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="flex-1 bg-white/5 rounded-lg border border-white/10 p-2 space-y-2">
                  <div className="h-2 w-1/2 bg-slate-500/30 rounded" />
                  <div className="h-8 w-full bg-[#c5a880]/20 border border-[#c5a880]/30 rounded-md" />
                  <div className="h-8 w-full bg-white/5 rounded-md" />
                </div>
                <div className="flex-1 bg-white/5 rounded-lg border border-white/10 p-2 space-y-2">
                  <div className="h-2 w-1/2 bg-[#c5a880]/50 rounded" />
                  <div className="h-8 w-full bg-white/5 rounded-md" />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Battle Cards - Wide (2x1) */}
          <div className="anim-fade-up group relative col-span-1 md:col-span-2 overflow-hidden rounded-[2rem] bg-[#16181D] border border-white/5 transition-colors hover:bg-[#1A1C23] hover:border-[#c5a880]/30 p-6" style={{ animationDelay: "0.35s" }}>
            
            {/* Abstract Background for wide card */}
            <div className="absolute top-0 right-0 h-full w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop" 
                alt="Cyber background" 
                className="h-full w-full object-cover opacity-10 mix-blend-screen transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#16181D] via-[#16181D]/80 to-transparent transition-colors group-hover:from-[#1A1C23]" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-center max-w-[60%]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c5a880]/10 border border-[#c5a880]/20 mb-4">
                <Swords className="h-5 w-5 text-[#c5a880]" />
              </div>
              <h3 className="font-bold text-lg text-white font-luxury-sans">Battle Cards</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400 font-medium">
                When a prospect replies, Agnelix instantly gives you a one-page cheat sheet — what to say, how to handle objections, and what to do next.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}