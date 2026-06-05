import { Activity, Target, Bot, TrendingUp, Lock, Layers, Calendar } from "lucide-react"

export function BentoFeatures() {
  return (
    <section className="relative bg-[#f8f8fb] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gradient-b md:text-5xl">
            The complete lead generation
            <br />
            <span className="text-gradient-accent">operating system.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
            Six core modules. One unified platform. No more duct-taping Apollo, Outreach, and Salesforce together.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(170px,auto)]">

          {/* Signal Intelligence - Large */}
          <div className="anim-fade-up group relative md:col-span-2 md:row-span-2 overflow-hidden rounded-3xl card-light p-8" style={{ animationDelay: "0.15s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/15">
                  <Activity className="h-7 w-7 text-white" />
                </div>
                <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-100">Core Engine</div>
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-neutral-900">Signal Intelligence</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-neutral-500">
                  Monitors public web data, intent signals, and behavioural data continuously. Detects unclaimed Google Business Profiles, job postings, funding rounds, tech stack changes, and review sentiment shifts in real time.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {["Job Postings", "Funding Events", "GMB Changes", "Tech Stack", "Review Sentiment"].map((tag) => (
                    <span key={tag} className="rounded-lg bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs text-neutral-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Predictive Scoring */}
          <div className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.25s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-neutral-900">Predictive Scoring</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Gradient boosting + fine-tuned BERT predict buying windows 30–90 days ahead with 85% confidence.</p>
              </div>
            </div>
          </div>

          {/* AI Outreach */}
          <div className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.3s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-neutral-900">AI Outreach</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Autonomous multi-channel engagement. Handles objections, schedules meetings, and never sleeps.</p>
              </div>
            </div>
          </div>

          {/* Revenue Attribution - Wide */}
          <div className="anim-fade-up group relative md:col-span-2 overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.35s" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-neutral-900">Revenue Attribution</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">Multi-touch attribution with time decay. See exactly which signals and sequences drive closed revenue.</p>
              </div>
              <div className="shrink-0 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center">
                <div className="text-lg font-bold text-emerald-600">28x</div>
                <div className="text-[10px] text-emerald-600/60 uppercase tracking-wider">Avg ROI</div>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.4s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50">
                <Lock className="h-5 w-5 text-rose-500" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-neutral-900">Compliance First</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Auto-detects jurisdiction, manages consent, handles opt-outs instantly. GDPR, CCPA, CAN-SPAM, TCPA ready.</p>
              </div>
            </div>
          </div>

          {/* Agency Layer */}
          <div className="anim-fade-up group relative md:col-span-2 overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.45s" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                <Layers className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-neutral-900">Agency Management</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">Multi-tenant architecture for agencies managing multiple clients. White-label branding, cross-client analytics, automated client billing.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-500">50+</div>
                  <div className="text-[10px] text-neutral-400">Clients</div>
                </div>
                <div className="w-px bg-neutral-200" />
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-500">WL</div>
                  <div className="text-[10px] text-neutral-400">White Label</div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.5s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-neutral-900">Meeting Ready</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Calendly links embedded natively. Leads book directly from any channel.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
