import React from "react";
import { Zap, Briefcase, TrendingUp, AlertCircle } from "lucide-react";

const signals = [
  {
    type: "risk",
    company: "Pearl Dental Clinic",
    location: "Denver, CO",
    detail: "4 negative reviews in 48 hours. Urgent reputation repair needed.",
    time: "2m ago",
    icon: AlertCircle,
    color: "text-slate-900",
    bg: "bg-slate-100",
  },
  {
    type: "hiring",
    company: "SmileDesigners Ltd",
    location: "Boulder, CO",
    detail: "Hiring 2 New Dental Hygienists. Growth signal detected.",
    time: "15m ago",
    icon: Briefcase,
    color: "text-black",
    bg: "bg-black/5",
  },
  {
    type: "tech",
    company: "Metro Ortho Care",
    location: "Aurora, CO",
    detail: "Upgraded website to WordPress. No SEO plugin detected.",
    time: "45m ago",
    icon: Zap,
    color: "text-slate-600",
    bg: "bg-slate-50",
  },
  {
    type: "expansion",
    company: "Family Dental Group",
    location: "Colorado Springs, CO",
    detail: "Opening a new pediatric branch in June.",
    time: "1h ago",
    icon: TrendingUp,
    color: "text-black",
    bg: "bg-black/10",
  },
];

export function LeadFeed() {
  return (
    <div className="glass-panel rounded-3xl p-6 h-full flex flex-col border-slate-100 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-black font-outfit">Live Alerts</h3>
        <span className="flex items-center gap-2 text-[10px] font-black text-black bg-slate-100 px-2 py-1 rounded-full uppercase tracking-tighter border border-slate-200">
          <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          Live
        </span>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {signals.map((signal, index) => (
          <div key={index} className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 transition-all group shadow-sm hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-xl ${signal.bg} ${signal.color} border border-slate-200/50`}>
                <signal.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{signal.company}</h4>
                  <span className="text-[10px] text-slate-400 font-bold">{signal.time}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-2 leading-relaxed">{signal.detail}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{signal.location}</span>
                  <span className="text-[10px] text-slate-200">•</span>
                  <button className="text-[10px] font-black text-black hover:underline uppercase tracking-tighter">Send Message</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-6 py-3 rounded-xl bg-slate-50 text-[10px] font-black text-slate-500 hover:text-black hover:bg-slate-100 transition-all uppercase tracking-widest border border-slate-200/50">
        View All Alerts
      </button>
    </div>
  );
}
