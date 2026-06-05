import React from "react";
import { MoreHorizontal, ExternalLink, Mail } from "lucide-react";

const leads = [
  {
    name: "Dr. Sarah Jenkins",
    role: "Clinical Director",
    company: "Lumina Dental Group",
    score: 98,
    intent: "Hiring Dental Associate",
    status: "Qualified",
    compliance: "Verified",
  },
  {
    name: "Michael Chen",
    role: "Practice Manager",
    company: "Advanced Ortho Denver",
    score: 92,
    intent: "GMB Sentiment Drop",
    status: "In Sequence",
    compliance: "Verified",
  },
  {
    name: "Elena Rodriguez",
    role: "Owner",
    company: "Skyline Pediatric Dentistry",
    score: 89,
    intent: "Low SEO Visibility",
    status: "New",
    compliance: "Verified",
  },
  {
    name: "David Park",
    role: "Head Surgeon",
    company: "Park Oral & Maxillofacial",
    score: 85,
    intent: "New Location Opening",
    status: "Engaged",
    compliance: "Verified",
  },
];

export function SignalTable() {
  return (
    <div className="glass-panel rounded-3xl overflow-hidden border-slate-100 shadow-sm">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
        <h3 className="text-lg font-bold text-black font-outfit">High-Intent Leads</h3>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">Export CSV</button>
          <button className="px-4 py-2 rounded-xl bg-black text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-black/10">Sync to CRM</button>
        </div>
      </div>
      
      <div className="overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prospect</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Intent Score</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Signal</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leads.map((lead, index) => (
              <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-black">
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{lead.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{lead.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-bold">{lead.company}</span>
                    <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-black transition-colors" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className={`h-full rounded-full bg-black`} 
                        style={{ width: `${lead.score}%` }} 
                      />
                    </div>
                    <span className={`text-xs font-black text-black`}>{lead.score}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-500 font-bold">{lead.intent}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg border border-slate-200 uppercase tracking-tighter ${
                    lead.status === 'Qualified' ? 'bg-black text-white' : 
                    lead.status === 'In Sequence' ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400'
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-black transition-all" title="LinkedIn Profile">
                      <LinkedinIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-black transition-all" title="Send Email">
                      <Mail className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-black transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
