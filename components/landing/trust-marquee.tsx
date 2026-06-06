import { MapPin, Mail, Bot, BarChart3, Swords, Zap, Workflow, Eye, Cpu } from "lucide-react"

export function TrustMarquee() {
  const modules = [
    { icon: MapPin, text: "Local Lead Discovery" },
    { icon: Mail, text: "AI-Personalized Emails" },
    { icon: Bot, text: "Autonomous Reply Handling" },
    { icon: BarChart3, text: "Pipeline CRM" },
    { icon: Eye, text: "Open & Click Tracking" },
    { icon: Swords, text: "Auto Battle Cards" },
    { icon: Zap, text: "Autopilot Mode" },
    { icon: Workflow, text: "Multi-Step Sequences" },
    { icon: Cpu, text: "AI Core Engine" }
  ]

  return (
    <div className="relative bg-[#0A0B0E] py-8 overflow-hidden">
      
      {/* Top and Bottom subtle borders */}
      <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Edge Gradients for smooth fade in/out */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 sm:w-48 bg-gradient-to-r from-[#0A0B0E] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 sm:w-48 bg-gradient-to-l from-[#0A0B0E] to-transparent" />

      {/* Marquee Track */}
      <div className="flex overflow-hidden gap-6 w-full py-2 group">
        
        {/* First set */}
        <div className="flex shrink-0 items-center gap-6 anim-marquee group-hover:[animation-play-state:paused]">
          {modules.map(({ icon: Icon, text }, i) => (
            <div 
              key={i} 
              className="flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.02] px-5 py-2.5 transition-all duration-300 hover:border-[#c5a880]/30 hover:bg-[#c5a880]/10 hover:shadow-[0_0_20px_rgba(197,168,128,0.15)] cursor-default"
            >
              <Icon className="h-4 w-4 text-[#c5a880]" />
              <span className="text-sm font-semibold tracking-wide text-slate-300 whitespace-nowrap font-luxury-sans">
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Duplicate set for seamless looping */}
        <div className="flex shrink-0 items-center gap-6 anim-marquee group-hover:[animation-play-state:paused]" aria-hidden="true">
          {modules.map(({ icon: Icon, text }, i) => (
            <div 
              key={`dup-${i}`} 
              className="flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.02] px-5 py-2.5 transition-all duration-300 hover:border-[#c5a880]/30 hover:bg-[#c5a880]/10 hover:shadow-[0_0_20px_rgba(197,168,128,0.15)] cursor-default"
            >
              <Icon className="h-4 w-4 text-[#c5a880]" />
              <span className="text-sm font-semibold tracking-wide text-slate-300 whitespace-nowrap font-luxury-sans">
                {text}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}