"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Loader2, TrendingUp, DollarSign, Users, ExternalLink } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type PipelineLead = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  company: string | null
  industry: string | null
  status: string
  dealValue: number | null
  updatedAt: string
  emails: { status: string }[]
}

const COLUMNS = [
  { id: "NEW",            label: "New",       accent: "rgba(255,255,255,.25)" },
  { id: "CONTACTED",      label: "Contacted", accent: "rgba(125,211,252,.7)"  },
  { id: "REPLIED",        label: "Replied",   accent: "rgba(167,139,250,.7)"  },
  { id: "INTERESTED",     label: "Interested",accent: "rgba(251,191,36,.7)"   },
  { id: "MEETING_BOOKED", label: "Meeting",   accent: "rgba(52,211,153,.7)"   },
  { id: "PROPOSAL_SENT",  label: "Proposal",  accent: "rgba(249,115,22,.7)"   },
  { id: "WON",            label: "Won",       accent: "rgba(52,211,153,.95)"  },
  { id: "LOST",           label: "Lost",      accent: "rgba(239,68,68,.6)"    },
] as const

function fmtVal(v: number | null) {
  if (!v) return null
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

export default function PipelinePage() {
  const { status } = useSession()
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const dragLeadRef = useRef<PipelineLead | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/pipeline")
      .then(r => r.json())
      .then(data => { setLeads(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status])

  function onDragStart(lead: PipelineLead) {
    setDragging(lead.id)
    dragLeadRef.current = lead
  }

  function onDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault()
    setDragOver(colId)
  }

  async function onDrop(colId: string) {
    const lead = dragLeadRef.current
    setDragging(null)
    setDragOver(null)
    dragLeadRef.current = null
    if (!lead || lead.status === colId) return

    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: colId } : l))

    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: colId }),
      })
      if (!res.ok) throw new Error()
      const col = COLUMNS.find(c => c.id === colId)
      toast.success(`→ ${col?.label ?? colId}`)
    } catch {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: lead.status } : l))
      toast.error("Stage update failed")
    }
  }

  const byStage = (colId: string) => leads.filter(l => l.status === colId)
  const wonRevenue = leads.filter(l => l.status === "WON").reduce((s, l) => s + (l.dealValue || 0), 0)
  const pipelineVal = leads.filter(l => !["LOST", "WON", "NEW"].includes(l.status)).reduce((s, l) => s + (l.dealValue || 0), 0)

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="shrink-0 pt-2 pb-5 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="size-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Sales Pipeline</span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">Pipeline</h1>
          <p className="mt-1.5 text-[12px] text-white/25">Drag cards between stages · {leads.length} leads total</p>
        </div>

        {/* KPI strip */}
        <div className="hidden sm:flex items-center gap-2">
          {[
            { icon: Users,      label: "Active",   val: leads.filter(l => !["LOST","NEW"].includes(l.status)).length.toString(), color: "text-white/50" },
            { icon: TrendingUp, label: "Pipeline", val: fmtVal(pipelineVal) || "$0", color: "text-amber-300" },
            { icon: DollarSign, label: "Won",      val: fmtVal(wonRevenue) || "$0",  color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <s.icon className={`size-3.5 ${s.color}`} />
              <div className="leading-none">
                <p className={`text-[13px] font-black ${s.color}`}>{s.val}</p>
                <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-white/20" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-2.5 h-full min-h-[560px]" style={{ minWidth: `${COLUMNS.length * 210}px` }}>
            {COLUMNS.map(col => {
              const colLeads = byStage(col.id)
              const colVal = colLeads.reduce((s, l) => s + (l.dealValue || 0), 0)
              const isOver = dragOver === col.id

              return (
                <div
                  key={col.id}
                  className="flex flex-col rounded-2xl w-[200px] shrink-0 transition-colors duration-100"
                  style={{
                    background: isOver
                      ? `${col.accent.replace(/[\d.]+\)$/, ".08)")}`
                      : "rgba(255,255,255,.025)",
                    border: `1px solid ${isOver ? col.accent.replace(/[\d.]+\)$/, ".25)") : "rgba(255,255,255,.06)"}`,
                    outline: isOver ? `1px solid ${col.accent.replace(/[\d.]+\)$/, ".15)")}` : "none",
                    outlineOffset: "2px",
                  }}
                  onDragOver={e => onDragOver(e, col.id)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => onDrop(col.id)}
                >
                  {/* Column header */}
                  <div className="px-3 pt-3 pb-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="size-1.5 rounded-full" style={{ background: col.accent }} />
                        <span className="text-[10px] font-black text-white/55 uppercase tracking-wider">{col.label}</span>
                      </div>
                      <span className="text-[9px] font-black text-white/30 tabular-nums">{colLeads.length}</span>
                    </div>
                    {colVal > 0 && (
                      <p className="text-[9px] font-bold mt-1 pl-3" style={{ color: col.accent }}>
                        {fmtVal(colVal)}
                      </p>
                    )}
                    <div className="mt-2.5 h-px" style={{ background: "rgba(255,255,255,.05)" }} />
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
                    {colLeads.length === 0 ? (
                      <div className="flex items-center justify-center py-10 rounded-xl"
                        style={{ border: "1px dashed rgba(255,255,255,.04)" }}>
                        <p className="text-[9px] text-white/12">drop here</p>
                      </div>
                    ) : colLeads.map(lead => {
                      const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email
                      const isDraggingThis = dragging === lead.id

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => onDragStart(lead)}
                          onDragEnd={() => { setDragging(null); setDragOver(null) }}
                          className="group rounded-xl p-3 cursor-grab active:cursor-grabbing select-none transition-all duration-100"
                          style={{
                            background: "linear-gradient(145deg,rgba(255,255,255,.055) 0%,rgba(255,255,255,.025) 100%)",
                            border: "1px solid rgba(255,255,255,.08)",
                            opacity: isDraggingThis ? 0.35 : 1,
                            transform: isDraggingThis ? "scale(.97)" : "none",
                          }}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <p className="text-[11px] font-bold text-white/80 leading-tight line-clamp-2">{name}</p>
                            <Link
                              href={`/leads/${lead.id}`}
                              onClick={e => e.stopPropagation()}
                              className="shrink-0 mt-0.5 text-white/15 hover:text-white/55 transition-colors"
                            >
                              <ExternalLink className="size-2.5" />
                            </Link>
                          </div>

                          {lead.company && (
                            <p className="text-[9px] text-white/30 truncate mb-1.5">{lead.company}</p>
                          )}

                          {lead.dealValue ? (
                            <div className="flex items-center justify-end">
                              <span
                                className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(52,211,153,.1)", color: "rgba(52,211,153,.85)" }}
                              >
                                {fmtVal(lead.dealValue)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
