"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Search, MapPin, Globe, Phone,
  Check, Loader2, Download,
  Filter, Star, MessageSquare,
  Shield, Gauge, ChevronDown, ChevronUp, Layers, Target,
  Building2, Camera, Image as ImageIcon,
  Zap, FileSpreadsheet, Sparkles as SparklesIcon,
  RefreshCw, ArrowRight, CheckCircle2, ChevronRight,
  SlidersHorizontal, X, Compass, ExternalLink, UserCheck,
  TrendingUp, Activity, Briefcase, Award, Flame,
  CheckSquare, Square, Trash2, Send, Cpu, Lightbulb, Users,
  Mail, AlertTriangle, Sparkles, Eye, Copy, Lock, AlertCircle,
  Laptop, CheckCircle, Monitor, BarChart3, Globe2, Newspaper,
  Share2, ArrowUpRight, MessageCircle, Quote
} from "lucide-react"
import { toast } from "sonner"
import { CustomSelect } from "@/components/ui/custom-select"
import type { Place } from "@/components/lead-analysis-panel"
import type { ContactResult } from "@/lib/contact-finder"
import type { LinkedInDecisionMaker } from "@/app/api/leads/linkedin-search/route"
import type { BusinessProfile } from "@/app/api/leads/research/route"
import { emailFromPlace } from "@/lib/utils"

type Campaign = { id: string; name: string; status: string }
type Sequence = { id: string; name: string }
type AgencyProfile = {
  agencyName?: string
  companyDesc?: string
  flagshipOffer?: string
  playbookType?: string
  title?: string
  tone?: string
}

type StructuredNiche = {
  title: string
  tag: string
  desc: string
  icon?: string
  color?: string
}

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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Award,
  Sparkles: SparklesIcon,
  Zap,
  Briefcase,
  TrendingUp,
  Building2,
  Shield,
  Target,
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-2.5",
            i < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-white/10 text-white/10"
          )}
        />
      ))}
    </span>
  )
}

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

function getCleanHostname(websiteUri?: string): string | null {
  if (!websiteUri) return null
  try {
    const u = new URL(websiteUri.startsWith("http") ? websiteUri : `https://${websiteUri}`)
    return u.hostname.replace(/^www\./, "")
  } catch {
    return websiteUri.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || null
  }
}

/* ─── Skeletons ───────────────────────────────────────────────────────────── */

function NicheSkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4.5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="size-8 rounded-xl bg-white/[0.06]" />
        <div className="h-3.5 w-14 rounded bg-white/[0.04]" />
      </div>
      <div className="h-4 w-3/4 rounded bg-white/[0.06] mb-2" />
      <div className="h-3 w-full rounded bg-white/[0.03]" />
    </div>
  )
}

function LeadSkeletonRow() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 animate-pulse flex items-center gap-3">
      <div className="size-4 rounded bg-white/[0.06] shrink-0" />
      <div className="size-10 rounded-lg bg-white/[0.06] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded bg-white/[0.07]" />
        <div className="h-3 w-1/3 rounded bg-white/[0.03]" />
      </div>
      <div className="h-5 w-20 rounded bg-white/[0.04] shrink-0" />
    </div>
  )
}

/* ─── Main Page Component (2-Column Studio) ───────────────────────────────── */

