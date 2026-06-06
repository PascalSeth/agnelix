import { MapPin, Search, Mail, Bot, Sparkles, ArrowRight } from "lucide-react"

export function HowItWorks() {
  const steps = [
    { 
      step: "01", 
      icon: MapPin, 
      title: "Discover Leads", 
      desc: "Search by business type and city. Agnelix finds prospects and pulls their name, website, phone, ratings, and reviews.",
      badge: "Targeting"
    },
    { 
      step: "02", 
      icon: Search, 
      title: "Research & Enrich", 
      desc: "AI visits each prospect's website, finds their email address, and puts together a quick summary of what they do.",
      badge: "AI Analysis"
    },
    { 
      step: "03", 
      icon: Mail, 
      title: "Launch Campaigns", 
      desc: "Build email sequences with multiple steps. AI writes each email based on the prospect's info. Preview and send.",
      badge: "Outreach"
    },
    { 
      step: "04", 
      icon: Bot, 
      title: "Autonomous Follow-Up", 
      desc: "When someone replies, AI reads the message, writes a response, and can book a meeting for you automatically.",
      badge: "Closing"
    },
  ]

  return (
    <section className="relative overflow-hidden bg-[#111216] py-24 lg:py-32">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[80%] rounded-full bg-[#c5a880]/10 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        
        {/* Header Section */}
        <div className="anim-fade-up text-center mb-20 lg:mb-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c5a880]/20 bg-[#c5a880]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#c5a880] mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Agent Workflow
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl font-luxury-sans">
            From search to meeting in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a880] to-[#e6d5b8]">four steps.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 font-medium">
            No manual scraping. No copy-paste. One tool takes you entirely from finding leads to booking meetings.
          </p>
        </div>

        {/* Workflow Grid */}
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Desktop Connecting Line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-transparent via-[#c5a880]/20 to-transparent z-0" />

          {steps.map((item, i) => (
            <div key={i} className="anim-fade-up group relative z-10" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
              
              {/* Icon / Node Indicator */}
              <div className="relative flex flex-col items-center mb-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1A1C23] border border-white/5 shadow-xl transition-all duration-500 group-hover:-translate-y-2 group-hover:border-[#c5a880]/40 group-hover:shadow-[0_0_30px_rgba(197,168,128,0.2)]">
                  <item.icon className="h-8 w-8 text-[#c5a880] transition-transform duration-500 group-hover:scale-110" />
                </div>
                
                {/* Micro Arrow between steps (Mobile/Tablet) */}
                {i < 3 && (
                  <div className="lg:hidden mt-6 text-[#c5a880]/30">
                    <ArrowRight className="h-6 w-6 rotate-90 md:rotate-0" />
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 p-8 transition-all duration-500 group-hover:bg-white/[0.06] group-hover:border-white/10 h-full">
                
                {/* Giant Watermark Number */}
                <div className="absolute -top-6 -right-2 select-none">
                  <span className="text-8xl font-black text-white/[0.02] transition-colors duration-500 group-hover:text-[#c5a880]/[0.05] font-luxury-sans">
                    {item.step}
                  </span>
                </div>

                <div className="relative z-10">
                  {/* Badge */}
                  <div className="inline-flex items-center rounded-lg bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c5a880] mb-5 border border-white/5">
                    {item.badge}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3 font-luxury-sans group-hover:text-[#c5a880] transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="text-sm leading-relaxed text-slate-400 font-medium">
                    {item.desc}
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