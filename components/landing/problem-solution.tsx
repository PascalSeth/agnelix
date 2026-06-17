/* eslint-disable @next/next/no-img-element */
import { X, Sparkles, MapPin, Search, Calendar, ArrowRight } from "lucide-react"

export function ProblemSolution() {
  const cards = [
    {
      id: "prospecting",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
      uiOverlay: (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-[200px] rounded-xl border border-white/60 bg-white/75 backdrop-blur-md p-3 shadow-lg">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2 mb-2">
              <Search className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-bold text-[#101e35]">Boutique Hotels in Miami</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded bg-[#728972]/10 px-2 py-1 border border-[#728972]/20">
                <span className="text-[9px] font-bold text-[#3d4d3d]">Found 28 local businesses</span>
                <MapPin className="h-3 w-3 text-[#728972]" />
              </div>
              <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden mt-2">
                <div className="h-full w-3/4 bg-[#728972] animate-pulse rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ),
      problem: "Right now you spend hours on Google Maps, buy outdated lists, and guess at email addresses.",
      solution: "Tell Galien the type of business and the city. It finds real local businesses with verified emails and phone numbers — in seconds."
    },
    {
      id: "writing",
      image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop",
      uiOverlay: (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-[220px] rounded-xl border border-white/60 bg-white/75 backdrop-blur-md p-3 shadow-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-4 w-4 rounded-full bg-[#c5a880]/15 flex items-center justify-center">
                <Sparkles className="h-2.5 w-2.5 text-[#c5a880]" />
              </div>
              <span className="text-[10px] font-bold text-[#101e35]">AI Website Analysis</span>
            </div>
            <div className="space-y-2 text-[9px] leading-relaxed text-slate-600 font-medium">
              <p>Hey John,</p>
              <p>
                Loved your recent work on the <span className="text-[#b5966d] font-bold bg-[#c5a880]/10 px-1 py-0.5 rounded border border-[#c5a880]/20">Downtown Plaza project</span>. Noticed you don&apos;t have...
              </p>
              <div className="w-16 h-4 rounded bg-[#101e35] flex items-center justify-center mt-2 cursor-pointer hover:brightness-115">
                <span className="text-[8px] text-white font-bold">Send Email</span>
              </div>
            </div>
          </div>
        </div>
      ),
      problem: "Copy-paste templates get ignored or land in spam. People can spot a generic email instantly.",
      solution: "Galien reads each prospect's website and writes a personal email that mentions their actual business — not a template."
    },
    {
      id: "closing",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      uiOverlay: (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-[220px] rounded-xl border border-white/60 bg-white/75 backdrop-blur-md p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <div className="self-start rounded-lg bg-white/90 border border-white shadow-sm px-2.5 py-1.5 text-[9px] font-bold text-slate-700 max-w-[85%]">
                Sounds interesting. Do you have time tomorrow?
              </div>
              <div className="flex items-center justify-center my-1">
                <ArrowRight className="h-3 w-3 text-[#c5a880]" />
              </div>
              <div className="self-end flex items-center gap-1.5 rounded-lg bg-[#728972]/10 border border-[#728972]/20 px-2.5 py-1.5 text-[9px] font-bold text-[#3d4d3d] max-w-[85%] shadow-sm">
                <Calendar className="h-3 w-3 text-[#728972]" />
                Meeting Booked
              </div>
            </div>
          </div>
        </div>
      ),
      problem: "When a lead finally replies, you're busy. By the time you respond, they've gone cold.",
      solution: "Galien reads the reply, answers questions, handles objections, and books the meeting on your calendar — automatically."
    }
  ]

  return (
    <section className="relative bg-gradient-to-b from-[#111216] via-[#1a1c24] to-[#111216] py-24 lg:py-32 overflow-hidden">
      
      {/* Decorative subtle top glow */}
      <div className="absolute top-0 inset-x-0 h-75 bg-white/[0.01] blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="anim-fade-up text-center mb-16 lg:mb-24">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-5xl font-luxury-sans">
            Stop chasing leads <span className="text-slate-500 line-through decoration-rose-400/60 font-medium">by hand</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400 font-semibold leading-relaxed">
            No more digging for emails or updating spreadsheets. Galien does the busywork so you can spend your time closing deals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {cards.map((card, i) => (
            <div 
              key={card.id} 
              className="anim-fade-up group relative flex flex-col overflow-hidden rounded-[2rem] border border-white/[0.05] bg-white/[0.01] backdrop-blur-xl shadow-xl transition-all duration-500 hover:shadow-2xl hover:border-white/10 hover:bg-white/[0.03] hover:-translate-y-1" 
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
            >
              
              {/* Top Half: Creative Image with UI Overlay */}
              <div className="relative h-60 w-full overflow-hidden bg-neutral-900/50">
                {/* Unsplash Background Image */}
                <img 
                  src={card.image} 
                  alt="Abstract tech background" 
                  className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay transition-transform duration-700 group-hover:scale-105"
                />
                {/* Fade into the frosted glass at the bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#16171e] via-[#16171e]/30 to-transparent" />
                
                {/* Floating UI Elements */}
                {card.uiOverlay}
              </div>

              {/* Bottom Half: Content (Problem vs Solution) */}
              <div className="flex flex-col flex-1 p-6 lg:p-8 bg-[#16171e]/90">
                
                {/* Problem (The Old Way) */}
                <div className="mb-6 border-l-2 border-rose-300/40 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="h-4 w-4 text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">The old way</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-slate-400">
                    {card.problem}
                  </p>
                </div>

                {/* Divider */}
                <div className="my-2 h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                {/* Solution (The Galien Way) */}
                <div className="mt-6 border-l-2 border-[#728972] pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-[#c5a880]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#728972]">With Galien</span>
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-slate-200">
                    {card.solution}
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}