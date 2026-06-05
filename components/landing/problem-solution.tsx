import { Timer, Mail, MessageSquare, CheckCircle2 } from "lucide-react"

export function ProblemSolution() {
  return (
    <section className="relative bg-[#f8f8fb] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gradient-b md:text-5xl">
            Manual prospecting is broken.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
            Agencies spend too much time searching for leads, writing emails, and chasing replies. Here's how Agnelix helps.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: Timer,
              title: "You waste hours finding leads",
              problem: "You spend hours searching for businesses online, copying info into spreadsheets, and looking for the right person to email.",
              fix: "Agnelix searches for businesses by type and city, finds their website, and gets you an email address — all in a few clicks.",
              accent: "rose"
            },
            {
              icon: Mail,
              title: "Your cold emails get ignored",
              problem: "If you send the same email to everyone, most people ignore it. Without knowing anything about the prospect, your message feels like spam.",
              fix: "AI looks up each prospect's website and writes a unique email that speaks to their business. You set the tone — friendly, professional, direct, or consultative.",
              accent: "indigo"
            },
            {
              icon: MessageSquare,
              title: "Follow-ups fall through the cracks",
              problem: "When someone finally replies, it's easy to miss. Interested leads go cold. Objections go unanswered. Meetings never get booked.",
              fix: "AI reads every reply, figures out what the person needs, writes a smart response, and can book a meeting — all while you sleep.",
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
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">How Agnelix fixes this</span>
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
