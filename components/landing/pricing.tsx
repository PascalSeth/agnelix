import { Zap } from "lucide-react"

export function Pricing() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up relative overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-10 md:p-16 backdrop-blur-3xl" style={{ animationDelay: "0.2s" }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-purple-600/20 blur-[100px] anim-diffuse" />

          <div className="relative flex flex-col items-center justify-between gap-12 lg:flex-row">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 mb-6">
                <Zap className="h-3 w-3" /> Outcome-Based Pricing
              </div>
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl text-gradient-w">
                We win when you win.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-white/25">
                Traditional SaaS charges per seat regardless of results. We flipped the model: pay only for qualified meetings booked, or share a percentage of revenue from closed deals. Your incentives are finally aligned with your software vendor.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {[
                  { label: "Pay-Per-Meeting", value: "$150 – $500", sub: "Per qualified meeting" },
                  { label: "Revenue Share", value: "5% – 10%", sub: "Of first-year contract value" },
                  { label: "Subscription", value: "$97 – $2,997", sub: "Per month, tier-based" },
                ].map((plan) => (
                  <div key={plan.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] transition-colors">
                    <div className="text-xs text-white/25 mb-1">{plan.label}</div>
                    <div className="text-lg font-bold text-white/80">{plan.value}</div>
                    <div className="text-[10px] text-white/15">{plan.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
              <div className="text-center">
                <div className="text-5xl font-bold text-gradient-accent">$0</div>
                <div className="mt-2 text-sm font-medium text-white/25">Until you win</div>
              </div>
              <div className="hidden h-20 w-px bg-white/8 lg:block" />
              <div className="text-center">
                <div className="text-5xl font-bold text-emerald-400">40%</div>
                <div className="mt-2 text-sm font-medium text-white/25">Lower Churn</div>
              </div>
              <div className="hidden h-20 w-px bg-white/8 lg:block" />
              <div className="text-center">
                <div className="text-5xl font-bold text-white/90">142:1</div>
                <div className="mt-2 text-sm font-medium text-white/25">Agency LTV:CAC</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
