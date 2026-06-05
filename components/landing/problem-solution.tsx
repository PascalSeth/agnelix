import { Timer, BarChart3, CreditCard, CheckCircle2 } from "lucide-react"

export function ProblemSolution() {
  return (
    <section className="relative bg-[#f8f8fb] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gradient-b md:text-5xl">
            Lead generation is broken.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
            68% of businesses say lead gen is their #1 challenge. Here is why the old way fails — and exactly how we fix it.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: Timer,
              title: "You waste 4 hours a day",
              problem: "SDRs spend 70% of their time researching and only 30% selling. Manual LinkedIn scraping and stale CSV lists kill productivity.",
              fix: "Our AI finds and engages leads 24/7. Your team focuses on closing deals, not chasing them.",
              accent: "rose"
            },
            {
              icon: BarChart3,
              title: "You cannot prove ROI",
              problem: "Data lives in disconnected tools: Apollo for contacts, Outreach for sequences, Salesforce for CRM. No attribution.",
              fix: "Built-in revenue tracking from first touch to closed deal. Show clients exactly where revenue came from.",
              accent: "indigo"
            },
            {
              icon: CreditCard,
              title: "You pay regardless of results",
              problem: "Traditional SaaS charges per seat whether you book zero meetings or fifty. Incentives are misaligned.",
              fix: "Outcome-based pricing: pay-per-meeting or revenue-share. If we do not deliver, we do not get paid.",
              accent: "emerald"
            }
          ].map((card, i) => (
            <div key={i} className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-8" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
              <div className={`absolute inset-0 bg-gradient-to-br from-${card.accent}-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
              <div className="relative">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-${card.accent}-50 mb-6`}>
                  <card.icon className={`h-6 w-6 text-${card.accent}-500`} />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">{card.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500 mb-5">{card.problem}</p>
                <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Our Fix</span>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-700">{card.fix}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
