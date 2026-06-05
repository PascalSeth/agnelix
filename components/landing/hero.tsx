import { Sparkles, Play, CheckCircle2, Bot, MessageSquare, Calendar } from "lucide-react"
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
              <span className="text-white/70 tracking-wider">AGNELIX · AI SALES AGENT</span>
              <Sparkles className="h-2.5 w-2.5 text-primary/50" />
            </div>

            <h1 className="anim-fade-up text-4xl font-bold tracking-tighter text-gradient-w sm:text-5xl lg:text-6xl leading-[1.1]" style={{ animationDelay: "0.1s" }}>
              Find businesses.
              <br />
              Write emails.
              <br />
              <span className="text-gradient-accent anim-shimmer">
                Book meetings.
              </span>
            </h1>

            <p className="anim-fade-up mt-4 max-w-lg text-base leading-relaxed text-white/35" style={{ animationDelay: "0.2s" }}>
              Agnelix finds local businesses <span className="text-white/80 font-medium">by type and location</span>, looks up their info, writes personalized emails for each one, and replies to prospects automatically. You just close the deals.
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
              {["Free to start", "Works with your email", "No code required"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60" /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="anim-scale-in relative hidden lg:block" style={{ animationDelay: "0.5s" }}>
            <div className="relative anim-float" style={{ perspective: "1000px" }}>
              <div style={{ transform: "rotateY(-6deg) rotateX(3deg)", transformStyle: "preserve-3d" }}>
                <div className="absolute -inset-10 rounded-[3rem] bg-gradient-to-r from-primary/25 via-purple-600/25 to-blue-600/25 blur-3xl opacity-50" />
                <div className="glass relative overflow-hidden rounded-[2rem] p-2">
                  <div className="relative space-y-3 rounded-[1.5rem] bg-black/40 p-5 border border-white/[0.04]">

                    {/* Dashboard Header */}
                    <div className="flex items-center justify-between pb-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,.9)" }} />
                          <span className="text-[8px] font-bold uppercase tracking-[.18em] text-white/25">All systems active</span>
                        </div>
                        <div className="text-sm font-black text-white/90">
                          <span className="text-white/40">Welcome back, </span>
                          <span className="text-white">Alex</span>
                        </div>
                        <div className="text-[9px] text-white/25 mt-0.5">847 leads in pipeline · 3 campaigns <span className="text-emerald-400">· 2 live</span></div>
                      </div>
                      <div className="rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[9px] font-bold text-white/70 border border-white/[0.08]">+ New Campaign</div>
                    </div>

                    {/* Stat Cards Row */}
                    <div className="grid grid-cols-6 gap-1.5">
                      {[
                        { label: "Active", sub: "campaigns", value: "3", sparkline: [20,45,30,70,50,85,60] },
                        { label: "Total", sub: "leads", value: "847", sparkline: [50,60,40,80,55,75,90] },
                        { label: "Emails", sub: "sent", value: "1,247", sparkline: [30,50,65,45,80,60,95] },
                        { label: "Reply", sub: "rate", value: "12%", sparkline: [40,35,55,30,60,45,70] },
                        { label: "Meetings", sub: "booked", value: "9", sparkline: [20,30,25,50,35,60,45] },
                        { label: "Revenue", sub: "closed", value: "$8.5k", sparkline: [10,20,15,40,30,60,50] },
                      ].map((stat, i) => (
                        <div key={i} className="rounded-lg p-2 border border-white/[0.06]" style={{ background: "rgba(255,255,255,.03)" }}>
                          <div className="flex items-end gap-px h-4 mb-1.5">
                            {stat.sparkline.map((h, j) => (
                              <div key={j} className="flex-1 rounded-[1px]" style={{ height: `${h}%`, background: `rgba(255,255,255,${0.08 + (h/100) * 0.18})` }} />
                            ))}
                          </div>
                          <div className="text-[11px] font-black text-white/90 leading-none">{stat.value}</div>
                          <div className="flex items-baseline gap-0.5 mt-0.5">
                            <span className="text-[7px] font-bold text-white/50">{stat.label}</span>
                            <span className="text-[7px] text-white/20">{stat.sub}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Banner */}
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-2 border" style={{ background: "rgba(167,139,250,.07)", borderColor: "rgba(167,139,250,.15)" }}>
                        <MessageSquare className="h-3 w-3 text-violet-400" />
                        <div>
                          <div className="text-[9px] font-bold text-violet-300">5 replies waiting</div>
                          <div className="text-[7px] text-white/25">Review in Inbox</div>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-2 border" style={{ background: "rgba(251,191,36,.07)", borderColor: "rgba(251,191,36,.14)" }}>
                        <Calendar className="h-3 w-3 text-amber-400" />
                        <div>
                          <div className="text-[9px] font-bold text-amber-300">3 hot leads</div>
                          <div className="text-[7px] text-white/25">Advance in Pipeline</div>
                        </div>
                      </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="rounded-lg border border-white/[0.06]" style={{ background: "rgba(255,255,255,.025)" }}>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-white/60">Activity</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                        </div>
                        <span className="text-[8px] text-white/20">Latest emails</span>
                      </div>
                      {[
                        { subject: "Website redesign for your practice", name: "Bright Smile Dental", status: "OPENED", statusColor: "text-emerald-300 bg-emerald-400/10", time: "2m" },
                        { subject: "Quick question about your services", name: "Peak Roofing Co.", status: "REPLIED", statusColor: "text-amber-300 bg-amber-400/10", time: "18m" },
                        { subject: "Following up on our proposal", name: "FreshCut Barbershop", status: "CLICKED", statusColor: "text-sky-300 bg-sky-400/10", time: "1h" },
                        { subject: "Grow your online presence", name: "Metro Plumbing LLC", status: "SENT", statusColor: "text-white/40 bg-white/[0.06]", time: "2h" },
                      ].map((email, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="text-[9px] font-semibold text-white/70 truncate">{email.subject}</div>
                            <div className="text-[7px] text-white/25">{email.name}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`rounded-full px-1.5 py-px text-[7px] font-bold uppercase ${email.statusColor}`}>{email.status}</span>
                            <span className="text-[7px] text-white/20">{email.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Agent Digest */}
                    <div className="flex items-center gap-2 rounded-lg p-2.5 border" style={{ background: "rgba(56,189,248,.06)", borderColor: "rgba(56,189,248,.15)" }}>
                      <Bot className="h-4 w-4 text-sky-400 animate-pulse" />
                      <div className="flex-1">
                        <div className="text-[9px] font-bold text-sky-300">Agent: 12 actions · 3 meetings · 2 proposals</div>
                        <div className="text-[7px] text-white/25">1 high-risk action pending review</div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 glass rounded-2xl px-4 py-3 anim-float" style={{ animationDelay: "1s" }}>
              <div className="text-xl font-bold text-white">12%</div>
              <div className="text-[10px] text-white/30">Reply Rate</div>
            </div>
            <div className="absolute -bottom-3 -left-3 glass rounded-2xl px-4 py-3 anim-float" style={{ animationDelay: "2s" }}>
              <div className="text-xl font-bold text-emerald-400">$8.5k</div>
              <div className="text-[10px] text-white/30">Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
