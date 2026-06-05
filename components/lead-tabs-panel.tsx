"use client"

import { useState, useEffect } from "react"
import {
  MapPin, Globe, Shield, Gauge, Eye, MousePointerClick,
  MessageSquare, Clock, XCircle, Mail, Star, Phone,
  Loader2, Copy, RefreshCw, ExternalLink, FileText,
  Smartphone, TrendingUp, ShoppingBag, Zap, BarChart3,
  ChevronLeft, ChevronRight, Sparkles, Users, Check,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

type Photo = { name: string }
type Review = {
  text?: { text: string }
  rating?: number
  authorAttribution?: { displayName: string }
  relativePublishTimeDescription?: string
}
type PlaceData = {
  displayName?: { text: string }
  formattedAddress?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
  photos?: Photo[]
  reviews?: Review[]
  editorialSummary?: { text: string }
  primaryType?: string
}
type AuditResult = {
  ssl: boolean; speed: number; pixel: boolean
  googleAds: boolean; googleAnalytics: boolean
  googleTagManager: boolean; wordpress: boolean
  shopify: boolean; mobile?: boolean
  noH1: boolean; noMetaDesc: boolean; title: string
}
type Contact = {
  email: string; name: string | null; firstName: string | null
  lastName: string | null; title: string | null
  confidence: number; isDecisionMaker: boolean
}
export type EmailRecord = {
  id: string; subject: string; body: string; stepNumber: number
  status: string; sentAt: string | null; openCount: number; clickCount: number
}
export type ReplyRecord = {
  id: string; fromEmail: string; subject: string | null
  body: string; receivedAt: string
}

type Tab = "overview" | "contact" | "audit" | "emails" | "replies"

// ── Email status map ───────────────────────────────────────────────────────────

const ES: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  SENT:      { icon: Mail,              color: "text-white/40",    label: "Sent"      },
  DELIVERED: { icon: Mail,              color: "text-white/40",    label: "Delivered" },
  OPENED:    { icon: Eye,               color: "text-emerald-400", label: "Opened"    },
  CLICKED:   { icon: MousePointerClick, color: "text-sky-400",     label: "Clicked"   },
  REPLIED:   { icon: MessageSquare,     color: "text-violet-400",  label: "Replied"   },
  QUEUED:    { icon: Clock,             color: "text-sky-400/60",  label: "Queued"    },
  BOUNCED:   { icon: XCircle,           color: "text-red-400",     label: "Bounced"   },
  FAILED:    { icon: XCircle,           color: "text-red-400",     label: "Failed"    },
}

// ── Photo carousel ─────────────────────────────────────────────────────────────

