import React from "react";
import { TrendingUp, Users, Target, Rocket } from "lucide-react";

const stats = [
  {
    label: "Leads Found",
    value: "2,482",
    change: "+12.5%",
    trend: "up",
    icon: TrendingUp,
    color: "text-black",
    bg: "bg-black/5",
  },
  {
    label: "Live Campaigns",
    value: "124",
    change: "+8.2%",
    trend: "up",
    icon: Rocket,
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
  {
    label: "Success Rate",
    value: "86%",
    change: "+3.1%",
    trend: "up",
    icon: Target,
    color: "text-slate-800",
    bg: "bg-slate-50",
  },
  {
    label: "Total Earnings",
    value: "$42,850",
    change: "+18.4%",
    trend: "up",
    icon: Users,
    color: "text-black",
    bg: "bg-black/10",
  },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-6 rounded-3xl relative overflow-hidden group border-slate-100 shadow-sm">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-tight">{stat.label}</p>
              <h3 className="text-2xl font-bold text-black font-outfit">{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} border border-slate-200/50`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2 relative z-10">
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.bg} ${stat.color} border border-slate-200/50`}>
              {stat.change}
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">vs last month</span>
          </div>
        </div>
      ))}
    </div>
  );
}
