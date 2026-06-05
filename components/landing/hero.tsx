import { Sparkles, Play, CheckCircle2, Search, Bot } from "lucide-react"
import { SignInButton } from "@/components/sign-in-button"

export function Hero() {
  return (
    <section className="relative pt-24 pb-12 lg:pt-32 lg:pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">

          {/* Left */}
          <div>
            <div className="anim-fade-up inline-flex items-center gap-2 rounded-full glass px-4 py-1 text-[10px] font-medium text-white/50 mb-4">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-white/70 tracking-wider">AI-POWERED LEAD GEN · BETA OPEN</span>
              <Sparkles className="h-2.5 w-2.5 text-primary/50" />
            </div>

            <h1 className="anim-fade-up text-4xl font-bold tracking-tighter text-gradient-w sm:text-5xl lg:text-6xl leading-[1.1]" style={{ animationDelay: "0.1s" }}>
              Turn buying
              <br />
              signals into
              <br />
              <span className="text-gradient-accent anim-shimmer">
                booked meetings.
              </span>
            </h1>

            <p className="anim-fade-up mt-4 max-w-lg text-base leading-relaxed text-white/35" style={{ animationDelay: "0.2s" }}>
              The only platform that detects <span className="text-white/80 font-medium">50+ intent signals</span>, engages leads with autonomous AI across email, LinkedIn, and SMS, and proves ROI with built-in revenue attribution. You only pay when we book qualified meetings.
            </p>

            <div className="anim-fade-up mt-6 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.3s" }}>
              <div className="relative group">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-indigo-500 opacity-50 blur-lg transition duration-500 group-hover:opacity-80" />
                <SignInButton />
              </div>
              <button className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/50 transition-all hover:bg-white/10 hover:text-white hover:border-white/20">
                <Play className="h-4 w-4 transition-transform group-hover:scale-110" />
                Watch Demo
              </button>
            </div>

            <div className="anim-fade-up mt-6 flex flex-wrap items-center gap-6 text-[10px] text-white/20 uppercase tracking-widest" style={{ animationDelay: "0.4s" }}>
              {["No credit card required", "14-day free trial", "Cancel anytime"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60" /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Dashboard */}
          <div className="anim-scale-in relative hidden lg:block" style={{ animationDelay: "0.5s" }}>
            <div className="relative anim-float" style={{ perspective: "1000px" }}>
              <div style={{ transform: "rotateY(-6deg) rotateX(3deg)", transformStyle: "preserve-3d" }}>
                <div className="absolute -inset-10 rounded-[3rem] bg-gradient-to-r from-primary/25 via-purple-600/25 to-blue-600/25 blur-3xl opacity-50" />
                <div className="glass relative overflow-hidden rounded-[2rem] p-2">
                  <div className="relative space-y-3 rounded-[1.5rem] bg-black/40 p-6 border border-white/[0.04]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                          <Search className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white/90">Signal Intelligence</div>
                          <div className="text-[11px] text-white/25">47 new buying signals detected today</div>
                        </div>
                      </div>
                      <div className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">LIVE</div>
                    </div>
                    <div className="relative h-36 rounded-2xl bg-gradient-to-b from-primary/[0.08] to-transparent border border-white/[0.04] p-4 overflow-hidden">
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-1.5">
                        {[30, 50, 35, 75, 55, 90, 65, 85, 95, 70, 80, 60].map((h, i) => (
                          <div key={i} className="w-full rounded-t-sm bg-gradient-to-t from-primary/50 to-primary/15" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <div className="absolute top-4 right-4 text-right">
                        <div className="text-3xl font-bold text-white">2,847</div>
                        <div className="text-[10px] text-white/25 uppercase tracking-wider">Leads Scored</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: "Sarah Chen", role: "VP Sales", company: "TechFlow Inc.", signal: "Hiring 3 SDRs", score: 94 },
                        { name: "Marcus Reid", role: "CEO", company: "BuildRight Co.", signal: "Unclaimed GMB", score: 89 },
                        { name: "Elena Voss", role: "CMO", company: "GrowthLabs", signal: "Series A funded", score: 98 },
                      ].map((lead, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 hover:bg-white/[0.04] transition-colors">
                          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white border border-white/5">{lead.name[0]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white/80 truncate">{lead.name}</span>
                              <span className="text-[10px] text-white/25">{lead.role}</span>
                            </div>
                            <div className="text-[11px] text-primary/50">{lead.company} · {lead.signal}</div>
                          </div>
                          <div className="flex h-7 items-center justify-center rounded-lg bg-white/5 px-2.5 text-xs font-bold text-white/60 border border-white/5">{lead.score}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 p-3">
                      <Bot className="h-5 w-5 text-primary animate-pulse" />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-white/60">Autonomous Outreach Running</div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-purple-500 anim-shimmer" />
                        </div>
                      </div>
                      <div className="text-xs font-bold text-primary">12 meetings</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 glass rounded-2xl px-4 py-3 anim-float" style={{ animationDelay: "1s" }}>
              <div className="text-xl font-bold text-white">94%</div>
              <div className="text-[10px] text-white/30">Avg. Open Rate</div>
            </div>
            <div className="absolute -bottom-3 -left-3 glass rounded-2xl px-4 py-3 anim-float" style={{ animationDelay: "2s" }}>
              <div className="text-xl font-bold text-emerald-400">3x</div>
              <div className="text-[10px] text-white/30">More Meetings</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
