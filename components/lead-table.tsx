"use client"

import { useState } from "react"
import Link from "next/link"
import { Trash2, Loader2 } from "lucide-react"
import { formatRelative, initials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"

type LeadStatus = "NEW" | "CONTACTED" | "REPLIED" | "INTERESTED" | "MEETING_BOOKED" | "PROPOSAL_SENT" | "WON" | "LOST" | "NOT_INTERESTED" | "BOUNCED"

export interface LeadRow {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  company: string | null
  title: string | null
  status: LeadStatus
  createdAt: Date
  campaigns?: string[]
  linkedinUrl?: string | null
  auditJson?: string | null
  contactsJson?: string | null
  platformFocus?: string | null
  sourceQuery?: string | null
}

const STATUS_STYLE: Record<LeadStatus, { text: string; bg: string }> = {
  NEW:            { text: "text-white/40",    bg: "rgba(255,255,255,.06)"  },
  CONTACTED:      { text: "text-sky-300",     bg: "rgba(125,211,252,.1)"  },
  REPLIED:        { text: "text-violet-300",  bg: "rgba(167,139,250,.1)"  },
  INTERESTED:     { text: "text-amber-300",   bg: "rgba(252,211,77,.1)"   },
  MEETING_BOOKED: { text: "text-emerald-300", bg: "rgba(52,211,153,.1)"   },
  PROPOSAL_SENT:  { text: "text-indigo-300",  bg: "rgba(129,140,248,.1)"  },
  WON:            { text: "text-emerald-400", bg: "rgba(16,185,129,.12)"  },
  LOST:           { text: "text-white/25",    bg: "rgba(255,255,255,.03)" },
  NOT_INTERESTED: { text: "text-white/30",    bg: "rgba(255,255,255,.04)" },
  BOUNCED:        { text: "text-red-400",     bg: "rgba(239,68,68,.1)"    },
}


const COLS = "minmax(200px, 1.5fr) minmax(140px, 1fr) minmax(120px, 1fr) 140px 100px 48px"

export function LeadTable({ leads: initial }: { leads: LeadRow[] }) {
  const [rows, setRows]           = useState(initial)
  const [deleting, setDeleting]   = useState<string | null>(null)

  async function del(id: string) {
    if (!confirm("Delete this lead?")) return
    setDeleting(id)
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" })
      setRows((r) => r.filter((l) => l.id !== id))
      toast.success("Lead deleted")
    } catch {
      toast.error("Delete failed")
    } finally {
      setDeleting(null)
    }
  }

  if (!rows.length) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl py-14 text-center"
        style={{ background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.07)" }}
      >
        <p className="text-[12px] font-bold text-white/20">No leads match your filter</p>
      </div>
    )
  }

  return (
    <div
      className="relative overflow-x-auto rounded-2xl"
      style={{
        background: "linear-gradient(145deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.015) 100%)",
        border: "1px solid rgba(255,255,255,.07)",
      }}
    >
      <div className="min-w-[800px] sm:min-w-full">
      {/* Table header */}
      <div
        className="grid items-center gap-4 px-5 py-3"
        style={{
          gridTemplateColumns: COLS,
          borderBottom: "1px solid rgba(255,255,255,.05)",
        }}
      >
        {["Contact", "Company", "Campaigns", "Status", "Added", ""].map((h) => (
          <p key={h} className="text-[9px] font-bold uppercase tracking-[.15em] text-white/20">{h}</p>
        ))}
      </div>

      {/* Rows */}
      {rows.map((lead, idx) => {
        const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email
        const ss   = STATUS_STYLE[lead.status] ?? STATUS_STYLE.NEW
        return (
          <div
            key={lead.id}
            className="grid items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[.02]"
            style={{
              gridTemplateColumns: COLS,
              borderBottom: idx < rows.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none",
            }}
          >
            {/* Contact */}
            <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 min-w-0 group">
              <Avatar
                className="size-7 shrink-0"
                style={{ boxShadow: "0 0 0 1.5px rgba(255,255,255,.08)" }}
              >
                <AvatarFallback
                  className="text-[10px] font-bold text-white/50"
                  style={{ background: "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03))" }}
                >
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white/70 group-hover:text-white/90 transition-colors">
                  {name}
                </p>
                <p className="truncate text-[10px] text-white/25">{lead.email}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {lead.linkedinUrl && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-sky-400 bg-sky-400/5 border border-sky-400/10 px-1 py-0.25 rounded">
                      <svg className="size-2 fill-current" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      LinkedIn
                    </span>
                  )}
                  {lead.auditJson && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 px-1 py-0.25 rounded">
                      Audited
                    </span>
                  )}
                  {lead.contactsJson && (() => {
                    try {
                      const list = JSON.parse(lead.contactsJson || "[]")
                      if (list.length > 0) {
                        return (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-1 py-0.25 rounded">
                            {list.length} contact{list.length > 1 ? "s" : ""}
                          </span>
                        )
                      }
                    } catch {}
                    return null
                  })()}
                  {lead.platformFocus && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-1 py-0.25 rounded">
                      {lead.platformFocus}
                    </span>
                  )}
                  {lead.sourceQuery && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-indigo-400 bg-indigo-400/5 border border-indigo-400/10 px-1.5 py-0.25 rounded max-w-[120px] truncate" title={lead.sourceQuery}>
                      {lead.sourceQuery}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* Company */}
            <div className="min-w-0">
              <p className="truncate text-[12px] text-white/50">{lead.company || "—"}</p>
              {lead.title && (
                <p className="truncate text-[10px] text-white/25">{lead.title}</p>
              )}
            </div>

            {/* Campaigns */}
            <div className="flex flex-wrap gap-1 min-w-0">
              {lead.campaigns && lead.campaigns.length > 0 ? (
                lead.campaigns.map((c, idx) => (
                  <span 
                    key={idx}
                    className="truncate px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/40 border border-white/5"
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-white/10 italic">None</span>
              )}
            </div>

            {/* Status (read-only) */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${ss.text}`}
              style={{ background: ss.bg }}
            >
              {lead.status.replace(/_/g, " ")}
            </span>

            {/* Added */}
            <p className="text-[10px] text-white/20">{formatRelative(lead.createdAt)}</p>

            {/* Delete */}
            <button
              onClick={() => del(lead.id)}
              disabled={deleting === lead.id}
              className="flex size-7 items-center justify-center rounded-lg text-red-400/25 transition-all hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
            >
              {deleting === lead.id
                ? <Loader2 className="size-3 animate-spin" />
                : <Trash2 className="size-3" />}
            </button>
          </div>
        )
      })}
      </div>
    </div>
  )
}
