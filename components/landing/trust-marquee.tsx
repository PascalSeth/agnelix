import { Globe, Users, Target, Shield, MessageSquare, CreditCard, TrendingUp, Award } from "lucide-react"

export function TrustMarquee() {
  return (
    <div className="relative border-y border-white/[0.04] bg-black/20 backdrop-blur-sm overflow-hidden">
      <div className="flex overflow-hidden py-5">
        <div className="anim-marquee flex shrink-0 items-center gap-10 pr-10">
          {[...Array(2)].map((_, set) => (
            <div key={set} className="flex items-center gap-10">
              {[
                { icon: Globe, text: "$7.5B Lead Gen Market" },
                { icon: Users, text: "85,000+ Target Agencies" },
                { icon: Target, text: "50+ Intent Signals" },
                { icon: Shield, text: "GDPR / CCPA Built-In" },
                { icon: MessageSquare, text: "Email · LinkedIn · SMS" },
                { icon: CreditCard, text: "Outcome-Based Pricing" },
                { icon: TrendingUp, text: "40% Lower Churn" },
                { icon: Award, text: "AI-Powered Sales Tools" },
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
