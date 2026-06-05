"use client"

import { useState, useRef } from "react"
import {
  MapPin, Globe2, Gauge, Shield, Sparkles, Zap,
  ExternalLink, X, Check, Plus, Loader2,
  ChevronLeft, ChevronRight, UserSearch, Star,
  Copy, Phone, Mail, BarChart3,
} from "lucide-react"
import { useEffect } from "react"
import { toast } from "sonner"
import type { ContactResult } from "@/lib/contact-finder"

export type Place = {
  id: string
  displayName: { text: string }
  formattedAddress: string
  websiteUri?: string
  nationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
  businessStatus?: string
  primaryType?: string
  editorialSummary?: { text: string }
  photos?: { name: string }[]
  reviews?: {
    text: { text: string }
    rating: number
    authorAttribution: { displayName: string }
  }[]
}

interface LeadAnalysisPanelProps {
  place: Place | null
  onClose: () => void
  isSelected: boolean
  onToggle: (id: string) => void
  emailFromPlace: (p: Place) => string
}

type Tab = "overview" | "contact" | "audit" | "ai"

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "contact",  label: "Contact"  },
  { id: "audit",    label: "Audit"    },
  { id: "ai",       label: "AI"       },
]

const PEEK_H = 128

export function LeadAnalysisPanel({
  place: placeProp,
  onClose,
  isSelected,
  onToggle,
}: LeadAnalysisPanelProps) {
  const [expanded, setExpanded]               = useState(false)
  const [activeTab, setActiveTab]             = useState<Tab>("overview")
  const [activePhoto, setActivePhoto]         = useState(0)
  const [isClosing, setIsClosing]             = useState(false)

  // drag-to-expand
  const dragStartY  = useRef(0)
  const dragging    = useRef(false)

  // enrichment
  const [socials, setSocials]                         = useState<string[]>([])
  const [discoveredEmails, setDiscoveredEmails]       = useState<string[]>([])
  const [loadingEnrich, setLoadingEnrich]             = useState(false)
  const [enrichSearched, setEnrichSearched]           = useState(false)

  // decision maker
  const [contacts, setContacts]                       = useState<ContactResult[]>([])
  const [searchingContacts, setSearchingContacts]     = useState(false)
  const [contactsSearched, setContactsSearched]       = useState(false)

  // audit
  const [auditData, setAuditData] = useState<{
    ssl: boolean; speed: number; mobile: boolean; pixel: boolean
  } | null>(null)
  const [auditing, setAuditing] = useState(false)

  // icebreaker
  const [icebreaker, setIcebreaker]       = useState("")
  const [generatingIce, setGeneratingIce] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      setExpanded(false)
      setActiveTab("overview")
      setActivePhoto(0)
      setIsClosing(false)
      setSocials([])
      setDiscoveredEmails([])
      setLoadingEnrich(false)
      setEnrichSearched(false)
      setContacts([])
      setSearchingContacts(false)
      setContactsSearched(false)
      setAuditData(null)
      setAuditing(false)
      setIcebreaker("")
      setGeneratingIce(false)
    }, 0)
    if (placeProp?.websiteUri) {
      runEnrichment()
      runAudit()
      findDecisionMaker()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeProp?.id])

  if (!placeProp) return null
  const place = placeProp

  const initiateClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

  // ── Drag handlers ────────────────────────────────────────────
  const onHandleDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    dragging.current   = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHandleUp = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    const delta = dragStartY.current - e.clientY // positive = swipe up
    if (delta > 40)       setExpanded(true)
    else if (delta < -40) setExpanded(false)
    else                  setExpanded(p => !p) // tap = toggle
  }

  // ── Data functions ───────────────────────────────────────────
  async function runEnrichment() {
    if (!place?.websiteUri) return
    setLoadingEnrich(true)
    setEnrichSearched(true)
    try {
      const res = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: place.websiteUri }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDiscoveredEmails(data.emails ?? [])
      setSocials(data.socials ?? [])
    } catch { /* silent */ }
    finally  { setLoadingEnrich(false) }
  }

  async function runAudit() {
    if (!place?.websiteUri) return
    setAuditing(true)
    try {
      const res = await fetch("/api/leads/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: place.websiteUri }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (!data.error) setAuditData(data)
    } catch { /* silent */ }
    finally { setAuditing(false) }
  }

  async function generateIcebreaker() {
    setGeneratingIce(true)
    setIcebreaker("")
    try {
      const decisionMaker = contacts.find(c => c.isDecisionMaker)
      const res = await fetch("/api/leads/icebreaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: place.displayName.text,
          address: place.formattedAddress,
          industry: place.primaryType?.replace(/_/g, " ") ?? null,
          rating: place.rating ?? null,
          reviewCount: place.userRatingCount ?? null,
          auditData,
          decisionMakerFirstName: decisionMaker?.firstName ?? null,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setIcebreaker(data.icebreaker ?? "")
    } catch (err) {
      console.error("Icebreaker error:", err)
      toast.error("Failed to generate message — check console")
    } finally {
      setGeneratingIce(false)
    }
  }

  async function findDecisionMaker() {
    if (!place?.websiteUri) return
    setSearchingContacts(true)
    setContactsSearched(true)
    try {
      const res = await fetch("/api/leads/contact-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: place.websiteUri, companyName: place.displayName.text }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setContacts(data.contacts ?? [])
    } catch {
      toast.error("Contact search failed")
    } finally {
      setSearchingContacts(false)
    }
  }

  // ── Shared sub-styles ────────────────────────────────────────
  const sectionHead = "text-[10px] font-black text-white/30 uppercase tracking-[.18em] mb-3"
  const card        = { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }

  // ── Tab: Overview ────────────────────────────────────────────
  function renderOverviewTab() {
    return (
      <div className="space-y-6">
        {/* Photo slider */}
        {place.photos && place.photos.length > 0 && (
          <div className="relative h-52 rounded-2xl overflow-hidden group/slider select-none touch-none"
            style={{ border: "1px solid rgba(255,255,255,.07)" }}>
            <div className={`flex h-full ${dragging.current ? "" : "transition-transform duration-500 ease-out"}`}
              style={{ transform: `translateX(-${activePhoto * 100}%)` }}>
              {place.photos.map((photo, i) => (
                <img key={i} alt=""
                  src={`https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=500&maxWidthPx=900&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                  className="w-full h-full object-cover shrink-0 pointer-events-none"
                />
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {place.photos.length > 1 && (
              <>
                <button onClick={() => setActivePhoto(p => Math.max(0, p - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/30 backdrop-blur border border-white/10 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity">
                  <ChevronLeft className="size-4 text-white" />
                </button>
                <button onClick={() => setActivePhoto(p => Math.min(place.photos!.length - 1, p + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/30 backdrop-blur border border-white/10 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity">
                  <ChevronRight className="size-4 text-white" />
                </button>
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                  {place.photos.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all ${i === activePhoto ? "w-5 bg-white" : "w-1 bg-white/30"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rating",  value: place.rating ? `${place.rating}★` : "—",             color: "text-amber-400" },
            { label: "Reviews", value: place.userRatingCount?.toLocaleString() ?? "—",       color: "text-sky-400"   },
            { label: "Status",  value: place.businessStatus === "OPERATIONAL" ? "Open" : (place.businessStatus ?? "—"), color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={card}>
              <p className={`text-[15px] font-black ${color}`}>{value}</p>
              <p className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Business summary */}
        {place.editorialSummary?.text && (
          <div className="rounded-xl p-4" style={card}>
            <p className="text-[12px] text-white/55 leading-relaxed italic">&quot;{place.editorialSummary.text}&quot;</p>
          </div>
        )}

        {/* Address + website */}
        <div className="space-y-2">
          <div className="flex items-start gap-3 py-2 border-b border-white/[.04]">
            <MapPin className="size-3.5 text-white/25 mt-0.5 shrink-0" />
            <span className="text-[12px] text-white/55 leading-snug">{place.formattedAddress}</span>
          </div>
          {place.websiteUri && (
            <div className="flex items-center gap-3 py-2 border-b border-white/[.04]">
              <Globe2 className="size-3.5 text-white/25 shrink-0" />
              <a href={place.websiteUri} target="_blank" rel="noopener noreferrer"
                className="text-[12px] text-sky-400 hover:text-sky-300 transition-colors truncate flex-1">
                {new URL(place.websiteUri).hostname}
              </a>
              <ExternalLink className="size-3 text-white/20 shrink-0" />
            </div>
          )}
          {place.nationalPhoneNumber && (
            <div className="flex items-center gap-3 py-2">
              <Phone className="size-3.5 text-white/25 shrink-0" />
              <span className="text-[12px] text-white/55">{place.nationalPhoneNumber}</span>
            </div>
          )}
        </div>

        {/* Top review */}
        {place.reviews && place.reviews[0] && (
          <div>
            <p className={sectionHead}>Top Review</p>
            <div className="rounded-xl p-4 space-y-2" style={card}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/50">{place.reviews[0].authorAttribution.displayName}</span>
                <span className="text-[11px] text-amber-400 font-mono">{place.reviews[0].rating}★</span>
              </div>
              <p className="text-[12px] text-white/50 leading-relaxed line-clamp-3 italic">
                &quot;{place.reviews[0].text.text}&quot;
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Tab: Contact ─────────────────────────────────────────────
  function renderContactTab() {
    return (
      <div className="space-y-6">
        {/* Decision Maker */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className={sectionHead.replace("mb-3", "")}>Decision Maker</p>
            {contactsSearched && !searchingContacts && (
              <button onClick={findDecisionMaker}
                className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1">
                <UserSearch className="size-3" /> Refresh
              </button>
            )}
          </div>

          {!place.websiteUri ? (
            <div className="rounded-xl p-4 text-center" style={card}>
              <p className="text-[11px] text-white/25">No website — can&apos;t search for contacts</p>
            </div>
          ) : (searchingContacts || !contactsSearched) ? (
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
            <div className="rounded-xl p-4 text-center" style={card}>
              <p className="text-[11px] text-white/25">No decision maker identified</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {contacts.slice(0, 4).map((c, i) => {
                const barColor = c.confidence >= 75 ? "#34d399" : c.confidence >= 50 ? "#fbbf24" : "#f87171"
                const srcLabel = c.sources.includes("ai-extracted") ? "AI"
                  : c.sources.includes("format-matched") ? "Format"
                  : c.sources.includes("website-scraped") ? "Site" : "Gen"
                return (
                  <div key={i}
                    className="group/c relative rounded-xl p-3.5 transition-all hover:brightness-110"
                    style={{
                      background: c.isDecisionMaker
                        ? "linear-gradient(135deg,rgba(52,211,153,.06),rgba(255,255,255,.02))"
                        : "rgba(255,255,255,.025)",
                      border: c.isDecisionMaker
                        ? "1px solid rgba(52,211,153,.15)"
                        : "1px solid rgba(255,255,255,.05)",
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        {c.name   && <p className="text-[12px] font-bold text-white/80 truncate">{c.name}</p>}
                        {c.title  && <p className="text-[10px] text-white/40 mt-0.5 truncate">{c.title}</p>}
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
                        className="opacity-0 group-hover/c:opacity-100 transition-opacity shrink-0">
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

        {/* Found emails */}
        <div>
          <p className={sectionHead}>Scraped Emails</p>
          {(loadingEnrich || !enrichSearched) ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-8 rounded-lg bg-white/[.04] animate-pulse" />)}
            </div>
          ) : discoveredEmails.length > 0 ? (
            <div className="space-y-1.5">
              {discoveredEmails.map((email, i) => (
                <div key={i} className="group/email flex items-center gap-3 rounded-lg px-3 py-2" style={card}>
                  <Mail className="size-3 text-white/25 shrink-0" />
                  <span className="text-[12px] font-mono text-white/60 truncate flex-1">{email}</span>
                  <button onClick={() => { navigator.clipboard.writeText(email); toast.success("Copied") }}
                    className="opacity-0 group-hover/email:opacity-100 transition-opacity">
                    <Copy className="size-3 text-white/40 hover:text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-white/25 italic">None found on site</p>
          )}
        </div>

        {/* Socials */}
        {(loadingEnrich || !enrichSearched) ? (
          <div>
            <p className={sectionHead}>Social</p>
            <div className="flex gap-2">
              <div className="h-7 w-20 bg-white/[.04] rounded-xl animate-pulse" />
              <div className="h-7 w-20 bg-white/[.04] rounded-xl animate-pulse" />
            </div>
          </div>
        ) : socials.length > 0 ? (
          <div>
            <p className={sectionHead}>Social</p>
            <div className="flex flex-wrap gap-2">
              {socials.map((link, i) => {
                const label = link.includes("facebook") ? "Facebook"
                  : link.includes("instagram") ? "Instagram"
                  : link.includes("linkedin")  ? "LinkedIn"
                  : link.includes("twitter") || link.includes("x.com") ? "X / Twitter"
                  : "Link"
                return (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors"
                    style={card}>
                    {label}
                  </a>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  // ── Tab: Audit ───────────────────────────────────────────────
  function renderAuditTab() {
    return (
      <div className="space-y-6">
        {!place.websiteUri ? (
          <div className="rounded-xl p-5 text-center" style={card}>
            <Globe2 className="size-5 text-amber-400/50 mx-auto mb-2" />
            <p className="text-[12px] font-bold text-amber-400/70">No website to audit</p>
            <p className="text-[10px] text-white/25 mt-1">High-intent lead for web services</p>
          </div>
        ) : auditing ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-sky-400" />
            <p className="text-[11px] text-white/30">Auditing {new URL(place.websiteUri).hostname}…</p>
          </div>
        ) : auditData ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "SSL",    value: auditData.ssl    ? "Secure"    : "Insecure",  icon: Shield,  ok: auditData.ssl        },
                { label: "Speed",  value: `${auditData.speed}ms`,                       icon: Gauge,   ok: auditData.speed > 70 },
                { label: "Pixel",  value: auditData.pixel  ? "Active"    : "Missing",   icon: Sparkles,ok: auditData.pixel      },
                { label: "Mobile", value: auditData.mobile ? "Optimised" : "Poor",      icon: Zap,     ok: auditData.mobile     },
              ].map(({ label, value, icon: Icon, ok }) => (
                <div key={label} className="rounded-xl p-4 space-y-2" style={card}>
                  <div className="flex items-center gap-2">
                    <Icon className={`size-3.5 ${ok ? "text-emerald-400" : "text-red-400"}`} />
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{label}</span>
                  </div>
                  <p className={`text-[13px] font-bold ${ok ? "text-white/80" : "text-red-400/80"}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Pain points */}
            <div>
              <p className={sectionHead}>AI Pain Points</p>
              <div className="rounded-xl p-4 space-y-3" style={card}>
                {!auditData.ssl && (
                  <PainPoint num={1} text={<><strong className="text-white">No SSL</strong> — Google downgrades ranking; visitors see a &apos;Not Secure&apos; warning.</>} />
                )}
                {auditData.speed < 70 && (
                  <PainPoint num={!auditData.ssl ? 2 : 1} text={<><strong className="text-white">Slow load ({auditData.speed}ms)</strong> — 50%+ of mobile users leave before the page finishes.</>} />
                )}
                {!auditData.pixel && (
                  <PainPoint num={[!auditData.ssl, auditData.speed < 70].filter(Boolean).length + 1}
                    text={<><strong className="text-white">No tracking pixel</strong> — ad spend is unattributed; no retargeting possible.</>} />
                )}
                {auditData.ssl && auditData.speed >= 70 && auditData.pixel && (
                  <PainPoint num={1} color="emerald" text="Strong technical foundation. Angle: scale existing traffic rather than fix leaks." />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl p-6 text-center" style={card}>
            <BarChart3 className="size-6 text-white/15 mx-auto mb-3" />
            <p className="text-[11px] text-white/25 mb-4">Check SSL, speed, pixel &amp; mobile in one click</p>
            <button onClick={runAudit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold text-black hover:brightness-110 transition-all"
              style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 8px rgba(0,0,0,.3)" }}>
              <Gauge className="size-3.5" /> Run Audit
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Tab: AI Writer ───────────────────────────────────────────
  function renderAITab() {
    return (
      <div className="space-y-4">
        <div className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background: "linear-gradient(145deg,rgba(52,211,153,.06),rgba(255,255,255,.02))",
            border: "1px solid rgba(52,211,153,.12)",
          }}>
          <div className="absolute inset-0 opacity-[.025] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(#34d399 0.5px,transparent 0.5px)", backgroundSize: "16px 16px" }} />
          <div className="absolute top-4 right-4">
            <Sparkles className="size-4 text-emerald-400/25" />
          </div>

          {generatingIce ? (
            <div className="py-6 flex flex-col items-center gap-3">
              <Loader2 className="size-5 animate-spin text-emerald-400" />
              <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest">Writing…</p>
            </div>
          ) : icebreaker ? (
            <div className="space-y-4">
              <p className="text-[13px] text-white/75 leading-relaxed italic">&quot;{icebreaker}&quot;</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(icebreaker); toast.success("Copied") }}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Copy className="size-3" /> Copy
                </button>
                <span className="text-white/10">·</span>
                <button
                  onClick={generateIcebreaker}
                  className="text-[10px] font-black uppercase text-white/30 hover:text-white/50 transition-colors">
                  Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-[11px] text-white/25 mb-5 max-w-[200px] mx-auto leading-normal italic">
                AI writes a personalised hook using this business&apos;s data
              </p>
              <button onClick={generateIcebreaker}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-400 text-black text-[12px] font-black hover:brightness-110 hover:scale-105 active:scale-95 transition-all"
                style={{ boxShadow: "0 0 20px rgba(52,211,153,.3)" }}>
                <Zap className="size-3.5 fill-current" /> Craft Message
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop (expanded only — constrained to content area) */}
      {expanded && (
        <div
          className={`fixed inset-y-0 right-0 z-[90] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${isClosing ? "opacity-0" : "opacity-100"}`}
          style={{ left: "var(--sidebar-w, 0px)" }}
          onClick={initiateClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed bottom-0 right-0 z-[100] flex flex-col transition-all duration-350 ease-out ${isClosing ? "translate-y-full" : "translate-y-0"}`}
        style={{
          left:         "var(--sidebar-w, 0px)",
          height:       expanded ? "80vh" : `${PEEK_H}px`,
          borderRadius: "20px 20px 0 0",
          background:   "rgba(18,20,26,.95)",
          borderTop:    "1px solid rgba(255,255,255,.08)",
          backdropFilter: "blur(20px)",
          boxShadow:    "0 -24px 80px rgba(0,0,0,.7)",
        }}
      >
        {/* Dot grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[.12] rounded-[20px_20px_0_0]"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.08) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* Top edge glow */}
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

        {/* ── Drag handle ── */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none relative z-10 touch-none"
          onPointerDown={onHandleDown}
          onPointerUp={onHandleUp}
        >
          <div className="w-9 h-1 rounded-full bg-white/15 hover:bg-white/25 transition-colors" />
        </div>

        {/* ── Peek header ── */}
        <div className="relative z-10 px-5 py-3 flex items-center gap-3">
          {/* Thumbnail (peek only) */}
          {!expanded && place.photos && place.photos.length > 0 && (
            <div className="size-11 rounded-xl overflow-hidden shrink-0 border border-white/[.08]">
              <img alt=""
                src={`https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=80&maxWidthPx=80&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black text-white/90 leading-tight truncate">{place.displayName.text}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {place.rating && (
                <span className="text-[10px] font-bold text-amber-400">{place.rating}★</span>
              )}
              {place.primaryType && (
                <span className="text-[10px] text-white/30 capitalize">{place.primaryType.replace(/_/g, " ")}</span>
              )}
              {!expanded && (
                <>
                  {(loadingEnrich || !enrichSearched) && <span className="text-[9px] text-white/20 animate-pulse">scanning…</span>}
                  {!(loadingEnrich || !enrichSearched) && discoveredEmails.length > 0 && (
                    <span className="text-[9px] font-bold text-emerald-400/70">{discoveredEmails.length} email{discoveredEmails.length > 1 ? "s" : ""} found</span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick actions visible in peek */}
            <button
              onClick={() => onToggle(place.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
              style={isSelected
                ? { background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)", color: "#34d399" }
                : { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(255,255,255,.55)" }}>
              {isSelected ? <Check className="size-3" /> : <Plus className="size-3" />}
              {isSelected ? "Added" : "Add"}
            </button>
            <button
              onClick={initiateClose}
              className="size-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
              style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)" }}>
              <X className="size-3.5 text-white/40" />
            </button>
          </div>
        </div>

        {/* ── Tab bar (expanded only) ── */}
        {expanded && (
          <div className="relative z-10 px-5 pb-3 flex gap-1.5 border-b border-white/[.05] shrink-0">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={activeTab === tab.id
                  ? { background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)", color: "rgba(255,255,255,.88)" }
                  : { background: "transparent", border: "1px solid transparent", color: "rgba(255,255,255,.28)" }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Tab content ── */}
        {expanded && (
          <div className="relative z-10 flex-1 overflow-y-auto px-5 py-5">
            {activeTab === "overview" && renderOverviewTab()}
            {activeTab === "contact"  && renderContactTab()}
            {activeTab === "audit"    && renderAuditTab()}
            {activeTab === "ai"       && renderAITab()}
          </div>
        )}
      </div>
    </>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PainPoint({
  num,
  text,
  color = "white",
}: {
  num: number
  text: React.ReactNode
  color?: "white" | "emerald"
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`text-[10px] mt-0.5 font-bold shrink-0 ${color === "emerald" ? "text-emerald-400/60" : "text-red-400/60"}`}>
        {num}.
      </span>
      <p className="text-[12px] text-white/60 leading-snug">{text}</p>
    </div>
  )
}
