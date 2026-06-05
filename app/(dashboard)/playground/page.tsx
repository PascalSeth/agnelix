"use client"

import { useState, useEffect } from "react"
import {
  MapPin, Shield, Gauge, Zap, CheckCircle2, XCircle,
  Mail, Eye, MessageSquare, Calendar, ChevronRight,
  ChevronLeft, Star, Globe2, Phone, AlertTriangle,
  Play, RotateCcw, TrendingUp, Sparkles, Users,
} from "lucide-react"

// ── Mock data ─────────────────────────────────────────────────────────────────

const LEAD = {
  name:       "James Mitchell",
  first:      "James",
  title:      "Practice Owner",
  company:    "Apex Dental Practice",
  email:      "james@apexdental.co.uk",
  website:    "apexdental.co.uk",
  address:    "14 Park Row, Leeds, LS1 5JF",
  phone:      "+44 113 246 7890",
  rating:     4.1,
  reviews:    47,
  industry:   "dental practice",
}

const SENDER = {
  name:    "Pascal",
  title:   "Founder",
  agency:  "Agnelix",
  email:   "pascal@agnelix.com",
}

const MOCK_EMAIL = `I had a look at Apex Dental Practice ahead of sending this — the site is loading in around 4 seconds on mobile, which for a practice where most patients search on their phone, is typically where you lose them before they see your availability.

${SENDER.name}
${SENDER.title}, ${SENDER.agency}`

const MOCK_SUBJECT = "Apex Dental — quick one on your site"

const BATTLE_CARD = {
  summary: "James is open to a conversation but cautious — he's asked about cost, which signals genuine interest. The slow site pain point landed. Keep the next reply concise and lead with ROI.",
  points: [
    "Site loads 4.2s on mobile — 50%+ of dental searches happen on mobile during emergencies",
    "No Google Analytics means he has zero visibility on how many people visit and leave",
    "47 reviews at 4.1★ — just below the threshold where competitors pull clicks automatically",
  ],
  objections: [
    { q: "How much does it cost?", a: "Frame around one new patient per month covering the fee — most dental practices are worth £400–800/patient." },
    { q: "We already have a website company", a: "Ask what they do about lead tracking and Google visibility — most website companies just build, they don't market." },
  ],
}

// ── Scenario definitions ───────────────────────────────────────────────────────

type Step = {
  tag: string
  title: string
  desc: string
  sender: React.ReactNode
  prospect: React.ReactNode
}

// ── Reusable mock UI blocks ───────────────────────────────────────────────────

function BusinessCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)" }}>
      <div className="h-28 flex items-center justify-center relative" style={{ background: "linear-gradient(135deg,rgba(52,211,153,.08),rgba(125,211,252,.05))" }}>
        <div className="flex size-14 items-center justify-center rounded-2xl text-2xl" style={{ background: "rgba(255,255,255,.08)" }}>🦷</div>
        
        {/* Visual AI Lead Classification badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse"
          style={{
            background: "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(99, 102, 241, 0.15))",
            color: "#f472b6",
            border: "1px solid rgba(236, 72, 153, 0.3)",
            boxShadow: "0 0 10px rgba(236, 72, 153, 0.15)"
          }}
        >
          <Sparkles className="size-2.5" /> Tier 1 Lead
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <p className="font-black text-white/90">{LEAD.company}</p>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={`size-3 ${i < Math.round(LEAD.rating) ? "fill-amber-400 text-amber-400" : "text-white/15"}`} />
            ))}
            <span className="text-[11px] text-white/35">{LEAD.rating} · {LEAD.reviews} reviews</span>
          </div>
        </div>

        {/* Explanation box: AI Lead Category */}
        <div className="rounded-lg p-2 text-[10px] leading-relaxed"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.05)"
          }}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-black text-indigo-400 uppercase tracking-widest text-[8px]">AI Lead Category</span>
          </div>
          <p className="text-white/60 font-medium">Local Dental Practice (High LTV, Service-based Business)</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] text-white/40 flex items-center gap-1"><MapPin className="size-3" />{LEAD.address}</p>
          <p className="text-[11px] text-white/40 flex items-center gap-1"><Globe2 className="size-3" />{LEAD.website}</p>
          <p className="text-[11px] text-white/40 flex items-center gap-1"><Phone className="size-3" />{LEAD.phone}</p>
        </div>
      </div>
    </div>
  )
}

