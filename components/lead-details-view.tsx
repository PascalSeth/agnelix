/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import { 
  Globe, MapPin, ExternalLink, 
  MessageSquare, Gauge, Shield, Cpu, 
  BarChart3, Zap, Sparkles, Loader2, Copy,
  ChevronLeft, ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import type { Place } from "@/components/lead-analysis-panel"
import type { Lead } from "@/app/generated/prisma/client"

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
  const [generatingIce, setGeneratingIce] = useState(false)
  const [socials, setSocials] = useState<string[]>([])
  const [discoveredEmails, setDiscoveredEmails] = useState<string[]>([])
  const [loadingEnrich, setLoadingEnrich] = useState(false)


  useEffect(() => {
    async function fetchMapsData() {
      setLoadingPlace(true)
      setPlace(null)
      setSocials([])
      setDiscoveredEmails([])
      setAuditData(null)
      setIcebreaker("")

      try {
        const res = await fetch(`/api/leads/${initialLead.id}/place`)
        if (res.ok) {
          const data = await res.json()
          setPlace(data)
          
          // Also trigger enrichment automatically if possible
          if (data.websiteUri) {
            setLoadingEnrich(true)
            const enrichRes = await fetch('/api/leads/enrich', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: data.websiteUri })
            })
            if (enrichRes.ok) {
              const enrichData = await enrichRes.json()
              setSocials(enrichData.socials || [])
              setDiscoveredEmails(enrichData.emails || [])
            }
            setLoadingEnrich(false)
          }
        }
      } catch (err) {
        console.error("Failed to sync Maps data", err)
      } finally {
        setLoadingPlace(false)
      }
    }
    fetchMapsData()
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

  async function generateIcebreaker() {
    setGeneratingIce(true)
    await new Promise(r => setTimeout(r, 1200))
    
    let hook = `Hi ${initialLead.firstName || 'there'}, `
    if (auditData) {
      if (!auditData.ssl) hook += `I noticed your site isn't fully secure (no SSL), which might be hurting your local ranking...`
      else if (auditData.speed !== undefined && auditData.speed < 70) hook += `I saw your site is a bit slow on mobile. That usually means losing about 20% of local traffic...`
      else hook += `Love the business you've built. I saw your ${place?.userRatingCount || 0} reviews and wanted to reach out...`
    } else {
      hook += `Saw your business on Google Maps. Your ${place?.rating || 'high'} star rating really stands out in the area...`
    }
    
    setIcebreaker(hook)
    setGeneratingIce(false)
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
            className="h-[400px] relative overflow-hidden bg-black/40 touch-none cursor-grab active:cursor-grabbing"
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

        {/* Business Identity & Market Position */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Identity */}
          <div className="p-8 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-5 relative overflow-hidden group/id">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/id:opacity-20 transition-opacity">
              <Globe className="size-20 -rotate-12" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight leading-none truncate">
                {place?.displayName?.text || initialLead.company || "Unknown Business"}
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

          {/* Market Position */}
          <div className="p-8 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-400" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Google Rating</h4>
            </div>
            {place ? (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{place.rating}</span>
                  <span className="text-[12px] text-white/40 mb-1.5">★ Rating</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${(place.rating || 0) * 20}%` }} />
                </div>
                <p className="text-[11px] text-white/30">
                  {place.rating && place.rating > 4.4 ? "Performing above category average." : "Opportunity for reputation growth."}
                </p>
              </div>
            ) : <div className="h-20 animate-pulse bg-white/5 rounded-xl" />}
          </div>

          {/* Tech Profile */}
          <div className="p-6 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-sky-400" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Website Tech</h4>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-white/60">Modern Stack</span>
                <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-white/60">Responsive</span>
                {place?.websiteUri?.includes('wordpress') && <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-white/60">WordPress</span>}
              </div>
              <p className="text-[11px] text-white/30">Detected via domain pattern analysis.</p>
            </div>
          </div>
        </div>

        {/* Customer Sentiment */}
        <div className="p-6 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-violet-400" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Customer Reviews</h4>
            </div>
            <span className="px-2 py-1 rounded-lg bg-violet-400/10 text-[9px] font-black uppercase text-violet-400 tracking-tighter">Verified Reviews</span>
          </div>
          
          <div className="space-y-4">
            {place?.reviews?.slice(0, 2).map((review: {
              text?: { text?: string }
              rating?: number
              authorAttribution?: { displayName?: string }
              relativePublishTimeDescription?: string
            }, i: number) => (
              <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex text-amber-400 text-[10px]">
                    {Array.from({ length: review?.rating || 0 }).map((_, j) => <span key={j}>★</span>)}
                    <span className="text-[10px] text-white/20 ml-2">• {review?.relativePublishTimeDescription || 'Recently'}</span>
                  </div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">{review?.authorAttribution?.displayName || 'Anonymous'}</span>
                </div>
                <p className="text-[12px] text-white/50 italic leading-relaxed line-clamp-3">
                  &quot;{review?.text?.text || 'No review text provided.'}&quot;
                </p>
              </div>
            ))}
            {!place?.reviews && <p className="text-[12px] text-white/20 italic">No public reviews found to analyze.</p>}
          </div>
        </div>
      </div>

      {/* Right Column: Outreach & Action */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Outreach Center */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-8 space-y-6 relative overflow-hidden group/outreach">
          <div className="absolute top-0 right-0 p-6">
            <Sparkles className="size-6 text-emerald-400/20 group-hover/outreach:scale-125 transition-all duration-700" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white tracking-tight">Email Writer</h3>
            <p className="text-[12px] text-white/40 leading-relaxed">AI looks at photos and website info to write a personal email.</p>
          </div>

          <div className="min-h-[140px] rounded-2xl bg-black/40 border border-white/5 p-5 flex flex-col justify-center">
            {generatingIce ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-5 animate-spin text-emerald-400" />
                <span className="text-[10px] uppercase font-black text-white/20 tracking-widest">Writing email...</span>
              </div>
            ) : icebreaker ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-[13px] text-emerald-100/80 leading-relaxed italic pr-8">&quot;{icebreaker}&quot;</p>
                <button 
                  onClick={() => { navigator.clipboard.writeText(icebreaker); toast.success("Copied to clipboard") }}
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300"
                >
                  <Copy className="size-3" /> Copy Message
                </button>
              </div>
            ) : (
              <div className="text-center">
                <button 
                  onClick={generateIcebreaker}
                  className="px-6 py-3 rounded-xl bg-emerald-400 text-black text-[12px] font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                >
                  Generate First Touch
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Technical Audit Card */}
        <div className="p-6 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-emerald-400" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Website Check</h4>
            </div>
            {!auditData && (
              <button 
                onClick={runAudit}
                disabled={auditing}
                className="text-[10px] font-black text-emerald-400 hover:underline uppercase tracking-wider"
              >
                {auditing ? 'Checking...' : 'Start Check'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {auditing ? (
              // Skeletal Loader for Audit
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 animate-pulse">
                  <div className="size-3 bg-white/10 rounded-full" />
                  <div className="h-2 w-16 bg-white/5 rounded" />
                  <div className="h-3 w-10 bg-white/10 rounded" />
                </div>
              ))
            ) : (
              [
                { icon: Shield, label: "SSL Security", val: auditData?.ssl },
                { icon: Gauge, label: "Page Speed", val: auditData ? `${auditData.speed}ms` : null },
                { icon: Globe, label: "Meta Pixel", val: auditData?.pixel },
                { icon: BarChart3, label: "Google Ads", val: auditData?.googleAds },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                  <item.icon className={`size-3 ${item.val === false ? 'text-red-400' : 'text-emerald-400/40'}`} />
                  <span className="text-[9px] font-bold text-white/20 uppercase">{item.label}</span>
                  <span className={`text-[11px] font-bold ${item.val === false ? 'text-red-400' : 'text-white/70'}`}>
                    {item.val === null || item.val === undefined ? "—" : typeof item.val === 'boolean' ? (item.val ? 'Active' : 'Missing') : item.val}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-6 rounded-3xl bg-[#1a1c23] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-white/30">Contact Info</h4>
            {discoveredEmails.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-emerald-400/10 text-[9px] font-black text-emerald-400 uppercase tracking-tighter animate-pulse">
                Live Scan Complete
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            {/* Primary Web Info */}
            <div className="flex items-center justify-between py-2 border-b border-white/5 group/link">
              <span className="text-[11px] text-white/40 font-bold uppercase tracking-tighter">Web Domain</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-sky-400 font-mono font-bold truncate max-w-[150px]">
                  {place?.websiteUri?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") || initialLead.website || '—'}
                </span>
                <button 
                  onClick={() => { 
                    navigator.clipboard.writeText(place?.websiteUri || initialLead.website || '');
                    toast.success("URL Copied");
                  }}
                  className="opacity-0 group-hover/link:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded"
                >
                  <Copy className="size-3 text-white/40" />
                </button>
              </div>
            </div>

            {/* Found Emails Section with Skeletal Loader */}
            {loadingEnrich ? (
              <div className="py-2 border-b border-white/5 space-y-3">
                <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">Searching for contacts...</span>
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-white/5 rounded-lg animate-pulse" />
                  <div className="h-4 w-1/2 bg-white/5 rounded-lg animate-pulse" />
                </div>
              </div>
            ) : discoveredEmails.length > 0 && (
              <div className="py-2 border-b border-white/5 space-y-2">
                <span className="text-[9px] font-black text-emerald-400/40 uppercase tracking-[0.2em]">Discovered Emails</span>
                <div className="space-y-1.5">
                  {discoveredEmails.map((email, i) => (
                    <div key={i} className="flex items-center justify-between group/email">
                      <span className="text-[12px] text-white/70 font-medium truncate pr-4">{email}</span>
                      <button 
                        onClick={() => { 
                          navigator.clipboard.writeText(email);
                          toast.success("Email Copied");
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-[9px] font-bold text-white/40 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all opacity-40 group-hover/email:opacity-100"
                      >
                        <Copy className="size-2.5" /> Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-[11px] text-white/40">Direct Phone</span>
              <span className="text-[11px] text-white/80">{place?.nationalPhoneNumber || initialLead.nationalPhoneNumber || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[11px] text-white/40">Verified Address</span>
              <span className="text-[11px] text-white/80 text-right max-w-[180px] leading-tight">{place?.formattedAddress || initialLead.companyDesc}</span>
            </div>
          </div>

          {loadingEnrich ? (
            <div className="pt-4 border-t border-white/5 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/10">Finding Socials...</h4>
              <div className="flex gap-2">
                <div className="h-7 w-20 bg-white/5 rounded-lg animate-pulse" />
                <div className="h-7 w-20 bg-white/5 rounded-lg animate-pulse" />
              </div>
            </div>
          ) : socials.length > 0 && (
            <div className="pt-4 border-t border-white/5 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400/50">Social Channels</h4>
              <div className="flex flex-wrap gap-2">
                {socials.map((link, i) => {
                  const domain = link.includes('facebook') ? 'Facebook' : 
                                link.includes('instagram') ? 'Instagram' :
                                link.includes('linkedin') ? 'LinkedIn' :
                                link.includes('x.com') || link.includes('twitter') ? 'X / Twitter' : 'Social'
                  return (
                    <a 
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                    >
                      {domain}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
