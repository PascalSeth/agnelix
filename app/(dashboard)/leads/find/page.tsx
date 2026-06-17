"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Search, MapPin, Globe, Phone,
  Check, Loader2, Download, Megaphone, Plus, GitBranch,
  Filter, Star, Globe2, MessageSquare,
  Shield, Gauge, ChevronDown, Sparkles, Layers, Target,
} from "lucide-react"
import { toast } from "sonner"
import { CustomSelect } from "@/components/ui/custom-select"
import { LeadAnalysisPanel, type Place } from "@/components/lead-analysis-panel"
import { LeadDetailSide, type AuditData, type PlaceEnrichment } from "@/components/lead-detail-side"
import type { ContactResult } from "@/lib/contact-finder"
import type { LinkedInDecisionMaker } from "@/app/api/leads/linkedin-search/route"
import { emailFromPlace } from "@/lib/utils"
import { usePlaybook } from "@/lib/playbook-context"

type Campaign = { id: string; name: string; status: string }
type Sequence  = { id: string; name: string }


function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[11px]">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < Math.round(rating) ? "text-amber-400" : "text-white/15"}>★</span>
      ))}
    </span>
  )
}

// ── Default enrichment factory ───────────────────────────────────────────────
function defaultEnrichment(): PlaceEnrichment {
  return {
    auditData: null,
    auditLoading: false,
    contacts: [],
    contactsLoading: false,
    contactsDone: false,
    icebreaker: "",
    research: null,
    researchLoading: false,
    linkedInProfiles: [],
    linkedInLoading: false,
    linkedInDone: false,
    linkedInLogs: [],
  }
}

// ── PlaceRow ─────────────────────────────────────────────────────────────────
interface PlaceRowProps {
  place: Place
  isSelected: boolean
  isInspecting: boolean
  enrichment: PlaceEnrichment | undefined
  onToggle: (id: string) => void
  onInspect: (place: Place) => void
}

