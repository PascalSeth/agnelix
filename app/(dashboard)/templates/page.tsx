"use client"

import { usePlaybook } from "@/lib/playbook-context";
import { FileText, CheckCircle2 } from "lucide-react";

export default function TemplatesPage() {
  const { activePlaybook } = usePlaybook();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Templates Library</h1>
        <p className="text-sm text-white/40">Browse preset sequence campaigns and proposal templates defined by the active playbook.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sequence Templates */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4"
             style={{ backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
            <CheckCircle2 className="size-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Campaign Outreach presets</h2>
          </div>
          <div className="space-y-3">
            {activePlaybook?.sequenceTemplates.map((s) => (
              <div key={s.id} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-white">{s.name}</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                    {s.steps} steps
                  </span>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Proposal Templates */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4"
             style={{ backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
            <FileText className="size-4 text-pink-400" />
            <h2 className="text-sm font-semibold text-white">Proposal models & setup fees</h2>
          </div>
          <div className="space-y-3">
            {activePlaybook?.proposalTemplates.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3.5 flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-white">{p.name}</p>
                  <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{p.description}</p>
                </div>
                <span className="text-xs font-bold text-white/70 ml-4 shrink-0">
                  {p.currency === "GBP" ? "£" : p.currency}{p.price}/{p.period === "monthly" ? "mo" : "one-off"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
