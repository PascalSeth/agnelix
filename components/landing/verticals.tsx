import { Users, Globe, Phone } from "lucide-react"

export function Verticals() {
  return (
    <section className="relative bg-[#f8f8fb] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gradient-b md:text-5xl">
            Built for agencies. Ready for everyone.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
            Vertical-specific AI playbooks that understand your market&apos;s language, pain points, and seasonality.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Digital Marketing Agencies",
              desc: "Serving dentists, chiropractors, roofers, and restaurants. White-label ready with multi-tenant client management.",
              tags: ["Local SEO", "GMB Optimization", "Reputation"],
              color: "bg-blue-50 text-blue-600"
            },
            {
              icon: Globe,
              title: "B2B SaaS Sales Teams",
              desc: "Series A–C companies selling to mid-market and enterprise. Identify in-market accounts before they RFP.",
              tags: ["Intent Data", "Account-Based", "Tech Stack"],
              color: "bg-purple-50 text-purple-600"
            },
            {
              icon: Phone,
              title: "Real Estate & Insurance",
              desc: "Agents and brokers who need listing signals and policy renewal triggers. Pay only for qualified appointments.",
              tags: ["Listing Signals", "Renewals", "Referrals"],
              color: "bg-emerald-50 text-emerald-600"
            }
          ].map((vert, i) => (
            <div key={i} className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-8" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
              <div className="relative">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${vert.color} mb-6`}>
                  <vert.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">{vert.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500 mb-6">{vert.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {vert.tags.map((tag) => (
                    <span key={tag} className="rounded-lg bg-neutral-100 border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
