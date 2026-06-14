"use client"

import { useState, useEffect } from "react"
import { usePlaybook } from "@/lib/playbook-context"
import { CustomSelect } from "@/components/ui/custom-select"
import { Globe, Plus, Copy, Check, ExternalLink, Eye } from "lucide-react"

interface Campaign {
  id: string
  name: string
  status: string
  revenueAttributed: number | null
}

interface Portal {
  id: string
  accessUrl: string
  accessToken: string
  isActive: boolean
  viewCount: number
  enabledSections: string[]
  campaign: Campaign
}

export default function ClientPortalsPage() {
  const { activePlaybook } = usePlaybook()
  const [portals, setPortals] = useState<Portal[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState("")
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/portals").then(r => r.json()),
      fetch("/api/campaigns").then(r => r.json()),
    ]).then(([p, c]) => {
      setPortals(Array.isArray(p) ? p : [])
      setCampaigns(Array.isArray(c) ? c : [])
    }).finally(() => setLoading(false))
  }, [])

  const portalCampaignIds = new Set(portals.map(p => p.campaign.id))
  const availableCampaigns = campaigns.filter(c => !portalCampaignIds.has(c.id))

  async function createPortal() {
    if (!selectedCampaignId) return
    setCreating(true)
    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaignId }),
      })
      if (res.ok) {
        const portal = await res.json()
        setPortals(prev => [portal, ...prev.filter(p => p.id !== portal.id)])
        setShowForm(false)
        setSelectedCampaignId("")
      }
    } finally {
      setCreating(false)
    }
  }

  function shareLink(portal: Portal) {
    return `${window.location.origin}/portal/${portal.accessUrl}?token=${portal.accessToken}`
  }

  function copyLink(portal: Portal) {
    navigator.clipboard.writeText(shareLink(portal))
    setCopiedId(portal.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Client Portals</h1>
          <p className="text-sm text-white/40">Manage your active client workspaces, shared assets, and white-label communication portals.</p>
        </div>
        {availableCampaigns.length > 0 && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 border border-white/[0.08] transition-all"
          >
            <Plus className="size-4" />
            <span>New Client Portal</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4" style={{ backdropFilter: "blur(12px)" }}>
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Create Portal</p>
          <CustomSelect
            value={selectedCampaignId}
            onChange={setSelectedCampaignId}
            options={availableCampaigns.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Select a campaign…"
          />
          <button
            onClick={createPortal}
            disabled={!selectedCampaignId || creating}
            className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black text-xs font-bold px-4 py-2 disabled:opacity-40 transition-all"
          >
            {creating ? "Creating…" : "Generate Portal"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-white/30">Loading…</p>
      ) : portals.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-2xl p-16 text-center space-y-4 bg-white/[0.01]"
             style={{ backdropFilter: "blur(12px)" }}>
          <div className="size-12 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]">
            <Globe className="size-6 text-white/30" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-sm font-semibold text-white">No portals deployed yet</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Create a client portal for an active campaign to share live progress, reports, and proposals.
            </p>
          </div>

          {activePlaybook && (
            <div className="pt-4 text-xs text-white/40 max-w-md">
              <p className="text-[10px] uppercase font-black tracking-wider text-white/20 mb-2">Auto-Enabled sections for {activePlaybook.name}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {activePlaybook.portalSections.map((s) => (
                  <span key={s} className="rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/[0.06] capitalize">
                    {s.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {portals.map(portal => (
            <div key={portal.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3" style={{ backdropFilter: "blur(12px)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{portal.campaign.name}</p>
                  <p className="text-[11px] text-white/40">{portal.campaign.status}</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/40">
                  <span className="flex items-center gap-1"><Eye className="size-3.5" /> {portal.viewCount} views</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${portal.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-white/30"}`}>
                    {portal.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {portal.enabledSections.map(s => (
                  <span key={s} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] border border-white/[0.06] capitalize text-white/40">
                    {s.replace("_", " ")}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareLink(portal)}
                  className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[11px] text-white/50 outline-none"
                />
                <button
                  onClick={() => copyLink(portal)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] px-3 py-2 text-[11px] font-semibold text-white/70 transition-colors"
                >
                  {copiedId === portal.id ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  {copiedId === portal.id ? "Copied" : "Copy"}
                </button>
                <a
                  href={shareLink(portal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] px-3 py-2 text-[11px] font-semibold text-white/70 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
