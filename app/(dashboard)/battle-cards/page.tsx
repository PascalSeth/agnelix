"use client"

import { useState, useEffect } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import { Zap, MessageSquare, Star, Swords, Quote } from "lucide-react"

interface CaseStudy {
  id: string
  clientName: string
  industry: string
  nicheTags: string[]
  results: string
  aiSummary: string | null
  testimonialQuote: string | null
}

interface Lead {
  id: string
  firstName: string | null
  lastName: string | null
  company: string | null
  industry: string | null
  competitorAnalysis: string | null
}

export default function BattleCardsPage() {
  const { activePlaybook } = usePlaybook()
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/case-studies").then(r => r.json()),
      fetch("/api/leads").then(r => r.json()),
    ]).then(([cs, ls]) => {
      setCaseStudies(Array.isArray(cs) ? cs : [])
      setLeads(Array.isArray(ls) ? ls : [])
    }).finally(() => setLoading(false))
  }, [])

  const verticals = (activePlaybook?.targetVerticals || []).map(v => v.toLowerCase())
  const matchedCaseStudies = caseStudies.filter(cs => {
    const tags = [cs.industry, ...(Array.isArray(cs.nicheTags) ? cs.nicheTags : [])].map(t => String(t).toLowerCase())
    return verticals.some(v => tags.some(t => t.includes(v) || v.includes(t)))
  })

  const leadsWithIntel = leads.filter(l => l.competitorAnalysis)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Battle Cards & Objection Handling</h1>
        <p className="text-sm text-white/40">Objection rebuttals, proof points, and competitor intel that equip your AI inbox copilot.</p>
      </div>

      {/* Objection Library */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-6"
           style={{ backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
          <Zap className="size-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Objection Library ({activePlaybook?.name})</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {activePlaybook?.objectionHandlers.map((obj, idx) => (
            <div key={idx} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 space-y-3">
              <div className="flex gap-2">
                <MessageSquare className="size-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-white">Objection: &ldquo;{obj.objection}&rdquo;</p>
                  <p className="text-xs text-white/40 leading-relaxed mt-2 bg-white/[0.01] p-3 rounded-lg border border-white/[0.04] italic">
                    Response Strategy: &ldquo;{obj.response}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proof Points */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-6"
           style={{ backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
          <Star className="size-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Proof Points ({matchedCaseStudies.length})</h2>
        </div>

        {loading ? (
          <p className="text-xs text-white/30">Loading…</p>
        ) : matchedCaseStudies.length === 0 ? (
          <p className="text-xs text-white/30">No case studies match this playbook&apos;s target verticals yet. Add success stories in Case Studies.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {matchedCaseStudies.map(cs => (
              <div key={cs.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">{cs.clientName} <span className="text-white/30">· {cs.industry}</span></p>
                </div>
                {cs.aiSummary && <p className="text-[11px] text-white/50 leading-relaxed">{cs.aiSummary}</p>}
                <p className="text-[11px] text-emerald-300/90 bg-emerald-500/[0.06] rounded-lg p-2 border border-emerald-500/10">{cs.results}</p>
                {cs.testimonialQuote && (
                  <p className="text-[11px] text-white/40 italic flex gap-1.5">
                    <Quote className="size-3 shrink-0 mt-0.5" /> {cs.testimonialQuote}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Competitor Intel */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-6"
           style={{ backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
          <Swords className="size-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Competitor Intel ({leadsWithIntel.length})</h2>
        </div>

        {loading ? (
          <p className="text-xs text-white/30">Loading…</p>
        ) : leadsWithIntel.length === 0 ? (
          <p className="text-xs text-white/30">No competitor analyses yet. Generate one from Competitor Intel.</p>
        ) : (
          <div className="space-y-3">
            {leadsWithIntel.map(l => (
              <a key={l.id} href={`/leads/${l.id}`} className="block rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 hover:bg-white/[0.03] transition-colors">
                <p className="text-xs font-semibold text-white mb-1">
                  {[l.firstName, l.lastName].filter(Boolean).join(" ") || "Lead"} <span className="text-white/30">· {l.company || l.industry}</span>
                </p>
                <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{l.competitorAnalysis?.split("\n").find(line => line.trim()) || l.competitorAnalysis}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
