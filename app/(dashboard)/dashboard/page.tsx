/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { CampaignCard } from "@/components/campaign-card"
import { GettingStartedModal } from "@/components/getting-started-modal"
import { Megaphone, Mail, MessageSquare, Calendar, Plus, Users, ArrowUpRight, DollarSign, Check, GitBranch, Search, Bot } from "lucide-react"
import Link from "next/link"
import { pct, formatRelative } from "@/lib/utils"
import { toast } from "sonner"

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
  SENT:    "text-white/40 bg-white/[0.06] border border-white/5",
  OPENED:  "text-sky-300 bg-sky-400/10 border border-sky-400/20",
  CLICKED: "text-blue-300 bg-blue-400/10 border border-blue-400/20",
  REPLIED: "text-emerald-300 bg-emerald-400/10 border border-emerald-400/20",
  BOUNCED: "text-rose-400 bg-rose-400/10 border border-rose-400/20",
}

function renderSparkline(points: number[], color: string) {
  const width = 100
  const height = 30
  const pad = 2
  const step = (width - pad * 2) / (points.length - 1)
  const pathParts = points.map((p, idx) => {
    const x = pad + idx * step
    const y = height - pad - (p / 100) * (height - pad * 2)
    return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
  })
  const pathD = pathParts.join(" ")
  
  return (
    <svg className="w-full h-8 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-25 blur-[2px]"
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
  let playbook: { name: string; type: string; targetVerticals: any; discoveryMethod: string } | null = null
  let agentGoal: { lowPriorityDelayMins: number; highPriorityDelayMins: number } | null = null

  try {
    campaigns = (await prisma.campaign.findMany({
      where: { userId }, orderBy: { updatedAt: "desc" }, take: 6,
    })) as CampaignRow[]
    
    const [leadsCount, emails, wonLeads, replyCount, hotCount, seqCount, digest, userRecord, goalRecord] = await Promise.all([
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
      prisma.user.findUnique({
        where: { id: userId },
        select: { playbookType: true }
      }),
      prisma.agentGoal.findUnique({
        where: { userId },
        select: { lowPriorityDelayMins: true, highPriorityDelayMins: true }
      })
    ])

    totalLeads = leadsCount
    recentEmails = emails
    wonLeadsCount = wonLeads.length
    wonRevenue = wonLeads.reduce((s, l) => s + (l.dealValue ?? 0), 0)
    inboxCount = replyCount
    hotLeadsCount = hotCount
    sequencesCount = seqCount
    latestDigest = digest
    agentGoal = goalRecord

    if (userRecord?.playbookType) {
      playbook = await prisma.playbook.findUnique({
        where: { type: userRecord.playbookType },
        select: { name: true, type: true, targetVerticals: true, discoveryMethod: true }
      }) as any
    }
  } catch (err) {
    console.error("Dashboard fetch error:", err)
  }

  const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE")
  const totalSent    = campaigns.reduce((s, c) => s + c.emailsSent, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.replies, 0)
  const totalMeetings= campaigns.reduce((s, c) => s + c.meetings, 0)
  const firstName    = session?.user?.name?.split(" ")[0] ?? "there"

  function fmtRevenue(v: number) {
    if (v === 0) return "£0"
    if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `£${(v / 1_000).toFixed(0)}k`
    return `£${v}`
  }

  const stats = [
    { key: "campaigns", label: "Active",     sub: "campaigns", value: activeCampaigns.length,      icon: Megaphone,    accent: "#a1a1aa", sparkline: [20, 45, 30, 70, 50, 85, 60] },
    { key: "leads",     label: "Total",      sub: "leads",     value: totalLeads,                   icon: Users,        accent: "#818cf8", sparkline: [50, 60, 40, 80, 55, 75, 90] },
    { key: "sent",      label: "Emails",     sub: "sent",      value: totalSent,                    icon: Mail,         accent: "#38bdf8", sparkline: [30, 50, 65, 45, 80, 60, 95] },
    { key: "reply",     label: "Reply",      sub: "rate",      value: pct(totalReplies, totalLeads), icon: MessageSquare,accent: "#34d399", sparkline: [40, 35, 55, 30, 60, 45, 70] },
    { key: "meetings",  label: "Meetings",   sub: "booked",    value: totalMeetings,                icon: Calendar,     accent: "#fbbf24", sparkline: [20, 30, 25, 50, 35, 60, 45] },
    { key: "revenue",   label: "MRR",        sub: "won deals", value: fmtRevenue(wonRevenue),       icon: DollarSign,   accent: "#059669", sparkline: [10, 20, 15, 40, 30, 60, 50] },
  ]

  const parsedVerticals = typeof playbook?.targetVerticals === "string" 
    ? JSON.parse(playbook.targetVerticals) 
    : playbook?.targetVerticals || []

  const gettingStartedSteps = [
    {
      key: "sequence",
      label: "Plan your outreach sequence",
      desc: "Set the timing and messages your AI sends — tailored to how your agency talks to prospects.",
      href: "/sequences",
      cta: "Build a sequence",
      icon: "GitBranch",
      done: sequencesCount > 0,
    },
    {
      key: "leads",
      label: "Find your first leads",
      desc: "Search for businesses that match your ideal client and import them into your pipeline.",
      href: "/leads/find",
      cta: "Find leads",
      icon: "Search",
      done: totalLeads > 0,
    },
    {
      key: "campaign",
      label: "Launch a campaign",
      desc: "Combine your leads and sequence so Agnelix can start reaching out automatically.",
      href: "/campaigns/new",
      cta: "Create campaign",
      icon: "Megaphone",
      done: campaigns.length > 0,
    },
  ]
  const gettingStartedDone = gettingStartedSteps.filter(s => s.done).length
  const showGettingStarted = gettingStartedDone < gettingStartedSteps.length

  return (
    <div className="space-y-8">

      {/* ── Welcome Hero Panel ────────────────────────────────────────── */}
      <div 
        className="relative overflow-hidden rounded-3xl p-7 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          background: "linear-gradient(135deg, rgba(30, 32, 45, 0.7) 0%, rgba(15, 16, 22, 0.4) 100%)",
          border: "1px solid rgba(255,255,255,.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.05), 0 20px 40px rgba(0,0,0,0.3)",
          backdropFilter: "blur(16px)"
        }}
      >
        {/* Glow vector backs */}
        <div className="absolute -left-16 -top-16 size-44 rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="absolute -right-16 -bottom-16 size-44 rounded-full bg-emerald-500/10 blur-[80px]" />

        <div className="space-y-2.5 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/[0.04] border border-white/[0.06] text-white/50">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 6px rgba(52,211,153,.9)" }} />
            Agnel Autopilot: {activeCampaigns.length > 0 ? "Active Search" : "Idle Operations"}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Welcome, <span className="bg-gradient-to-r from-indigo-200 via-white to-indigo-300 bg-clip-text text-transparent">{firstName}</span>
          </h1>

          {playbook && (
            <p className="text-[12.5px] text-white/40 font-medium leading-relaxed max-w-xl">
              Configured as a <span className="text-white/70 font-semibold">{playbook.name}</span>. Targeting niches like <span className="text-white/70 capitalize">{parsedVerticals.slice(0, 3).join(", ") || "n/a"}</span> via <span className="text-white/70 capitalize">{playbook.discoveryMethod}</span> scraping channels.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10 self-start md:self-center">
          <GettingStartedModal steps={gettingStartedSteps} />
          <Link
            href="/playbooks"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Playbook Settings
          </Link>
          <Link
            href="/settings/autopilot"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            AI Config
          </Link>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
          >
            <Plus className="size-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* ── Getting Started Modal (handled by component) ──────────────── */}

      {/* ── Stat cards (Bento with glowing SVGs) ─────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ key, label, sub, value, accent, sparkline }) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.015) 100%)",
              border: "1px solid rgba(255,255,255,.07)",
              boxShadow: "0 1px 0 rgba(255,255,255,.03) inset, 0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            {/* Accent top line */}
            <div className="absolute top-0 inset-x-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
              style={{ background: `radial-gradient(circle at center,${accent}15 0%,transparent 70%)` }} />

            {/* Sparkline curve */}
            <div className="relative h-8 mb-4 flex items-end">
              {renderSparkline(sparkline, accent)}
            </div>

            <p className="relative text-2xl font-black tracking-tight text-white/90 leading-none">{value}</p>
            <div className="relative mt-2 flex items-baseline gap-1">
              <span className="text-[12px] font-bold text-white/60">{label}</span>
              <span className="text-[10px] text-white/25">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI & Playbook Configuration Center ────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Playbook settings card */}
        <div 
          className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 border border-white/[0.04] hover:border-violet-500/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]"
          style={{
            background: "linear-gradient(135deg, rgba(30, 32, 45, 0.5) 0%, rgba(15, 16, 22, 0.2) 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          {/* Glowing gradient back */}
          <div className="absolute -right-20 -bottom-20 size-40 rounded-full bg-violet-500/5 blur-[80px] group-hover:bg-violet-500/10 transition-all duration-500" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <GitBranch className="size-3.5" /> Playbook Config
              </div>
              <div>
                <h3 className="text-base font-black text-white/90 group-hover:text-white transition-colors">
                  {playbook?.name || "No Playbook Configured"}
                </h3>
                <p className="text-[11.5px] text-white/40 mt-1 leading-relaxed">
                  Active playbook controls lead discovery channels, target verticals, and personalization strategies.
                </p>
              </div>
              
              {playbook && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[10px] font-bold text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1">
                    Method: <span className="text-violet-400 capitalize">{playbook.discoveryMethod}</span>
                  </span>
                  {parsedVerticals.slice(0, 3).map((v: string) => (
                    <span key={v} className="text-[10px] font-bold text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1 capitalize">
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <Link
              href="/playbooks"
              className="shrink-0 flex items-center justify-center size-9 rounded-xl text-white/40 bg-white/[0.03] border border-white/[0.08] hover:bg-violet-500/20 hover:text-violet-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Configure Playbook"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* AI Autopilot Settings Card */}
        <div 
          className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 border border-white/[0.04] hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(52,211,153,0.06)]"
          style={{
            background: "linear-gradient(135deg, rgba(30, 32, 45, 0.5) 0%, rgba(15, 16, 22, 0.2) 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          {/* Glowing gradient back */}
          <div className="absolute -right-20 -bottom-20 size-40 rounded-full bg-emerald-500/5 blur-[80px] group-hover:bg-emerald-500/10 transition-all duration-500" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Bot className="size-3.5 animate-pulse" /> AI Autopilot Engine
              </div>
              <div>
                <h3 className="text-base font-black text-white/90 group-hover:text-white transition-colors">
                  Autonomous Reply Settings
                </h3>
                <p className="text-[11.5px] text-white/40 mt-1 leading-relaxed">
                  Controls minimum classification confidence thresholds, daily sends quotas, and automatic response window timing.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[10px] font-bold text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1">
                  Delay: <span className="text-emerald-400">
                    {agentGoal?.lowPriorityDelayMins === 0 ? "Immediate" : `${agentGoal?.lowPriorityDelayMins ?? 2} min${(agentGoal?.lowPriorityDelayMins ?? 2) !== 1 ? 's' : ''}`}
                  </span>
                </span>
                <span className="text-[10px] font-bold text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1">
                  Objections: <span className="text-emerald-400">
                    {agentGoal?.highPriorityDelayMins === 0 ? "Immediate" : `${agentGoal?.highPriorityDelayMins ?? 15} min${(agentGoal?.highPriorityDelayMins ?? 15) !== 1 ? 's' : ''}`}
                  </span>
                </span>
                <span className="text-[10px] font-bold text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1">
                  Model: <span className="text-emerald-400">DeepSeek-V4-Pro</span>
                </span>
              </div>
            </div>
            
            <Link
              href="/settings/autopilot"
              className="shrink-0 flex items-center justify-center size-9 rounded-xl text-white/40 bg-white/[0.03] border border-white/[0.08] hover:bg-emerald-500/20 hover:text-emerald-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Configure Autopilot"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Action Center ───────────────────────────────────────────── */}
      {(inboxCount > 0 || hotLeadsCount > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {inboxCount > 0 && (
            <Link
              href="/inbox"
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 transition-all hover:scale-[1.005] duration-200"
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
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 transition-all hover:scale-[1.005] duration-200"
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

      {/* ── AI Autopilot Command Digest ──────────────────────────────── */}
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
            <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">
              {latestDigest.summary ?? "Latest autonomous execution snapshot"} · {latestDigest.flaggedCount} high-risk actions pending review
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

      {/* ── Revenue Attribution Banner ──────────────────────────────── */}
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

      {/* ── Main Command Grid: Campaigns + Activity Feed ────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Campaigns — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-white/80">Active Campaigns</h2>
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
              <p className="font-bold text-white/40">No campaigns configured</p>
              <p className="mt-1 text-[12px] text-white/20 mb-6 max-w-xs leading-relaxed">
                Launch your first AI campaign to begin automated prospecting
              </p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-black"
                style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}
              >
                <Plus className="size-3.5" />
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {campaigns.map(c => (
                <CampaignCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  status={c.status as any}
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

        {/* Activity feed terminal — 1/3 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-white/80 flex items-center gap-2">
                Activity Logs
                <span className="inline-block size-1.5 rounded-full bg-indigo-400 animate-pulse" />
              </h2>
              <p className="text-[11px] text-white/25 mt-0.5">Real-time system events</p>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-2xl flex flex-col"
            style={{ 
              background: "linear-gradient(145deg,rgba(255,255,255,.02) 0%,rgba(255,255,255,.005) 100%)",
              border: "1px solid rgba(255,255,255,.06)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
            }}
          >
            {recentEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[.15em] text-white/15">No events logged</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {recentEmails.map((e, idx) => {
                  const name = [e.lead.firstName, e.lead.lastName].filter(Boolean).join(" ") || e.lead.email
                  const chip = STATUS_CHIP[e.status] ?? "text-white/30 bg-white/[0.05]"
                  return (
                    <Link
                      key={e.id}
                      href={`/leads/${e.lead.id}`}
                      className="group flex items-start justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="truncate text-[12px] font-bold text-white/70 group-hover:text-white/90 transition-colors">{e.subject}</p>
                        <p className="truncate text-[10px] text-white/25 mt-1">{name}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5 self-center">
                        <span className={`rounded-full px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${chip}`}>
                          {e.status}
                        </span>
                        <span className="text-[8.5px] text-white/20">{formatRelative(e.createdAt)}</span>
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