function AuditPanel() {
  const signals = [
    { icon: Shield,  label: "SSL",      ok: true,  val: "Secure"    },
    { icon: Gauge,   label: "Speed",    ok: false, val: "4.2s"      },
    { icon: Zap,     label: "Mobile",   ok: true,  val: "Optimised" },
    { icon: Eye,     label: "Analytics",ok: false, val: "Missing"   },
    { icon: TrendingUp, label: "Pixel", ok: false, val: "No pixel"  },
  ]
  return (
    <div className="space-y-3">
      {/* AI Scoring & Category block */}
      <div className="rounded-xl p-3.5 space-y-2.5" 
        style={{ 
          border: "1px solid rgba(236, 72, 153, 0.25)", 
          background: "linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)",
          boxShadow: "0 4px 20px rgba(236, 72, 153, 0.05)"
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="size-3 text-pink-400" /> AI Scoring & Category
          </p>
          <span className="text-[11px] font-black text-white bg-pink-500/20 px-2 py-0.5 rounded-md border border-pink-500/30">
            9.2/10
          </span>
        </div>
        <div className="space-y-1 text-[11px] leading-relaxed">
          <p className="text-white/80 font-bold">Category: High-Priority Local Healthcare</p>
          <p className="text-white/45">
            Classified based on high Average Order Value (AOV) for implants/Invisalign and critical site speed failure (4.2s mobile load). Excellent match for speed optimization pitch.
          </p>
        </div>
      </div>

      <div className="rounded-xl p-3 space-y-2" style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)" }}>
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Site Audit</p>
        {signals.map(({ icon: Icon, label, ok, val }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded-md" style={{ background: ok ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)" }}>
              <Icon className={`size-3 ${ok ? "text-emerald-400" : "text-red-400"}`} />
            </div>
            <span className="text-[12px] text-white/60 flex-1">{label}</span>
            <span className={`text-[11px] font-bold ${ok ? "text-emerald-400" : "text-red-400"}`}>{val}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3" style={{ border: "1px solid rgba(56,189,248,.2)", background: "rgba(56,189,248,.06)" }}>
        <p className="text-[10px] font-black text-sky-400/60 uppercase tracking-widest mb-1.5">Contact Found</p>
        <p className="text-[12px] font-bold text-white/80">{LEAD.name}</p>
        <p className="text-[10px] text-white/40">{LEAD.title} · {LEAD.email}</p>
      </div>
    </div>
  )
}

function EmailComposer({ subject = MOCK_SUBJECT, body = MOCK_EMAIL }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>
      <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,.06)" }}>
        <Sparkles className="size-3.5 text-emerald-400/60" />
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">AI-Generated Email</p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Subject</p>
          <p className="text-[12px] font-semibold text-white/75">{subject}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Body</p>
          <pre className="text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap font-sans">{body}</pre>
        </div>
      </div>
    </div>
  )
}

