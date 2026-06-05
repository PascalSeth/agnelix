import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { CampaignCard } from "@/components/campaign-card"
import { Megaphone, Mail, MessageSquare, Calendar, Plus, Users, ArrowUpRight, DollarSign, Check, ChevronRight } from "lucide-react"
import Link from "next/link"
import { pct, formatRelative } from "@/lib/utils"

type CampaignRow = {
  id: string; name: string; status: string; totalLeads: number
  emailsSent: number; emailsOpened: number; emailsClicked: number
  replies: number; meetings: number; launchedAt: Date | null
  createdAt: Date; updatedAt: Date
}
type EmailRow = {
  id: string; subject: string; status: string; createdAt: Date; leadId: string
  lead: { id: string; firstName: string | null; lastName: string | null; email: string }
}

const STATUS_CHIP: Record<string, string> = {
  SENT:    "text-white/40 bg-white/[0.06]",
  OPENED:  "text-emerald-300 bg-emerald-400/10",
  CLICKED: "text-sky-300 bg-sky-400/10",
  REPLIED: "text-amber-300 bg-amber-400/10",
  BOUNCED: "text-red-400 bg-red-400/10",
}


export default async function DashboardPage() {
  const session = await auth()
  const userId  = session?.user?.id ?? ""

  let campaigns: CampaignRow[] = []
  let totalLeads  = 0
  let recentEmails: EmailRow[] = []
  let wonRevenue = 0
  let wonLeadsCount = 0
  let inboxCount = 0
  let hotLeadsCount = 0
  let sequencesCount = 0
  let latestDigest: { sentCount: number; meetingsBookedCount: number; proposalsSentCount: number; flaggedCount: number; summary: string | null } | null = null

  try {
    campaigns = (await prisma.campaign.findMany({
      where: { userId }, orderBy: { updatedAt: "desc" }, take: 6,
    })) as CampaignRow[]
    const [leadsCount, emails, wonLeads, replyCount, hotCount, seqCount, digest] = await Promise.all([
      prisma.lead.count({ where: { userId } }),
      prisma.email.findMany({
        where: { lead: { userId } }, orderBy: { createdAt: "desc" }, take: 8,
        include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }) as Promise<EmailRow[]>,
      prisma.lead.findMany({ where: { userId, status: "WON" }, select: { dealValue: true } }),
      prisma.reply.count({ where: { lead: { userId } } }),
      prisma.lead.count({ where: { userId, status: { in: ["REPLIED", "INTERESTED"] } } }),
      prisma.sequence.count({ where: { userId } }),
      prisma.agentDigestLog.findFirst({
        where: { userId },
        orderBy: { day: "desc" },
        select: { sentCount: true, meetingsBookedCount: true, proposalsSentCount: true, flaggedCount: true, summary: true },
      }),
    ])
    totalLeads = leadsCount
    recentEmails = emails
    wonLeadsCount = wonLeads.length
    wonRevenue = wonLeads.reduce((s, l) => s + (l.dealValue ?? 0), 0)
    inboxCount = replyCount
    hotLeadsCount = hotCount
    sequencesCount = seqCount
    latestDigest = digest
  } catch { /* DB not configured */ }

  const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE")
  const totalSent    = campaigns.reduce((s, c) => s + c.emailsSent, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.replies, 0)
  const totalMeetings= campaigns.reduce((s, c) => s + c.meetings, 0)
  const firstName    = session?.user?.name?.split(" ")[0] ?? "there"

  function fmtRevenue(v: number) {
    if (v === 0) return "$0"
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
    return `$${v}`
  }

  const stats = [
    { key: "campaigns", label: "Active",     sub: "campaigns", value: activeCampaigns.length,      icon: Megaphone,    accent: "rgba(148,163,184,.6)", sparkline: [20, 45, 30, 70, 50, 85, 60] },
    { key: "leads",     label: "Total",      sub: "leads",     value: totalLeads,                   icon: Users,        accent: "rgba(167,139,250,.6)", sparkline: [50, 60, 40, 80, 55, 75, 90] },
    { key: "sent",      label: "Emails",     sub: "sent",      value: totalSent,                    icon: Mail,         accent: "rgba(125,211,252,.6)", sparkline: [30, 50, 65, 45, 80, 60, 95] },
    { key: "reply",     label: "Reply",      sub: "rate",      value: pct(totalReplies, totalSent), icon: MessageSquare,accent: "rgba(52,211,153,.6)",  sparkline: [40, 35, 55, 30, 60, 45, 70] },
    { key: "meetings",  label: "Meetings",   sub: "booked",    value: totalMeetings,                icon: Calendar,     accent: "rgba(251,191,36,.6)",  sparkline: [20, 30, 25, 50, 35, 60, 45] },
    { key: "revenue",   label: "Revenue",    sub: "closed",    value: fmtRevenue(wonRevenue),       icon: DollarSign,   accent: "rgba(52,211,153,.7)",  sparkline: [10, 20, 15, 40, 30, 60, 50] },
  ]

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between pt-2">
        <div>
          {/* eyebrow */}
          <div className="flex items-center gap-2 mb-3">
            <span className="size-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">
              All systems active
            </span>
          </div>

          {/* heading */}
          <h1 className="text-[32px] font-black tracking-tight leading-none">
            <span className="text-white/40">Welcome back, </span>
            <span style={{
              background: "linear-gradient(90deg,#ffffff 0%,rgba(255,255,255,.7) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              {firstName}
            </span>
          </h1>

          {/* meta */}
          <p className="mt-2 text-[13px] text-white/25 font-medium">
            {totalLeads.toLocaleString()} leads in pipeline
            {" · "}
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            {activeCampaigns.length > 0 && (
              <span className="text-emerald-400"> · {activeCampaigns.length} live</span>
            )}
          </p>
        </div>

        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98]"
          style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
        >
          <Plus className="size-4" />
          New Campaign
        </Link>
      </div>

      {/* ── Setup checklist (only shown until all steps done) ───────── */}
      {(sequencesCount === 0 || campaigns.length === 0 || totalLeads === 0) && (() => {
        const steps = [
          { label: "Create your account",       done: true,                    href: null },
          { label: "Set up agency profile",     done: true,                    href: null },
          { label: "Create an email sequence",  done: sequencesCount > 0,      href: "/sequences" },
          { label: "Create a campaign",         done: campaigns.length > 0,    href: "/campaigns/new" },
          { label: "Add leads",                 done: totalLeads > 0,          href: "/leads/upload" },
        ]
        const completedCount = steps.filter(s => s.done).length
        const pct = Math.round((completedCount / steps.length) * 100)
        return (
          <div
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
              border: "1px solid rgba(255,255,255,.07)",
            }}
          >
            <div className="absolute top-0 inset-x-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)" }} />

            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-black text-white/75">Getting started</p>
                <p className="text-[11px] text-white/25 mt-0.5">{completedCount} of {steps.length} steps complete</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.07)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg,rgba(255,255,255,.35),rgba(255,255,255,.65))" }}
                  />
                </div>
                <span className="text-[11px] font-bold text-white/30">{pct}%</span>
              </div>
            </div>

            {/* Steps */}
            <div className="flex flex-wrap gap-2">
              {steps.map((step) => (
                step.href && !step.done ? (
                  <Link
                    key={step.label}
                    href={step.href}
                    className="group flex items-center gap-2 rounded-xl px-3 py-2 transition-all hover:-translate-y-px"
                    style={{
                      background: "rgba(255,255,255,.03)",
                      border: "1px solid rgba(255,255,255,.09)",
                    }}
                  >
                    <span
                      className="flex size-4 shrink-0 items-center justify-center rounded-full"
                      style={{ border: "1.5px solid rgba(255,255,255,.18)" }}
                    />
                    <span className="text-[12px] font-semibold text-white/50 group-hover:text-white/70 transition-colors">
                      {step.label}
                    </span>
                    <ChevronRight className="size-3 text-white/20 group-hover:text-white/40 transition-colors" />
                  </Link>
                ) : (
                  <div
                    key={step.label}
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: step.done ? "rgba(52,211,153,.05)" : "rgba(255,255,255,.02)",
                      border: `1px solid ${step.done ? "rgba(52,211,153,.15)" : "rgba(255,255,255,.06)"}`,
                    }}
                  >
                    <span
                      className="flex size-4 shrink-0 items-center justify-center rounded-full"
                      style={step.done ? { background: "rgba(52,211,153,.8)" } : { border: "1.5px solid rgba(255,255,255,.15)" }}
                    >
                      {step.done && <Check className="size-2.5 text-black" strokeWidth={3} />}
                    </span>
                    <span className={`text-[12px] font-semibold ${step.done ? "text-white/30 line-through" : "text-white/40"}`}>
                      {step.label}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Stat cards (bento with sparklines) ──────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ key, label, sub, value, accent, sparkline }) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
              border: "1px solid rgba(255,255,255,.07)",
              boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
            }}
          >
            {/* accent top line */}
            <div className="absolute top-0 inset-x-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
            {/* hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ background: `radial-gradient(ellipse at top,${accent.replace(".6",",.1").replace(".7",",.1")} 0%,transparent 65%)` }} />

            {/* sparkline */}
            <div className="relative flex items-end gap-[2px] h-7 mb-4">
              {sparkline.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[2px] transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    background: `rgba(255,255,255,${0.08 + (h / 100) * 0.18})`,
                  }}
                />
              ))}
            </div>

            <p className="relative text-[26px] font-black tracking-tight text-white/90 leading-none">{value}</p>
            <div className="relative mt-1.5 flex items-baseline gap-1">
              <span className="text-[13px] font-bold text-white/60">{label}</span>
              <span className="text-[11px] text-white/25">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Action center ───────────────────────────────────────────── */}
      {(inboxCount > 0 || hotLeadsCount > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {inboxCount > 0 && (
            <Link
              href="/inbox"
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg,rgba(167,139,250,.07) 0%,rgba(167,139,250,.03) 100%)",
                border: "1px solid rgba(167,139,250,.15)",
              }}
            >
              <div className="absolute top-0 inset-x-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(167,139,250,.4),transparent)" }} />
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.18)" }}>
                <MessageSquare className="size-4 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-black text-violet-300">
                  {inboxCount} repl{inboxCount === 1 ? "y" : "ies"} waiting
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">Review and respond in Inbox</p>
              </div>
              <ArrowUpRight className="size-3.5 text-violet-400/50 group-hover:text-violet-400 transition-colors" />
            </Link>
          )}
          {hotLeadsCount > 0 && (
            <Link
              href="/pipeline"
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg,rgba(251,191,36,.07) 0%,rgba(251,191,36,.02) 100%)",
                border: "1px solid rgba(251,191,36,.14)",
              }}
            >
              <div className="absolute top-0 inset-x-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(251,191,36,.4),transparent)" }} />
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.18)" }}>
                <Calendar className="size-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-black text-amber-300">
                  {hotLeadsCount} hot lead{hotLeadsCount === 1 ? "" : "s"} to move
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">Replied or interested — advance them</p>
              </div>
              <ArrowUpRight className="size-3.5 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
            </Link>
          )}
        </div>
      )}

      {latestDigest && (
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-5 flex items-center gap-6"
          style={{
            background: "linear-gradient(135deg,rgba(56,189,248,.08) 0%,rgba(56,189,248,.03) 100%)",
            border: "1px solid rgba(56,189,248,.16)",
          }}
        >
          <div className="flex-1">
            <p className="text-[13px] font-black text-sky-300">
              Agent digest: {latestDigest.sentCount} actions, {latestDigest.meetingsBookedCount} meetings, {latestDigest.proposalsSentCount} proposals
            </p>
            <p className="text-[11px] text-white/35 mt-0.5">
              {latestDigest.summary ?? "Latest autonomous execution snapshot"} · {latestDigest.flaggedCount} high-risk actions pending
            </p>
          </div>
          <Link
            href="/inbox"
            className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-sky-300 transition-all hover:bg-sky-400/10"
            style={{ border: "1px solid rgba(56,189,248,.22)" }}
          >
            Open AI Queue <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* ── Revenue attribution banner ──────────────────────────────── */}
      {wonRevenue > 0 && (
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-5 flex items-center gap-6"
          style={{
            background: "linear-gradient(135deg,rgba(52,211,153,.08) 0%,rgba(52,211,153,.03) 100%)",
            border: "1px solid rgba(52,211,153,.15)",
          }}
        >
          <div className="absolute top-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(52,211,153,.4),transparent)" }} />
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.2)" }}
          >
            <DollarSign className="size-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-black text-emerald-300">
              {fmtRevenue(wonRevenue)} closed revenue from {wonLeadsCount} won deal{wonLeadsCount !== 1 ? "s" : ""}
            </p>
            <p className="text-[11px] text-white/35 mt-0.5">
              Revenue attribution — based on deal values set in Pipeline
            </p>
          </div>
          <Link
            href="/pipeline"
            className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-emerald-300 transition-all hover:bg-emerald-400/10"
            style={{ border: "1px solid rgba(52,211,153,.2)" }}
          >
            View Pipeline <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* ── Main grid: campaigns + activity ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Campaigns — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-white/80">Campaigns</h2>
              <p className="text-[11px] text-white/25 mt-0.5">Your active outreach sequences</p>
            </div>
            <Link
              href="/campaigns"
              className="flex items-center gap-1 text-[11px] font-semibold text-white/30 hover:text-white/60 transition-colors"
            >
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div
              className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl py-16 text-center"
              style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}
            >
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                <Megaphone className="size-6 text-white/25" />
              </div>
              <p className="font-bold text-white/40">No campaigns yet</p>
              <p className="mt-1 text-[12px] text-white/20 mb-6 max-w-xs">
                Launch your first AI campaign and start booking meetings
              </p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-black"
                style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}
              >
                <Plus className="size-3.5" />
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {campaigns.map(c => (
                <CampaignCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  status={c.status as "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"}
                  totalLeads={c.totalLeads}
                  emailsSent={c.emailsSent}
                  emailsOpened={c.emailsOpened}
                  emailsClicked={c.emailsClicked}
                  replies={c.replies}
                  meetings={c.meetings}
                  launchedAt={c.launchedAt}
                  createdAt={c.createdAt}
                />
              ))}
            </div>
          )}
        </div>

        {/* Activity feed — 1/3 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-white/80 flex items-center gap-2">
                Activity
                <span className="inline-block size-1.5 rounded-full bg-rose-400 animate-pulse" />
              </h2>
              <p className="text-[11px] text-white/25 mt-0.5">Latest email events</p>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-2xl"
            style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}
          >
            {recentEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[.15em] text-white/15">No activity yet</p>
              </div>
            ) : (
              <div>
                {recentEmails.map((e, idx) => {
                  const name = [e.lead.firstName, e.lead.lastName].filter(Boolean).join(" ") || e.lead.email
                  const chip = STATUS_CHIP[e.status] ?? "text-white/30 bg-white/[0.05]"
                  return (
                    <Link
                      key={e.id}
                      href={`/leads/${e.lead.id}`}
                      className="group flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                      style={{ borderBottom: idx < recentEmails.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="truncate text-[12px] font-semibold text-white/70 group-hover:text-white/85 transition-colors">{e.subject}</p>
                        <p className="truncate text-[10px] text-white/25 mt-0.5">{name}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide ${chip}`}>
                          {e.status}
                        </span>
                        <span className="text-[9px] text-white/20">{formatRelative(e.createdAt)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
