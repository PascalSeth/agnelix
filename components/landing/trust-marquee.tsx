import { MapPin, Mail, Bot, BarChart3, Swords, Zap, Workflow, Eye } from "lucide-react"

export function TrustMarquee() {
  return (
    <div className="relative border-y border-white/[0.04] bg-black/20 backdrop-blur-sm overflow-hidden">
      <div className="flex overflow-hidden py-5">
        <div className="anim-marquee flex shrink-0 items-center gap-10 pr-10">
          {[...Array(2)].map((_, set) => (
            <div key={set} className="flex items-center gap-10">
              {[
                { icon: MapPin, text: "Local Lead Discovery" },
                { icon: Mail, text: "AI-Personalized Emails" },
                { icon: Bot, text: "Autonomous Reply Handling" },
                { icon: BarChart3, text: "Pipeline CRM" },
                { icon: Eye, text: "Open & Click Tracking" },
                { icon: Swords, text: "Auto Battle Cards" },
                { icon: Zap, text: "Autopilot Mode" },
                { icon: Workflow, text: "Multi-Step Sequences" },
              ].map(({ icon: Icon, text }, i) => (
                <span key={i} className="flex items-center gap-2 text-sm font-medium text-white/20 whitespace-nowrap">
                  <Icon className="h-4 w-4 text-white/10" /> {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