function GmailInbox({ subject = MOCK_SUBJECT, preview = "I had a look at Apex Dental Practice ahead of sending this…", from = `${SENDER.name} <${SENDER.email}>`, isNew = true }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#f6f8fc", border: "1px solid rgba(0,0,0,.08)" }}>
      {/* Gmail header mock */}
      <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: "rgba(0,0,0,.08)", background: "#fff" }}>
        <div className="size-6 rounded-full bg-red-500 flex items-center justify-center">
          <Mail className="size-3.5 text-white" />
        </div>
        <span className="text-[13px] font-semibold text-gray-700">Gmail</span>
      </div>
      {/* Email row */}
      <div className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-white/50 ${isNew ? "font-semibold" : ""}`}
        style={{ background: isNew ? "#fff" : "transparent" }}>
        <div className="size-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[12px] font-bold shrink-0 mt-0.5">
          {SENDER.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className={`text-[13px] ${isNew ? "font-bold text-gray-900" : "text-gray-700"}`}>{SENDER.name}</p>
            <p className="text-[11px] text-gray-400 shrink-0">just now</p>
          </div>
          <p className={`text-[12px] truncate ${isNew ? "text-gray-900" : "text-gray-600"}`}>{subject}</p>
          <p className="text-[11px] text-gray-400 truncate">{preview}</p>
        </div>
        {isNew && <div className="size-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
      </div>
    </div>
  )
}

function GmailOpen({ subject = MOCK_SUBJECT, body = MOCK_EMAIL }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,.08)" }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
        <p className="text-[14px] font-bold text-gray-900 mb-2">{subject}</p>
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] font-bold">{SENDER.name[0]}</div>
          <div>
            <p className="text-[12px] font-semibold text-gray-800">{SENDER.name} &lt;{SENDER.email}&gt;</p>
            <p className="text-[11px] text-gray-400">to me</p>
          </div>
        </div>
      </div>
      <div className="px-4 py-4">
        <pre className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{body}</pre>
      </div>
    </div>
  )
}

function GmailReply({ text }: { text: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,.08)" }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[11px] font-bold">{LEAD.first[0]}</div>
          <div>
            <p className="text-[12px] font-semibold text-gray-800">{LEAD.name} &lt;{LEAD.email}&gt;</p>
            <p className="text-[11px] text-gray-400">to {SENDER.name}</p>
          </div>
        </div>
      </div>
      <div className="px-4 py-4">
        <p className="text-[12px] text-gray-700 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function BattleCardView() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl p-3.5 space-y-2" style={{ border: "1px solid rgba(167,139,250,.2)", background: "rgba(167,139,250,.06)" }}>
        <p className="text-[10px] font-black text-violet-400/60 uppercase tracking-widest">Battle Card — AI Generated</p>
        <p className="text-[11px] text-white/65 leading-relaxed">{BATTLE_CARD.summary}</p>
      </div>
      <div className="rounded-xl p-3 space-y-1.5" style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)" }}>
        <p className="text-[10px] font-black text-emerald-400/50 uppercase tracking-widest mb-2">Talking Points</p>
        {BATTLE_CARD.points.map((p, i) => (
          <div key={i} className="flex gap-2 text-[11px] text-white/55">
            <span className="text-emerald-400/40 shrink-0">{i + 1}.</span>{p}
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3 space-y-2" style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)" }}>
        <p className="text-[10px] font-black text-amber-400/50 uppercase tracking-widest">Likely Objections</p>
        {BATTLE_CARD.objections.map((o, i) => (
          <div key={i} className="space-y-0.5">
            <p className="text-[11px] font-bold text-white/60">{o.q}</p>
            <p className="text-[10px] text-white/35 leading-snug">→ {o.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineBoard({ stage }: { stage: "REPLIED" | "INTERESTED" | "MEETING_BOOKED" | "WON" | "LOST" | "NURTURE" }) {
  const stages = [
    { id: "REPLIED",       label: "Replied",     color: "rgba(167,139,250,.6)"  },
    { id: "INTERESTED",    label: "Interested",  color: "rgba(52,211,153,.6)"   },
    { id: "MEETING_BOOKED",label: "Meeting",     color: "rgba(251,191,36,.6)"   },
    { id: "WON",           label: "Won ✓",       color: "rgba(52,211,153,1)"    },
    { id: "LOST",          label: "Lost",        color: "rgba(248,113,113,.6)"  },
    { id: "NURTURE",       label: "Nurture",     color: "rgba(125,211,252,.6)"  },
  ]
  const active = stages.find(s => s.id === stage)
  return (
    <div className="space-y-3">
      <div className="rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)" }}>
        <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-3">Pipeline</p>
        <div className="space-y-1.5">
          {stages.filter(s => !["LOST", "NURTURE"].includes(s.id)).map(s => {
            const isActive = s.id === stage
            return (
              <div key={s.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                style={{ background: isActive ? "rgba(255,255,255,.07)" : "transparent", border: isActive ? `1px solid ${s.color}30` : "1px solid transparent" }}>
                <div className="size-2 rounded-full shrink-0" style={{ background: isActive ? s.color : "rgba(255,255,255,.1)" }} />
                <span className={`text-[12px] font-semibold ${isActive ? "text-white/85" : "text-white/25"}`}>{s.label}</span>
                {isActive && <span className="ml-auto text-[10px] font-bold" style={{ color: s.color }}>← Current</span>}
              </div>
            )
          })}
        </div>
      </div>
      {active && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ border: `1px solid ${active.color}30`, background: `${active.color}10` }}>
          <p className="text-[12px] font-bold" style={{ color: active.color }}>{LEAD.company} moved to {active.label}</p>
        </div>
      )}
    </div>
  )
}

function NurtureScheduled() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl p-3.5" style={{ border: "1px solid rgba(125,211,252,.2)", background: "rgba(125,211,252,.06)" }}>
        <p className="text-[10px] font-black text-sky-400/60 uppercase tracking-widest mb-2">Nurture Sequence Enrolled</p>
        <p className="text-[11px] text-white/55 leading-relaxed">
          {LEAD.company} has been enrolled in the 60-day nurture sequence. Agnelix will automatically re-engage with a case study, tip, and check-in — no manual effort required.
        </p>
      </div>
      <div className="rounded-xl p-3 space-y-2" style={{ border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)" }}>
        {[
          { day: "Day 7",  label: "Case study email sent" },
          { day: "Day 21", label: "Industry tip follow-up" },
          { day: "Day 45", label: "Check-in + new hook" },
          { day: "Day 90", label: "Re-audit + resurrection" },
        ].map(({ day, label }) => (
          <div key={day} className="flex items-center gap-2.5">
            <span className="text-[10px] font-black text-white/25 w-12 shrink-0">{day}</span>
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,.07)" }} />
            <span className="text-[11px] text-white/45">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarInvite() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,.1)" }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,.08)", background: "#1a73e8" }}>
        <p className="text-[13px] font-bold text-white">📅 Meeting Invitation</p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-[14px] font-bold text-gray-900">Discovery call with {SENDER.agency}</p>
        <div className="space-y-1.5 text-[12px] text-gray-600">
          <p>📅 Thursday 12 June · 11:00 – 11:30 AM</p>
          <p>📍 Google Meet (link included)</p>
          <p>👤 {SENDER.name} from {SENDER.agency}</p>
        </div>
        <div className="flex gap-2 pt-1">
          <button className="rounded-lg px-3 py-1.5 text-[12px] font-bold bg-blue-100 text-blue-700">Accept</button>
          <button className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-gray-500 hover:bg-gray-100">Decline</button>
        </div>
      </div>
    </div>
  )
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

const scenarios: { id: string; label: string; emoji: string; color: string; tagline: string; steps: Step[] }[] = [
  {
    id: "interested",
    label: "Interested → Meeting",
    emoji: "🟢",
    color: "#34d399",
    tagline: "Lead replies positively — AI handles it, meeting booked",
    steps: [
      {
        tag: "Discovery",
        title: "Lead Found on Google Maps",
        desc: "Agnelix searches Google Maps for dental practices in Leeds. Apex Dental surfaces with a 4.1★ rating, website, and phone number. The audit starts automatically.",
        sender: <BusinessCard />,
        prospect: (
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,.08)" }}>
            <div className="h-10 bg-blue-600 flex items-center px-4"><p className="text-white text-[13px] font-bold">🦷 Apex Dental Practice – Leeds</p></div>
            <div className="p-4 text-[12px] text-gray-700 space-y-2">
              <p className="font-bold text-gray-900">Quality dental care in Leeds since 2008</p>
              <p className="text-gray-500">New patients welcome. General & cosmetic dentistry, Invisalign, emergency appointments.</p>
              <div className="flex items-center gap-1 text-amber-500 text-[11px]">⭐⭐⭐⭐☆ 4.1 · 47 reviews</div>
              <p className="text-gray-400 text-[11px]">Loading... (4.2 seconds)</p>
            </div>
          </div>
        ),
      },
      {
        tag: "Research",
        title: "Site Audited · Contact Found",
        desc: "The audit flags a slow load time and missing analytics. AI scans the About page and finds James Mitchell, the Practice Owner. His email is confirmed.",
        sender: <AuditPanel />,
        prospect: (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,.08)" }}>
              <div className="px-4 py-3 bg-gray-50 border-b text-[11px] text-gray-500 border-gray-100">apexdental.co.uk/about</div>
              <div className="p-4 space-y-2">
                <p className="font-bold text-[13px] text-gray-900">Meet Our Team</p>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">👨‍⚕️</div>
                  <div>
                    <p className="text-[12px] font-bold text-gray-800">James Mitchell</p>
                    <p className="text-[11px] text-gray-500">Practice Owner & Principal Dentist</p>
                    <p className="text-[11px] text-blue-600">james@apexdental.co.uk</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        tag: "Outreach",
        title: "AI Writes & Sends Personalised Email",
        desc: "DeepSeek uses the audit findings (4.2s load, no analytics) + James's name + the dental context to write a specific, non-generic opener. Email sent from your Gmail.",
        sender: <EmailComposer />,
        prospect: <GmailInbox />,
      },
      {
        tag: "Reply",
        title: "James Replies — Interested",
        desc: "James opens the email within 2 hours and replies. Agnelix detects the reply via IMAP, classifies it as INTERESTED (high confidence), and immediately generates a Battle Card.",
        sender: (
          <div className="space-y-3">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(52,211,153,.25)", background: "rgba(52,211,153,.07)" }}>
              <MessageSquare className="size-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-emerald-400">Reply received — INTERESTED</p>
                <p className="text-[10px] text-white/40">High confidence · AI processing…</p>
              </div>
            </div>
            <BattleCardView />
          </div>
        ),
        prospect: <GmailOpen subject="Re: Apex Dental — quick one on your site" body={`Hi Pascal,\n\nYou're right — I've noticed it's been a bit slow recently but hadn't thought much of it. We also had someone mention it was flagging 'Not Secure' on their phone which is concerning.\n\nI'd be interested to understand what's involved. What sort of thing are you thinking, and what would the cost typically be?\n\nJames`} />,
      },
      {
        tag: "AI Response",
        title: "AI Drafts Reply — You Approve & Send",
        desc: "The AI uses the Battle Card, James's reply, and your agency description to draft a tailored response. It proposes two specific times for a call and addresses the cost question.",
        sender: (
          <EmailComposer
            subject="Re: Apex Dental — quick one on your site"
            body={`James — good to hear from you. The 'Not Secure' flag is a trust issue at exactly the moment someone's deciding whether to book.\n\nHappy to walk you through what we'd do in a short call — typically takes 20 minutes and I'll bring the numbers on what it's likely costing you in missed bookings.\n\nCould do Tue 11am or Thu 2pm — which works better?\n\nPascal\nFounder, Agnelix`}
          />
        ),
        prospect: <GmailReply text={`Pascal,\n\nTuesday at 11am works great. Looking forward to it.\n\nJames`} />,
      },
      {
        tag: "Outcome",
        title: "Meeting Booked — Pipeline Updated",
        desc: "Meeting confirmed. Pipeline moves to MEETING_BOOKED. Agnelix schedules a pre-call brief and sends a calendar invite to James automatically.",
        sender: <PipelineBoard stage="MEETING_BOOKED" />,
        prospect: <CalendarInvite />,
      },
    ],
  },
  {
    id: "objection",
    label: "Objection → Handled",
    emoji: "🟡",
    color: "#fbbf24",
    tagline: "Lead pushes back — AI counters professionally, keeps the door open",
    steps: [
      {
        tag: "Discovery",
        title: "Lead Found on Google Maps",
        desc: "Same discovery and research flow. Audit runs, contact found, personalised email sent.",
        sender: <BusinessCard />,
        prospect: <GmailInbox isNew={false} />,
      },
      {
        tag: "Outreach",
        title: "Email Sent & Opened",
        desc: "James opens the email. Agnelix records the open event. The sequence continues automatically.",
        sender: <EmailComposer />,
        prospect: <GmailOpen />,
      },
      {
        tag: "Objection",
        title: "James Objects — Already Has a Provider",
        desc: "James replies with a classic objection. Agnelix classifies it as OBJECTION, detects the specific type (existing vendor), and queues an AI-drafted counter.",
        sender: (
          <div className="space-y-3">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(251,191,36,.25)", background: "rgba(251,191,36,.07)" }}>
              <AlertTriangle className="size-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-amber-400">Reply — OBJECTION detected</p>
                <p className="text-[10px] text-white/40">Type: Existing vendor · drafting counter…</p>
              </div>
            </div>
            <EmailComposer
              subject="Re: Apex Dental — quick one on your site"
              body={`James — makes sense you'd want to stick with someone you know.\n\nOne thing worth checking: does your current setup give you any visibility on how many people visit the site and leave without booking? Most dental sites don't, which means you're paying for traffic you can't measure.\n\nNot asking you to switch — just worth knowing if there's a gap. Happy to run a free 10-minute audit if useful.\n\nPascal`}
            />
          </div>
        ),
        prospect: <GmailReply text={`Hi Pascal,\n\nAppreciate you reaching out, but we already have someone who manages our website. I don't think we're looking to change at the moment.\n\nThanks,\nJames`} />,
      },
      {
        tag: "Follow-up",
        title: "Counter Sent — Door Left Open",
        desc: "The objection counter is sent. James doesn't close it down — he's been re-framed. The sequence pauses for 14 days before a final value-touch.",
        sender: (
          <div className="space-y-2">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(125,211,252,.2)", background: "rgba(125,211,252,.06)" }}>
              <Mail className="size-4 text-sky-400 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-sky-400">Counter sent — monitoring</p>
                <p className="text-[10px] text-white/40">Day 14 follow-up queued automatically</p>
              </div>
            </div>
            <PipelineBoard stage="REPLIED" />
          </div>
        ),
        prospect: <GmailOpen
          subject="Re: Apex Dental — quick one on your site"
          body={`James — makes sense you'd want to stick with someone you know.\n\nOne thing worth checking: does your current setup give you any visibility on how many people visit the site and leave without booking? Most dental sites don't, which means you're paying for traffic you can't measure.\n\nNot asking you to switch — just worth knowing if there's a gap. Happy to run a free 10-minute audit if useful.\n\nPascal`}
        />,
      },
    ],
  },
  {
    id: "rejection",
    label: "Rejection → Nurtured",
    emoji: "🔴",
    color: "#f87171",
    tagline: "Lead says no — sequences stop, 60-day nurture starts automatically",
    steps: [
      {
        tag: "Outreach",
        title: "Email Sent",
        desc: "Personalised email sent. James opens it but isn't ready right now.",
        sender: <EmailComposer />,
        prospect: <GmailOpen />,
      },
      {
        tag: "Rejection",
        title: "James Unsubscribes",
        desc: "James asks to be removed. Agnelix detects the unsubscribe intent instantly, cancels all queued follow-ups, and updates his status — no manual action needed.",
        sender: (
          <div className="space-y-3">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(248,113,113,.25)", background: "rgba(248,113,113,.07)" }}>
              <XCircle className="size-4 text-red-400 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-red-400">UNSUBSCRIBE detected — sequences stopped</p>
                <p className="text-[10px] text-white/40">0 further emails will be sent</p>
              </div>
            </div>
            <PipelineBoard stage="NURTURE" />
          </div>
        ),
        prospect: <GmailReply text={`Hi,\n\nPlease remove me from your list. Not interested at this time.\n\nJames`} />,
      },
      {
        tag: "Nurture",
        title: "60-Day Nurture Sequence Starts",
        desc: "James is enrolled in the passive nurture track. Agnelix sends a light-touch case study, a useful tip, and a check-in over 60 days. No pressure, no pitch. At day 90, the site is re-audited automatically for a resurrection hook.",
        sender: <NurtureScheduled />,
        prospect: (
          <div className="space-y-2">
            <GmailInbox subject="How one Leeds dental practice added 12 new patients" preview="We worked with a practice similar to yours last quarter…" isNew={false} />
            <p className="text-[10px] text-white/20 text-center">Day 7 nurture email (no reply required)</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "won",
    label: "Full Journey → Won",
    emoji: "🏆",
    color: "#fbbf24",
    tagline: "Complete deal cycle: discovery → outreach → proposal → closed",
    steps: [
      {
        tag: "Discovery",
        title: "Lead Found & Researched",
        desc: "Business found via Google Maps. Audit flags slow site and missing analytics. James's email confirmed from the About page.",
        sender: <AuditPanel />,
        prospect: <GmailInbox isNew={false} />,
      },
      {
        tag: "Outreach",
        title: "Personalised Email Sent",
        desc: "AI writes a specific opener using the audit findings and James's name.",
        sender: <EmailComposer />,
        prospect: <GmailOpen />,
      },
      {
        tag: "Reply",
        title: "James Replies — Wants a Proposal",
        desc: "James asks for pricing and a proposal. Agnelix detects INTERESTED intent with proposal request, generates a battle card, and auto-drafts a proposal.",
        sender: <BattleCardView />,
        prospect: <GmailReply text={`Pascal,\n\nThis looks relevant. Could you send over a proposal with what you'd do and what it would cost? We're reviewing a few options at the moment.\n\nJames`} />,
      },
      {
        tag: "Proposal",
        title: "One-Page Proposal Auto-Generated",
        desc: "Agnelix generates a tailored one-page proposal using the audit data, James's company info, and your agency details. Sent in the next reply automatically.",
        sender: (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(167,139,250,.2)", background: "rgba(167,139,250,.06)" }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(167,139,250,.15)" }}>
              <Sparkles className="size-3.5 text-violet-400/60" />
              <p className="text-[11px] font-black text-violet-400/60 uppercase tracking-widest">Auto-Generated Proposal</p>
            </div>
            <div className="p-4 space-y-3 text-[11px]">
              <p className="font-bold text-white/80 text-[13px]">Apex Dental Practice — Digital Presence Proposal</p>
              <div>
                <p className="font-bold text-white/50 uppercase tracking-wide text-[9px] mb-1">Current Situation</p>
                <p className="text-white/45 leading-snug">Site loads in 4.2s, no analytics, 4.1★ on Google. Estimated 40–60 missed bookings/month based on traffic benchmarks for Leeds dental practices.</p>
              </div>
              <div>
                <p className="font-bold text-white/50 uppercase tracking-wide text-[9px] mb-1">What We'll Do</p>
                <p className="text-white/45 leading-snug">Speed optimisation, Google Analytics setup, review generation system, 3-month SEO foundation. Delivered in 4 weeks.</p>
              </div>
              <div>
                <p className="font-bold text-white/50 uppercase tracking-wide text-[9px] mb-1">Investment</p>
                <p className="text-white/70 font-bold">£1,200 setup · £350/month</p>
                <p className="text-white/30 text-[10px]">ROI break-even: 2 additional patients/month</p>
              </div>
            </div>
          </div>
        ),
        prospect: (
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(0,0,0,.08)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
              <p className="text-[13px] font-bold text-gray-900">Re: Apex Dental — quick one on your site</p>
              <p className="text-[11px] text-gray-400">{SENDER.name} to me</p>
            </div>
            <div className="p-4 space-y-2 text-[12px] text-gray-700">
              <p>James — thanks for coming back. I've put together a short brief on exactly what I'd recommend for Apex Dental.</p>
              <p className="text-blue-600 underline cursor-pointer">📄 Apex Dental — Proposal.pdf</p>
              <p>Happy to walk through it on a call. Could do Thu 2pm or Fri 10am.</p>
              <p>Pascal</p>
            </div>
          </div>
        ),
      },
      {
        tag: "Outcome",
        title: "Deal Won — £1,200 + £350/mo",
        desc: "James accepts the proposal and books onboarding. Pipeline updates to WON. Revenue is logged, and the campaign closes.",
        sender: (
          <div className="space-y-3">
            <div className="rounded-xl px-4 py-4 text-center space-y-1" style={{ border: "1px solid rgba(52,211,153,.3)", background: "rgba(52,211,153,.08)" }}>
              <p className="text-2xl">🏆</p>
              <p className="text-[15px] font-black text-emerald-400">Deal Won</p>
              <p className="text-[12px] text-white/50">{LEAD.company} · {LEAD.name}</p>
              <p className="text-[13px] font-bold text-white/70">£1,200 setup + £350/mo recurring</p>
            </div>
            <PipelineBoard stage="WON" />
          </div>
        ),
        prospect: <GmailReply text={`Pascal,\n\nLooks good to me. Let's go ahead with it. I'll book the onboarding call for next week.\n\nThanks,\nJames`} />,
      },
    ],
  },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [stepIdx, setStepIdx]         = useState(0)
  const [autoPlay, setAutoPlay]       = useState(false)

  const scenario = scenarios[scenarioIdx]
  const step     = scenario.steps[stepIdx]
  const total    = scenario.steps.length
  const isLast   = stepIdx === total - 1

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return
    if (isLast) { setAutoPlay(false); return }
    const t = setTimeout(() => setStepIdx(i => i + 1), 3000)
    return () => clearTimeout(t)
  }, [autoPlay, stepIdx, isLast])

  function selectScenario(i: number) {
    setScenarioIdx(i)
    setStepIdx(0)
    setAutoPlay(false)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="size-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 6px rgba(167,139,250,.9)" }} />
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Interactive Demo</span>
            </div>
            <h1 className="text-[22px] font-black tracking-tight text-white/90">Playground</h1>
            <p className="text-[12px] text-white/25 mt-0.5">See the full outreach loop from both sides — your view and the prospect's inbox</p>
          </div>

          {/* Auto-play control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStepIdx(0); setAutoPlay(true) }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,rgba(167,139,250,.15),rgba(167,139,250,.06))", border: "1px solid rgba(167,139,250,.25)", color: "#a78bfa" }}
            >
              <Play className="size-3.5 fill-current" /> Auto-play
            </button>
            <button
              onClick={() => { setStepIdx(0); setAutoPlay(false) }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold text-white/30 hover:text-white/60 transition-all"
              style={{ border: "1px solid rgba(255,255,255,.07)" }}
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* Scenario tabs */}
        <div className="flex gap-2 flex-wrap">
          {scenarios.map((s, i) => (
            <button key={s.id} onClick={() => selectScenario(i)}
              className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all"
              style={{
                background: i === scenarioIdx ? `${s.color}15` : "rgba(255,255,255,.03)",
                border: i === scenarioIdx ? `1px solid ${s.color}35` : "1px solid rgba(255,255,255,.06)",
                color: i === scenarioIdx ? s.color : "rgba(255,255,255,.35)",
              }}>
              <span>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step progress */}
      <div className="shrink-0 px-6 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
        <p className="text-[11px] text-white/25 shrink-0 w-20">{scenario.tagline.split(" — ")[0]}</p>
        <div className="flex-1 flex items-center gap-1">
          {scenario.steps.map((s, i) => (
            <button key={i} onClick={() => setStepIdx(i)} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full h-1 rounded-full transition-all"
                style={{ background: i <= stepIdx ? scenario.color : "rgba(255,255,255,.1)" }} />
              <span className={`text-[9px] font-bold uppercase tracking-wide transition-all hidden sm:block ${i === stepIdx ? "opacity-100" : "opacity-30"}`}
                style={{ color: i === stepIdx ? scenario.color : "rgba(255,255,255,.5)" }}>
                {s.tag}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/25 shrink-0 text-right">{stepIdx + 1}/{total}</p>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-5 space-y-4">

          {/* Step header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide"
                style={{ background: `${scenario.color}15`, color: scenario.color, border: `1px solid ${scenario.color}30` }}>
                {step.tag}
              </span>
            </div>
            <h2 className="text-[17px] font-black text-white/90">{step.title}</h2>
            <p className="text-[12px] text-white/40 mt-1 leading-relaxed max-w-2xl">{step.desc}</p>
          </div>

          {/* Split view */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sender view */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: "rgba(167,139,250,.15)", border: "1px solid rgba(167,139,250,.25)" }}>
                  👤
                </div>
                <p className="text-[11px] font-black text-white/40 uppercase tracking-wide">Your View — Inside Agnelix</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", minHeight: "240px" }}>
                {step.sender}
              </div>
            </div>

            {/* Prospect view */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.2)" }}>
                  🎯
                </div>
                <p className="text-[11px] font-black text-white/40 uppercase tracking-wide">Prospect's View — Their Inbox</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", minHeight: "240px" }}>
                {step.prospect}
              </div>
            </div>
          </div>

          {/* AI Advisor Promotion Banner */}
          <div 
            className="rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden mt-6" 
            style={{ 
              border: "1px solid rgba(255, 255, 255, 0.08)", 
              background: "linear-gradient(135deg, rgba(20, 20, 35, 0.6) 0%, rgba(10, 10, 20, 0.8) 100%)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
            }}
          >
            {/* Ambient background glow */}
            <div 
              className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[80px]" 
              style={{ background: "radial-gradient(circle, rgba(236, 72, 153, 0.12), rgba(99, 102, 241, 0.08), transparent 70%)" }}
            />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative flex size-12 shrink-0 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border border-dashed border-indigo-400/40"
                  style={{ animation: "orb-rotate 15s linear infinite" }}
                />
                <img
                  src="/logo.png"
                  alt="Agnelix"
                  className="relative size-8 rounded-xl object-contain bg-black/30"
                  style={{
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    boxShadow: "0 0 15px rgba(99, 102, 241, 0.3)"
                  }}
                />
              </div>
              <div>
                <h3 className="text-[14px] font-black text-white/90">Need help optimizing your campaign strategy?</h3>
                <p className="text-[12px] text-white/45 mt-0.5">
                  Agnel is ready to audit your leads and brainstorm outreach hooks. Ask Agnel now.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => window.dispatchEvent(new Event("open-ai-advisor"))}
              className="relative z-10 shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-black tracking-wide text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #6366f1 100%)",
                boxShadow: "0 4px 20px rgba(236, 72, 153, 0.25)"
              }}
            >
              <Sparkles className="size-3.5" /> Ask Agnel Now
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,.05)", background: "rgba(12,13,18,.98)", backdropFilter: "blur(12px)" }}>
        <button
          onClick={() => setStepIdx(i => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold text-white/40 hover:text-white/70 disabled:opacity-30 transition-all"
          style={{ border: "1px solid rgba(255,255,255,.08)" }}>
          <ChevronLeft className="size-4" /> Previous
        </button>

        <div className="flex items-center gap-1.5">
          {scenario.steps.map((_, i) => (
            <button key={i} onClick={() => setStepIdx(i)}
              className="size-2 rounded-full transition-all"
              style={{ background: i === stepIdx ? scenario.color : "rgba(255,255,255,.12)" }} />
          ))}
        </div>

        <button
          onClick={() => isLast ? selectScenario((scenarioIdx + 1) % scenarios.length) : setStepIdx(i => i + 1)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all hover:brightness-110"
          style={{
            background: `linear-gradient(135deg,${scenario.color}30,${scenario.color}15)`,
            border: `1px solid ${scenario.color}35`,
            color: scenario.color,
          }}>
          {isLast ? (
            <><Users className="size-4" /> Next Scenario</>
          ) : (
            <>Next <ChevronRight className="size-4" /></>
          )}
        </button>
      </div>
    </div>
  )
}
