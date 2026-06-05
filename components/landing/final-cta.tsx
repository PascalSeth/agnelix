import { Mail, Bot, MapPin, Workflow } from "lucide-react"
import { SignInButton } from "@/components/sign-in-button"

export function FinalCTA() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/12 blur-[150px] anim-diffuse" />
        <div className="absolute top-[15%] right-[15%] h-[250px] w-[250px] rounded-full bg-purple-600/15 blur-[80px] anim-vortex-fast" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="anim-fade-up inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-white/40 mb-8" style={{ animationDelay: "0.1s" }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Set up in under 5 minutes
        </div>

        <h2 className="anim-fade-up text-5xl font-bold tracking-tight md:text-7xl" style={{ animationDelay: "0.2s" }}>
          <span className="text-gradient-w">Ready to put your</span>
          <br />
          <span className="text-gradient-accent anim-shimmer">
            outreach on autopilot?
          </span>
        </h2>
        <p className="anim-fade-up mx-auto mt-8 max-w-2xl text-xl text-white/25" style={{ animationDelay: "0.3s" }}>
          Stop looking for leads by hand. Agnelix finds businesses, writes emails, handles replies, and books meetings — while you focus on closing.
        </p>

        <div className="anim-fade-up mt-12 flex flex-col items-center gap-8" style={{ animationDelay: "0.4s" }}>
          <div className="relative group">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-indigo-500 opacity-50 blur-xl transition duration-500 group-hover:opacity-90 anim-diffuse" />
            <div className="relative flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl transition-transform hover:scale-105 cursor-pointer">
              <SignInButton />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/20">
            {[
              { icon: MapPin, text: "Lead Discovery" },
              { icon: Mail, text: "Email Integration" },
              { icon: Bot, text: "AI Agent" },
              { icon: Workflow, text: "Multi-Step Sequences" }
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-emerald-500/50" /> {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