function PhotoCarousel({ photos }: { photos: Photo[] }) {
  const [idx, setIdx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [offsetX, setOffsetX] = useState(0)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <div
      className="relative rounded-xl overflow-hidden select-none"
      style={{ height: 200, background: "rgba(0,0,0,.3)" }}
    >
      <div
        className={`flex h-full cursor-grab active:cursor-grabbing ${dragging ? "" : "transition-transform duration-400"}`}
        style={{ transform: `translateX(calc(-${idx * 100}% + ${offsetX}px))` }}
        onPointerDown={e => { setDragging(true); setStartX(e.clientX) }}
        onPointerMove={e => { if (dragging) setOffsetX(e.clientX - startX) }}
        onPointerUp={() => {
          setDragging(false)
          if (offsetX < -50 && idx < photos.length - 1) setIdx(p => p + 1)
          else if (offsetX > 50 && idx > 0) setIdx(p => p - 1)
          setOffsetX(0)
        }}
        onPointerLeave={() => { if (dragging) { setDragging(false); setOffsetX(0) } }}
      >
        {photos.map((p, i) => (
          <img
            key={i}
            src={`https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=600&maxWidthPx=900&key=${apiKey}`}
            className="w-full h-full object-cover shrink-0 pointer-events-none"
            alt=""
          />
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            onClick={() => setIdx(p => Math.max(0, p - 1))}
            disabled={idx === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full disabled:opacity-20 transition-opacity"
            style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
          >
            <ChevronLeft className="size-3.5 text-white" />
          </button>
          <button
            onClick={() => setIdx(p => Math.min(photos.length - 1, p + 1))}
            disabled={idx === photos.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full disabled:opacity-20 transition-opacity"
            style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
          >
            <ChevronRight className="size-3.5 text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.slice(0, 8).map((_, i) => (
              <div
                key={i}
                onClick={() => setIdx(i)}
                className="cursor-pointer rounded-full transition-all"
                style={{
                  width: i === idx ? 14 : 5, height: 5,
                  background: i === idx ? "white" : "rgba(255,255,255,.35)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Shared card style ──────────────────────────────────────────────────────────

const card = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.06)",
}

// ── CopyButton ─────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-white/30 hover:text-white/60 transition-colors shrink-0"
      style={{ background: "rgba(255,255,255,.04)" }}
    >
      {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
    </button>
  )
}

// ── Overview tab ───────────────────────────────────────────────────────────────

function OverviewTab({ place, loading }: { place: PlaceData | null; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-5 animate-spin text-white/20" />
        <p className="text-[11px] text-white/25">Loading business data…</p>
      </div>
    </div>
  )

  if (!place) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <MapPin className="size-8 text-white/10" />
      <p className="text-[12px] font-semibold text-white/25">No Google Maps data</p>
      <p className="text-[11px] text-white/15">This lead wasn't imported from Maps or has no place ID</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Photos */}
      {place.photos && place.photos.length > 0 && (
        <PhotoCarousel photos={place.photos} />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {place.rating !== undefined && (
          <div className="rounded-xl p-4 space-y-1.5" style={card}>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-widest flex items-center gap-1">
              <Star className="size-2.5 text-amber-400/60" /> Rating
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white/90">{place.rating}</span>
              <span className="text-[11px] text-white/30">/ 5</span>
            </div>
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
              <div className="h-full rounded-full bg-amber-400/70" style={{ width: `${(place.rating / 5) * 100}%` }} />
            </div>
            <p className="text-[10px] text-white/25">{place.userRatingCount?.toLocaleString()} reviews</p>
          </div>
        )}

        {place.formattedAddress && (
          <div className="rounded-xl p-4 space-y-1.5" style={card}>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-widest flex items-center gap-1">
              <MapPin className="size-2.5" /> Address
            </p>
            <p className="text-[11px] text-white/65 leading-snug">{place.formattedAddress}</p>
          </div>
        )}
      </div>

      {/* Editorial summary */}
      {place.editorialSummary?.text && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.015)", border: "1px solid rgba(255,255,255,.05)" }}>
          <p className="text-[12px] text-white/50 italic leading-relaxed">&ldquo;{place.editorialSummary.text}&rdquo;</p>
        </div>
      )}

      {/* Reviews */}
      {place.reviews && place.reviews.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-black text-white/25 uppercase tracking-widest flex items-center gap-1.5">
            <MessageSquare className="size-3" /> Customer Reviews
          </p>
          {place.reviews.slice(0, 3).map((r, i) => (
            <div key={i} className="rounded-xl p-4" style={card}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-px">
                  {Array.from({ length: 5 }, (_, j) => (
                    <span key={j} className={`text-[10px] ${j < (r.rating ?? 0) ? "text-amber-400" : "text-white/10"}`}>★</span>
                  ))}
                </div>
                <span className="text-[9px] text-white/25">
                  {r.authorAttribution?.displayName} · {r.relativePublishTimeDescription}
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed line-clamp-3 italic">
                &ldquo;{r.text?.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Website */}
      {place.websiteUri && (
        <a
          href={place.websiteUri}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
          style={{ background: "rgba(125,211,252,.05)", border: "1px solid rgba(125,211,252,.1)" }}
        >
          <Globe className="size-3.5" />
          {new URL(place.websiteUri).hostname.replace(/^www\./, "")}
          <ExternalLink className="size-3 opacity-50" />
        </a>
      )}
    </div>
  )
}

// ── Contact tab ────────────────────────────────────────────────────────────────

interface ContactTabProps {
  leadEmail: string
  place: PlaceData | null
  contacts: Contact[]
  contactsLoading: boolean
  contactsDone: boolean
  socials: string[]
  socialsLoading: boolean
  socialsDone: boolean
  website: string | null | undefined
  onRefreshContacts: () => void
  onLoadSocials: () => void
}

function ContactTab({
  leadEmail, place, contacts, contactsLoading, contactsDone,
  socials, socialsLoading, socialsDone, website,
  onRefreshContacts, onLoadSocials,
}: ContactTabProps) {
  return (
    <div className="space-y-5">
      {/* Stored email */}
      <div className="rounded-xl p-4" style={card}>
        <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Stored Email</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-white/80 font-mono truncate">{leadEmail}</span>
          <CopyBtn text={leadEmail} />
        </div>
      </div>

      {/* Phone from Maps */}
      {place?.nationalPhoneNumber && (
        <div className="rounded-xl p-4" style={card}>
          <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Phone className="size-2.5" /> Phone
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-white/70">{place.nationalPhoneNumber}</span>
            <CopyBtn text={place.nationalPhoneNumber} />
          </div>
        </div>
      )}

      {/* Contacts from website */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <Users className="size-3" /> Website Contacts
          </p>
          {contactsDone && (
            <button
              onClick={onRefreshContacts}
              className="flex items-center gap-1 text-[10px] font-bold text-sky-400/60 hover:text-sky-400 transition-colors"
            >
              <RefreshCw className="size-3" /> Refresh
            </button>
          )}
        </div>

        {!website ? (
          <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <p className="text-[11px] text-white/25">No website — can't scan for contacts</p>
          </div>
        ) : contactsLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3 animate-pulse" style={{ background: "rgba(255,255,255,.03)" }}>
                <div className="size-8 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-28 bg-white/5 rounded" />
                  <div className="h-2 w-44 bg-white/5 rounded" />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-sky-400/50 uppercase tracking-widest font-bold animate-pulse px-1">
              Scanning domain footprints…
            </p>
          </div>
        ) : contactsDone && contacts.length === 0 ? (
          <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <p className="text-[11px] text-white/25">No contacts found on website</p>
          </div>
        ) : contacts.length > 0 ? (
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: c.isDecisionMaker ? "rgba(52,211,153,.04)" : "rgba(255,255,255,.02)",
                  border: c.isDecisionMaker ? "1px solid rgba(52,211,153,.12)" : "1px solid rgba(255,255,255,.05)",
                }}
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white/50"
                  style={{ background: "rgba(255,255,255,.06)" }}
                >
                  {(c.name?.[0] ?? c.email[0]).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {c.name && <p className="text-[12px] font-semibold text-white/75 truncate">{c.name}</p>}
                  <p className="text-[11px] text-white/45 font-mono truncate">{c.email}</p>
                  {c.title && <p className="text-[10px] text-white/25 truncate">{c.title}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.isDecisionMaker && (
                    <span
                      className="text-[8px] font-black uppercase tracking-wide text-emerald-400 px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(52,211,153,.1)" }}
                    >
                      DM
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-white/20">{c.confidence}%</span>
                  <CopyBtn text={c.email} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Socials */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Social Links</p>
          {!socialsDone && website && (
            <button
              onClick={onLoadSocials}
              disabled={socialsLoading}
              className="flex items-center gap-1 text-[10px] font-bold text-white/30 hover:text-white/60 disabled:opacity-40 transition-colors"
            >
              {socialsLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              {socialsLoading ? "Scanning…" : "Find socials"}
            </button>
          )}
        </div>

        {socials.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {socials.map((link, i) => {
              const label = link.includes("facebook") ? "Facebook"
                : link.includes("instagram") ? "Instagram"
                : link.includes("linkedin") ? "LinkedIn"
                : link.includes("twitter") || link.includes("x.com") ? "X / Twitter"
                : link.includes("youtube") ? "YouTube"
                : link.includes("tiktok") ? "TikTok"
                : "Social"
              return (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
                >
                  {label}
                  <ExternalLink className="size-2.5 opacity-50" />
                </a>
              )
            })}
          </div>
        ) : socialsDone ? (
          <p className="text-[11px] text-white/20 px-1">No social links found</p>
        ) : null}
      </div>
    </div>
  )
}

// ── Audit tab ──────────────────────────────────────────────────────────────────

interface AuditTabProps {
  audit: AuditResult | null
  auditLoading: boolean
  auditDone: boolean
  website: string | null | undefined
  onRunAudit: () => void
}

function AuditTab({ audit, auditLoading, auditDone, website, onRunAudit }: AuditTabProps) {
  if (!website) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <Globe className="size-8 text-white/10" />
      <p className="text-[12px] text-white/25">No website to audit</p>
    </div>
  )

  const hostname = (() => { try { return new URL(website).hostname.replace(/^www\./, "") } catch { return website } })()

  const CHECKS = audit ? [
    { label: "SSL",              icon: Shield,      good: audit.ssl,            val: audit.ssl ? "Active" : "Missing" },
    { label: "Page speed",       icon: Gauge,       speed: true,                val: `${(audit.speed / 1000).toFixed(1)}s` },
    { label: "Mobile",           icon: Smartphone,  good: audit.mobile,         val: audit.mobile ? "Optimised" : "Issues" },
    { label: "Facebook Pixel",   icon: Zap,         good: audit.pixel,          val: audit.pixel ? "Active" : "Missing" },
    { label: "Google Analytics", icon: BarChart3,   good: audit.googleAnalytics,val: audit.googleAnalytics ? "Active" : "Missing" },
    { label: "Google Ads",       icon: TrendingUp,  good: audit.googleAds,      val: audit.googleAds ? "Active" : "Not found" },
    { label: "WordPress",        icon: Globe,       neutral: true,              val: audit.wordpress ? "Detected" : "Not detected" },
    { label: "Shopify",          icon: ShoppingBag, neutral: true,              val: audit.shopify ? "Detected" : "Not detected" },
    { label: "Meta description", icon: FileText,    good: !audit.noMetaDesc,    val: !audit.noMetaDesc ? "Present" : "Missing" },
  ] as const : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/35 font-mono truncate">{hostname}</p>
        <button
          onClick={onRunAudit}
          disabled={auditLoading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white/40 hover:text-white/70 disabled:opacity-40 transition-colors"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          {auditLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          {auditLoading ? "Checking…" : auditDone ? "Re-run" : "Run Audit"}
        </button>
      </div>

      {auditLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse space-y-2.5" style={{ background: "rgba(255,255,255,.03)" }}>
              <div className="size-4 rounded-full bg-white/5" />
              <div className="h-2 w-20 bg-white/5 rounded" />
              <div className="h-3 w-14 bg-white/8 rounded" />
            </div>
          ))}
        </div>
      ) : audit ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CHECKS.map((item) => {
            const itemAny = item as any
            const speedGood = itemAny.speed
              ? audit.speed < 2000 ? true : audit.speed < 4000 ? null : false
              : null
            const isGood = itemAny.speed ? speedGood
              : itemAny.neutral ? null
              : itemAny.good === true ? true
              : itemAny.good === false ? false
              : null

            return (
              <div
                key={item.label}
                className="rounded-xl p-4 space-y-2"
                style={{
                  background: isGood === true ? "rgba(52,211,153,.04)" : isGood === false ? "rgba(239,68,68,.04)" : "rgba(255,255,255,.02)",
                  border: isGood === true ? "1px solid rgba(52,211,153,.1)" : isGood === false ? "1px solid rgba(239,68,68,.1)" : "1px solid rgba(255,255,255,.05)",
                }}
              >
                <item.icon className={`size-3.5 ${isGood === true ? "text-emerald-400" : isGood === false ? "text-red-400" : "text-white/20"}`} />
                <p className="text-[9px] font-black text-white/25 uppercase tracking-wide">{item.label}</p>
                <p className={`text-[12px] font-bold ${isGood === true ? "text-emerald-400" : isGood === false ? "text-red-400" : "text-white/40"}`}>
                  {item.val}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <Zap className="size-8 text-white/10" />
          <p className="text-[12px] text-white/30">Run the audit to check this website's health</p>
          <p className="text-[11px] text-white/15">Checks SSL, speed, mobile, pixels, analytics and more</p>
        </div>
      )}
    </div>
  )
}

// ── Emails tab ─────────────────────────────────────────────────────────────────

function EmailsTab({ emails }: { emails: EmailRecord[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (emails.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <Mail className="size-8 text-white/10" />
      <p className="text-[12px] text-white/25">No emails sent yet</p>
      <p className="text-[11px] text-white/15">Emails appear here once the campaign starts sending</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {emails.map(e => {
        const { icon: Icon, color, label } = ES[e.status] ?? ES.SENT
        const isExpanded = expanded === e.id
        return (
          <div
            key={e.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : e.id)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[.015] transition-colors"
            >
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white/40"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
              >
                {e.stepNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white/75 truncate">{e.subject}</p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {e.sentAt ? formatDate(e.sentAt) : "Queued"}
                  {e.openCount > 0 && ` · ${e.openCount} open${e.openCount !== 1 ? "s" : ""}`}
                  {e.clickCount > 0 && ` · ${e.clickCount} click${e.clickCount !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Icon className={`size-3.5 ${color}`} />
                <span className={`text-[10px] font-bold ${color}`}>{label}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0">
                <div className="rounded-lg p-4" style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(255,255,255,.04)" }}>
                  <pre className="text-[12px] text-white/50 leading-relaxed whitespace-pre-wrap font-sans" style={{ maxHeight: 240, overflowY: "auto" }}>
                    {e.body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Replies tab ────────────────────────────────────────────────────────────────

function RepliesTab({ replies }: { replies: ReplyRecord[] }) {
  return (
    <div className="space-y-4">
      {replies.map(r => (
        <div
          key={r.id}
          className="rounded-xl p-4 space-y-2"
          style={{ background: "rgba(167,139,250,.04)", border: "1px solid rgba(167,139,250,.1)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold text-violet-300/70">{r.fromEmail}</p>
            <p className="text-[10px] text-white/25">
              {new Date(r.receivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          {r.subject && <p className="text-[12px] font-semibold text-white/55">{r.subject}</p>}
          <p className="text-[12px] text-white/50 leading-relaxed whitespace-pre-wrap">{r.body}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

interface Props {
  leadId: string
  leadEmail: string
  leadWebsite: string | null
  leadCompany: string | null
  emails: EmailRecord[]
  replies: ReplyRecord[]
}

export function LeadTabsPanel({ leadId, leadEmail, leadWebsite, leadCompany, emails, replies }: Props) {
  const [tab, setTab] = useState<Tab>("overview")

  const [place, setPlace]             = useState<PlaceData | null>(null)
  const [placeLoading, setPlaceLoading] = useState(true)

  const [contacts, setContacts]             = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsDone, setContactsDone]       = useState(false)

  const [socials, setSocials]               = useState<string[]>([])
  const [socialsLoading, setSocialsLoading] = useState(false)
  const [socialsDone, setSocialsDone]       = useState(false)

  const [audit, setAudit]               = useState<AuditResult | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditDone, setAuditDone]       = useState(false)

  useEffect(() => {
    fetch(`/api/leads/${leadId}/place`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setPlace(d))
      .catch(() => {})
      .finally(() => setPlaceLoading(false))
  }, [leadId])

  const website = place?.websiteUri || leadWebsite

  useEffect(() => {
    if (tab !== "contact" || contactsDone || contactsLoading || !website) return
    doContactSearch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, website])

  useEffect(() => {
    if (tab !== "audit" || auditDone || auditLoading || !website) return
    doAudit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, website])

  async function doContactSearch() {
    if (!website) return
    setContactsLoading(true)
    try {
      const res = await fetch("/api/leads/contact-search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: website, companyName: leadCompany ?? "" }),
      })
      if (res.ok) setContacts((await res.json()).contacts ?? [])
    } catch { /* silent */ }
    finally { setContactsLoading(false); setContactsDone(true) }
  }

  async function doEnrich() {
    if (!website) return
    setSocialsLoading(true)
    try {
      const res = await fetch("/api/leads/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
      })
      if (res.ok) setSocials((await res.json()).socials ?? [])
    } catch { /* silent */ }
    finally { setSocialsLoading(false); setSocialsDone(true) }
  }

  async function doAudit() {
    if (!website) { toast.error("No website to audit"); return }
    setAuditLoading(true)
    setAudit(null)
    try {
      const res = await fetch("/api/leads/audit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
      })
      if (res.ok) setAudit(await res.json())
      else toast.error("Audit failed")
    } catch { toast.error("Could not reach website") }
    finally { setAuditLoading(false); setAuditDone(true) }
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "contact",  label: "Contact"  },
    { id: "audit",    label: "Audit"    },
    { id: "emails",   label: "Emails",  count: emails.length  },
    ...(replies.length > 0 ? [{ id: "replies" as Tab, label: "Replies", count: replies.length }] : []),
  ]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,.07)" }}>
      {/* Tab bar */}
      <div
        className="flex"
        style={{ borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.015)" }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-5 py-3.5 text-[12px] font-bold transition-all"
            style={{
              color: tab === t.id ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.3)",
              borderBottom: tab === t.id ? "2px solid rgba(255,255,255,.5)" : "2px solid transparent",
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className="rounded-full px-1.5 py-px text-[9px] font-black"
                style={{
                  background: tab === t.id ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)",
                  color: "rgba(255,255,255,.4)",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {tab === "overview" && <OverviewTab place={place} loading={placeLoading} />}
        {tab === "contact" && (
          <ContactTab
            leadEmail={leadEmail}
            place={place}
            contacts={contacts}
            contactsLoading={contactsLoading}
            contactsDone={contactsDone}
            socials={socials}
            socialsLoading={socialsLoading}
            socialsDone={socialsDone}
            website={website}
            onRefreshContacts={() => { setContactsDone(false); doContactSearch() }}
            onLoadSocials={doEnrich}
          />
        )}
        {tab === "audit" && (
          <AuditTab
            audit={audit}
            auditLoading={auditLoading}
            auditDone={auditDone}
            website={website}
            onRunAudit={doAudit}
          />
        )}
        {tab === "emails"  && <EmailsTab emails={emails} />}
        {tab === "replies" && <RepliesTab replies={replies} />}
      </div>
    </div>
  )
}
