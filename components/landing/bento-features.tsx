import { MapPin, Brain, Bot, BarChart3, Zap, Swords, Mail, Workflow } from "lucide-react"

export function BentoFeatures() {
  return (
    <section className="relative bg-[#f8f8fb] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="anim-fade-up text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gradient-b md:text-5xl">
            Everything you need to
            <br />
            <span className="text-gradient-accent">automate outreach.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
            Find leads, send emails, and manage deals — all in one place. No need to juggle multiple tools.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(170px,auto)]">

          {/* Lead Discovery - Large */}
          <div className="anim-fade-up group relative md:col-span-2 md:row-span-2 overflow-hidden rounded-3xl card-light p-8" style={{ animationDelay: "0.15s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/15">
                  <MapPin className="h-7 w-7 text-white" />
                </div>
                <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-100">Core Engine</div>
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-neutral-900">Lead Discovery</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-neutral-500">
                  Search for businesses by type and location. Agnelix pulls their name, website, phone, ratings, reviews, and photos — then finds their email address from their website.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {["Location Search", "Website Lookup", "Email Finder", "Email Checker", "Contact Info"].map((tag) => (
                    <span key={tag} className="rounded-lg bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs text-neutral-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Email Writer */}
          <div className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.25s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-neutral-900">AI Email Writer</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Looks up each prospect&apos;s website and writes a unique email using your business info and preferred tone.</p>
              </div>
            </div>
          </div>

          {/* Autonomous Agent */}
          <div className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.3s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-neutral-900">Autonomous Agent</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Reads replies, understands what the person wants, writes a response, and books meetings. You can review everything before it sends.</p>
              </div>
            </div>
          </div>

          {/* Pipeline & CRM - Wide */}
          <div className="anim-fade-up group relative md:col-span-2 overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.35s" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <BarChart3 className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-neutral-900">Pipeline &amp; CRM</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">Drag-and-drop board to track every deal — from first contact to closed. Add deal values and see your total pipeline at a glance.</p>
              </div>
              <div className="shrink-0 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center">
                <div className="text-lg font-bold text-emerald-600">8</div>
                <div className="text-[10px] text-emerald-600/60 uppercase tracking-wider">Stages</div>
              </div>
            </div>
          </div>

          {/* Autopilot */}
          <div className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.4s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50">
                <Zap className="h-5 w-5 text-rose-500" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-neutral-900">Autopilot Mode</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Set up a search once and let it run on a schedule. New leads get imported, added to campaigns, and emailed automatically.</p>
              </div>
            </div>
          </div>

          {/* Battle Cards & Research - Wide */}
          <div className="anim-fade-up group relative md:col-span-2 overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.45s" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                <Swords className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-neutral-900">Battle Cards &amp; Research</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">When someone replies, AI creates a cheat sheet with talking points, common objections and how to handle them, and a clear next step.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-500">Auto</div>
                  <div className="text-[10px] text-neutral-400">Generated</div>
                </div>
                <div className="w-px bg-neutral-200" />
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-500">5</div>
                  <div className="text-[10px] text-neutral-400">Sections</div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Tracking */}
          <div className="anim-fade-up group relative overflow-hidden rounded-3xl card-light p-6" style={{ animationDelay: "0.5s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-neutral-900">Email Tracking</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">Know who opened your email, who clicked a link, and who replied. All tracked automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
