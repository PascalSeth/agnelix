/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import { 
  Globe, MapPin, ExternalLink, 
  MessageSquare, Gauge, Shield, Cpu, 
  BarChart3, Zap, Loader2, Copy,
  ChevronLeft, ChevronRight, Check, RefreshCw
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import type { Place } from "@/components/lead-analysis-panel"
import type { Lead } from "@/app/generated/prisma/client"
import type { BusinessProfile } from "@/app/api/leads/research/route"

interface AuditData {
  ssl?: boolean
  speed?: number
  pixel?: boolean
  googleAds?: boolean
}

interface ExtendedLead extends Lead {
  nationalPhoneNumber?: string | null
}

export function LeadDetailsClient({ lead: initialLead }: { lead: ExtendedLead }) {
  const [place, setPlace] = useState<Place | null>(null)
  const [loadingPlace, setLoadingPlace] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  
  const [auditData, setAuditData] = useState<AuditData | null>(null)
  const [auditing, setAuditing] = useState(false)
  const [icebreaker, setIcebreaker] = useState("")
  const [socials, setSocials] = useState<string[]>([])
  const [discoveredEmails, setDiscoveredEmails] = useState<string[]>([])
  const [loadingEnrich, setLoadingEnrich] = useState(false)

  // ── Deep Intelligence & Public Roadmap State ──
  const [research, setResearch] = useState<BusinessProfile | null>(null)
  const [loadingResearch, setLoadingResearch] = useState(false)

  useEffect(() => {
    async function fetchMapsAndResearchData() {
      setLoadingPlace(true)
      setPlace(null)
      setSocials([])
      setDiscoveredEmails([])
      setAuditData(null)
      setIcebreaker("")
      setResearch(null)

      try {
        const res = await fetch(`/api/leads/${initialLead.id}/place`)
        if (res.ok) {
          const data: Place = await res.json()
          setPlace(data)
          
          // Trigger enrichment
          if (data.websiteUri) {
            setLoadingEnrich(true)
            fetch('/api/leads/enrich', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: data.websiteUri })
            })
              .then(async r => {
                if (r.ok) {
                  const d = await r.json()
                  if (Array.isArray(d.socials)) setSocials(d.socials)
                  if (Array.isArray(d.emails)) setDiscoveredEmails(d.emails)
                }
              })
              .catch(() => {})
              .finally(() => setLoadingEnrich(false))
          }

          // Trigger Deep Live AI Research (Website crawl, reviews analysis, public roadmap/announcements)
          setLoadingResearch(true)
          fetch('/api/leads/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: data.displayName?.text || initialLead.company || initialLead.firstName || "Company",
              websiteUrl: data.websiteUri || initialLead.website,
              industry: initialLead.industry,
              address: data.formattedAddress,
              rating: data.rating,
              userRatingCount: data.userRatingCount,
              reviews: data.reviews,
            })
          })
            .then(async r => {
              if (r.ok) {
                const d = await r.json()
                if (d.profile) {
                  const p = d.profile as BusinessProfile
                  setResearch(p)
                  if (p.whyNowTrigger) {
                    setIcebreaker(p.whyNowTrigger)
                  }
                }
              }
            })
            .catch(err => console.error("Lead research error:", err))
            .finally(() => setLoadingResearch(false))
        }
      } catch (err) {
        console.error("Failed to sync Maps data", err)
      } finally {
        setLoadingPlace(false)
      }
    }
    fetchMapsAndResearchData()
  }, [initialLead.id])

  async function runAudit() {
    const url = place?.websiteUri || initialLead.website
    if (!url) {
      toast.error("No website found to audit")
      return
    }

    setAuditing(true)
    try {
      const res = await fetch("/api/leads/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAuditData(data)
      toast.success("Technical audit complete")
    } catch {
      toast.error("Could not reach website for audit")
    } finally {
      setAuditing(false)
    }
  }

  async function triggerManualResearch() {
    setLoadingResearch(true)
    try {
      const res = await fetch('/api/leads/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: place?.displayName?.text || initialLead.company || "Company",
          websiteUrl: place?.websiteUri || initialLead.website,
          industry: initialLead.industry,
          address: place?.formattedAddress,
          rating: place?.rating,
          userRatingCount: place?.userRatingCount,
          reviews: place?.reviews,
        })
      })
      const data = await res.json()
      if (data.profile) {
        const p = data.profile as BusinessProfile
        setResearch(p)
        if (p.whyNowTrigger) {
          setIcebreaker(p.whyNowTrigger)
        }
        toast.success("Live intelligence refreshed")
      }
    } catch {
      toast.error("Research failed")
    } finally {
      setLoadingResearch(false)
    }
  }

  // Slider Drag logic
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragStartX(e.clientX)
    setIsDragging(true)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setDragOffset(e.clientX - dragStartX)
  }
  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragOffset < -50 && place?.photos && activePhoto < place.photos.length - 1) setActivePhoto(p => p + 1)
    else if (dragOffset > 50 && activePhoto > 0) setActivePhoto(p => p - 1)
    setDragOffset(0)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Column: Visuals & Intelligence */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Photo Gallery Card */}
        <div className="rounded-3xl overflow-hidden bg-[#1a1c23] border border-white/5 shadow-2xl group/gallery">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Business Photos</h3>
            </div>
            {place?.photos && (
              <div className="flex gap-1">
                {place.photos.slice(0, 5).map((_, i) => (
                  <div key={i} className={`h-1 w-4 rounded-full transition-all ${i === activePhoto ? 'bg-emerald-400' : 'bg-white/10'}`} />
                ))}
              </div>
            )}
          </div>
          
          <div 
            className="h-[360px] relative overflow-hidden bg-black/40 touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {loadingPlace ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <Loader2 className="size-8 animate-spin text-white/10" />
                <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Fetching media...</p>
              </div>
            ) : place?.photos && place.photos.length > 0 ? (
              <div 
                className={`flex h-full ${isDragging ? '' : 'transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)'}`}
                style={{ transform: `translateX(calc(-${activePhoto * 100}% + ${dragOffset}px))` }}
              >
                {place.photos.map((photo, i) => (
                  <img 
                    key={i}
                    src={`https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1000&maxWidthPx=1600&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                    className="w-full h-full object-cover shrink-0 select-none pointer-events-none"
                    alt="Lead business"
                  />
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/10">
                <MapPin className="size-12" />
              </div>
            )}
            
            {/* Nav Arrows */}
            {place?.photos && place.photos.length > 1 && (
              <>
                <button onClick={() => setActivePhoto(p => Math.max(0, p-1))} className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/60 hover:bg-black/60 transition-all">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => setActivePhoto(p => Math.min(place.photos!.length-1, p+1))} className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/60 hover:bg-black/60 transition-all">
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Deep Business Intelligence Dossier */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#1a1c23] p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-4 text-cyan-300" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Deep Lead Intelligence &amp; Multi-Page Live Crawl
              </h3>
            </div>
            <button
              onClick={triggerManualResearch}
              disabled={loadingResearch}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
            >
              <RefreshCw className={`size-3 ${loadingResearch ? "animate-spin" : ""}`} />
              {loadingResearch ? "Investigating..." : "Deep Crawl & Analyze"}
            </button>
          </div>

          {loadingResearch && !research ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/40">
              <Loader2 className="size-6 animate-spin text-cyan-400" />
              <p className="text-[11px] tracking-wide">Crawling multi-page sitemap, scanning public announcements &amp; analyzing reviews...</p>
            </div>
          ) : research ? (
            <div className="space-y-4 text-[12.5px]">
              {/* 1. Core Offering & Pricing */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-white/30">What They Sell &amp; Target ICP</span>
                  {research.pricingTier && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                      {research.pricingTier}
                    </span>
                  )}
                </div>
                <p className="text-white/85 leading-relaxed">{research.whatTheyDo}</p>
                {research.targetCustomers && (
                  <p className="text-[11px] text-white/50">
                    <strong className="text-white/70">Target Audience:</strong> {research.targetCustomers}
                  </p>
                )}
                {research.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {research.specializations.map((spec, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/60">
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Public Roadmap & Announcements ("What they have made publicly known they are coming to do") */}
              {(research.publicRoadmap?.upcomingInitiatives?.length || research.publicRoadmap?.announcements?.length) ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-violet-950/30 border border-indigo-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="size-3 text-indigo-400" /> Public Roadmap &amp; Announcements
                    </span>
                    {research.publicRoadmap?.growthTrajectory && (
                      <span className="text-[9px] font-bold text-indigo-300/80 font-mono">
                        {research.publicRoadmap.growthTrajectory}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {research.publicRoadmap.upcomingInitiatives?.map((init, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11.5px] text-indigo-100 leading-snug">
                        <span className="text-indigo-400 shrink-0 font-bold">📢</span>
                        <span>{init}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 3. Review Sentiment & Critical Friction Points */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-white/30">Customer Reviews &amp; Friction Radar</span>
                  {research.reviewHighlights.overallSentiment && (
                    <span className="text-[9.5px] font-mono text-emerald-300/80">
                      {research.reviewHighlights.overallSentiment} ({place?.rating || "?"}★)
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-[11.5px]">
                  {research.reviewHighlights.praise?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase text-emerald-400/70">What Customers Praise</p>
                      <div className="flex flex-wrap gap-1">
                        {research.reviewHighlights.praise.map((p, i) => (
                          <span key={i} className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {research.reviewHighlights.complaints?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase text-amber-400/70">Customer Complaints / Gaps</p>
                      <div className="flex flex-wrap gap-1">
                        {research.reviewHighlights.complaints.map((c, i) => (
                          <span key={i} className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {research.reviewHighlights.recurringFrictionPoint && (
                  <p className="text-[11px] text-amber-200/80 italic bg-amber-500/[0.06] p-2.5 rounded-xl border border-amber-500/15">
                    <strong>Recurring operational friction:</strong> {research.reviewHighlights.recurringFrictionPoint}
                  </p>
                )}
              </div>

              {/* 4. Strategic Outreach Angles */}
              {research.outreachAngles?.length > 0 && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-sky-400/60">Tailored Conversation Angles</span>
                  <div className="space-y-1.5">
                    {research.outreachAngles.map((angle, i) => (
                      <p key={i} className="text-[11px] text-white/70 leading-snug flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold shrink-0">→</span> {angle}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center text-white/30 text-xs">
              Click &ldquo;Deep Crawl &amp; Analyze&rdquo; above to run real-time research on this company.
            </div>
          )}
        </div>

        {/* Business Identity & Tech Profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white tracking-tight leading-none truncate">
                {place?.displayName?.text || initialLead.company || "Business"}
              </h2>
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
                {initialLead.industry || "General Business"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {place?.websiteUri ? (
                <a 
                  href={place.websiteUri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-400/10 text-sky-400 text-[12px] font-bold hover:bg-sky-400/20 transition-all border border-sky-400/20"
                >
                  <Globe className="size-3.5" />
                  Visit Website
                  <ExternalLink className="size-3 opacity-50" />
                </a>
              ) : (
                <div className="text-[11px] text-white/20 italic font-medium">No website detected</div>
              )}
            </div>
          </div>

          {/* Tech & Infrastructure Profile */}
          <div className="p-6 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-sky-400" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Tech Stack &amp; Infrastructure</h4>
              </div>
              <span className="text-[9px] font-black uppercase text-sky-400/60 font-mono">Live Crawl</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(research?.technicalProfile?.techStack && research.technicalProfile.techStack.length > 0) ? (
                  research.technicalProfile.techStack.map((tech, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10.5px] font-bold text-sky-300">
                      {tech}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-white/60">Modern Web</span>
                    <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-white/60">Responsive</span>
                    {place?.websiteUri?.includes('wordpress') && <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-white/60">WordPress</span>}
                  </>
                )}
              </div>

              {/* Detected Pricing Signals if any */}
              {research?.technicalProfile?.detectedPricing && research.technicalProfile.detectedPricing.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[9px] font-black uppercase text-white/25 mb-1">Pricing Signals Crawled</p>
                  <div className="flex flex-wrap gap-1">
                    {research.technicalProfile.detectedPricing.map((price, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-300">
                        {price}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Outreach Hook & Action */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Outreach Center */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-black/50 to-transparent border border-emerald-500/20 p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">AI &ldquo;Why Now&rdquo; Outreach Hook</h3>
              <p className="text-[11.5px] text-white/40">Grounded directly in multi-page crawl findings and review signals.</p>
            </div>
            <Sparkles className="size-5 text-emerald-400/40" />
          </div>

          <div className="min-h-[140px] rounded-2xl bg-black/60 border border-white/5 p-4 flex flex-col justify-center">
            {loadingResearch ? (
              <div className="flex flex-col items-center gap-2.5 py-4">
                <Loader2 className="size-5 animate-spin text-emerald-400" />
                <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">Synthesizing crawl &amp; reviews...</span>
              </div>
            ) : icebreaker ? (
              <div className="space-y-3.5">
                <p className="text-[12.5px] text-emerald-100/90 leading-relaxed italic">&ldquo;{icebreaker}&rdquo;</p>
                <button 
                  onClick={() => { navigator.clipboard.writeText(icebreaker); toast.success("Copied to clipboard") }}
                  className="flex items-center gap-1.5 text-[10.5px] font-black uppercase text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Copy className="size-3" /> Copy Outreach Hook
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-white/30 text-center py-4 italic">No hook generated yet. Run research to synthesize.</p>
            )}
          </div>
        </div>

        {/* Technical Audit Card */}
        <div className="p-6 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-sky-400" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Technical Health Audit</h4>
            </div>
            <button
              onClick={runAudit}
              disabled={auditing}
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              {auditing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              {auditing ? "Scanning..." : "Run Tech Scan"}
            </button>
          </div>

          {auditData ? (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-white/50">SSL Certificate</span>
                <span className={auditData.ssl ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {auditData.ssl ? "✓ Secure" : "✕ Missing"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-white/50">Mobile Speed</span>
                <span className="text-white font-bold">{auditData.speed ?? "N/A"}/100</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-white/30 italic">Click &ldquo;Run Tech Scan&rdquo; to test page speed and tracking pixels.</p>
          )}
        </div>
      </div>
    </div>
  )
}
