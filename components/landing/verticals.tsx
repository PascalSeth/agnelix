import { Users, Briefcase, User } from "lucide-react"

export function Verticals() {
  return (
    <section className="relative bg-[#f8f8fb] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gradient-b md:text-5xl">
            Built for anyone who sells to local businesses.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
            Whether you run an agency, a service company, or work solo — Agnelix helps you find clients and book meetings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Digital Marketing Agencies",
              desc: "Find dentists, restaurants, roofers, salons — any local business. Search by niche and city, send personalized emails, and let AI handle the follow-ups.",
              tags: ["Local Business Search", "Personalized Outreach", "Auto Follow-Up"],
              color: "bg-blue-50 text-blue-600"
            },
            {
              icon: Briefcase,
              title: "B2B Service Providers",
              desc: "Find businesses by type and location. AI checks their website, writes a tailored pitch, and manages your whole pipeline from first email to booked meeting.",
              tags: ["Company Research", "AI Email Sequences", "Pipeline CRM"],
              color: "bg-purple-50 text-purple-600"
            },
            {
              icon: User,
              title: "Consultants & Freelancers",
              desc: "Working alone? Agnelix is your AI sales team. It finds new businesses every day, sends emails, handles replies, and fills your calendar — while you focus on your current clients.",
              tags: ["Autopilot Mode", "Battle Cards", "Meeting Booking"],
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