function PlaceRow({ place, isSelected, isInspecting, enrichment, onToggle, onInspect }: PlaceRowProps) {
  const audit = enrichment?.auditData
  const auditLoading = enrichment?.auditLoading

  const speedColor = !audit ? "text-white/20"
    : audit.speed < 2000 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : audit.speed < 4000 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-rose-400 bg-rose-500/10 border-rose-500/20"

  const highlighted = isSelected || isInspecting

  return (
    <div
      onClick={() => onInspect(place)}
      className="group relative cursor-pointer flex items-start gap-3.5 mx-2 my-1.5 px-4 py-3.5 rounded-xl transition-all duration-300 border border-white/[0.03] hover:border-white/[0.08]"
      style={{
        background: isInspecting
          ? "rgba(255, 255, 255, 0.05)"
          : isSelected
          ? "rgba(255, 255, 255, 0.03)"
          : "rgba(255, 255, 255, 0.015)",
        boxShadow: highlighted ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
        borderLeft: highlighted 
          ? `2px solid ${isSelected ? "#10b981" : "#818cf8"}` 
          : "1px solid rgba(255,255,255,0.03)",
      }}
    >
      {/* Checkbox */}
      <div
        className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded transition-all duration-200"
        onClick={(e) => { e.stopPropagation(); onToggle(place.id) }}
        style={{
          width: "18px",
          height: "18px",
          background: isSelected ? "rgba(16, 185, 129, 0.95)" : "transparent",
          border: isSelected ? "none" : "1.5px solid rgba(255,255,255,.22)",
          borderRadius: "5px",
          cursor: "pointer",
          flexShrink: 0,
          marginTop: "2px",
          boxShadow: isSelected ? "0 0 8px rgba(16,185,129,0.4)" : "none"
        }}
      >
        {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Name + type badge */}
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-extrabold text-white/90 truncate leading-snug flex-1 group-hover:text-white transition-colors">
            {place.displayName.text}
          </p>
          {place.primaryType && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider truncate max-w-22.5"
              style={{ background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,0.4)" }}
            >
              {place.primaryType.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Rating + reviews */}
        {place.rating !== undefined && (
          <div className="flex items-center gap-2">
            <Stars rating={place.rating} />
            <span className="text-[10px] text-white/30 font-semibold">
              {place.rating} · {place.userRatingCount?.toLocaleString()} reviews
            </span>
          </div>
        )}

        {/* Location & Contact Details */}
        <div className="space-y-0.5 text-[10px] text-white/35">
          <p className="truncate flex items-center gap-1.5">
            <MapPin className="size-3 shrink-0 opacity-40" />
            {place.formattedAddress}
          </p>

          {place.websiteUri && (
            <p className="text-sky-400/50 truncate flex items-center gap-1.5 font-medium hover:text-sky-300 transition-colors">
              <Globe className="size-3 shrink-0 opacity-40" />
              {new URL(place.websiteUri).hostname.replace(/^www\./, "")}
            </p>
          )}

          {place.nationalPhoneNumber && (
            <p className="truncate flex items-center gap-1.5">
              <Phone className="size-3 shrink-0 opacity-40" />
              {place.nationalPhoneNumber}
            </p>
          )}
        </div>

        {/* Signal dots */}
        {(audit || auditLoading) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.03]">
            {auditLoading ? (
              <span className="text-[9px] text-white/20 animate-pulse flex items-center gap-1">
                <Loader2 className="size-2.5 animate-spin" /> auditing site…
              </span>
            ) : audit ? (
              <>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8.5px] font-bold border ${audit.ssl ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"}`}>
                  <Shield className="size-2.5" />
                  {audit.ssl ? "SSL" : "No SSL"}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8.5px] font-bold border ${speedColor}`}>
                  <Gauge className="size-2.5" />
                  {(audit.speed / 1000).toFixed(1)}s
                </span>
                {!audit.pixel && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[8.5px] font-bold bg-rose-500/5 border border-rose-500/15 text-rose-400/70">
                    No Pixel
                  </span>
                )}
                {!audit.googleAnalytics && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[8.5px] font-bold bg-amber-500/5 border border-amber-500/15 text-amber-400/70">
                    No GA
                  </span>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FindLeadsPage() {
  const router = useRouter()

  // Campaign state
  const [campaigns, setCampaigns]       = useState<Campaign[]>([])
  const [sequences, setSequences]       = useState<Sequence[]>([])
  const [campaignMode, setCampaignMode] = useState<"existing" | "new">("existing")
  const [campaignId, setCampaignId]     = useState("")
  const [newCampName, setNewCampName]   = useState("")
  const [newSeqId, setNewSeqId]         = useState("")
  const [loadingMeta, setLoadingMeta]   = useState(true)

  // Search state
  const [query, setQuery]               = useState("")
  const [location, setLocation]         = useState("")
  const [locationLoading, setLocationLoading] = useState(true)
  const [searching, setSearching]       = useState(false)
  const [places, setPlaces]             = useState<Place[]>([])
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [importPhase, setImportPhase]   = useState<null | "fetching" | "saving">(null)
  const [importProgress, setImportProgress] = useState("")
  const [searched, setSearched]         = useState(false)
  const [limit, setLimit]               = useState(20)
  const [searchTarget, setSearchTarget] = useState<"b2b" | "b2c">("b2b")
  const [platformFocus, setPlatformFocus] = useState<string | null>(null)
  const { activePlaybook } = usePlaybook()

  // Filter state
  const [showFilters, setShowFilters]     = useState(false)
  const [minRating, setMinRating]         = useState<number>(0)
  const [minReviews, setMinReviews]       = useState<number>(0)
  const [websiteFilter, setWebsiteFilter] = useState<"any" | "yes" | "no">("any")

  // Enrichment cache (keyed by place.id)
  const [enrichmentCache, setEnrichmentCache] = useState<Record<string, PlaceEnrichment>>({})

  // Desktop inspect state
  const [inspecting, setInspecting] = useState<Place | null>(null)

  // Search mode state: 'manual' or 'copilot'
  const [searchMode, setSearchMode] = useState<"manual" | "copilot">("manual")

  function applySuggestion(term: string) {
    setQuery(term)
    setSearchMode("manual")
    toast.success(`Niche query set to "${term}"`)
  }

  // Mobile bottom sheet state (reuses LeadAnalysisPanel)
  const [mobileInspecting, setMobileInspecting] = useState<Place | null>(null)

  // AI prompt widget state
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiReply, setAiReply] = useState("")
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)

  // ── Meta load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch("/api/campaigns").then(r => r.json()),
      fetch("/api/sequences").then(r => r.json()),
    ]).then(([c, s]) => {
      setCampaigns(Array.isArray(c) ? c : [])
      setSequences(Array.isArray(s) ? s : [])
      if (Array.isArray(c) && c.length === 0) setCampaignMode("new")
    }).finally(() => setLoadingMeta(false))
  }, [])

  // ── Location detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setTimeout(() => setLocationLoading(false), 0);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          )
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || ""
          const country = data.address?.country || ""
          const resolved = [city, country].filter(Boolean).join(", ")
          if (resolved) setLocation(resolved)
        } catch { /* silent */ }
        finally { setLocationLoading(false) }
      },
      () => setLocationLoading(false),
      { timeout: 5000, maximumAge: 300_000 }
    )
  }, [])

  // ── Pre-fill AI prompt from user profile ─────────────────────────────────
  useEffect(() => {
    fetch("/api/leads/suggest-businesses")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.prefill) setAiPrompt(data.prefill) })
      .catch(() => {})
  }, [])

  // ── AI prompt submit ──────────────────────────────────────────────────────
  async function handleAiSuggest() {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiDone(false)
    setAiSuggestions([])
    setAiReply("")
    try {
      const res = await fetch("/api/leads/suggest-businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt, location: location.trim() }),
      })
      const data = await res.json()
      if (data.suggestions?.length) {
        setAiSuggestions(data.suggestions)
        setAiReply(data.reply ?? "")
        setAiDone(true)
      }
    } catch { /* silent */ }
    finally { setAiLoading(false) }
  }

  // ── Enrichment helpers ────────────────────────────────────────────────────
  function updateEnrichment(placeId: string, patch: Partial<PlaceEnrichment>) {
    setEnrichmentCache(prev => ({
      ...prev,
      [placeId]: { ...defaultEnrichment(), ...prev[placeId], ...patch },
    }))
  }

  async function autoAudit(places: Place[]) {
    const toAudit = places.filter(p => p.websiteUri)
    for (let i = 0; i < toAudit.length; i += 5) {
      const batch = toAudit.slice(i, i + 5)
      await Promise.all(batch.map(async (place) => {
        updateEnrichment(place.id, { auditLoading: true })
        try {
          const res = await fetch("/api/leads/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: place.websiteUri }),
          })
          const data = await res.json()
          if (!data.error) updateEnrichment(place.id, { auditData: data as AuditData, auditLoading: false })
          else             updateEnrichment(place.id, { auditLoading: false })
        } catch {
          updateEnrichment(place.id, { auditLoading: false })
        }
      }))
      if (i + 5 < toAudit.length) await new Promise(r => setTimeout(r, 500))
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    let activeQuery = query.trim()
    if (searchTarget === "b2c" && !activeQuery) {
      activeQuery = "offices"
      setQuery("offices")
    }
    if (!activeQuery) { toast.error("Enter a business type to search"); return }
    setSearching(true)
    setSearched(false)
    setSelected(new Set())
    setInspecting(null)
    setMobileInspecting(null)
    setEnrichmentCache({})
    try {
      const res = await fetch("/api/leads/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeQuery, location: location.trim(), limit }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlaces(data)
      setSearched(true)
      if (data.length === 0) {
        toast("No results found — try a different search")
      } else {
        const initialCache: Record<string, PlaceEnrichment> = {}
        data.forEach((p: { id: string; cachedContacts?: ContactResult[]; cachedProfiles?: LinkedInDecisionMaker[] }) => {
          if (p.cachedContacts || p.cachedProfiles) {
            initialCache[p.id] = {
              ...defaultEnrichment(),
              contacts: p.cachedContacts || [],
              contactsDone: !!p.cachedContacts,
              linkedInProfiles: p.cachedProfiles || [],
              linkedInDone: !!p.cachedProfiles,
            }
          }
        })
        if (Object.keys(initialCache).length > 0) {
          setEnrichmentCache(initialCache)
        }
        autoAudit(data)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed")
    } finally {
      setSearching(false)
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredPlaces = places.filter(p => {
    const ratingOk  = (p.rating ?? 0) >= minRating
    const reviewsOk = (p.userRatingCount ?? 0) >= minReviews
    const websiteOk =
      websiteFilter === "any" ||
      (websiteFilter === "yes" && !!p.websiteUri) ||
      (websiteFilter === "no" && !p.websiteUri)
    return ratingOk && reviewsOk && websiteOk
  })

  function toggleAll() {
    setSelected(selected.size === filteredPlaces.length ? new Set() : new Set(filteredPlaces.map(p => p.id)))
  }


  function canImport(): boolean {
    if (selected.size === 0) return false
    if (campaignMode === "existing") return !!campaignId
    return !!newCampName.trim() && !!newSeqId
  }

  // ── Import (enriched) ─────────────────────────────────────────────────────
  async function handleImport() {
    const toImport = places.filter(p => selected.has(p.id))
    if (!toImport.length) { toast.error("Select at least one business"); return }
    if (campaignMode === "existing" && !campaignId) { toast.error("Choose a campaign first"); return }
    if (campaignMode === "new" && (!newCampName.trim() || !newSeqId)) {
      toast.error("Enter a campaign name and choose a sequence"); return
    }

    setImportPhase("saving")
    setImportProgress("Importing leads...")
    try {
      const leads = toImport.map(p => {
        const cached = enrichmentCache[p.id] || {}
        const contacts = cached.contacts || []
        const bestContact = contacts.find(c => c.isDecisionMaker) ?? contacts[0]
        const audit = cached.auditData || null

        const painPoints: string[] = []
        if (audit) {
          if (!audit.ssl)            painPoints.push("No SSL certificate")
          if (audit.speed > 3000)    painPoints.push(`Slow website (${(audit.speed / 1000).toFixed(1)}s)`)
          if (!audit.pixel)          painPoints.push("No Facebook pixel")
          if (!audit.mobile)         painPoints.push("Not mobile optimised")
          if (!audit.googleAnalytics) painPoints.push("No Google Analytics")
        }

        const linkedInUrl = cached.linkedInProfiles?.find(lp => lp.name?.toLowerCase() === bestContact?.name?.toLowerCase())?.linkedinUrl
          || cached.linkedInProfiles?.[0]?.linkedinUrl
          || null

        const recentNews = cached.research?.outreachAngles?.join(". ") 
          || (cached.research?.positioning ? `Positioning: ${cached.research.positioning}` : null)
          || null

        const companyDesc = cached.research?.whatTheyDo 
          || p.editorialSummary?.text 
          || p.formattedAddress

        const recommendedApproachText = cached.research?.recommendedApproach
          ? `Recommended AI Approach: ${cached.research.recommendedApproach.label} (${cached.research.recommendedApproach.reason})`
          : null

        return {
          email:        bestContact?.email ?? emailFromPlace(p),
          firstName:    bestContact?.firstName ?? null,
          lastName:     bestContact?.lastName  ?? null,
          title:        bestContact?.title     ?? null,
          company:      p.displayName.text,
          website:      p.websiteUri ?? null,
          industry:     p.primaryType?.replace(/_/g, " ") ?? null,
          companyDesc:  companyDesc,
          linkedinUrl:  linkedInUrl,
          recentNews:   recentNews,
          googlePlaceId: p.id,
          painPoint:    painPoints.slice(0, 3).join(". ") || null,
          notes: [
            p.formattedAddress,
            p.nationalPhoneNumber ?? null,
            p.rating ? `Rating: ${p.rating}/5 (${p.userRatingCount} reviews)` : null,
            bestContact?.name ? `Contact: ${bestContact.name}${bestContact.title ? ` (${bestContact.title})` : ""}` : null,
            recommendedApproachText,
          ].filter(Boolean).join("\n"),
          auditJson:    audit ? JSON.stringify(audit) : null,
          contactsJson: contacts.length > 0 ? JSON.stringify(contacts) : null,
          linkedinProfilesJson: cached.linkedInProfiles ? JSON.stringify(cached.linkedInProfiles) : null,
          recommendedApproach: cached.research?.recommendedApproach?.id || null,
          sourceQuery: query.trim() || null,
          platformFocus: platformFocus || null,
        }
      })

      const payload =
        campaignMode === "existing"
          ? { leads, campaignId, enrichInBackground: true, localNeighbors: searchTarget === "b2c" }
          : { leads, newCampaign: { name: newCampName.trim(), sequenceId: newSeqId }, enrichInBackground: true, localNeighbors: searchTarget === "b2c" }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const { count, campaignId: finalCampaignId } = await res.json()
      toast.success(`${count} leads added to campaign`)
      router.push(`/campaigns/${finalCampaignId ?? campaignId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImportPhase(null)
      setImportProgress("")
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const hasResults = !searching && filteredPlaces.length > 0

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar: Header + Search Console ── */}
      <div
        className="shrink-0 px-6 pt-5 pb-5 space-y-5"
        style={{ 
          borderBottom: "1px solid rgba(255,255,255,.05)",
          background: "linear-gradient(180deg, rgba(15,16,22,0.3) 0%, rgba(15,16,22,0) 100%)"
        }}
      >
        {/* ── Slim header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href="/leads"
              className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 transition-all hover:text-white/70 hover:scale-105 active:scale-95"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <MapPin className={`size-3 transition-colors ${searchTarget === "b2c" ? "text-emerald-400" : "text-sky-400"}`} style={{ filter: `drop-shadow(0 0 4px ${searchTarget === "b2c" ? "rgba(52,211,153,.8)" : "rgba(56,189,248,.8)"})` }} />
                <span className="text-[10px] font-black uppercase tracking-[.2em] text-white/20">Google Maps Scraping</span>
              </div>
              <h1 className="text-[20px] font-black tracking-tight leading-none text-white/95">
                {searchTarget === "b2c" ? "Find Office Neighbors" : "Prospect Discovery"}
              </h1>
            </div>
          </div>

          {/* B2B vs B2C Local Neighbors Toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl shrink-0" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <button
              type="button"
              onClick={() => {
                setSearchTarget("b2b")
                setQuery("")
              }}
              className="rounded-lg px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
              style={searchTarget === "b2b"
                ? { background: "rgba(56,189,248,.12)", border: "1px solid rgba(56,189,248,.25)", color: "#38bdf8" }
                : { color: "rgba(255,255,255,.25)" }}
            >
              B2B Industries
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTarget("b2c")
                setQuery("offices")
              }}
              className="rounded-lg px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              style={searchTarget === "b2c"
                ? { background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.25)", color: "#34d399" }
                : { color: "rgba(255,255,255,.25)" }}
            >
              <Sparkles className="size-3" />
              Office Neighbors
            </button>
          </div>
        </div>

        {/* ── Console Mode Selector Tabs ── */}
        <div className="flex items-center gap-4 border-b border-white/[0.04] pb-1">
          <button
            type="button"
            onClick={() => setSearchMode("manual")}
            className="relative pb-2.5 text-[12px] font-bold transition-all cursor-pointer"
            style={{ color: searchMode === "manual" ? "white" : "rgba(255,255,255,0.35)" }}
          >
            🔍 Search & Filter Tools
            {searchMode === "manual" && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSearchMode("copilot")}
            className="relative pb-2.5 text-[12px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            style={{ color: searchMode === "copilot" ? "white" : "rgba(255,255,255,0.35)" }}
          >
            <Sparkles className="size-3.5 text-violet-400" />
            AI Targeting Copilot
            {searchMode === "copilot" && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full" />
            )}
          </button>
        </div>

        {/* ── Tab Contents ── */}
        {searchMode === "manual" ? (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/20 pointer-events-none" />
                <input
                  type="text"
                  placeholder={searchTarget === "b2c" ? "Neighbor type — e.g. offices, coworking (default: offices)" : "Business type — e.g. Dental practices"}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-[12.5px] text-white/80 outline-none placeholder:text-white/20 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.07)",
                  }}
                />
              </div>

              <div className="relative sm:w-64">
                {locationLoading ? (
                  <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/25 pointer-events-none animate-spin" />
                ) : (
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/20 pointer-events-none" />
                )}
                <input
                  type="text"
                  placeholder={locationLoading ? "Detecting location…" : "City or Area"}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-[12.5px] text-white/80 outline-none placeholder:text-white/20 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.07)",
                  }}
                />
              </div>

              <div className="relative sm:w-32">
                <select
                  value={limit}
                  onChange={e => setLimit(parseInt(e.target.value))}
                  className="w-full rounded-xl pl-3 pr-8 py-2.5 text-[12.5px] text-white/80 outline-none appearance-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.07)",
                  }}
                >
                  <option value="10" className="bg-[#13151c]">10 leads</option>
                  <option value="20" className="bg-[#13151c]">20 leads</option>
                  <option value="30" className="bg-[#13151c]">30 leads</option>
                  <option value="40" className="bg-[#13151c]">40 leads</option>
                  <option value="50" className="bg-[#13151c]">50 leads</option>
                  <option value="60" className="bg-[#13151c]">60 leads</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/20 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={searching}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-extrabold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)",
                  color: "black",
                  boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)"
                }}
              >
                {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                {searching ? "Searching…" : "Search"}
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(f => !f)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold transition-all border cursor-pointer"
                style={{
                  background: showFilters ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)",
                  border: showFilters ? "1px solid rgba(255,255,255,.15)" : "1px solid rgba(255,255,255,.07)",
                  color: showFilters ? "white" : "rgba(255,255,255,.5)",
                }}
              >
                <Filter className="size-3.5" />
                Filters
                {(minRating > 0 || minReviews > 0 || websiteFilter !== "any") && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-black">!</span>
                )}
              </button>
            </div>

            {/* Expandable Manual Filters panel */}
            {showFilters && (
              <div
                className="grid gap-5 sm:grid-cols-3 rounded-2xl p-4 bg-white/[0.01] border border-white/[0.04]"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="size-3 text-amber-400" /> Min Rating
                    </label>
                    <span className="text-[11px] font-bold text-amber-400">{minRating === 0 ? "Any" : `${minRating}+`}</span>
                  </div>
                  <input type="range" min="0" max="5" step="0.5" value={minRating}
                    onChange={e => setMinRating(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="size-3 text-sky-400" /> Min Reviews
                    </label>
                    <span className="text-[11px] font-bold text-sky-400">{minReviews === 0 ? "Any" : minReviews}</span>
                  </div>
                  <input type="range" min="0" max="500" step="10" value={minReviews}
                    onChange={e => setMinReviews(parseInt(e.target.value))}
                    className="w-full accent-sky-400 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Globe2 className="size-3 text-emerald-400" /> Website
                  </label>
                  <div className="flex gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    {(["any", "yes", "no"] as const).map(v => (
                      <button key={v} type="button" onClick={() => setWebsiteFilter(v)}
                        className="flex-1 rounded-lg py-1 text-[10px] font-bold transition-all uppercase tracking-wider cursor-pointer"
                        style={websiteFilter === v
                          ? { background: "rgba(255,255,255,.08)", color: "white" }
                          : { color: "rgba(255,255,255,.3)" }}>
                        {v === "no" ? "No Site" : v === "yes" ? "Has Site" : "Any"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Playbook niche presets below manual search */}
            {activePlaybook && (activePlaybook.targetVerticals.length > 0 || (activePlaybook.platformOptions?.length ?? 0) > 0) && (
              <div className="flex flex-col gap-2 pt-1">
                {activePlaybook.targetVerticals.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[9px] font-black text-white/20 uppercase tracking-wider mr-1">
                      <Target className="size-3" /> Niche Presets:
                    </span>
                    {activePlaybook.targetVerticals.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setQuery(v)}
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold transition-all hover:bg-white/[0.06] cursor-pointer"
                        style={query === v
                          ? { background: "rgba(56,189,248,.12)", border: "1px solid rgba(56,189,248,.25)", color: "#38bdf8" }
                          : { background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.45)" }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}

                {(activePlaybook.platformOptions?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[9px] font-black text-white/20 uppercase tracking-wider mr-1">
                      <Layers className="size-3" /> Mediums:
                    </span>
                    {activePlaybook.platformOptions!.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlatformFocus(prev => prev === p ? null : p)}
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold transition-all hover:bg-white/[0.06] cursor-pointer"
                        style={platformFocus === p
                          ? { background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.25)", color: "rgba(196,181,253,.9)" }
                          : { background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.45)" }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-4">
            {/* AI Prompt suggest form */}
            <div
              className="rounded-2xl overflow-hidden border border-violet-500/15 bg-white/[0.01]"
              style={{ background: "rgba(139,92,246,.03)" }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <Sparkles className="size-4 shrink-0 text-violet-400" />
                <input
                  type="text"
                  placeholder="Describe your business — e.g. We build websites for local salons…"
                  value={aiPrompt}
                  onChange={e => { setAiPrompt(e.target.value); setAiDone(false) }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAiSuggest() } }}
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] text-white/80 placeholder:text-white/20 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-extrabold transition-all disabled:opacity-40 hover:scale-[1.02] cursor-pointer"
                  style={{ background: "rgba(139,92,246,.25)", color: "rgba(196,181,253,.9)" }}
                >
                  {aiLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5 animate-pulse" />
                  )}
                  {aiLoading ? "Thinking…" : "Suggest Targets"}
                </button>
              </div>

              {aiDone && aiSuggestions.length > 0 && (
                <div className="px-4 pb-4 pt-2 space-y-2.5" style={{ borderTop: "1px solid rgba(139,92,246,.08)" }}>
                  {aiReply && (
                    <p className="text-[11.5px] text-violet-300/60 font-medium leading-relaxed">{aiReply}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {aiSuggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold transition-all hover:bg-violet-500/20 hover:scale-105 active:scale-95 cursor-pointer"
                        style={{
                          background: "rgba(139,92,246,.08)",
                          border: "1px solid rgba(139,92,246,.2)",
                          color: "rgba(196,181,253,.8)",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Local Neighbor Info Banner */}
            {searchTarget === "b2c" && (
              <div
                className="rounded-2xl px-4 py-3 flex items-start gap-3 border border-emerald-500/15 bg-white/[0.01]"
                style={{ background: "rgba(16,185,129,.03)" }}
              >
                <Sparkles className="size-4.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-black text-emerald-400">Local Office Neighbor Search Active</p>
                  <p className="text-[10px] text-white/45 mt-0.5 leading-relaxed">
                    Enter your business address under search, then use this Copilot to find nearby offices and corporate headquarters. This compiles localized B2C dining/setup targets.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Searching spinner ── */}
        {searching && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="relative">
              <MapPin className="size-8 text-emerald-400/40" />
              <Loader2 className="size-4 animate-spin text-white/30 absolute -bottom-1 -right-1" />
            </div>
            <p className="text-[13px] text-white/30 font-medium">Searching Google Maps…</p>
          </div>
        )}

        {/* ── Empty state after search ── */}
        {!searching && searched && filteredPlaces.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-8 gap-3">
            <MapPin className="size-8 text-white/15" />
            <p className="text-[13px] font-bold text-white/30">No results found</p>
            <p className="text-[11px] text-white/20">Try adjusting your filters or search terms</p>
            {(minRating > 0 || minReviews > 0 || websiteFilter !== "any") && (
              <button
                onClick={() => { setMinRating(0); setMinReviews(0); setWebsiteFilter("any") }}
                className="text-[11px] font-bold text-emerald-400/60 hover:text-emerald-400 underline underline-offset-4 mt-2"
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* ── Pre-search placeholder ── */}
        {!searching && !searched && (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-8 gap-3">
            <Search className="size-8 text-white/10" />
            <p className="text-[13px] text-white/25">Search Google Maps to find leads</p>
          </div>
        )}

        {/* ── Results: desktop split view (lg+) ── */}
        {hasResults && (
          <>
            {/* LEFT: list panel */}
            <div
              className="hidden lg:flex flex-col w-100 xl:w-110 shrink-0 overflow-y-auto"
              style={{ borderRight: "1px solid rgba(255,255,255,.05)" }}
            >
              {/* List header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5"
                style={{ background: "rgba(12,13,18,.95)", borderBottom: "1px solid rgba(255,255,255,.04)", backdropFilter: "blur(12px)" }}>
                <p className="text-[11px] text-white/40">
                  <span className="font-bold text-white/60">{filteredPlaces.length}</span> businesses
                  {selected.size > 0 && <span className="ml-2 text-emerald-400/70">· {selected.size} selected</span>}
                </p>
                <button
                  onClick={toggleAll}
                  className="text-[10px] font-semibold text-white/35 hover:text-white/65 transition-colors"
                >
                  {selected.size === filteredPlaces.length ? "Clear all" : "Select all"}
                </button>
              </div>

              {/* Place rows */}
              {filteredPlaces.map(place => (
                <PlaceRow
                  key={place.id}
                  place={place}
                  isSelected={selected.has(place.id)}
                  isInspecting={inspecting?.id === place.id}
                  enrichment={enrichmentCache[place.id]}
                  onToggle={toggle}
                  onInspect={p => setInspecting(p)}
                />
              ))}
            </div>

            {/* RIGHT: detail panel */}
            <div className="hidden lg:flex flex-1 overflow-y-auto">
              {inspecting ? (
                <div className="w-full">
                  <LeadDetailSide
                    place={inspecting}
                    enrichment={enrichmentCache[inspecting.id] ?? defaultEnrichment()}
                    searchTarget={searchTarget}
                    onAuditDone={data => updateEnrichment(inspecting.id, { auditData: data, auditLoading: false })}
                    onAuditStart={() => updateEnrichment(inspecting.id, { auditLoading: true })}
                    onContactsDone={contacts => updateEnrichment(inspecting.id, { contacts, contactsLoading: false, contactsDone: true })}
                    onContactsStart={() => updateEnrichment(inspecting.id, { contactsLoading: true, contactsDone: false })}
                    onIcebreakerDone={text => updateEnrichment(inspecting.id, { icebreaker: text })}
                    onResearchDone={data => updateEnrichment(inspecting.id, { research: data, researchLoading: false })}
                    onResearchStart={() => updateEnrichment(inspecting.id, { researchLoading: true })}
                    onLinkedInDone={(profiles, logs) => updateEnrichment(inspecting.id, {
                      linkedInProfiles: profiles,
                      linkedInLoading: false,
                      linkedInDone: true,
                      linkedInLogs: logs ?? [],
                    })}
                    onLinkedInStart={() => updateEnrichment(inspecting.id, { linkedInLoading: true, linkedInDone: false })}
                  />
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center px-8 gap-3 text-white/20">
                  <MapPin className="size-8 opacity-30" />
                  <p className="text-[13px]">Click a business to inspect it</p>
                </div>
              )}
            </div>

            {/* ── Mobile: grid cards (below lg) ── */}
            <div className="lg:hidden flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-white/70">
                  {filteredPlaces.length} businesses
                </p>
                <button onClick={toggleAll} className="text-[11px] font-semibold text-white/35 hover:text-white/65 transition-colors">
                  {selected.size === filteredPlaces.length ? "Clear all" : "Select all"}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredPlaces.map(place => {
                  const isSelected = selected.has(place.id)
                  return (
                    <div
                      key={place.id}
                      onClick={() => setMobileInspecting(place)}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: isSelected
                          ? "linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.04))"
                          : "linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.02))",
                        border: isSelected ? "1px solid rgba(255,255,255,.18)" : "1px solid rgba(255,255,255,.07)",
                      }}
                    >
                      <div
                        className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full transition-all z-10"
                        onClick={e => { e.stopPropagation(); toggle(place.id) }}
                        style={{
                          background: isSelected ? "rgba(255,255,255,.85)" : "transparent",
                          border: isSelected ? "none" : "1.5px solid rgba(255,255,255,.18)",
                        }}
                      >
                        {isSelected && <Check className="size-3 text-black" strokeWidth={3} />}
                      </div>

                      <h3 className="font-bold text-[13px] text-white/80 pr-8 mb-1.5 leading-snug">
                        {place.displayName.text}
                      </h3>

                      {place.rating !== undefined && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Stars rating={place.rating} />
                          <span className="text-[10px] text-white/30">
                            {place.rating} · {place.userRatingCount?.toLocaleString()} reviews
                          </span>
                        </div>
                      )}

                      <p className="text-[11px] text-white/35 truncate mb-1 flex items-center gap-1">
                        <MapPin className="size-2.5 shrink-0 opacity-50" />
                        {place.formattedAddress}
                      </p>

                      {place.websiteUri && (
                        <p className="text-[10px] text-sky-400/60 truncate flex items-center gap-1">
                          <Globe className="size-2.5 shrink-0 opacity-50" />
                          {new URL(place.websiteUri).hostname.replace(/^www\./, "")}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>





      {/* ── Mobile bottom sheet ── */}
      <LeadAnalysisPanel
        place={mobileInspecting}
        onClose={() => setMobileInspecting(null)}
        isSelected={mobileInspecting ? selected.has(mobileInspecting.id) : false}
        onToggle={toggle}
        emailFromPlace={emailFromPlace}
        searchTarget={searchTarget}
      />

      {/* ── Sliding Glassmorphic Floating Import Dock ── */}
      {selected.size > 0 && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col md:flex-row items-center gap-4 px-6 py-4 rounded-2xl border border-white/[0.08] shadow-2xl backdrop-blur-xl animate-slideUp"
          style={{
            background: "linear-gradient(135deg, rgba(20, 22, 33, 0.9) 0%, rgba(10, 11, 16, 0.95) 100%)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            width: "calc(100% - 48px)",
            maxWidth: "800px"
          }}
        >
          {/* Left info */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Check className="size-5" />
            </div>
            <div>
              <p className="text-[13px] font-black text-white/90">
                {selected.size} Lead{selected.size !== 1 ? "s" : ""} Selected
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">Choose campaign to import leads</p>
            </div>
          </div>

          {/* Middle selectors */}
          <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.05]">
              {(["existing", "new"] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCampaignMode(mode)}
                  className="rounded px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wide transition-all cursor-pointer"
                  style={campaignMode === mode
                    ? { background: "rgba(255,255,255,0.1)", color: "white" }
                    : { color: "rgba(255,255,255,0.3)" }}
                >
                  {mode === "existing" ? "Existing" : "New"}
                </button>
              ))}
            </div>

            {loadingMeta ? (
              <span className="text-[11px] text-white/20">Loading campaigns…</span>
            ) : campaignMode === "existing" ? (
              campaigns.length === 0 ? (
                <span className="text-[11px] text-white/35">No campaigns available</span>
              ) : (
                <CustomSelect
                  value={campaignId}
                  onChange={setCampaignId}
                  placeholder="Select campaign…"
                  options={campaigns.map(c => ({ value: c.id, label: c.name }))}
                  className="w-48 h-8 text-[11px] min-h-0"
                />
              )
            ) : (
              <div className="flex items-center gap-2 flex-1 md:flex-initial">
                <input
                  type="text"
                  placeholder="Campaign name…"
                  value={newCampName}
                  onChange={e => setNewCampName(e.target.value)}
                  className="rounded-lg px-2.5 py-1 text-[11.5px] text-white/85 outline-none placeholder:text-white/20 w-32 bg-white/[0.04] border border-white/[0.08]"
                />
                <CustomSelect
                  value={newSeqId}
                  onChange={setNewSeqId}
                  placeholder="Sequence…"
                  options={sequences.map(s => ({ value: s.id, label: s.name }))}
                  className="w-32 h-8 text-[11px] min-h-0"
                />
              </div>
            )}
          </div>

          {/* Right import button */}
          <button
            type="button"
            onClick={handleImport}
            disabled={!!importPhase || !canImport()}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-[12.5px] font-extrabold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
            style={{
              background: canImport()
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "rgba(255,255,255,0.03)",
              color: canImport() ? "#fff" : "rgba(255,255,255,0.25)",
              border: canImport() ? "none" : "1px solid rgba(255,255,255,0.06)",
              boxShadow: canImport() ? "0 4px 15px rgba(16,185,129,0.3)" : "none",
            }}
          >
            {importPhase ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {importPhase ? importProgress || "Importing…" : "Import Leads"}
          </button>
        </div>
      )}
    </div>
  )
}
