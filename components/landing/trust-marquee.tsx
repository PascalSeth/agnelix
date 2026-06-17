import { MapPin, Mail, Bot, BarChart3, Swords, Zap, Workflow, Eye, Cpu } from "lucide-react"

export function TrustMarquee() {
  const modules = [
    { icon: MapPin, text: "Find Local Leads" },
    { icon: Mail, text: "Personal AI Emails" },
    { icon: Bot, text: "Auto Reply Handling" },
    { icon: BarChart3, text: "Pipeline & CRM" },
    { icon: Eye, text: "Open & Click Tracking" },
    { icon: Swords, text: "Battle Cards" },
    { icon: Zap, text: "Autopilot Mode" },
    { icon: Workflow, text: "Email Sequences" },
    { icon: Cpu, text: "AI Engine" }
  ]

  return (
    <div className="relative bg-[#07080a] py-3.5 overflow-hidden">
      
      {/* Top and Bottom subtle borders */}
      <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Edge Gradients for smooth fade in/out */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 sm:w-48 bg-gradient-to-r from-[#07080a] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 sm:w-48 bg-gradient-to-l from-[#07080a] to-transparent" />

      {/* Marquee Track */}
      <div className="flex overflow-hidden gap-4 w-full py-1 group">
        
        {/* First set */}
        <div className="flex shrink-0 items-center gap-4 anim-marquee group-hover:[animation-play-state:paused]">
          {modules.map(({ icon: Icon, text }, i) => (
            <div 
              key={i} 
              className="flex items-center gap-2.5 px-4 border-r border-white/5 last:border-0 hover:text-white transition-all duration-300 cursor-default group/item"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#c5a880]/5 border border-[#c5a880]/15 text-[#c5a880] transition-colors group-hover/item:bg-[#c5a880]/10">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[12px] font-semibold tracking-wide text-slate-400 whitespace-nowrap transition-colors group-hover/item:text-slate-200 font-luxury-sans">
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Duplicate set for seamless looping */}
        <div className="flex shrink-0 items-center gap-4 anim-marquee group-hover:[animation-play-state:paused]" aria-hidden="true">
          {modules.map(({ icon: Icon, text }, i) => (
            <div 
              key={`dup-${i}`} 
              className="flex items-center gap-2.5 px-4 border-r border-white/5 last:border-0 hover:text-white transition-all duration-300 cursor-default group/item"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#c5a880]/5 border border-[#c5a880]/15 text-[#c5a880] transition-colors group-hover/item:bg-[#c5a880]/10">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[12px] font-semibold tracking-wide text-slate-400 whitespace-nowrap transition-colors group-hover/item:text-slate-200 font-luxury-sans">
                {text}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}