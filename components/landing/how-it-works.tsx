import { Search, Target, Bot, TrendingUp, ChevronRight } from "lucide-react"

export function HowItWorks() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gradient-w md:text-5xl">
            From signal to meeting in four steps.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/25">
            No fragmented tools. No manual copy-paste. One platform owns the entire journey from discovery to revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "01", icon: Search, title: "Detect Signals", desc: "Our engine monitors 50+ sources — job postings, funding events, tech stack changes, review sentiment, hiring velocity — to spot buying intent before your competitors do.", color: "indigo" },
            { step: "02", icon: Target, title: "Score & Predict", desc: "ML models forecast buying windows 30–90 days out with 85% confidence. Each lead gets an intent score, fit score, and optimal outreach timing recommendation.", color: "purple" },
            { step: "03", icon: Bot, title: "Autonomous Outreach", desc: "GPT-4o crafts personalised emails, LinkedIn messages, and SMS sequences. The AI handles objections, answers questions, and schedules meetings via Calendly — 24/7.", color: "primary" },
            { step: "04", icon: TrendingUp, title: "Prove ROI", desc: "Multi-touch attribution tracks every lead from discovery to closed revenue. Your dashboard shows exact ROI: '$297 invested → $8,500 revenue (28x return)'.", color: "emerald" },
          ].map((item, i) => (
            <div key={i} className="anim-fade-up group relative" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
              <div className="card-elevated relative overflow-hidden rounded-3xl p-8 h-full">
                <div className="absolute top-0 right-0 p-6">
                  <span className="text-5xl font-bold text-white/[0.03] group-hover:text-white/[0.06] transition-colors">{item.step}</span>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-${item.color}-500/10 mb-6`}>
                  <item.icon className={`h-6 w-6 ${item.color === 'primary' ? 'text-primary' : `text-${item.color}-400`}`} />
                </div>
                <h3 className="text-lg font-semibold text-white/90 mb-3">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/25">{item.desc}</p>
              </div>
              {i < 3 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 z-10">
                  <ChevronRight className="h-5 w-5 text-white/8" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
