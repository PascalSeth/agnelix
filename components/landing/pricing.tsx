import { Zap, Check, CalendarCheck, Percent } from "lucide-react"
import { CtaLink } from "@/components/landing/cta-link"

export function Pricing() {
  const subscriptionTiers = [
    {
      name: "Starter",
      price: "$97",
      desc: "For solo agency founders starting outreach.",
      credits: "500 lead credits / mo",
      seats: "1 user seat",
      features: [
        "Email outreach channel",
        "1 vertical playbook",
        "Basic lead discovery scanner",
        "Standard templates library",
        "48h email support SLA",
      ],
      popular: false,
    },
    {
      name: "Growth",
      price: "$297",
      desc: "For growing agencies expanding outreach.",
      credits: "2,500 lead credits / mo",
      seats: "5 user seats",
      features: [
        "Email + LinkedIn outreach",
        "3 vertical playbooks",
        "Automated revenue attribution",
        "A/B testing on subject lines",
        "24h support SLA",
      ],
      popular: false,
    },
    {
      name: "Agency",
      price: "$997",
      desc: "Our flagship tier for full white-labeled scale.",
      credits: "15,000 lead credits / mo",
      seats: "Unlimited seats",
      features: [
        "Email + LinkedIn + SMS channels",
        "All vertical playbooks",
        "AI reply handling & classification",
        "Full white-label settings",
        "Multi-client sub-accounts",
        "4h high-priority support SLA",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$2,997+",
      desc: "For custom high-volume operations.",
      credits: "Unlimited credits",
      seats: "Unlimited seats",
      features: [
        "All outreach channels + API access",
        "Custom AI training on brand voice",
        "Dedicated account manager",
        "Custom compliance policies",
        "1h response support SLA",
      ],
      popular: false,
    },
  ]

  return (
    <section className="relative py-24 bg-[#111216] overflow-hidden">
      <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-white/[0.01] blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] bg-[#c5a880]/[0.01] blur-[150px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-md mb-4 shadow-sm">
            <Zap className="h-3 w-3 text-[#c5a880]" />
            Simple Pricing
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl font-luxury-sans">
            Pick the plan that fits your agency
          </h2>
          <p className="mt-4 text-lg text-slate-400 font-medium">
            Start small and upgrade as you grow — or pay based on the meetings and deals Galien brings in.
          </p>
        </div>

        {/* 4 SaaS Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {subscriptionTiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl p-6 flex flex-col relative transition-all duration-300 ${
                tier.popular
                  ? "bg-[#161922] border-2 border-[#c5a880] shadow-2xl scale-[1.02] z-10"
                  : "bg-white/[0.02] border border-white/[0.07] hover:border-white/[0.12]"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#c5a880] px-3 py-1 text-[10px] font-bold text-black uppercase tracking-wider shadow-md">
                  Most Popular
                </span>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-bold text-white font-luxury-sans">{tier.name}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{tier.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white font-luxury-sans">{tier.price}</span>
                  {tier.name !== "Enterprise" && <span className="text-xs text-slate-500 font-semibold">/month</span>}
                </div>
              </div>

              <div className="space-y-2 py-4 border-t border-white/[0.06] mb-6 flex-1">
                <div className="text-xs font-bold text-slate-300">{tier.credits}</div>
                <div className="text-xs font-semibold text-slate-400 mb-4">{tier.seats}</div>
                <ul className="space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-400 leading-normal">
                      <Check className="h-3.5 w-3.5 text-[#728972] shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {tier.name === "Enterprise" ? (
                <a
                  href="mailto:hello@galien.com"
                  className="w-full py-2.5 rounded-xl text-center text-xs font-bold transition-all duration-200 bg-white/5 text-white hover:bg-white/10 border border-white/10"
                >
                  Contact Sales
                </a>
              ) : (
                <CtaLink
                  className={`w-full py-2.5 rounded-xl text-center text-xs font-bold transition-all duration-200 ${
                    tier.popular
                      ? "bg-gradient-to-r from-[#ffffff] to-[#cbd5e1] text-black hover:brightness-110"
                      : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                  }`}
                  authedHref="/settings/agency"
                  authedChildren="Manage Plan"
                >
                  Get Started
                </CtaLink>
              )}
            </div>
          ))}
        </div>

        {/* Outcome-Based / Performance Feature Highlight Banner */}
        <div
          className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #1b202c 0%, #111216 100%)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.02] via-transparent to-transparent" />
          
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="flex-1 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#c5a880]/15 px-3 py-1 text-[11px] font-bold text-[#c5a880] border border-[#c5a880]/30 mb-4 uppercase tracking-wider">
                <Zap className="h-3 w-3" /> Pay For Results
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-luxury-sans">
                Prefer to pay based on what Galien actually delivers?
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed font-medium">
                On top of your plan, you can add performance-based pricing — pay extra only when Galien books you a meeting or helps you close a deal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto shrink-0">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 hover:bg-white/[0.04] transition-all duration-200 min-w-[220px]">
                <div className="flex items-center gap-2 text-[#c5a880] mb-2">
                  <CalendarCheck className="h-4.5 w-4.5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Performance Fee</span>
                </div>
                <div className="text-xl font-bold text-white font-luxury-sans">+$150 – $500</div>
                <div className="text-[10px] text-slate-400 mt-1">Per qualified meeting booked</div>
              </div>

              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 hover:bg-white/[0.04] transition-all duration-200 min-w-[220px]">
                <div className="flex items-center gap-2 text-[#728972] mb-2">
                  <Percent className="h-4.5 w-4.5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Revenue Attribution</span>
                </div>
                <div className="text-xl font-bold text-white font-luxury-sans">5% – 10%</div>
                <div className="text-[10px] text-slate-400 mt-1">First-year contract closed value</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
