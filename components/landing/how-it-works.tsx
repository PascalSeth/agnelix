import { MapPin, Search, Mail, Bot, ChevronRight } from "lucide-react"

export function HowItWorks() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gradient-w md:text-5xl">
            From search to meeting in four steps.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/25">
            No manual work. No copy-paste. One tool takes you from finding leads to booking meetings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "01", icon: MapPin, title: "Discover Leads", desc: "Search by business type and city. Agnelix finds prospects and pulls their name, website, phone, ratings, and reviews.", color: "indigo" },
            { step: "02", icon: Search, title: "Research & Enrich", desc: "AI visits each prospect's website, finds their email address, and puts together a quick summary of what they do and how you can help.", color: "purple" },
            { step: "03", icon: Mail, title: "Launch Campaigns", desc: "Build email sequences with multiple steps. AI writes each email based on the prospect's info. Set the timing, preview, and send.", color: "primary" },
            { step: "04", icon: Bot, title: "Autonomous Follow-Up", desc: "When someone replies, AI reads the message, writes a response, and can book a meeting for you. You stay in control with approve or edit options.", color: "emerald" },
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