export default function FindLeadsPage() {
  const router = useRouter()

  /* State */
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null)
  const [agencyNiches, setAgencyNiches] = useState<StructuredNiche[]>([])
  const [loadingNiches, setLoadingNiches] = useState(true)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [campaignMode, setCampaignMode] = useState<"existing" | "new">("existing")
  const [campaignId, setCampaignId] = useState("")
  const [newCampName, setNewCampName] = useState("")
  const [newSeqId, setNewSeqId] = useState("")
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [locationLoading, setLocationLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [places, setPlaces] = useState<Place[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null)
  const [limit, setLimit] = useState(20)

  const [quickFilter, setQuickFilter] = useState<"all" | "email" | "dm" | "audit" | "phone">("all")
  const [minRating, setMinRating] = useState<number>(0)
  const [websiteFilter, setWebsiteFilter] = useState<"any" | "yes" | "no">("any")

  const [enrichmentCache, setEnrichmentCache] = useState<Record<string, PlaceEnrichment>>({})
  const [batchEnriching, setBatchEnriching] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [importPhase, setImportPhase] = useState<null | "saving">(null)
  const [importProgress, setImportProgress] = useState("")

  /* Effects */
  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then(r => r.ok ? r.json() : null),
      fetch("/api/campaigns").then(r => r.json()),
      fetch("/api/sequences").then(r => r.json()),
    ]).then(([profile, c, s]) => {
      if (profile) setAgencyProfile(profile)
      setCampaigns(Array.isArray(c) ? c : [])
      setSequences(Array.isArray(s) ? s : [])
      if (Array.isArray(c) && c.length === 0) setCampaignMode("new")
    }).finally(() => setLoadingMeta(false))
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setTimeout(() => setLocationLoading(false), 0)
      return
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

  useEffect(() => {
    const desc = [
      agencyProfile?.agencyName,
      agencyProfile?.flagshipOffer,
      agencyProfile?.companyDesc,
      agencyProfile?.title,
    ].filter(Boolean).join(" — ") || "B2B client acquisition and lead generation"

    setLoadingNiches(true)
    fetch("/api/leads/suggest-businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc, location }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.niches && Array.isArray(data.niches) && data.niches.length > 0) {
          setAgencyNiches(data.niches)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingNiches(false))
  }, [agencyProfile?.agencyName, agencyProfile?.flagshipOffer, agencyProfile?.companyDesc, location])

  /* Helpers */
  function updateEnrichment(placeId: string, patch: Partial<PlaceEnrichment>) {
    setEnrichmentCache(prev => ({
      ...prev,
      [placeId]: { ...defaultEnrichment(), ...prev[placeId], ...patch },
    }))
  }

  async function autoAudit(items: Place[]) {
    const toAudit = items.filter(p => p.websiteUri)
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
          else updateEnrichment(place.id, { auditLoading: false })
        } catch {
          updateEnrichment(place.id, { auditLoading: false })
        }
      }))
      if (i + 5 < toAudit.length) await new Promise(r => setTimeout(r, 400))
    }
  }

  // Trigger Deep AI Intelligence Research (Company summary, News, Signals, Angles)
  async function handleTriggerDeepResearch(place: Place) {
    updateEnrichment(place.id, { researchLoading: true })
    try {
      const res = await fetch("/api/leads/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: place.websiteUri,
          businessName: place.displayName.text,
          industry: place.primaryType,
          address: place.formattedAddress,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          reviews: place.reviews,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const profile = (data.profile || data) as BusinessProfile
        updateEnrichment(place.id, { research: profile, researchLoading: false })
      } else {
        updateEnrichment(place.id, { researchLoading: false })
      }
    } catch {
      updateEnrichment(place.id, { researchLoading: false })
    }
  }

  // Trigger LinkedIn & Executive Search
  async function handleFindLinkedInExecutives(place: Place) {
    updateEnrichment(place.id, { linkedInLoading: true, linkedInDone: false })
    try {
      const res = await fetch("/api/leads/linkedin-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: place.displayName.text,
          websiteUrl: place.websiteUri,
          address: place.formattedAddress,
          industry: place.primaryType,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        updateEnrichment(place.id, {
          linkedInProfiles: data.profiles || [],
          linkedInLoading: false,
          linkedInDone: true,
          linkedInLogs: data.logs || [],
        })
        toast.success(`Found ${data.profiles?.length || 0} executive profiles!`)
      } else {
        updateEnrichment(place.id, { linkedInLoading: false })
      }
    } catch {
      updateEnrichment(place.id, { linkedInLoading: false })
    }
  }

  // Trigger Contact Email Finder
  async function handleFindContactsForPlace(place: Place) {
    if (!place.websiteUri) {
      toast.error("No website available for this business")
      return
    }
    updateEnrichment(place.id, { contactsLoading: true, contactsDone: false })
    try {
      const cRes = await fetch("/api/leads/contact-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: place.websiteUri,
          companyName: place.displayName.text,
        }),
      })
      if (cRes.ok) {
        const cData = await cRes.json()
        updateEnrichment(place.id, { contacts: cData.contacts ?? [], contactsDone: true, contactsLoading: false })
        toast.success(`Found ${cData.contacts?.length ?? 0} verified emails!`)
      } else {
        updateEnrichment(place.id, { contactsLoading: false })
      }
    } catch {
      updateEnrichment(place.id, { contactsLoading: false })
    }
  }

  // Active lead being inspected on the right side studio
  const activePlace = useMemo(() => {
    if (!places.length) return null
    return places.find(p => p.id === activePlaceId) || places[0]
  }, [places, activePlaceId])

  // Automatically trigger AI research for active lead if not fetched yet
  const autoFetchedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!activePlace) return
    const cached = enrichmentCache[activePlace.id]
    if (!cached?.research && !cached?.researchLoading && !autoFetchedRef.current.has(activePlace.id)) {
      autoFetchedRef.current.add(activePlace.id)
      handleTriggerDeepResearch(activePlace)
    }
  }, [activePlace?.id, enrichmentCache])

  /* Handlers */
  async function handleSearch(targetQuery?: string, targetLoc?: string) {
    const q = (targetQuery ?? query).trim()
    const l = (targetLoc ?? location).trim()

    if (!q) {
      toast.error("Please enter a business category or keyword")
      return
    }

    setSearching(true)
    setHasSearched(true)
    setSelected(new Set())
    setActivePlaceId(null)
    setEnrichmentCache({})
    autoFetchedRef.current.clear()

    try {
      const res = await fetch("/api/leads/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, location: l, limit }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlaces(data)

      if (data.length === 0) {
        toast("No businesses found. Try a broader term or different location.")
      } else {
        setActivePlaceId(data[0]?.id ?? null)
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
        if (Object.keys(initialCache).length > 0) setEnrichmentCache(initialCache)
        autoAudit(data)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed")
    } finally {
      setSearching(false)
    }
  }

  async function handleAutoMatchAgencyICP() {
    const desc = [
      agencyProfile?.agencyName,
      agencyProfile?.flagshipOffer,
      agencyProfile?.companyDesc,
    ].filter(Boolean).join(" — ")

    if (!desc) {
      handleSearch("Roofing Contractors", location)
      return
    }

    setSearching(true)
    toast.info("Analyzing agency offer to discover highest-converting niches…")
    try {
      const res = await fetch("/api/leads/suggest-businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, location }),
      })
      const data = await res.json()
      if (data?.suggestions?.[0]) {
        setQuery(data.suggestions[0])
        handleSearch(data.suggestions[0], location)
        toast.success(`Matched ICP Niche: "${data.suggestions[0]}"`)
      } else {
        handleSearch("Dental Clinics", location)
      }
    } catch {
      handleSearch("Dental Clinics", location)
    }
  }

  async function handleBatchDeepEnrich() {
    const toEnrich = places.filter(p => selected.size === 0 || selected.has(p.id))
    if (toEnrich.length === 0) {
      toast.error("No leads to enrich")
      return
    }
    setBatchEnriching(true)
    setBatchProgress({ current: 0, total: toEnrich.length })

    for (let i = 0; i < toEnrich.length; i++) {
      const p = toEnrich[i]
      setBatchProgress({ current: i + 1, total: toEnrich.length })
      updateEnrichment(p.id, { contactsLoading: true, auditLoading: true })

      try {
        if (p.websiteUri) {
          const cRes = await fetch("/api/leads/contact-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              websiteUrl: p.websiteUri,
              companyName: p.displayName.text,
            }),
          })
          if (cRes.ok) {
            const cData = await cRes.json()
            updateEnrichment(p.id, { contacts: cData.contacts ?? [], contactsDone: true, contactsLoading: false })
          } else {
            updateEnrichment(p.id, { contactsLoading: false })
          }

          const aRes = await fetch("/api/leads/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: p.websiteUri }),
          })
          if (aRes.ok) {
            const aData = await aRes.json()
            if (!aData.error) updateEnrichment(p.id, { auditData: aData as AuditData, auditLoading: false })
            else updateEnrichment(p.id, { auditLoading: false })
          } else {
            updateEnrichment(p.id, { auditLoading: false })
          }
        } else {
          updateEnrichment(p.id, { contactsLoading: false, auditLoading: false })
        }
      } catch {
        updateEnrichment(p.id, { contactsLoading: false, auditLoading: false })
      }
    }
    setBatchEnriching(false)
    toast.success(`Enriched ${toEnrich.length} leads with verified contact details!`)
  }

  function handleExportCSV() {
    const toExport = places.filter(p => selected.size === 0 || selected.has(p.id))
    if (toExport.length === 0) {
      toast.error("No leads to export")
      return
    }

    const headers = [
      "Business Name", "Primary Type", "Website", "Phone", "Address", "Rating", "Reviews",
      "Contact Name", "Contact Email", "Decision Maker Title", "SSL Status", "Page Speed (s)"
    ]
    const rows = toExport.map(p => {
      const cached = enrichmentCache[p.id] || {}
      const contacts = cached.contacts || []
      const bestContact = contacts.find(c => c.isDecisionMaker) ?? contacts[0]
      const audit = cached.auditData

      return [
        `"${p.displayName.text.replace(/"/g, '""')}"`,
        `"${(p.primaryType || "").replace(/_/g, " ")}"`,
        `"${p.websiteUri || ""}"`,
        `"${p.nationalPhoneNumber || ""}"`,
        `"${p.formattedAddress.replace(/"/g, '""')}"`,
        p.rating ?? "",
        p.userRatingCount ?? "",
        `"${bestContact?.name?.replace(/"/g, '""') || ""}"`,
        `"${bestContact?.email || emailFromPlace(p) || ""}"`,
        `"${bestContact?.title?.replace(/"/g, '""') || ""}"`,
        audit ? (audit.ssl ? "Secure (SSL)" : "Insecure (No SSL)") : "",
        audit ? (audit.speed / 1000).toFixed(1) : "",
      ].join(",")
    })

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `leads-${(query || "prospects").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${toExport.length} leads to CSV`)
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredPlaces = places.filter(p => {
    const ratingOk = (p.rating ?? 0) >= minRating
    const websiteOk =
      websiteFilter === "any" ||
      (websiteFilter === "yes" && !!p.websiteUri) ||
      (websiteFilter === "no" && !p.websiteUri)
    if (!ratingOk || !websiteOk) return false

    const cached = enrichmentCache[p.id]
    if (quickFilter === "email") return (cached?.contacts?.length ?? 0) > 0
    if (quickFilter === "dm") return (cached?.contacts?.some(c => c.isDecisionMaker) || (cached?.linkedInProfiles?.length ?? 0) > 0)
    if (quickFilter === "audit") return (cached?.auditData && (!cached.auditData.ssl || cached.auditData.speed > 2500 || !cached.auditData.pixel))
    if (quickFilter === "phone") return !!p.nationalPhoneNumber
    return true
  })

  function toggleAll() {
    setSelected(selected.size === filteredPlaces.length ? new Set() : new Set(filteredPlaces.map(p => p.id)))
  }

  const canImport = useMemo(() => {
    if (selected.size === 0) return false
    if (campaignMode === "existing") return !!campaignId
    return !!newCampName.trim() && !!newSeqId
  }, [selected.size, campaignMode, campaignId, newCampName, newSeqId])

  async function handleImport() {
    const toImport = places.filter(p => selected.has(p.id))
    if (!toImport.length) { toast.error("Select at least one lead"); return }
    if (campaignMode === "existing" && !campaignId) { toast.error("Choose a campaign first"); return }
    if (campaignMode === "new" && (!newCampName.trim() || !newSeqId)) {
      toast.error("Enter a campaign name and select a sequence"); return
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
          if (!audit.ssl) painPoints.push("No SSL certificate")
          if (audit.speed > 3000) painPoints.push(`Slow website (${(audit.speed / 1000).toFixed(1)}s)`)
          if (!audit.pixel) painPoints.push("No Facebook pixel")
          if (!audit.mobile) painPoints.push("Not mobile optimised")
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

        return {
          email: bestContact?.email ?? emailFromPlace(p),
          firstName: bestContact?.firstName ?? null,
          lastName: bestContact?.lastName ?? null,
          title: bestContact?.title ?? null,
          company: p.displayName.text,
          website: p.websiteUri ?? null,
          industry: p.primaryType?.replace(/_/g, " ") ?? null,
          companyDesc: companyDesc,
          linkedinUrl: linkedInUrl,
          recentNews: recentNews,
          googlePlaceId: p.id,
          painPoint: painPoints.slice(0, 3).join(". ") || null,
          notes: [
            p.formattedAddress,
            p.nationalPhoneNumber ?? null,
            p.rating ? `Rating: ${p.rating}/5 (${p.userRatingCount} reviews)` : null,
            bestContact?.name ? `Contact: ${bestContact.name}${bestContact.title ? ` (${bestContact.title})` : ""}` : null,
          ].filter(Boolean).join("\n"),
          auditJson: audit ? JSON.stringify(audit) : null,
          contactsJson: contacts.length > 0 ? JSON.stringify(contacts) : null,
          linkedinProfilesJson: cached.linkedInProfiles ? JSON.stringify(cached.linkedInProfiles) : null,
          sourceQuery: query.trim() || null,
        }
      })

      const payload = campaignMode === "existing"
        ? { leads, campaignId, enrichInBackground: true }
        : { leads, newCampaign: { name: newCampName.trim(), sequenceId: newSeqId }, enrichInBackground: true }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const { count, campaignId: finalCampaignId } = await res.json()
      toast.success(`${count} leads enrolled in campaign!`)
      router.push(`/campaigns/${finalCampaignId ?? campaignId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImportPhase(null)
      setImportProgress("")
    }
  }

  const estPipelineValue = selected.size * 1800

  const activeEnrichment = activePlace ? (enrichmentCache[activePlace.id] || defaultEnrichment()) : null
  const activeAudit = activeEnrichment?.auditData
  const activeResearch = activeEnrichment?.research
  const activeContacts = activeEnrichment?.contacts || []
  const activeLinkedIn = activeEnrichment?.linkedInProfiles || []
  const activeDecisionMaker = activeContacts.find(c => c.isDecisionMaker) || (activeLinkedIn[0] ? {
    name: activeLinkedIn[0].name,
    title: activeLinkedIn[0].title,
    email: null,
    isDecisionMaker: true,
  } : null)

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Copied ${label} to clipboard!`)
  }

  /* ─── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 pb-24 bg-transparent text-white">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pt-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="size-1.5 rounded-full bg-indigo-400" style={{ boxShadow: "0 0 6px rgba(129,140,248,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/30">
              Pipeline · Prospecting & Intelligence Studio
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-[26px] font-black tracking-tight leading-none text-white/90">
              Find Leads via Maps
            </h1>
            {agencyProfile?.agencyName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <Sparkles className="size-3 text-indigo-400" />
                <span>ICP: {agencyProfile.agencyName}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={handleAutoMatchAgencyICP}
            disabled={searching}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-indigo-300 transition-all hover:bg-indigo-500/15 border border-indigo-500/25 bg-indigo-500/10 cursor-pointer"
          >
            <Sparkles className="size-3.5 text-indigo-400" />
            <span>Auto-Match Agency ICP</span>
          </button>
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white/60 hover:text-white transition-all border border-white/[0.08] bg-white/[0.03] cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Leads</span>
          </Link>
        </div>
      </div>

      {/* ── Search Command Bar ── */}
      <div
        className="p-3 rounded-2xl border border-white/[0.08] shadow-xl space-y-2.5"
        style={{
          background: "linear-gradient(145deg, rgba(20, 22, 34, 0.65) 0%, rgba(12, 13, 20, 0.8) 100%)",
          backdropFilter: "blur(16px)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch()
          }}
          className="flex flex-col lg:flex-row items-stretch gap-2"
        >
          {/* Keyword Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-indigo-400/60 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Target business niche (e.g. Med Spas, Roofing Contractors, Cosmetic Dentists...)"
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-[12.5px] text-white outline-none placeholder:text-white/25 bg-white/[0.02] border border-white/[0.05] focus:border-indigo-500/50 transition-all font-medium"
            />
          </div>

          {/* Location Input */}
          <div className="relative lg:w-72">
            {locationLoading ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30 animate-spin" />
            ) : (
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-emerald-400/70 pointer-events-none" />
            )}
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={locationLoading ? "Detecting location…" : "City or Area (e.g. Miami, FL)"}
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-[12.5px] text-white outline-none placeholder:text-white/25 bg-white/[0.02] border border-white/[0.05] focus:border-emerald-500/50 transition-all font-medium"
            />
          </div>

          {/* Quota */}
          <div className="lg:w-32">
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full h-full rounded-xl px-3 py-2.5 text-[11.5px] font-bold text-white/80 outline-none border border-white/[0.05] bg-[#12141f] focus:border-indigo-500/40 cursor-pointer"
            >
              <option value={20} className="bg-[#12141f]">20 Leads</option>
              <option value={40} className="bg-[#12141f]">40 Leads</option>
              <option value={60} className="bg-[#12141f]">60 Leads</option>
            </select>
          </div>

          {/* Search CTA */}
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-[12.5px] font-bold text-white transition-all shadow-md hover:brightness-110 active:scale-[0.98] disabled:opacity-40 cursor-pointer shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)",
            }}
          >
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span>{searching ? "Scraping…" : "Search Leads →"}</span>
          </button>
        </form>

        {/* ── Filter Strip ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Discovered" },
              { id: "email", label: "⚡ Has Email" },
              { id: "dm", label: "⭐ Decision Maker" },
              { id: "audit", label: "🛡️ Growth Gaps" },
              { id: "phone", label: "📞 Has Phone" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQuickFilter(tab.id as typeof quickFilter)}
                className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer"
                style={{
                  background: quickFilter === tab.id ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  color: quickFilter === tab.id ? "#c7d2fe" : "rgba(255, 255, 255, 0.4)",
                  border: quickFilter === tab.id ? "1px solid rgba(99, 102, 241, 0.35)" : "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {hasSearched && filteredPlaces.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const emailIds = filteredPlaces.filter(p => (enrichmentCache[p.id]?.contacts?.length ?? 0) > 0).map(p => p.id)
                  setSelected(new Set(emailIds.length > 0 ? emailIds : filteredPlaces.map(p => p.id)))
                  toast.success(`Selected verified contacts`)
                }}
                className="text-[10.5px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                ⚡ Select Verified Emails
              </button>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                {selected.size === filteredPlaces.length ? "Deselect All" : `Select All (${filteredPlaces.length})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2-Column Split Studio Content ── */}
      {!hasSearched ? (
        /* Initial 1-Click Launchpad */
        <div className="py-4 space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10.5px] font-bold">
              <Sparkles className="size-3" />
              <span>RECOMMENDED AGENCY ICP NICHES</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white/90 tracking-tight">
              High-Yield Niches Suitable for {agencyProfile?.agencyName || "Your Agency"}
            </h2>
            <p className="text-[12px] text-white/40 leading-relaxed">
              {agencyProfile?.flagshipOffer
                ? `AI analyzed your flagship offer ("${agencyProfile.flagshipOffer}") to surface target niches:`
                : "Click any verified niche below to immediately scrape businesses, extract contacts, and stage them for outreach."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {loadingNiches ? (
              Array.from({ length: 6 }).map((_, i) => <NicheSkeletonCard key={i} />)
            ) : (
              agencyNiches.map((card) => {
                const IconComponent = (card.icon && ICON_MAP[card.icon]) ? ICON_MAP[card.icon] : Target
                return (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => {
                      setQuery(card.title)
                      handleSearch(card.title, location)
                    }}
                    className="flex flex-col text-left p-4.5 rounded-2xl border border-white/[0.06] hover:border-indigo-500/35 bg-white/[0.02] hover:bg-indigo-500/[0.04] transition-all group shadow-sm hover:-translate-y-0.5 cursor-pointer backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] group-hover:border-indigo-500/30 transition-colors">
                        <IconComponent className={cn("size-4", card.color || "text-indigo-400")} />
                      </div>
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/30 group-hover:text-indigo-300 transition-colors">
                        {card.tag}
                      </span>
                    </div>
                    <h4 className="text-[13px] font-bold text-white/90 group-hover:text-white mb-1">
                      {card.title}
                    </h4>
                    <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
                      {card.desc}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : searching ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => <LeadSkeletonRow key={i} />)}
          </div>
          <div className="lg:col-span-6 h-96 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-2xl border border-white/[0.06] bg-white/[0.01]">
          <div className="size-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <Search className="size-5 text-white/30" />
          </div>
          <div>
            <p className="text-[13.5px] font-bold text-white/80 mb-0.5">No matching prospects found</p>
            <p className="text-[11px] text-white/40 max-w-sm">Try broadening your search term or switching to a nearby city.</p>
          </div>
        </div>
      ) : (
        /* ── 2-Column Split View: List on Left (50%), Dossier on Right (50%) ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">
          {/* LEFT COLUMN: Prospect List with Multi-Select */}
          <div className="lg:col-span-6 min-w-0 w-full space-y-2">
            {/* List Header Toolbar */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 font-bold text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <div className={cn(
                    "flex size-4 items-center justify-center rounded border transition-all",
                    selected.size === filteredPlaces.length
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : selected.size > 0
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "border-white/30 bg-transparent"
                  )}>
                    {selected.size > 0 && <Check className="size-3 stroke-[3]" />}
                  </div>
                  <span>{selected.size > 0 ? `${selected.size} Selected` : "Select All"}</span>
                </button>
              </div>

              <span className="text-[11px] text-white/40 font-medium">
                {filteredPlaces.length} Prospects Available
              </span>
            </div>

            {/* Leads List */}
            <div className="space-y-2">
              {filteredPlaces.map((place) => {
                const isSelected = selected.has(place.id)
                const isActive = activePlace?.id === place.id
                const domain = getCleanHostname(place.websiteUri)
                const cached = enrichmentCache[place.id]
                const audit = cached?.auditData
                const contacts = cached?.contacts || []
                const dm = contacts.find(c => c.isDecisionMaker)

                return (
                  <div
                    key={place.id}
                    onClick={() => setActivePlaceId(place.id)}
                    className={cn(
                      "group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer backdrop-blur-sm select-none min-w-0 w-full",
                      isActive
                        ? "border-indigo-500/50 bg-indigo-500/[0.09] shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                        : isSelected
                        ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.035]"
                    )}
                  >
                    {/* Active Left Indicator Pill */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-indigo-500" />
                    )}

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(place.id)
                      }}
                      className={cn(
                        "mt-1 flex size-4.5 shrink-0 items-center justify-center rounded transition-all duration-150 border cursor-pointer",
                        isSelected
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                          : "border-white/25 group-hover:border-white/50 bg-white/[0.02]"
                      )}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </button>

                    {/* Thumbnail / Favicon */}
                    <div className="relative size-10 rounded-lg overflow-hidden shrink-0 border border-white/[0.08] bg-black/40 flex items-center justify-center">
                      {domain ? (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                          alt={place.displayName.text}
                          className="size-5 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Building2 className="size-4 text-white/30" />
                      )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                      <div className="flex items-start justify-between gap-1.5 min-w-0">
                        <h3 className="text-[13px] font-bold text-white/90 truncate leading-snug group-hover:text-white">
                          {place.displayName.text}
                        </h3>
                        {place.rating !== undefined && (
                          <span className="text-[10px] font-semibold text-amber-400 shrink-0 flex items-center gap-0.5">
                            ★ {place.rating}
                          </span>
                        )}
                      </div>

                      <p className="text-[10.5px] text-white/40 truncate flex items-center gap-1">
                        <MapPin className="size-2.5 shrink-0 text-white/20" />
                        {place.formattedAddress}
                      </p>

                      {/* Signals & Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {audit && !audit.ssl ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 border border-rose-500/25 text-rose-300">
                            🚨 No SSL
                          </span>
                        ) : audit?.ssl ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400">
                            SSL Valid
                          </span>
                        ) : null}

                        {audit && audit.speed > 3000 && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/25 text-amber-300">
                            🐢 {(audit.speed / 1000).toFixed(1)}s Slow
                          </span>
                        )}

                        {dm ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 flex items-center gap-0.5">
                            <UserCheck className="size-2" /> {dm.name || "Owner"}
                          </span>
                        ) : contacts.length > 0 ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
                            {contacts.length} Emails
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <ChevronRight className={cn(
                      "size-4 shrink-0 transition-transform",
                      isActive ? "text-indigo-400 translate-x-0.5" : "text-white/20 group-hover:text-white/40"
                    )} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: 100% Dedicated Clean AI Intelligence Dossier */}
          <div className="lg:col-span-6 min-w-0 w-full sticky top-4 max-h-[calc(100vh-80px)] overflow-y-auto pr-1">
            {activePlace && (
              <div
                className="p-5 rounded-2xl border border-white/[0.08] shadow-xl space-y-4 overflow-hidden break-words w-full"
                style={{
                  background: "linear-gradient(145deg, rgba(20, 22, 34, 0.6) 0%, rgba(12, 13, 20, 0.85) 100%)",
                  backdropFilter: "blur(16px)",
                }}
              >
                {/* 1. Header & Stage Action */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="size-2 rounded-full bg-indigo-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/80">
                        AI Prospect Dossier
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white/95 leading-tight">
                      {activePlace.displayName.text}
                    </h2>
                    <p className="text-[11px] text-white/40 mt-0.5 flex items-center gap-1">
                      <MapPin className="size-2.5 text-white/20 shrink-0" />
                      {activePlace.formattedAddress}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggle(activePlace.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 shadow-sm",
                      selected.has(activePlace.id)
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/35"
                        : "bg-white/[0.05] text-white/70 border-white/[0.1] hover:text-white hover:bg-white/[0.1]"
                    )}
                  >
                    {selected.has(activePlace.id) ? "✓ Staged for Campaign" : "+ Stage Prospect"}
                  </button>
                </div>

                {/* Direct Contacts & Web Strip */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {activePlace.websiteUri && (
                    <a
                      href={activePlace.websiteUri.startsWith("http") ? activePlace.websiteUri : `https://${activePlace.websiteUri}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 font-medium transition-colors truncate max-w-[180px] shrink"
                    >
                      <Globe className="size-3 shrink-0" />
                      {getCleanHostname(activePlace.websiteUri)}
                      <ExternalLink className="size-2.5 opacity-60" />
                    </a>
                  )}

                  {activePlace.nationalPhoneNumber && (
                    <a
                      href={`tel:${activePlace.nationalPhoneNumber}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border border-white/[0.08] font-medium transition-colors"
                    >
                      <Phone className="size-3 text-white/40" />
                      {activePlace.nationalPhoneNumber}
                    </a>
                  )}

                  {activePlace.rating !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {activePlace.rating} ({activePlace.userRatingCount || 0} reviews)
                    </span>
                  )}
                </div>

                {/* ── PILLAR 1: COMPANY SNAPSHOT & POSITIONING ── */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-1">
                      <Building2 className="size-3 text-indigo-400" /> Company Positioning
                    </span>
                    {activeEnrichment?.researchLoading ? (
                      <span className="text-[9.5px] text-indigo-300 animate-pulse flex items-center gap-1">
                        <Loader2 className="size-2.5 animate-spin" /> AI Analyzing Website…
                      </span>
                    ) : activeResearch?.pricingTier ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/60">
                        {activeResearch.pricingTier}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed font-medium">
                    {activeResearch?.whatTheyDo || (activeEnrichment?.researchLoading
                      ? "Deep-crawling website and analyzing core service offerings…"
                      : activePlace.editorialSummary?.text || `${activePlace.displayName.text} is an established local service provider.`)}
                  </p>
                  {activeResearch?.targetCustomers && (
                    <div className="text-[10.5px] text-white/40 pt-1 border-t border-white/[0.04]">
                      <span className="font-semibold text-white/60">Target Market: </span>
                      {activeResearch.targetCustomers}
                    </div>
                  )}
                </div>

                {/* ── PILLAR 2: REAL-TIME SIGNALS, RECENT NEWS & WHY NOW? TRIGGER ── */}
                <div className="space-y-2">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-1">
                    <Newspaper className="size-3 text-amber-400" /> Real-Time News & Signals
                  </span>

                  {/* Why Now Trigger */}
                  <div className="p-3.5 rounded-xl bg-amber-500/[0.07] border border-amber-500/20 space-y-1">
                    <span className="text-[9px] font-bold uppercase text-amber-300/80 tracking-wide block">
                      ⚡ Timely Outreach Trigger ("Why Reach Out Now?")
                    </span>
                    <p className="text-[11.5px] text-white/90 leading-relaxed font-medium">
                      {activeResearch?.whyNowTrigger || (activeAudit && !activeAudit.ssl
                        ? "Currently losing paid and organic visitor trust due to missing SSL certificate warnings on search results."
                        : activeAudit && activeAudit.speed > 3000
                        ? `Website takes ${(activeAudit.speed / 1000).toFixed(1)}s to load, causing significant bounce rates on mobile.`
                        : "Active local reputation momentum with high customer reviews.")}
                    </p>
                  </div>

                  {/* Public Announcements / Roadmap */}
                  {activeResearch?.publicRoadmap?.announcements && activeResearch.publicRoadmap.announcements.length > 0 && (
                    <div className="space-y-1.5">
                      {activeResearch.publicRoadmap.announcements.slice(0, 2).map((ann, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white/90">{ann.headline}</span>
                            <span className="text-[9px] font-semibold text-indigo-300 uppercase px-1 rounded bg-indigo-500/15">
                              {ann.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/40">{ann.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Social Media Channels */}
                  {activeResearch?.technicalProfile?.socials && Object.keys(activeResearch.technicalProfile.socials).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[9.5px] text-white/40 mr-1 font-semibold">Socials:</span>
                      {Object.entries(activeResearch.technicalProfile.socials).map(([net, url]) => (
                        <a
                          key={net}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.06] transition-all capitalize"
                        >
                          {net} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── PILLAR 3: VERIFIED DECISION MAKERS & SOCIALS ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-1">
                      <Users className="size-3 text-indigo-400" /> Verified Decision Makers
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFindLinkedInExecutives(activePlace)}
                        disabled={activeEnrichment?.linkedInLoading}
                        className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                      >
                        {activeEnrichment?.linkedInLoading ? <Loader2 className="size-2.5 animate-spin" /> : <Globe className="size-2.5" />}
                        <span>LinkedIn</span>
                      </button>
                      <span className="text-white/20">·</span>
                      <button
                        type="button"
                        onClick={() => handleFindContactsForPlace(activePlace)}
                        disabled={activeEnrichment?.contactsLoading}
                        className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 cursor-pointer"
                      >
                        {activeEnrichment?.contactsLoading ? <Loader2 className="size-2.5 animate-spin" /> : <Mail className="size-2.5 text-indigo-400" />}
                        <span>Emails</span>
                      </button>
                    </div>
                  </div>

                  {/* Decision Maker Card */}
                  {activeDecisionMaker ? (
                    <div className="p-3 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                            {activeDecisionMaker.name ? activeDecisionMaker.name[0] : "E"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{activeDecisionMaker.name || "Executive"}</span>
                              <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                                {activeDecisionMaker.title || "Owner / Partner"}
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-medium block">
                              ✓ Verified Authority
                            </span>
                          </div>
                        </div>

                        {activeLinkedIn[0]?.linkedinUrl && (
                          <a
                            href={activeLinkedIn[0].linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#0077b5]/20 hover:bg-[#0077b5]/30 text-sky-300 border border-[#0077b5]/30 transition-all flex items-center gap-1"
                          >
                            LinkedIn ↗
                          </a>
                        )}
                      </div>

                      {activeDecisionMaker.email && (
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.06] text-xs">
                          <span className="text-emerald-400 font-mono text-[11px] truncate">{activeDecisionMaker.email}</span>
                          <button
                            type="button"
                            onClick={() => copyText(activeDecisionMaker.email!, "Email")}
                            className="text-[10px] font-semibold text-white/50 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="size-2.5" /> Copy
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs text-white/40">
                      <span>Click to scan leadership & LinkedIn profiles</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleFindLinkedInExecutives(activePlace)
                          handleFindContactsForPlace(activePlace)
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
                      >
                        Extract Leadership
                      </button>
                    </div>
                  )}
                </div>

                {/* ── PILLAR 4: TAILORED COLD OUTREACH ANGLES ── */}
                <div className="space-y-2">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-1">
                    <Target className="size-3 text-emerald-400" /> Cold Pitch Angles
                  </span>

                  {activeResearch?.outreachAngles && activeResearch.outreachAngles.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeResearch.outreachAngles.map((angle, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-white/90">Angle {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => copyText(angle, `Angle ${idx + 1}`)}
                              className="text-[9.5px] font-semibold text-white/40 hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="size-2.5" /> Copy Angle
                            </button>
                          </div>
                          <p className="text-[10.5px] text-white/50 leading-relaxed">{angle}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[10.5px] text-white/40">
                      {activeAudit ? "✅ Technical diagnostics ready. Synthesizing AI angles…" : "Scanning company diagnostics…"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sleek Floating Action Dock for Campaign Enrollment (Only when leads selected) ── */}
      {selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl animate-in slide-in-from-bottom-6 duration-200">
          <div
            className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl border border-indigo-500/35 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(16, 18, 30, 0.96) 0%, rgba(10, 11, 18, 0.98) 100%)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.75), 0 0 25px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Left: Selected Count & Pipeline Value */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Check className="size-4.5 stroke-[3]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">
                    {selected.size} Leads Staged
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ${estPipelineValue.toLocaleString()} Pipeline
                  </span>
                </div>
                <p className="text-[10px] text-white/40">Ready to enroll into outreach campaign</p>
              </div>
            </div>

            {/* Center: Campaign Setup Controls */}
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0">
                {(["existing", "new"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCampaignMode(mode)}
                    className={cn(
                      "rounded px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide transition-all cursor-pointer",
                      campaignMode === mode
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-white/40 hover:text-white"
                    )}
                  >
                    {mode === "existing" ? "Existing" : "+ New"}
                  </button>
                ))}
              </div>

              {loadingMeta ? (
                <div className="h-8 flex items-center text-[10.5px] text-white/30">
                  <Loader2 className="size-3 animate-spin mr-1.5" /> Loading…
                </div>
              ) : campaignMode === "existing" ? (
                <div className="flex-1 min-w-[160px]">
                  <CustomSelect
                    value={campaignId}
                    onChange={setCampaignId}
                    placeholder="Choose target campaign…"
                    options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
                    className="w-full h-8 text-xs"
                  />
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-1.5 min-w-0">
                  <input
                    type="text"
                    placeholder="Campaign name..."
                    value={newCampName}
                    onChange={(e) => setNewCampName(e.target.value)}
                    className="w-1/2 rounded-lg px-2.5 py-1 text-xs text-white/90 outline-none placeholder:text-white/25 bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50"
                  />
                  <div className="w-1/2">
                    <CustomSelect
                      value={newSeqId}
                      onChange={setNewSeqId}
                      placeholder="Sequence…"
                      options={sequences.map((s) => ({ value: s.id, label: s.name }))}
                      className="w-full h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleBatchDeepEnrich}
                disabled={batchEnriching}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 transition-all disabled:opacity-50 cursor-pointer"
                title="Extract verified emails & decision maker contacts"
              >
                {batchEnriching ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3 text-indigo-400" />}
                <span className="hidden sm:inline">{batchEnriching ? `${batchProgress.current}/${batchProgress.total}` : "Deep Enrich"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer"
                title="Download CSV export"
              >
                <FileSpreadsheet className="size-3 text-emerald-400" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport || !!importPhase}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-md",
                  canImport
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25 hover:brightness-110"
                    : "bg-white/[0.04] border border-white/[0.08]"
                )}
              >
                {importPhase ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                <span>{importPhase ? importProgress || "Enrolling…" : `Launch ${selected.size} Leads →`}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
                title="Deselect all"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}