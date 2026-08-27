/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities, react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import {
  MapPin, Globe, Shield, Gauge, Eye, MousePointerClick,
  MessageSquare, Clock, XCircle, Mail, Star, Phone,
  Loader2, Copy, RefreshCw, ExternalLink, FileText,
  Smartphone, TrendingUp, ShoppingBag, Zap, BarChart3,
  ChevronLeft, ChevronRight, ChevronDown, Users, Check,
  Lightbulb, Target, Swords, NotebookPen, Trash2, Send,
  Newspaper, Flame, UserPlus, Briefcase, Rocket, Cpu,
  AlertTriangle,
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { parseCompetitorAnalysis } from "@/lib/competitor-utils"
import type { LinkedInDecisionMaker } from "@/app/api/leads/linkedin-search/route"
import type { BusinessProfile } from "@/app/api/leads/research/route"
import type { BuyingSignals } from "@/lib/buying-signals"

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

type Tab = "overview" | "contact" | "audit" | "intel" | "emails" | "replies"

// ── Email status map ───────────────────────────────────────────────────────────

const ES: Record<string, { icon: React.ElementType<{ className?: string }>; color: string; label: string }> = {
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
  linkedinProfiles: LinkedInDecisionMaker[]
  linkedinLoading: boolean
  onRefreshLinkedIn: () => void
}

function ContactTab({
  leadEmail, place, contacts, contactsLoading, contactsDone,
  socials, socialsLoading, socialsDone, website,
  onRefreshContacts, onLoadSocials, linkedinProfiles,
  linkedinLoading, onRefreshLinkedIn,
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
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
            <Users className="size-3" /> Website Contacts
            {contactsDone && !contactsLoading && contacts.length > 0 && (
              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 px-1.5 py-0.25 rounded lowercase">saved in db</span>
            )}
          </p>
          <button
            onClick={onRefreshContacts}
            disabled={contactsLoading}
            className="flex items-center gap-1 text-[10px] font-bold text-sky-400/60 hover:text-sky-400 transition-colors"
          >
            {contactsLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            {contactsLoading ? "Scanning…" : contactsDone ? "Refresh" : "Scan"}
          </button>
        </div>

        {!website ? (
          <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <p className="text-[11px] text-white/25">No website — can&apos;t scan for contacts</p>
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
        ) : contacts.length === 0 ? (
          <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <p className="text-[11px] text-white/25">
              {contactsDone ? "No contacts found on website" : "No contacts in database"}
            </p>
          </div>
        ) : (
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
        )}
      </div>

      {/* LinkedIn Decision Makers */}
      <div className="space-y-3 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,.05)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
            <svg className="size-3 text-sky-400 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            LinkedIn Decision Makers
            {!linkedinLoading && linkedinProfiles.length > 0 && (
              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 px-1.5 py-0.25 rounded lowercase">saved in db</span>
            )}
          </p>
          <button
            onClick={onRefreshLinkedIn}
            disabled={linkedinLoading}
            className="flex items-center gap-1 text-[10px] font-bold text-sky-400/60 hover:text-sky-400 transition-colors"
          >
            {linkedinLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            {linkedinLoading ? "Searching…" : linkedinProfiles.length > 0 ? "Refresh" : "Search"}
          </button>
        </div>

        {linkedinLoading ? (
          <div className="space-y-2.5">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3 animate-pulse" style={{ background: "rgba(255,255,255,.03)" }}>
                <div className="size-8 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-28 bg-white/5 rounded" />
                  <div className="h-2 w-44 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : linkedinProfiles.length === 0 ? (
          <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <p className="text-[11px] text-white/25">No LinkedIn profiles found in database</p>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedinProfiles.map((p, i) => {
              const sourceLabel = p.source === "profile-page" ? "LinkedIn" : p.source === "ai-knowledge" ? "AI" : "Inferred"
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl p-3"
                  style={{
                    background: p.isDecisionMaker ? "rgba(52,211,153,.04)" : "rgba(255,255,255,.02)",
                    border: p.isDecisionMaker ? "1px solid rgba(52,211,153,.12)" : "1px solid rgba(255,255,255,.05)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white/50"
                      style={{ background: "rgba(255,255,255,.06)" }}
                    >
                      {(p.name?.[0] ?? "L").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[12px] font-semibold text-white/75 truncate">{p.name || "LinkedIn Member"}</p>
                        <span className="text-[8px] px-1 py-0.25 rounded bg-white/5 text-white/40 border border-white/10 uppercase tracking-wider">{sourceLabel}</span>
                      </div>
                      <p className="text-[10px] text-white/25 truncate">{p.title || "No title available"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.isDecisionMaker && (
                      <span
                        className="text-[8px] font-black uppercase tracking-wide text-emerald-400 px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(52,211,153,.1)" }}
                      >
                        DM
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-white/20">{p.confidence}%</span>
                    {p.linkedinUrl && (
                      <a
                        href={p.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 transition-colors"
                        style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
  fromDb?: boolean
}

function AuditTab({ audit, auditLoading, auditDone, website, onRunAudit, fromDb }: AuditTabProps) {
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
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[11px] text-white/35 font-mono truncate">{hostname}</p>
          {fromDb && auditDone && !auditLoading && audit && (
            <span className="text-[8px] font-bold text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 px-1.5 py-0.25 rounded lowercase shrink-0">saved in db</span>
          )}
        </div>
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
            const itemTyped = item as { speed?: boolean; neutral?: boolean; good?: boolean; label: string; val: string; icon: React.ElementType<{ className?: string }> }
            const speedGood = itemTyped.speed
              ? audit.speed < 2000 ? true : audit.speed < 4000 ? null : false
              : null
            const isGood = itemTyped.speed ? speedGood
              : itemTyped.neutral ? null
              : itemTyped.good === true ? true
              : itemTyped.good === false ? false
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
          <p className="text-[12px] text-white/30">Run the audit to check this website&apos;s health</p>
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

// ── Intel tab (research, icebreaker, pain points, competitor, notes) ──────────

type NoteRecord = { id: string; content: string; createdBy: string; createdAt: string }

const SIGNAL_ICONS: Record<string, typeof Newspaper> = {
  leadership_change: UserPlus,
  hiring: Briefcase,
  funding: Rocket,
  expansion: TrendingUp,
  tech_change: Cpu,
  news: Newspaper,
}

const URGENCY_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  high:   { text: "text-rose-300",   bg: "rgba(244,63,94,.1)",   border: "rgba(244,63,94,.2)" },
  medium: { text: "text-amber-300",  bg: "rgba(251,191,36,.1)",  border: "rgba(251,191,36,.2)" },
  low:    { text: "text-white/30",   bg: "rgba(255,255,255,.04)", border: "rgba(255,255,255,.07)" },
}

interface IntelTabProps {
  leadId: string
  icebreaker: string | null
  profile: BusinessProfile | null
  profileLoading: boolean
  painPoints: string[]
  competitorAnalysis: string | null
  buyingSignals: BuyingSignals | null
  signalsCheckedAt: string | null
  notes: NoteRecord[]
  notesLoading: boolean
  onRunResearch: () => void
  onGenerateIcebreaker: () => void
  icebreakerLoading: boolean
  onAddNote: (content: string) => Promise<void>
  onDeleteNote: (id: string) => void
}

function IntelTab({
  icebreaker, profile, profileLoading, painPoints, competitorAnalysis,
  buyingSignals, signalsCheckedAt,
  notes, notesLoading, onRunResearch, onGenerateIcebreaker, icebreakerLoading,
  onAddNote, onDeleteNote,
}: IntelTabProps) {
  const [noteText, setNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  async function submitNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      await onAddNote(noteText.trim())
      setNoteText("")
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Buying Signals */}
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <Flame className="size-3" /> Buying Signals — Why Now
          </p>
          {buyingSignals && (
            <span
              className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${URGENCY_STYLE[buyingSignals.urgency].text}`}
              style={{ background: URGENCY_STYLE[buyingSignals.urgency].bg, border: `1px solid ${URGENCY_STYLE[buyingSignals.urgency].border}` }}
            >
              {buyingSignals.urgency} urgency
            </span>
          )}
        </div>

        {buyingSignals ? (
          <div className="space-y-3">
            <p className="text-[12px] text-white/60 leading-relaxed italic">{buyingSignals.summary}</p>

            {buyingSignals.signals.length > 0 && (
              <ul className="space-y-2">
                {buyingSignals.signals.map((s, i) => {
                  const Icon = SIGNAL_ICONS[s.type] || Newspaper
                  return (
                    <li key={i} className="flex items-start gap-2.5 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                      <Icon className="size-3.5 text-violet-300/70 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-bold text-white/70">{s.headline}{s.date ? <span className="text-white/25 font-normal"> · {s.date}</span> : null}</p>
                        <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">{s.detail}</p>
                        {s.source && (
                          <a href={s.source} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-400/50 hover:text-sky-400 inline-flex items-center gap-1 mt-1">
                            <ExternalLink className="size-2.5" /> Source
                          </a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {signalsCheckedAt && (
              <p className="text-[9px] text-white/15">Last checked {formatDate(signalsCheckedAt)}</p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-white/25">No buying signals checked yet — this is populated automatically when lead data is researched (recent news, leadership changes, hiring, funding, etc.).</p>
        )}
      </div>

      {/* AI Research */}
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="size-3" /> AI Research
          </p>
          <button
            onClick={onRunResearch}
            disabled={profileLoading}
            className="flex items-center gap-1 text-[10px] font-bold text-sky-400/60 hover:text-sky-400 transition-colors"
          >
            {profileLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            {profileLoading ? "Researching…" : profile ? "Refresh" : "Run Research"}
          </button>
        </div>

        {profile ? (
          <div className="space-y-3">
            <p className="text-[12px] text-white/60 leading-relaxed">{profile.whatTheyDo}</p>
            {profile.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.specializations.map((s, i) => (
                  <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded text-sky-300 bg-sky-400/5 border border-sky-400/10">{s}</span>
                ))}
              </div>
            )}
            {profile.positioning && (
              <p className="text-[11px] text-white/40 italic leading-relaxed">{profile.positioning}</p>
            )}
            {profile.outreachAngles?.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-wide mb-1.5">Outreach Angles</p>
                <ul className="space-y-1">
                  {profile.outreachAngles.map((a, i) => (
                    <li key={i} className="text-[11px] text-white/45 leading-relaxed flex gap-1.5">
                      <span className="text-emerald-400/60 shrink-0">→</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-white/25">Run AI research to generate insights about this business — what they do, positioning, and outreach angles.</p>
        )}
      </div>

      {/* Icebreaker */}
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <Zap className="size-3" /> Icebreaker
          </p>
          <button
            onClick={onGenerateIcebreaker}
            disabled={icebreakerLoading}
            className="flex items-center gap-1 text-[10px] font-bold text-sky-400/60 hover:text-sky-400 transition-colors"
          >
            {icebreakerLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            {icebreakerLoading ? "Generating…" : icebreaker ? "Regenerate" : "Generate"}
          </button>
        </div>
        {icebreaker ? (
          <div className="flex items-start justify-between gap-3 rounded-lg p-3" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
            <p className="text-[12px] text-white/65 leading-relaxed italic">&ldquo;{icebreaker}&rdquo;</p>
            <CopyBtn text={icebreaker} />
          </div>
        ) : (
          <p className="text-[11px] text-white/25">Generate a personalized opening line for the first outreach email.</p>
        )}
      </div>

      {/* Pain points */}
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
          <Target className="size-3" /> Pain Points
        </p>
        {painPoints.length === 0 ? (
          <p className="text-[11px] text-white/25">No pain points identified yet — run AI research to surface content gaps and opportunities.</p>
        ) : (
          <ul className="space-y-1.5">
            {painPoints.map((p, i) => (
              <li key={i} className="text-[11px] text-white/50 leading-relaxed flex gap-1.5">
                <Lightbulb className="size-3 text-amber-400/60 shrink-0 mt-0.5" /> {p}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Competitor analysis */}
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <Swords className="size-3" /> Competitor Intel
          </p>
          <a href="/competitor-intel" className="flex items-center gap-1 text-[10px] font-bold text-sky-400/60 hover:text-sky-400 transition-colors">
            <ExternalLink className="size-3" /> {competitorAnalysis ? "Update" : "Generate"}
          </a>
        </div>
        {competitorAnalysis ? (() => {
          const competitors = parseCompetitorAnalysis(competitorAnalysis)
          if (competitors.length === 0) {
            return <p className="text-[11px] text-white/25">No competitor analysis yet. Generate one from the Competitor Intel tool.</p>
          }
          return (
            <div className="space-y-2">
              {competitors.map((c, i) => (
                <details key={`${c.name}-${i}`} className="group border border-white/[0.04] bg-white/[0.01] rounded-lg overflow-hidden [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
                  <summary className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors select-none">
                    <div className="min-w-0 pr-2">
                      <span className="text-[12px] font-semibold text-white truncate block">{c.name}</span>
                      {c.website && (
                        <span className="text-[9px] text-sky-400/60 truncate block">{c.website}</span>
                      )}
                    </div>
                    <ChevronDown className="size-3 text-white/30 group-open:rotate-180 transition-transform duration-200 shrink-0" />
                  </summary>
                  <div className="p-3 pt-1.5 space-y-3 border-t border-white/[0.02] text-[11px] leading-relaxed">
                    {c.summary && (
                      <p className="text-white/50 italic border-l border-rose-500/30 pl-2">{c.summary}</p>
                    )}
                    
                    {c.shortcomings && c.shortcomings.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-amber-300/80 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="size-3 text-amber-400" /> Shortcomings
                        </p>
                        <ul className="space-y-1 pl-2">
                          {c.shortcomings.map((item, idx) => (
                            <li key={idx} className="text-white/60 flex items-start gap-1">
                              <span className="text-amber-500/60 shrink-0 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.leverage && c.leverage.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wider flex items-center gap-1">
                          <Check className="size-3 text-emerald-400" /> Leverage
                        </p>
                        <ul className="space-y-1 pl-2">
                          {c.leverage.map((item, idx) => (
                            <li key={idx} className="text-white/60 flex items-start gap-1">
                              <span className="text-emerald-500/60 shrink-0 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.talkingPoints && c.talkingPoints.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-sky-300/80 uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="size-3 text-sky-400" /> Talking Points
                        </p>
                        <ul className="space-y-1 pl-2">
                          {c.talkingPoints.map((item, idx) => (
                            <li key={idx} className="text-white/60 flex items-start gap-1">
                              <span className="text-sky-500/60 shrink-0 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )
        })() : (
          <p className="text-[11px] text-white/25">No competitor analysis yet. Generate one from the Competitor Intel tool.</p>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
          <NotebookPen className="size-3" /> Notes
        </p>
        <div className="flex items-center gap-2">
          <input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submitNote() }}
            placeholder="Add a note…"
            className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-[12px] text-white outline-none"
          />
          <button
            onClick={submitNote}
            disabled={savingNote || !noteText.trim()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold text-white/60 disabled:opacity-40 transition-colors"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
          >
            {savingNote ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </button>
        </div>
        {notesLoading ? (
          <p className="text-[11px] text-white/20">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="text-[11px] text-white/25">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {notes.map(n => (
              <div key={n.id} className="rounded-lg p-3 flex items-start justify-between gap-3" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <p className="text-[12px] text-white/55 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  <p className="text-[10px] text-white/20 mt-1">{n.createdBy} · {formatDate(n.createdAt)}</p>
                </div>
                <button onClick={() => onDeleteNote(n.id)} className="text-white/15 hover:text-rose-400 transition-colors shrink-0">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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
  leadIndustry?: string | null
  auditJson?: string | null
  contactsJson?: string | null
  linkedinProfilesJson?: string | null
  recommendedApproach?: string | null
  icebreaker?: string | null
  researchNotes?: string | null
  painPoints?: unknown
  competitorAnalysis?: string | null
  buyingSignalsJson?: string | null
  signalsCheckedAt?: string | Date | null
}

export function LeadTabsPanel({
  leadId, leadEmail, leadWebsite, leadCompany, emails, replies, leadIndustry,
  auditJson, contactsJson, linkedinProfilesJson, recommendedApproach,
  icebreaker: initialIcebreaker, researchNotes, painPoints: initialPainPoints, competitorAnalysis,
  buyingSignalsJson, signalsCheckedAt,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview")

  const [place, setPlace]             = useState<PlaceData | null>(null)
  const [placeLoading, setPlaceLoading] = useState(true)

  const [contacts, setContacts]             = useState<Contact[]>(() => {
    try {
      return contactsJson ? JSON.parse(contactsJson) : []
    } catch { return [] }
  })
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsDone, setContactsDone]       = useState(() => !!contactsJson)

  const [socials, setSocials]               = useState<string[]>([])
  const [socialsLoading, setSocialsLoading] = useState(false)
  const [socialsDone, setSocialsDone]       = useState(false)

  const [audit, setAudit]               = useState<AuditResult | null>(() => {
    try {
      return auditJson ? JSON.parse(auditJson) : null
    } catch { return null }
  })
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditDone, setAuditDone]       = useState(() => !!auditJson)

  const [linkedinProfiles, setLinkedinProfiles] = useState<LinkedInDecisionMaker[]>(() => {
    try {
      return linkedinProfilesJson ? JSON.parse(linkedinProfilesJson) : []
    } catch { return [] }
  })
  const [linkedinLoading, setLinkedinLoading] = useState(false)

  const [icebreaker, setIcebreaker] = useState<string | null>(initialIcebreaker ?? null)
  const [icebreakerLoading, setIcebreakerLoading] = useState(false)
  const [profile, setProfile] = useState<BusinessProfile | null>(() => {
    try {
      return researchNotes ? JSON.parse(researchNotes) : null
    } catch { return null }
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [painPoints, setPainPoints] = useState<string[]>(() =>
    Array.isArray(initialPainPoints) ? (initialPainPoints as unknown[]).map(String) : []
  )
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [notesLoading, setNotesLoading] = useState(false)

  const buyingSignals = (() => {
    try {
      return buyingSignalsJson ? (JSON.parse(buyingSignalsJson) as BuyingSignals) : null
    } catch { return null }
  })()

  useEffect(() => {
    fetch(`/api/leads/${leadId}/place`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setPlace(d))
      .catch(() => {})
      .finally(() => setPlaceLoading(false))
  }, [leadId])

  useEffect(() => {
    if (tab !== "intel") return
    setNotesLoading(true)
    fetch(`/api/leads/${leadId}/notes`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setNotes(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setNotesLoading(false))
  }, [tab, leadId])

  const website = place?.websiteUri || leadWebsite

  // Auto-scans on tab hover/select are disabled to load database values directly.
  // The user can manually scan or refresh the data using the action buttons.

  async function doLinkedInSearch() {
    setLinkedinLoading(true)
    const isLocalOffice = !!(
      leadIndustry?.toLowerCase().includes("office") ||
      leadIndustry?.toLowerCase().includes("establishment") ||
      leadCompany?.toLowerCase().includes("office") ||
      leadCompany?.toLowerCase().includes("coworking")
    )
    try {
      const res = await fetch("/api/leads/linkedin-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: leadCompany || place?.displayName?.text || "",
          city: place?.formattedAddress || "",
          industry: leadIndustry || place?.primaryType || "",
          websiteUrl: website || "",
          localNeighbors: isLocalOffice,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const profiles = data.profiles ?? []
        setLinkedinProfiles(profiles)
        
        // Save to individual lead DB record
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkedinProfilesJson: JSON.stringify(profiles) }),
        })
        toast.success("LinkedIn decision makers updated")
      } else {
        toast.error("LinkedIn search failed")
      }
    } catch {
      toast.error("LinkedIn search failed")
    } finally {
      setLinkedinLoading(false)
    }
  }

  async function doContactSearch(bypassCache = false) {
    if (!website) return
    setContactsLoading(true)
    const isLocalOffice = !!(
      leadIndustry?.toLowerCase().includes("office") ||
      leadIndustry?.toLowerCase().includes("establishment") ||
      leadCompany?.toLowerCase().includes("office") ||
      leadCompany?.toLowerCase().includes("coworking")
    )
    try {
      const res = await fetch("/api/leads/contact-search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: website,
          companyName: leadCompany ?? "",
          localNeighbors: isLocalOffice,
          bypassCache,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const foundContacts = data.contacts ?? []
        setContacts(foundContacts)

        // Save to individual lead DB record
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactsJson: JSON.stringify(foundContacts) }),
        })
      }
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
      if (res.ok) {
        const auditData = await res.json()
        setAudit(auditData)

        // Save to individual lead DB record
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auditJson: JSON.stringify(auditData) }),
        })
      }
      else toast.error("Audit failed")
    } catch { toast.error("Could not reach website") }
    finally { setAuditLoading(false); setAuditDone(true) }
  }

  async function doRunResearch() {
    setProfileLoading(true)
    try {
      const res = await fetch("/api/leads/research", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: website || undefined,
          businessName: leadCompany || place?.displayName?.text || leadEmail,
          industry: leadIndustry || place?.primaryType || undefined,
          address: place?.formattedAddress || undefined,
          reviews: place?.reviews,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const newProfile = data.profile as BusinessProfile
        setProfile(newProfile)
        const gaps = [...(newProfile.contentGaps || []), ...(newProfile.outreachAngles || [])]
        setPainPoints(gaps)
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            researchNotes: JSON.stringify(newProfile),
            painPoints: gaps,
            recommendedApproach: newProfile.recommendedApproach?.id,
          }),
        })
        toast.success("Research updated")
      } else {
        toast.error("Research failed")
      }
    } catch {
      toast.error("Research failed")
    } finally {
      setProfileLoading(false)
    }
  }

  async function doGenerateIcebreaker() {
    setIcebreakerLoading(true)
    const decisionMaker = linkedinProfiles.find(p => p.isDecisionMaker) || contacts.find(c => c.isDecisionMaker)
    try {
      const res = await fetch("/api/leads/icebreaker", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approach: (recommendedApproach || profile?.recommendedApproach?.id || "website"),
          businessName: leadCompany || place?.displayName?.text || leadEmail,
          address: place?.formattedAddress,
          industry: leadIndustry || place?.primaryType,
          rating: place?.rating,
          reviewCount: place?.userRatingCount,
          auditData: audit,
          decisionMakerFirstName: decisionMaker?.name?.split(" ")[0] || null,
          businessProfile: profile,
          includeSenderCompany: true,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setIcebreaker(data.icebreaker)
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ icebreaker: data.icebreaker }),
        })
        toast.success("Icebreaker generated")
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Generation failed")
      }
    } catch {
      toast.error("Generation failed")
    } finally {
      setIcebreakerLoading(false)
    }
  }

  async function addNote(content: string) {
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes(prev => [note, ...prev])
    } else {
      toast.error("Could not save note")
    }
  }

  async function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id))
    await fetch(`/api/leads/${leadId}/notes/${id}`, { method: "DELETE" }).catch(() => {})
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "contact",  label: "Contact"  },
    { id: "audit",    label: "Audit"    },
    { id: "intel",    label: "Intel"    },
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
            onRefreshContacts={() => { setContactsDone(false); doContactSearch(true) }}
            onLoadSocials={doEnrich}
            linkedinProfiles={linkedinProfiles}
            linkedinLoading={linkedinLoading}
            onRefreshLinkedIn={doLinkedInSearch}
          />
        )}
        {tab === "audit" && (
          <AuditTab
            audit={audit}
            auditLoading={auditLoading}
            auditDone={auditDone}
            website={website}
            onRunAudit={doAudit}
            fromDb={!!auditJson}
          />
        )}
        {tab === "intel" && (
          <IntelTab
            leadId={leadId}
            icebreaker={icebreaker}
            profile={profile}
            profileLoading={profileLoading}
            painPoints={painPoints}
            competitorAnalysis={competitorAnalysis ?? null}
            buyingSignals={buyingSignals}
            signalsCheckedAt={signalsCheckedAt ? new Date(signalsCheckedAt).toISOString() : null}
            notes={notes}
            notesLoading={notesLoading}
            onRunResearch={doRunResearch}
            onGenerateIcebreaker={doGenerateIcebreaker}
            icebreakerLoading={icebreakerLoading}
            onAddNote={addNote}
            onDeleteNote={deleteNote}
          />
        )}
        {tab === "emails"  && <EmailsTab emails={emails} />}
        {tab === "replies" && <RepliesTab replies={replies} />}
      </div>
    </div>
  )
}
