"use client"

import { useState, useEffect } from "react"
import {
  MapPin, Globe2, Shield, Gauge, Sparkles, Zap,
  ExternalLink, Loader2, Star,
  Copy, Phone, ChevronLeft, ChevronRight,
  BarChart3, RefreshCw, Monitor, TrendingUp,
  Users, ArrowUpRight, HelpCircle,
} from "lucide-react"
import type { Approach } from "@/app/api/leads/icebreaker/route"
import type { BusinessProfile } from "@/app/api/leads/research/route"
import type { LinkedInDecisionMaker } from "@/app/api/leads/linkedin-search/route"
import { toast } from "sonner"
import type { ContactResult } from "@/lib/contact-finder"
import type { Place } from "@/components/lead-analysis-panel"
import { extractCityFromAddress } from "@/lib/utils"

// ── Types exported for use in the find page ──────────────────────────────────

export interface AuditData {
  ssl: boolean
  speed: number
  pixel: boolean
  googleAds: boolean
  googleAnalytics: boolean
  googleTagManager: boolean
  wordpress: boolean
  shopify: boolean
  hasChat: boolean
  noH1: boolean
  noMetaDesc: boolean
  mobile?: boolean
  title: string
}

export interface PlaceEnrichment {
  auditData: AuditData | null
  auditLoading: boolean
  contacts: ContactResult[]
  contactsLoading: boolean
  contactsDone: boolean
  icebreaker: string
  research: BusinessProfile | null
  researchLoading: boolean
  linkedInProfiles: LinkedInDecisionMaker[]
  linkedInLoading: boolean
  linkedInDone: boolean
  linkedInLogs?: string[]
}

// ── Props ────────────────────────────────────────────────────────────────────

interface LeadDetailSideProps {
  place: Place
  enrichment: PlaceEnrichment
  onAuditDone: (data: AuditData) => void
  onAuditStart?: () => void
  onContactsDone: (contacts: ContactResult[]) => void
  onContactsStart?: () => void
  onIcebreakerDone: (text: string) => void
  onResearchDone: (data: BusinessProfile) => void
  onResearchStart?: () => void
  onLinkedInDone: (profiles: LinkedInDecisionMaker[], logs?: string[]) => void
  onLinkedInStart?: () => void
}

type Tab = "overview" | "contact" | "audit" | "ai"

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "contact",  label: "Contact"  },
  { id: "audit",    label: "Audit"    },
  { id: "ai",       label: "AI"       },
]

// ── Shared style helpers ─────────────────────────────────────────────────────

const cardStyle = { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }
const sectionHead = "text-[10px] font-black text-white/30 uppercase tracking-[.18em] mb-3"

// ── Sub-components ────────────────────────────────────────────────────────────

function PainPoint({ num, text, color = "red" }: { num: number; text: React.ReactNode; color?: "red" | "emerald" }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`text-[10px] mt-0.5 font-bold shrink-0 ${color === "emerald" ? "text-emerald-400/60" : "text-red-400/60"}`}>
        {num}.
      </span>
      <p className="text-[12px] text-white/60 leading-snug">{text}</p>
    </div>
  )
}

