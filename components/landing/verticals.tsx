/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element */
import { Users, Briefcase, User, Sparkles, MessageSquare, ArrowRight } from "lucide-react"

export function Verticals() {
  const personas = [
    {
      id: "agencies",
      icon: Users,
      title: "Digital Marketing Agencies",
      desc: "Find dentists, roofers, salons — anyone. Search by niche and city, send personal emails, and let Agnelix handle the follow-ups.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop",
      prompt: "Find 50 plumbers in Dallas without SEO...",
      tags: ["Local Search", "Personal Emails", "Auto Follow-Up"],
    },
    {
      id: "b2b",
      icon: Briefcase,
      title: "B2B Service Providers",
      desc: "Agnelix checks each prospect's website, writes a tailored pitch, and tracks every deal from first email to booked meeting.",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=800&auto=format&fit=crop",
      prompt: "Pitch our HR software to local tech firms...",
      tags: ["Company Research", "AI Sequences", "Pipeline CRM"],
    },
    {
      id: "solo",
      icon: User,
      title: "Consultants & Freelancers",
      desc: "Working alone? Agnelix becomes your sales team. It finds businesses, replies to leads, and fills your calendar — so you can focus on the work.",
      image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800&auto=format&fit=crop",
      prompt: "Book 3 meetings for my design service...",
      tags: ["Autopilot Mode", "Battle Cards", "Meeting Booking"],
    }
  ]

  return (
    <section className="relative bg-[#0A0B0E] py-24 lg:py-32 overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[500px] bg-[#c5a880]/5 blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        
        {/* Header */}
        <div className="anim-fade-up text-center mb-16 lg:mb-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
            <User className="h-3.5 w-3.5 text-[#c5a880]" />
            Who is this for?
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl font-luxury-sans">
            Built for anyone who sells to <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d5b8]">local businesses.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 font-medium">
            Whether you run an agency, a small team, or work alone — Agnelix is your extra salesperson, working around the clock.
          </p>
        </div>

        {/* Persona Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {personas.map((vert, i) => (
            <div 
              key={vert.id} 
              className="anim-fade-up group relative flex flex-col overflow-hidden rounded-[2rem] bg-[#16181D] border border-white/5 transition-all duration-500 hover:border-[#c5a880]/30 hover:shadow-[0_0_40px_rgba(197,168,128,0.1)] hover:-translate-y-2" 
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
            >
              
              {/* Image & Interactive Top Half */}
              <div className="relative h-56 w-full overflow-hidden bg-neutral-900">
                <img 
                  src={vert.image} 
                  alt={vert.title} 
                  className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity transition-transform duration-700 group-hover:scale-110 group-hover:opacity-40 group-hover:mix-blend-normal"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#16181D] via-[#16181D]/60 to-transparent" />
                
                {/* Floating AI Prompt Simulation */}
                <div className="absolute inset-x-0 bottom-6 flex justify-center px-4 transition-transform duration-500 group-hover:-translate-y-2">
                  <div className="flex w-full max-w-[90%] items-center gap-3 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-3 shadow-2xl">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c5a880]/20 text-[#c5a880]">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-medium text-white/90 truncate">
                      &quot;{vert.prompt}&quot;
                    </p>
                    <div className="ml-auto h-3 w-[2px] animate-pulse bg-[#c5a880]" />
                  </div>
                </div>
              </div>

              {/* Content Bottom Half */}
              <div className="relative flex flex-col flex-1 p-8 pt-4">
                
                {/* Icon & Title */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-colors group-hover:bg-[#c5a880]/10 group-hover:border-[#c5a880]/30">
                    <vert.icon className="h-5 w-5 text-white transition-colors group-hover:text-[#c5a880]" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-luxury-sans leading-tight">
                    {vert.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-slate-400 font-medium mb-6 flex-1">
                  {vert.desc}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {vert.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="rounded-lg bg-white/5 border border-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-400 transition-colors group-hover:border-[#c5a880]/20 group-hover:text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Link (Appears on Hover) */}
                <div className="mt-auto flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c5a880] opacity-0 transition-all duration-300 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
                  See how it works <ArrowRight className="h-4 w-4" />
                </div>
                
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}