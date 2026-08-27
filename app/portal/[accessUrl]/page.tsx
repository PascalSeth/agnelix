/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client"

import { useState, useEffect, use } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Lock, BarChart3, FileText, FolderOpen, MessageSquare, Send, CheckCircle2 } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface PortalData {
  agency: { agencyName: string | null; agencyLogo: string | null; brandColor: string | null; domain: string | null }
  campaign: {
    id: string; name: string; status: string; totalLeads: number; emailsSent: number
    emailsOpened: number; emailsClicked: number; replies: number; meetings: number; revenueAttributed: number | null
  }
  enabledSections: string[]
  logoUrl: string | null
  brandColor: string | null
  documents: Array<{ id: string; name: string; fileUrl: string; fileType: string; category: string; createdAt: string }>
  messages: Array<{ id: string; direction: string; content: string; createdAt: string }>
  reports: Array<{ id: string; periodStart: string; periodEnd: string; aiNarrative: string | null; status: string }>
  proposals: Array<{ id: string; title: string; status: string; totalValue: number | null; currency: string }>
}

export default function ClientPortalPage({ params }: { params: Promise<{ accessUrl: string }> }) {
  const { accessUrl } = use(params)
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!token) { setLoading(false); setError(true); return }
    fetch(`/api/portal/${accessUrl}?token=${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [accessUrl, token])

  async function sendMessage() {
    if (!messageText.trim() || !data) return
    setSending(true)
    try {
      const res = await fetch(`/api/portal/${accessUrl}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, content: messageText.trim(), direction: "client" }),
      })
      if (res.ok) {
        const msg = await res.json()
        setData(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
        setMessageText("")
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0f]">
        <Loader2 className="size-6 animate-spin text-white/30" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0a0b0f] text-center px-6">
        <Lock className="size-8 text-white/20" />
        <p className="text-sm font-bold text-white/40">This portal link is invalid or has expired.</p>
      </div>
    )
  }

  const brand = data.brandColor || data.agency.brandColor || "#34d399"
  const sections = new Set(data.enabledSections)
  const c = data.campaign

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-5 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${brand}14, transparent)` }}>
        {data.logoUrl || data.agency.agencyLogo ? (
          <img src={(data.logoUrl || data.agency.agencyLogo) as string} alt={data.agency.agencyName || "Agency"} className="h-8 w-auto rounded" />
        ) : (
          <div className="size-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: brand, color: "#000" }}>
            {(data.agency.agencyName || "A")[0]}
          </div>
        )}
        <div>
          <p className="text-sm font-bold">{data.agency.agencyName || "Your Agency"}</p>
          <p className="text-[11px] text-white/40">{c.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Overview */}
        {sections.has("overview") && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white/30 mb-3 flex items-center gap-2">
              <BarChart3 className="size-3.5" /> Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Leads", value: c.totalLeads },
                { label: "Emails Sent", value: c.emailsSent },
                { label: "Opened", value: c.emailsOpened },
                { label: "Replies", value: c.replies },
                { label: "Meetings", value: c.meetings },
                ...(c.revenueAttributed ? [{ label: "Revenue", value: `£${c.revenueAttributed.toLocaleString()}` }] : []),
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4" style={{ backdropFilter: "blur(12px)" }}>
                  <p className="text-2xl font-black">{stat.value}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports */}
        {sections.has("reports") && data.reports.length > 0 && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white/30 mb-3 flex items-center gap-2">
              <FileText className="size-3.5" /> Reports
            </h2>
            <div className="space-y-3">
              {data.reports.map(r => (
                <div key={r.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1.5" style={{ backdropFilter: "blur(12px)" }}>
                  <p className="text-[12px] font-bold text-white/70">
                    {new Date(r.periodStart).toLocaleDateString()} – {new Date(r.periodEnd).toLocaleDateString()}
                  </p>
                  {r.aiNarrative && <p className="text-[12px] text-white/50 leading-relaxed">{r.aiNarrative}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proposals */}
        {sections.has("proposals") && data.proposals.length > 0 && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white/30 mb-3 flex items-center gap-2">
              <FileText className="size-3.5" /> Proposals
            </h2>
            <div className="space-y-2">
              {data.proposals.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <span className="text-[12px] font-semibold text-white/70">{p.title}</span>
                  <div className="flex items-center gap-2">
                    {p.totalValue != null && <span className="text-[12px] font-bold text-white/60">{formatCurrency(p.totalValue, p.currency)}</span>}
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white/40 bg-white/[0.04]">{p.status}</span>
                    {p.status === "SIGNED" && <CheckCircle2 className="size-3.5 text-emerald-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {sections.has("documents") && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white/30 mb-3 flex items-center gap-2">
              <FolderOpen className="size-3.5" /> Documents
            </h2>
            {data.documents.length === 0 ? (
              <p className="text-[12px] text-white/30">No documents shared yet.</p>
            ) : (
              <div className="space-y-2">
                {data.documents.map(d => (
                  <a key={d.id} href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors">
                    <span className="text-[12px] font-semibold text-white/70">{d.name}</span>
                    <span className="text-[10px] text-white/30 uppercase">{d.category}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {sections.has("messages") && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white/30 mb-3 flex items-center gap-2">
              <MessageSquare className="size-3.5" /> Messages
            </h2>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3" style={{ backdropFilter: "blur(12px)" }}>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {data.messages.length === 0 && <p className="text-[12px] text-white/30">No messages yet — say hello!</p>}
                {data.messages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === "client" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[75%] rounded-xl px-3 py-2 text-[12px]"
                      style={m.direction === "client"
                        ? { background: brand, color: "#000" }
                        : { background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.8)" }}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendMessage() }}
                  placeholder="Send a message…"
                  className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[12px] text-white outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !messageText.trim()}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold disabled:opacity-40"
                  style={{ background: brand, color: "#000" }}
                >
                  {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