function SignalRow({ icon: Icon, label, ok, detail }: {
  icon: React.ElementType
  label: string
  ok: boolean
  detail: string
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[.04] last:border-0">
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: ok ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)" }}
      >
        <Icon className={`size-3.5 ${ok ? "text-emerald-400" : "text-red-400"}`} />
      </div>
      <span className="text-[12px] text-white/55 flex-1">{label}</span>
      <span className={`text-[11px] font-bold ${ok ? "text-emerald-400" : "text-red-400/80"}`}>{detail}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function LeadDetailSide({
  place,
  enrichment,
  onAuditDone,
  onAuditStart,
  onContactsDone,
  onContactsStart,
  onIcebreakerDone,
  onResearchDone,
  onResearchStart,
  onLinkedInDone,
  onLinkedInStart,
}: LeadDetailSideProps) {
  const [activeTab, setActiveTab]     = useState<Tab>("overview")
  const [activePhoto, setActivePhoto] = useState(0)
  const [generatingIce, setGeneratingIce]         = useState(false)
  const [approach, setApproach]                   = useState<Approach>("website")
  const [includeSenderCompany, setIncludeSender]  = useState(false)

  // Reset tab + photo + approach when place changes
  useEffect(() => {
    setTimeout(() => {
      setActiveTab("overview")
      setActivePhoto(0)
      setApproach("website")
    }, 0)
  }, [place.id])

  // Auto-run contact search when place changes and not yet done
  useEffect(() => {
    if (!place.websiteUri) return
    if (enrichment.contactsDone || enrichment.contactsLoading) return
    runContactSearch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id])

  // Auto-run audit when place changes and not yet done
  useEffect(() => {
    if (!place.websiteUri) return
    if (enrichment.auditData || enrichment.auditLoading) return
    runAudit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id])

  // Auto-run research when place changes and not yet done
  useEffect(() => {
    if (enrichment.research || enrichment.researchLoading) return
    runResearch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id])

  // Auto-run LinkedIn search when place changes and not yet done
  useEffect(() => {
    if (enrichment.linkedInDone || enrichment.linkedInLoading) return
    // Signal loading to parent before async work starts
    onLinkedInDone([])  // reset previous results
    runLinkedInSearch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id])

  // Auto-select recommended approach when research completes
  useEffect(() => {
    if (enrichment.research?.recommendedApproach?.id) {
      const approachId = enrichment.research.recommendedApproach.id
      setTimeout(() => setApproach(approachId), 0)
    }
  }, [enrichment.research?.recommendedApproach?.id])

  async function runResearch() {
    if (onResearchStart) onResearchStart()
    try {
      const res = await fetch("/api/leads/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl:   place.websiteUri ?? null,
          businessName: place.displayName.text,
          industry:     place.primaryType?.replace(/_/g, " ") ?? null,
          address:      place.formattedAddress,
          reviews:      place.reviews ?? [],
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.profile) onResearchDone(data.profile)
    } catch { /* silent */ }
  }

  async function runAudit() {
    if (!place.websiteUri) return
    if (onAuditStart) onAuditStart()
    try {
      const res = await fetch("/api/leads/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: place.websiteUri }),
      })
      const data = await res.json()
      if (!data.error) onAuditDone(data)
    } catch {
      // silent — parent already sets auditLoading: false
    }
  }

  async function runContactSearch() {
    if (!place.websiteUri) return
    if (onContactsStart) onContactsStart()
    try {
      const res = await fetch("/api/leads/contact-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: place.websiteUri, companyName: place.displayName.text }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onContactsDone(data.contacts ?? [])
    } catch {
      toast.error("Contact search failed")
      onContactsDone([])
    }
  }

  async function runLinkedInSearch() {
    if (onLinkedInStart) onLinkedInStart()
    try {
      const city = extractCityFromAddress(place.formattedAddress)

      // Pass research context for AI inference
      const websiteText = enrichment.research
        ? [
            enrichment.research.whatTheyDo,
            ...(enrichment.research.specializations ?? []),
            enrichment.research.positioning,
          ].filter(Boolean).join(". ")
        : undefined

      const res = await fetch("/api/leads/linkedin-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: place.displayName.text,
          city,
          industry:    place.primaryType?.replace(/_/g, " ") ?? null,
          websiteUrl:  place.websiteUri ?? null,
          websiteText,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onLinkedInDone(data.profiles ?? [], data.logs ?? [])
    } catch {
      onLinkedInDone([], ["Failed to run search fetch"])
    }
  }

  async function generateIcebreaker() {
    setGeneratingIce(true)
    try {
      const dm = enrichment.contacts.find(c => c.isDecisionMaker)
      const res = await fetch("/api/leads/icebreaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approach,
          businessName:           place.displayName.text,
          address:                place.formattedAddress,
          industry:               place.primaryType?.replace(/_/g, " ") ?? null,
          rating:                 place.rating ?? null,
          reviewCount:            place.userRatingCount ?? null,
          auditData:              enrichment.auditData,
          decisionMakerFirstName: dm?.firstName ?? null,
          businessProfile:        enrichment.research ?? null,
          includeSenderCompany,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onIcebreakerDone(data.icebreaker ?? "")
    } catch {
      toast.error("Failed to generate message")
    } finally {
      setGeneratingIce(false)
    }
  }

  // ── Overview tab ───────────────────────────────────────────────────────────
  function renderOverviewTab() {
    return (
      <div className="space-y-5">
        {/* Photo slider */}
        {place.photos && place.photos.length > 0 && (
          <div className="relative h-44 rounded-2xl overflow-hidden group/slider select-none"
            style={{ border: "1px solid rgba(255,255,255,.07)" }}>
            <div className="flex h-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activePhoto * 100}%)` }}>
              {place.photos.map((photo, i) => (
                <img key={i} alt=""
                  src={`https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=700&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                  className="w-full h-full object-cover shrink-0"
                />
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {place.photos.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhoto(p => Math.max(0, p - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="size-3.5 text-white" />
                </button>
                <button
                  onClick={() => setActivePhoto(p => Math.min(place.photos!.length - 1, p + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity"
                >
                  <ChevronRight className="size-3.5 text-white" />
                </button>
                <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                  {place.photos.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all ${i === activePhoto ? "w-4 bg-white" : "w-1 bg-white/30"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Rating",  value: place.rating ? `${place.rating}★` : "—",       color: "text-amber-400"   },
            { label: "Reviews", value: place.userRatingCount?.toLocaleString() ?? "—", color: "text-sky-400"     },
            { label: "Status",  value: place.businessStatus === "OPERATIONAL" ? "Open" : (place.businessStatus ?? "—"), color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={cardStyle}>
              <p className={`text-[14px] font-black ${color}`}>{value}</p>
              <p className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Editorial summary */}
        {place.editorialSummary?.text && (
          <div className="rounded-xl p-4" style={cardStyle}>
            <p className="text-[12px] text-white/55 leading-relaxed italic">&quot;{place.editorialSummary.text}&quot;</p>
          </div>
        )}

        {/* Details */}
        <div className="space-y-0">
          <div className="flex items-start gap-3 py-2.5 border-b border-white/[.04]">
            <MapPin className="size-3.5 text-white/25 mt-0.5 shrink-0" />
            <span className="text-[12px] text-white/55 leading-snug">{place.formattedAddress}</span>
          </div>
          {place.websiteUri && (
            <div className="flex items-center gap-3 py-2.5 border-b border-white/[.04]">
              <Globe2 className="size-3.5 text-white/25 shrink-0" />
              <a href={place.websiteUri} target="_blank" rel="noopener noreferrer"
                className="text-[12px] text-sky-400 hover:text-sky-300 transition-colors truncate flex-1">
                {new URL(place.websiteUri).hostname}
              </a>
              <ExternalLink className="size-3 text-white/20 shrink-0" />
            </div>
          )}
          {place.nationalPhoneNumber && (
            <div className="flex items-center gap-3 py-2.5">
              <Phone className="size-3.5 text-white/25 shrink-0" />
              <span className="text-[12px] text-white/55">{place.nationalPhoneNumber}</span>
            </div>
          )}
        </div>

        {/* Top review */}
        {place.reviews && place.reviews[0] && (
          <div>
            <p className={sectionHead}>Top Review</p>
            <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/50">{place.reviews[0].authorAttribution.displayName}</span>
                <span className="text-[11px] text-amber-400 font-mono">{place.reviews[0].rating}★</span>
              </div>
              <p className="text-[12px] text-white/50 leading-relaxed line-clamp-4 italic">
                &quot;{place.reviews[0].text.text}&quot;
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Contact tab ───────────────────────────────────────────────────────────
  function renderContactTab() {
    const { contacts, contactsLoading, contactsDone } = enrichment
    return (
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[.18em]">Decision Maker</p>
            {contactsDone && !contactsLoading && (
              <button
                onClick={runContactSearch}
                className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
              >
                <RefreshCw className="size-3" /> Refresh
              </button>
            )}
          </div>

          {!place.websiteUri ? (
            <div className="rounded-xl p-4 text-center" style={cardStyle}>
              <p className="text-[11px] text-white/25">No website — can&apos;t search for contacts</p>
            </div>
          ) : (contactsLoading || !contactsDone) ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-sky-400/50 uppercase tracking-widest px-1 font-bold">
                <Loader2 className="size-3 animate-spin text-sky-400" />
                <span>Scanning domain footprints...</span>
              </div>
              <div className="space-y-2.5 animate-pulse">
                <div className="rounded-xl p-3.5 border border-white/5 bg-white/[0.015] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-28 bg-white/10 rounded" />
                      <div className="h-2.5 w-16 bg-white/5 rounded" />
                    </div>
                    <div className="h-4 w-12 bg-white/5 rounded-full" />
                  </div>
                  <div className="h-3 w-44 bg-white/5 rounded" />
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between">
                      <div className="h-2 w-12 bg-white/5 rounded" />
                      <div className="h-2 w-8 bg-white/5 rounded" />
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-xl p-4 text-center" style={cardStyle}>
              <p className="text-[11px] text-white/25">No decision maker identified</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {contacts.slice(0, 4).map((c, i) => {
                const barColor = c.confidence >= 75 ? "#34d399" : c.confidence >= 50 ? "#fbbf24" : "#f87171"
                const srcLabel = c.sources.includes("ai-extracted") ? "AI"
                  : c.sources.includes("format-matched") ? "Format"
                  : c.sources.includes("website-scraped") ? "Site" : c.sources[0] ?? "Gen"
                return (
                  <div
                    key={i}
                    className="group/c relative rounded-xl p-3.5 transition-all hover:brightness-110"
                    style={{
                      background: c.isDecisionMaker
                        ? "linear-gradient(135deg,rgba(52,211,153,.06),rgba(255,255,255,.02))"
                        : "rgba(255,255,255,.025)",
                      border: c.isDecisionMaker
                        ? "1px solid rgba(52,211,153,.15)"
                        : "1px solid rgba(255,255,255,.05)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        {c.name  && <p className="text-[12px] font-bold text-white/80 truncate">{c.name}</p>}
                        {c.title && <p className="text-[10px] text-white/40 mt-0.5 truncate">{c.title}</p>}
                        {!c.name && !c.title && <p className="text-[10px] text-white/30 italic">Generic inbox</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {c.isDecisionMaker && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase text-emerald-400"
                            style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.2)" }}>
                            <Star className="size-2 fill-current" /> DM
                          </span>
                        )}
                        {c.gravatar && (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase text-sky-400"
                            style={{ background: "rgba(56,189,248,.08)", border: "1px solid rgba(56,189,248,.15)" }}>
                            ✓ Live
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[11px] font-mono text-white/60 truncate flex-1">{c.email}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.email); toast.success("Copied") }}
                        className="opacity-0 group-hover/c:opacity-100 transition-opacity shrink-0"
                      >
                        <Copy className="size-3 text-white/40 hover:text-white" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-wide">Confidence</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1 py-0.5 rounded text-[8px] font-black uppercase"
                            style={{ background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.25)" }}>
                            {srcLabel}
                          </span>
                          <span className="text-[10px] font-black" style={{ color: barColor }}>{c.confidence}%</span>
                        </div>
                      </div>
                      <div className="h-1 w-full rounded-full" style={{ background: "rgba(255,255,255,.06)" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${c.confidence}%`, background: barColor, boxShadow: `0 0 6px ${barColor}55` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── LinkedIn Decision Makers ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[.18em]">LinkedIn</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-sky-400/60"
                style={{ background: "rgba(56,189,248,.07)", border: "1px solid rgba(56,189,248,.15)" }}>
                AI Search
              </span>
            </div>
            {enrichment.linkedInDone && !enrichment.linkedInLoading && (
              <button onClick={() => { onLinkedInDone([]); runLinkedInSearch() }}
                className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors">
                <RefreshCw className="size-3" /> Refresh
              </button>
            )}
          </div>

          {(enrichment.linkedInLoading || !enrichment.linkedInDone) ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-sky-400/50 uppercase tracking-widest px-1 font-bold">
                <Loader2 className="size-3 animate-spin text-sky-400" />
                <span>Searching social indexes...</span>
              </div>
              <div className="space-y-2 animate-pulse">
                <div className="rounded-xl p-3.5 border border-white/5 bg-white/[0.015] space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-32 bg-white/10 rounded" />
                      <div className="h-2.5 w-20 bg-white/5 rounded" />
                    </div>
                    <div className="h-4 w-8 bg-white/5 rounded-full" />
                  </div>
                  <div className="h-3 w-28 bg-white/5 rounded" />
                </div>
              </div>
            </div>
          ) : enrichment.linkedInProfiles.length === 0 ? (
            <div className="rounded-xl p-4 text-center" style={cardStyle}>
              <p className="text-[11px] text-white/25">No LinkedIn profiles found for this company</p>
              <p className="text-[10px] text-white/15 mt-1">Try a different company name spelling</p>
            </div>
          ) : (
            <div className="space-y-2">
              {enrichment.linkedInProfiles.map((p, i) => {
                const sourceLabel = p.source === "profile-page" ? "LinkedIn" : p.source === "ai-knowledge" ? "AI" : "Inferred"
                const sourceColor = p.source === "profile-page" ? "text-sky-400/70" : p.source === "ai-knowledge" ? "text-emerald-400/60" : "text-white/30"
                return (
                  <div key={i}
                    className="rounded-xl p-3.5"
                    style={{
                      background: p.isDecisionMaker
                        ? "linear-gradient(135deg,rgba(56,189,248,.06),rgba(255,255,255,.02))"
                        : "rgba(255,255,255,.025)",
                      border: p.isDecisionMaker
                        ? "1px solid rgba(56,189,248,.2)"
                        : "1px solid rgba(255,255,255,.05)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-white/85 truncate">
                          {p.name ?? <span className="text-white/30 italic">Name unknown</span>}
                        </p>
                        <p className="text-[10px] text-white/40 truncate mt-0.5">
                          {p.title ?? <span className="text-white/20 italic">Title unknown</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {p.isDecisionMaker && (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase text-sky-400"
                            style={{ background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.2)" }}>
                            DM
                          </span>
                        )}
                        <span className={`text-[8px] font-bold uppercase tracking-wide ${sourceColor}`}>
                          {sourceLabel}
                        </span>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.linkedinUrl ? (
                        <>
                          <a
                            href={p.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-sky-400/80 hover:text-sky-300 transition-colors font-semibold"
                          >
                            <ExternalLink className="size-3" /> View on LinkedIn
                          </a>
                          <span className="text-white/10">·</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(p.linkedinUrl!); toast.success("Copied") }}
                            className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
                          >
                            <Copy className="size-3" /> Copy URL
                          </button>
                        </>
                      ) : (
                        <span className="text-[9px] text-white/20 italic">No LinkedIn URL found</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Debug logs console */}
          {enrichment.linkedInLogs && enrichment.linkedInLogs.length > 0 && (
            <details className="mt-3.5 rounded-xl border border-white/[.04] bg-black/30 p-3">
              <summary className="text-[10px] font-black text-white/35 cursor-pointer hover:text-white/60 select-none uppercase tracking-wider">
                View Search Logs
              </summary>
              <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1 font-mono text-[9px] text-white/55 leading-normal whitespace-pre-wrap pr-1 select-text">
                {enrichment.linkedInLogs.map((log, li) => (
                  <div key={li} className="border-b border-white/[.02] pb-1 last:border-0">{log}</div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    )
  }

  // ── Audit tab ─────────────────────────────────────────────────────────────
  function renderAuditTab() {
    const { auditData, auditLoading } = enrichment

    const painPoints: Array<{ n: number; text: React.ReactNode }> = []
    let ppIdx = 1
    if (auditData) {
      if (!auditData.ssl)           { painPoints.push({ n: ppIdx++, text: <><strong className="text-white">No SSL</strong> — Google downgrades ranking; visitors see &quot;Not Secure&quot;.</> }) }
      if (auditData.speed > 3000)   { painPoints.push({ n: ppIdx++, text: <><strong className="text-white">Slow site ({(auditData.speed / 1000).toFixed(1)}s)</strong> — 50%+ of mobile users leave before load.</> }) }
      if (!auditData.pixel)         { painPoints.push({ n: ppIdx++, text: <><strong className="text-white">No Facebook pixel</strong> — ad spend is unattributed; no retargeting possible.</> }) }
      if (!auditData.googleAnalytics) { painPoints.push({ n: ppIdx++, text: <><strong className="text-white">No Google Analytics</strong> — zero insight into traffic or conversions.</> }) }
      if (auditData.noH1)           { painPoints.push({ n: ppIdx++, text: <><strong className="text-white">Missing H1</strong> — poor SEO structure hurts organic rankings.</> }) }
      if (auditData.noMetaDesc)     { painPoints.push({ n: ppIdx++, text: <><strong className="text-white">No meta description</strong> — reduces click-through from search results.</> }) }
    }

    return (
      <div className="space-y-5">
        {!place.websiteUri ? (
          <div className="rounded-xl p-5 text-center" style={cardStyle}>
            <Globe2 className="size-5 text-amber-400/50 mx-auto mb-2" />
            <p className="text-[12px] font-bold text-amber-400/70">No website to audit</p>
            <p className="text-[10px] text-white/25 mt-1">High-intent lead for web services</p>
          </div>
        ) : auditLoading ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-sky-400" />
            <p className="text-[11px] text-white/30">Auditing {new URL(place.websiteUri).hostname}…</p>
          </div>
        ) : auditData ? (
          <>
            {/* Signal rows */}
            <div className="rounded-xl px-4" style={cardStyle}>
              <SignalRow icon={Shield} label="SSL Certificate"    ok={auditData.ssl}            detail={auditData.ssl ? "Secure" : "Missing"} />
              <SignalRow icon={Gauge}  label="Page Speed"         ok={auditData.speed < 2000}   detail={`${(auditData.speed / 1000).toFixed(1)}s`} />
              <SignalRow icon={Zap}    label="Mobile Ready"       ok={!!auditData.mobile}       detail={auditData.mobile ? "Yes" : "No"} />
              <SignalRow icon={Sparkles} label="Facebook Pixel"   ok={auditData.pixel}          detail={auditData.pixel ? "Active" : "Missing"} />
              <SignalRow icon={BarChart3} label="Google Analytics" ok={auditData.googleAnalytics} detail={auditData.googleAnalytics ? "Active" : "Missing"} />
              <SignalRow icon={BarChart3} label="Google Tag Manager" ok={auditData.googleTagManager} detail={auditData.googleTagManager ? "Active" : "Missing"} />
              <SignalRow icon={Globe2} label="WordPress"          ok={!auditData.wordpress}     detail={auditData.wordpress ? "Yes" : "No"} />
              <SignalRow icon={Globe2} label="Shopify"            ok={!auditData.shopify}       detail={auditData.shopify ? "Yes" : "No"} />
              <SignalRow icon={Zap}    label="Chat Widget"        ok={auditData.hasChat}        detail={auditData.hasChat ? "Present" : "None"} />
            </div>

            {/* Pain points */}
            {painPoints.length > 0 && (
              <div>
                <p className={sectionHead}>AI Pain Points</p>
                <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
                  {painPoints.map(pp => (
                    <PainPoint key={pp.n} num={pp.n} text={pp.text} />
                  ))}
                </div>
              </div>
            )}
            {painPoints.length === 0 && (
              <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
                <PainPoint num={1} color="emerald" text="Strong technical foundation. Angle: scale existing traffic rather than fix leaks." />
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl p-6 text-center" style={cardStyle}>
            <BarChart3 className="size-6 text-white/15 mx-auto mb-3" />
            <p className="text-[11px] text-white/25 mb-4">Check SSL, speed, pixel &amp; mobile in one click</p>
            <button
              onClick={runAudit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold text-black hover:brightness-110 transition-all"
              style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 8px rgba(0,0,0,.3)" }}
            >
              <Gauge className="size-3.5" /> Run Audit
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── AI tab ───────────────────────────────────────────────────────────────
  function renderAITab() {
    const { icebreaker } = enrichment

    const approaches: {
      id: Approach
      icon: React.ElementType
      label: string
      desc: string
      available: boolean
      hint?: string
    }[] = [
      {
        id: "website",
        icon: Monitor,
        label: "Website",
        desc: "A specific issue spotted on their site",
        available: !!enrichment.auditData,
        hint: "Audit first",
      },
      {
        id: "local-rank",
        icon: TrendingUp,
        label: "Local Rank",
        desc: "Their Google rating, reviews, Maps position",
        available: !!(place.rating || place.userRatingCount),
        hint: "No rating data",
      },
      {
        id: "competitor",
        icon: Users,
        label: "Competitor",
        desc: "What others in their market are doing",
        available: true,
      },
      {
        id: "industry",
        icon: ArrowUpRight,
        label: "Industry Shift",
        desc: "A change happening in their sector",
        available: true,
      },
      {
        id: "question",
        icon: HelpCircle,
        label: "Question",
        desc: "Open with a sharp, disarming question",
        available: true,
      },
      {
        id: "social-proof",
        icon: Sparkles,
        label: "Social Proof",
        desc: "A result from a similar business",
        available: true,
      },
    ]

    const selected = approaches.find(a => a.id === approach)

    const { research, researchLoading } = enrichment

    return (
      <div className="space-y-5">

        {/* Business Intel */}
        {(researchLoading || research) && (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {researchLoading && !research ? (
              <div className="flex items-center gap-2.5 px-4 py-3">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-sky-400" />
                <p className="text-[11px] text-white/35">Researching business…</p>
              </div>
            ) : research ? (
              <div className="divide-y divide-white/[.04]">
                {/* What they do */}
                {research.whatTheyDo && (
                  <div className="px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/20 mb-1">What they do</p>
                    <p className="text-[11px] text-white/65 leading-relaxed">{research.whatTheyDo}</p>
                  </div>
                )}
                {/* Praise / complaints row */}
                {(research.reviewHighlights?.praise?.length || research.reviewHighlights?.complaints?.length) ? (
                  <div className="px-4 py-3 flex gap-4">
                    {research.reviewHighlights.praise?.slice(0, 2).length > 0 && (
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400/40 mb-1.5">Praised for</p>
                        <div className="flex flex-wrap gap-1">
                          {research.reviewHighlights.praise.slice(0, 3).map((p, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full text-emerald-400/70"
                              style={{ background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.15)" }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {research.reviewHighlights.complaints?.slice(0, 2).length > 0 && (
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-400/40 mb-1.5">Gaps</p>
                        <div className="flex flex-wrap gap-1">
                          {research.reviewHighlights.complaints.slice(0, 2).map((c, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full text-amber-400/60"
                              style={{ background: "rgba(251,191,36,.07)", border: "1px solid rgba(251,191,36,.15)" }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
                {/* Notable quote */}
                {research.reviewHighlights?.notableQuote && (
                  <div className="px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/20 mb-1">Customer voice</p>
                    <p className="text-[10px] text-white/45 leading-relaxed italic">&quot;{research.reviewHighlights.notableQuote}&quot;</p>
                  </div>
                )}
                {/* Outreach angles */}
                {research.outreachAngles?.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-sky-400/40 mb-1.5">Suggested angles</p>
                    <div className="space-y-1">
                      {research.outreachAngles.slice(0, 3).map((a, i) => (
                        <p key={i} className="text-[10px] text-white/40 leading-snug flex gap-1.5">
                          <span className="text-sky-400/30 shrink-0">→</span> {a}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Recommended reason */}
        {research?.recommendedApproach && (
          <div className="rounded-xl px-3.5 py-3 flex items-start gap-2.5"
            style={{ background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.15)" }}>
            <Sparkles className="size-3.5 shrink-0 text-emerald-400/60 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-emerald-400/80">
                Recommended: {research.recommendedApproach.label}
              </p>
              <p className="text-[10px] text-white/40 leading-snug mt-0.5">
                {research.recommendedApproach.reason}
              </p>
            </div>
          </div>
        )}

        {/* Approach grid */}
        <div>
          <p className={sectionHead}>Angle</p>
          <div className="grid grid-cols-2 gap-1.5">
            {approaches.map(a => {
              const Icon = a.icon
              const active      = approach === a.id
              const locked      = !a.available
              const recommended = research?.recommendedApproach?.id === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    if (locked) return
                    setApproach(a.id)
                    onIcebreakerDone("")
                  }}
                  disabled={locked}
                  className="text-left flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-all"
                  style={{
                    background: active
                      ? "linear-gradient(135deg,rgba(52,211,153,.12),rgba(52,211,153,.04))"
                      : "rgba(255,255,255,.02)",
                    border: active
                      ? "1px solid rgba(52,211,153,.28)"
                      : recommended
                      ? "1px solid rgba(52,211,153,.15)"
                      : "1px solid rgba(255,255,255,.06)",
                    opacity: locked ? 0.38 : 1,
                  }}
                >
                  <div
                    className="flex size-6 shrink-0 items-center justify-center rounded-md mt-0.5"
                    style={{ background: active ? "rgba(52,211,153,.18)" : "rgba(255,255,255,.05)" }}
                  >
                    <Icon className={`size-3 ${active ? "text-emerald-400" : "text-white/35"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className={`text-[11px] font-bold leading-tight ${active ? "text-white/90" : "text-white/45"}`}>
                        {a.label}
                      </p>
                      {recommended && !active && (
                        <span className="text-[8px] font-black text-emerald-400/50 uppercase tracking-wide">rec</span>
                      )}
                      {locked && a.hint && (
                        <span className="font-normal text-white/20 text-[9px]">({a.hint})</span>
                      )}
                    </div>
                    <p className="text-[9px] text-white/25 leading-snug mt-0.5">{a.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Output card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg,rgba(52,211,153,.05),rgba(255,255,255,.015))",
            border: "1px solid rgba(52,211,153,.12)",
          }}
        >
          <div className="absolute inset-0 opacity-[.018] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(#34d399 0.5px,transparent 0.5px)", backgroundSize: "16px 16px" }} />

          {generatingIce ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="size-5 animate-spin text-emerald-400" />
              <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest">Writing…</p>
            </div>
          ) : icebreaker ? (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2">
                <div className="w-0.5 shrink-0 self-stretch rounded-full mt-1"
                  style={{ background: "rgba(52,211,153,.35)" }} />
                <p className="text-[13px] text-white/85 leading-relaxed">{icebreaker}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => { navigator.clipboard.writeText(icebreaker); toast.success("Copied") }}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Copy className="size-3" /> Copy
                </button>
                <span className="text-white/10">·</span>
                <button
                  onClick={generateIcebreaker}
                  className="text-[10px] font-black uppercase text-white/25 hover:text-white/50 transition-colors"
                >
                  Try again
                </button>
                <span className="text-white/10">·</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <div
                    onClick={() => { setIncludeSender(v => !v); onIcebreakerDone("") }}
                    className="relative flex-none w-6 h-3 rounded-full transition-all"
                    style={{ background: includeSenderCompany ? "rgba(52,211,153,.7)" : "rgba(255,255,255,.1)" }}
                  >
                    <div className="absolute top-0.5 size-2 rounded-full bg-white transition-all duration-200"
                      style={{ left: includeSenderCompany ? "13px" : "1px" }} />
                  </div>
                  <span className="text-[9px] text-white/30 select-none">My company</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-5 flex flex-col items-center text-center gap-4">
              <div className="space-y-1">
                <p className="text-[12px] font-bold text-white/50">{selected?.label} approach</p>
                <p className="text-[11px] text-white/20">{selected?.desc}</p>
              </div>

              {/* Sender company toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => setIncludeSender(v => !v)}
                  className="relative flex-none w-8 h-4 rounded-full transition-all"
                  style={{
                    background: includeSenderCompany ? "rgba(52,211,153,.8)" : "rgba(255,255,255,.1)",
                  }}
                >
                  <div
                    className="absolute top-0.5 size-3 rounded-full bg-white transition-all duration-200"
                    style={{ left: includeSenderCompany ? "17px" : "2px" }}
                  />
                </div>
                <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors select-none">
                  Include my company
                </span>
              </label>

              <button
                onClick={generateIcebreaker}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 text-black text-[12px] font-black hover:brightness-110 active:scale-95 transition-all"
                style={{ boxShadow: "0 0 20px rgba(52,211,153,.22)" }}
              >
                <Zap className="size-3.5 fill-current" /> Write Opener
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="shrink-0 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}
      >
        <div className="flex items-start gap-3">
          {place.photos && place.photos.length > 0 && (
            <div className="size-11 rounded-xl overflow-hidden shrink-0"
              style={{ border: "1px solid rgba(255,255,255,.08)" }}>
              <img
                alt=""
                src={`https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=80&maxWidthPx=80&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black text-white/90 leading-tight truncate">{place.displayName.text}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {place.rating !== undefined && (
                <span className="text-[10px] font-bold text-amber-400">{place.rating}★</span>
              )}
              {place.primaryType && (
                <span className="text-[10px] text-white/35 capitalize">{place.primaryType.replace(/_/g, " ")}</span>
              )}
              {place.websiteUri && (
                <span className="text-[10px] text-sky-400/60 truncate max-w-[160px]">
                  {new URL(place.websiteUri).hostname.replace(/^www\./, "")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="shrink-0 px-5 py-2.5 flex gap-1"
        style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all"
            style={activeTab === tab.id
              ? { background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)", color: "rgba(255,255,255,.88)" }
              : { background: "transparent", border: "1px solid transparent", color: "rgba(255,255,255,.28)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "contact"  && renderContactTab()}
        {activeTab === "audit"    && renderAuditTab()}
        {activeTab === "ai"       && renderAITab()}
      </div>
    </div>
  )
}
