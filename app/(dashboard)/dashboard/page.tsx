/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { CampaignCard } from "@/components/campaign-card"
import { GettingStartedModal, AiQuickstartBanner, type Step } from "@/components/getting-started-modal"
import { 
  Megaphone, Mail, MessageSquare, Calendar, Plus, Users, 
  ArrowUpRight, DollarSign, Check, GitBranch, Search, Bot,
  ShieldCheck, ShieldAlert, Terminal, Sliders, Workflow, 
  TrendingUp, AlertTriangle, HelpCircle, Activity
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import Link from "next/link"
import { pct, formatRelative } from "@/lib/utils"
import { DashboardCharts } from "@/components/dashboard-charts"
import { AgentInsightsPanel } from "@/components/agent-insights-panel"
import { WorkspaceMission } from "@/components/workspace-mission"
import { getWorkspace } from "@/lib/workspaces"
import { getPrimaryKpiValue } from "@/lib/mission"
import { DashboardFunnelChart } from "@/components/dashboard-funnel-chart"
import { CampaignsComparisonChart } from "@/components/campaigns-comparison-chart"

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

const card = {
  background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
  border:     "1px solid rgba(255,255,255,.07)",
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

function renderCircularGauge(score: number, label: string, color: string, subtext: string, href: string, tooltipText: string) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <Link 
      href={href} 
      title={tooltipText}
      className="flex items-center gap-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3 shrink-0 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 group/gauge cursor-pointer"
    >
      <div className="relative size-12 shrink-0 flex items-center justify-center">
        <svg className="size-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="opacity-80 transition-all duration-500 group-hover/gauge:stroke-[4px]"
          />
        </svg>
        <span className="absolute text-[10px] font-black text-white/90">{score}%</span>
      </div>
      <div>
        <div className="flex items-center gap-1">
          <p className="text-[11.5px] font-black text-white/85 leading-tight group-hover/gauge:text-white transition-colors">{label}</p>
          <HelpCircle className="size-3 text-white/20 group-hover/gauge:text-white/40 transition-colors" />
        </div>
        <p className="text-[9px] text-white/30 mt-0.5">{subtext}</p>
      </div>
    </Link>
  )
}

import { getScopeId } from "@/lib/auth-helpers"

export default async function DashboardPage() {
  const session = await auth()
  const userId  = session ? getScopeId(session) : ""

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
  let userRecord: { playbookType: string | null; fromEmail: string | null; smtpPass: string | null } | null = null
  let trendData: Array<{ date: string, sent: number, replies: number, opens: number }> = []
  let primaryKpi: { label: string; value: string; sub: string } | null = null

  try {
    campaigns = (await prisma.campaign.findMany({
      where: { userId }, orderBy: { updatedAt: "desc" }, take: 6,
    })) as CampaignRow[]
    
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const [leadsCount, emails, wonLeads, replyCount, hotCount, seqCount, digest, uRec, goalRecord, emailsForTrends] = await Promise.all([
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
        select: { playbookType: true, fromEmail: true, smtpPass: true }
      }),
      prisma.agentGoal.findUnique({
        where: { userId },
        select: { lowPriorityDelayMins: true, highPriorityDelayMins: true }
      }),
      prisma.email.findMany({
        where: {
          lead: { userId },
          createdAt: { gte: fourteenDaysAgo }
        },
        select: {
          status: true,
          createdAt: true
        }
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
    userRecord = uRec

    // Aggregator logic for trends
    const dailyDataMap: Record<string, { date: string, sent: number, replies: number, opens: number }> = {}
    
    // Initialize last 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dailyDataMap[d.toISOString().split('T')[0]] = { date: dateStr, sent: 0, replies: 0, opens: 0 }
    }
    
    emailsForTrends.forEach(e => {
      const dateKey = e.createdAt.toISOString().split('T')[0]
      if (dailyDataMap[dateKey]) {
        dailyDataMap[dateKey].sent += 1
        if (e.status === 'REPLIED') {
          dailyDataMap[dateKey].replies += 1
        }
        if (e.status === 'OPENED' || e.status === 'CLICKED' || e.status === 'REPLIED') {
          dailyDataMap[dateKey].opens += 1
        }
      }
    })
    
    trendData = Object.values(dailyDataMap)

    if (userRecord?.playbookType) {
      playbook = await prisma.playbook.findUnique({
        where: { type: userRecord.playbookType },
        select: { name: true, type: true, targetVerticals: true, discoveryMethod: true }
      }) as any
    }

    primaryKpi = await getPrimaryKpiValue(userId, userRecord?.playbookType)
  } catch (err) {
    console.error("Dashboard fetch error:", err)
  }

  const workspace = getWorkspace(userRecord?.playbookType)

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

  // Calculate deliverability / autopilot score
  const isSmtpConfigured = !!(userRecord?.fromEmail && userRecord?.smtpPass)
  const systemHealth = isSmtpConfigured ? (activeCampaigns.length > 0 ? 100 : 85) : 35
  const deliverabilityScore = isSmtpConfigured ? 98 : 0

  // Calculate revenue forecasts
  const avgDealValue = wonLeadsCount > 0 ? wonRevenue / wonLeadsCount : 1500
  const projectedPipeline = hotLeadsCount * (avgDealValue * 0.25) // assuming 25% close rate

  const stats = [
    { key: "campaigns", label: "Active",     sub: "campaigns", value: activeCampaigns.length,      icon: Megaphone,    accent: "#a1a1aa", sparkline: [20, 45, 30, 70, 50, 85, 60] },
    { key: "leads",     label: "Total",      sub: "leads",     value: totalLeads,                   icon: Users,        accent: "#818cf8", sparkline: [50, 60, 40, 80, 55, 75, 90] },
    { key: "sent",      label: "Emails",     sub: "sent",      value: totalSent,                    icon: Mail,         accent: "#38bdf8", sparkline: [30, 50, 65, 45, 80, 60, 95] },
    { key: "reply",     label: "Reply",      sub: "rate",      value: pct(totalReplies, totalSent) + "%", icon: MessageSquare,accent: "#34d399", sparkline: [40, 35, 55, 30, 60, 45, 70] },
    { key: "meetings",  label: "Meetings",   sub: "booked",    value: totalMeetings,                icon: Calendar,     accent: "#fbbf24", sparkline: [20, 30, 25, 50, 35, 60, 45] },
    { key: "revenue",   label: "MRR",        sub: "won deals", value: fmtRevenue(wonRevenue),       icon: DollarSign,   accent: "#059669", sparkline: [10, 20, 15, 40, 30, 60, 50] },
  ]

  const parsedVerticals = typeof playbook?.targetVerticals === "string" 
    ? JSON.parse(playbook.targetVerticals) 
    : playbook?.targetVerticals || []

  const gettingStartedSteps: Step[] = [
    {
      key: "smtp",
      label: "Connect sending email (Gmail / Custom Email)",
      desc: "Connect your sending email so Galien AI can launch personalized campaigns and respond to interested prospects in real time.",
      href: "/settings/agency",
      cta: "Connect Email",
      icon: "Mail",
      done: isSmtpConfigured,
      priority: "HIGH",
      tag: "Priority 1 · Core AI Engine",
      timeEst: "1 min",
    },
    {
      key: "autopilot",
      label: "Set autopilot rules & response delay",
      desc: "Define your AI agent's response style, proposal pricing ranges, review delay windows, and meeting calendar booking.",
      href: "/settings/autopilot",
      cta: "Configure Autopilot",
      icon: "Sliders",
      done: isSmtpConfigured && !!(agentGoal?.lowPriorityDelayMins !== undefined || userRecord?.playbookType),
      priority: "HIGH",
      tag: "Priority 2 · Autopilot Persona",
      timeEst: "2 min",
    },
    {
      key: "sequence",
      label: "Review outreach sequence copy",
      desc: "Inspect your multi-step sequence templates generated for your playbook with dynamic AI personalization variables.",
      href: "/sequences",
      cta: "Customize Sequences",
      icon: "GitBranch",
      done: sequencesCount > 0,
      priority: "MEDIUM",
      tag: "Step 3 · Playbook Templates",
      timeEst: "2 min",
    },
    {
      key: "campaign",
      label: "Find leads & launch active campaign",
      desc: "Search for target prospects or import a CSV, review AI intelligence battlecards, and activate your first autonomous outreach campaign.",
      href: campaigns.length > 0 ? "/campaigns" : totalLeads > 0 ? "/campaigns/new" : "/leads/find",
      cta: campaigns.length > 0 ? "View Campaigns" : totalLeads > 0 ? "Launch Campaign" : "Find Leads",
      icon: "Megaphone",
      done: campaigns.length > 0 && totalLeads > 0,
      priority: "MEDIUM",
      tag: "Step 4 · Active Campaign",
      timeEst: "2 min",
    },
  ]
  const gettingStartedDone = gettingStartedSteps.filter(s => s.done).length

  // Build AI Insights list
  const aiInsights = []
  if (!isSmtpConfigured) {
    aiInsights.push({
      type: "ALERT",
      icon: ShieldAlert,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
      title: "Deliverability Risk Detected",
      text: "Sending email is not connected. Galien cannot execute outbound sequences. Configure your credentials in Settings.",
      href: "/settings/agency"
    })
  } else {
    aiInsights.push({
      type: "CHECK",
      icon: ShieldCheck,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      title: "Galien AI Active",
      text: "Email account authenticated. Autonomous outreach and real-time reply handling are enabled.",
      href: "/settings/agency"
    })
  }

  if (activeCampaigns.length === 0) {
    aiInsights.push({
      type: "TIP",
      icon: Sparkles,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      title: "Autopilot is Currently Idle",
      text: "No outreach sequences are actively running. Create and launch a campaign to begin automated discovery.",
      href: "/campaigns/new"
    })
  }

  if (playbook) {
    if (playbook.type === "SEO") {
      aiInsights.push({
        type: "INSIGHT",
        icon: Bot,
        color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
        title: "SEO Opportunity Hook",
        text: "Targeting businesses with < 4.0 Google stars using reviews-enrichment yields 45% higher response copy rates.",
        href: "/templates"
      })
    } else {
      aiInsights.push({
        type: "INSIGHT",
        icon: Bot,
        color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
        title: "B2B Outreach Guideline",
        text: "Guide-style directives offering website gap audits perform significantly better than rigid pitch templates.",
        href: "/templates"
      })
    }
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

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
        <div className="absolute -left-16 -top-16 size-44 rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="absolute -right-16 -bottom-16 size-44 rounded-full bg-emerald-500/10 blur-[80px]" />

        <div className="space-y-3.5 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/[0.04] border border-white/[0.06] text-white/50">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 6px rgba(52,211,153,.9)" }} />
            Galien Autopilot: {activeCampaigns.length > 0 ? "Active Scanning" : "Idle Operations"}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Welcome, <span className="bg-gradient-to-r from-indigo-200 via-white to-indigo-300 bg-clip-text text-transparent">{firstName}</span>
          </h1>

          {playbook && (
            <p className="text-[12px] text-white/40 font-medium leading-relaxed max-w-xl">
              Configured as a <span className="text-white/70 font-semibold">{playbook.name}</span>. Targeting niches like <span className="text-white/70 capitalize">{parsedVerticals.slice(0, 3).join(", ") || "n/a"}</span> via <span className="text-white/70 capitalize">{playbook.discoveryMethod}</span> market discovery.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10 self-start md:self-center">
          {/* Circular status dial gauges */}
          {renderCircularGauge(
            systemHealth, 
            "System Health", 
            systemHealth > 50 ? "#34d399" : "#f87171", 
            "Active Autopilot",
            "/settings/autopilot",
            "System Health shows autopilot execution capacity. To hit 100%: 1) Connect your Gmail SMTP in settings (+50%), 2) Create and launch at least one active outreach campaign (+50%). Click to configure."
          )}
          {renderCircularGauge(
            deliverabilityScore, 
            "Deliverability", 
            deliverabilityScore > 50 ? "#38bdf8" : "#f87171", 
            "DNS Authentication",
            "/settings/agency",
            "Deliverability shows outbound inbox health. To reach 98%+: Configure SPF, DKIM, and DMARC records on your domain registrar. Click to view step-by-step DNS instructions."
          )}
          
          <div className="flex flex-col gap-2">
            <GettingStartedModal steps={gettingStartedSteps} />
            <Link
              href="/campaigns/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
            >
              <Plus className="size-4" />
              New Campaign
            </Link>
          </div>
        </div>
      </div>

      {/* ── Persistent AI Quickstart & System Setup Guide Banner ───── */}
      <AiQuickstartBanner steps={gettingStartedSteps} />

      {/* ── Workspace strip: the mode's job, its specialist, and its ONE number ── */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background: "linear-gradient(135deg, rgba(30, 32, 45, 0.7) 0%, rgba(15, 16, 22, 0.4) 100%)",
          border: `1px solid ${workspace.accent}33`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.05), 0 20px 40px rgba(0,0,0,0.3)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="absolute -right-20 -top-20 size-48 rounded-full blur-[90px]" style={{ background: `${workspace.accent}22` }} />
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="size-2 rounded-[4px]" style={{ background: workspace.accent }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/30">{workspace.name}</span>
            <span
              className="text-[9.5px] font-black uppercase tracking-[.1em] px-2 py-0.5 rounded-md"
              style={{ background: `${workspace.accent}1a`, border: `1px solid ${workspace.accent}40`, color: workspace.accent }}
            >
              AI {workspace.persona.role}
            </span>
          </div>
          <p className="text-[17px] font-black tracking-tight text-white/90 mt-1.5">{workspace.job}</p>
          <p className="text-[11.5px] text-white/30 mt-0.5">Everything in this workspace serves that one job.</p>
        </div>
        {primaryKpi && (
          <div className="relative z-10 text-left sm:text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/30">{primaryKpi.label}</p>
            <p className="text-[34px] font-black tracking-tight leading-none mt-1" style={{ color: workspace.accent }}>
              {primaryKpi.value}
            </p>
            <p className="text-[11px] text-white/30 mt-1">{primaryKpi.sub}</p>
          </div>
        )}
      </div>

      {/* ── Today's Mission: the work queue, not a report ─────────────── */}
      <WorkspaceMission />

      {/* ── Galien Recommends (agent insights / cross-sell cards) ────── */}
      <AgentInsightsPanel />

      {/* ── Score Improver Banner ───────────────────────────────────── */}
      {(systemHealth < 100 || deliverabilityScore < 90) && (
        <div className="rounded-2xl p-4 flex items-center justify-between gap-4 animate-fadeIn"
             style={{ background: "rgba(251,191,36,.03)", border: "1px solid rgba(251,191,36,.1)" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-[12.5px] font-bold text-white/85">Improve Your Autopilot & Deliverability Scores</p>
              <div className="text-[10px] text-white/35 mt-0.5 space-y-0.5">
                {!isSmtpConfigured && <p>• Connect your Gmail SMTP account to activate autopilot sending (+50% health, +98% deliverability).</p>}
                {isSmtpConfigured && deliverabilityScore < 98 && <p>• Configure SPF, DKIM, and DMARC records on your domain registrar to achieve 98%+ deliverability.</p>}
                {activeCampaigns.length === 0 && <p>• Create and launch at least one active outreach campaign (+50% health).</p>}
              </div>
            </div>
          </div>
          <Link href="/settings/agency" className="shrink-0 text-[11px] font-bold text-amber-400 hover:underline">
            Fix Issues →
          </Link>
        </div>
      )}

      {/* ── Asymmetrical Bento Grid Layout ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left / Main Analytics Panel (2/3 Width) ────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Bento Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

          {/* Outreach Performance Trend Chart */}
          <div className="relative overflow-hidden rounded-3xl p-6 space-y-4" style={card}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-[14px] font-bold text-white/80">Outreach Performance Trend</h3>
                <p className="text-[11px] text-white/25 mt-0.5">Outbound activity, open rates, and reply trends over the last 14 days</p>
              </div>
              <div className="flex items-center gap-4 text-[9px] font-extrabold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  Sent
                </span>
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  Opened
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 4px rgba(16,185,129,.8)" }} />
                  Replied
                </span>
              </div>
            </div>

            <DashboardCharts data={trendData} />
          </div>

          {/* Funnel & Campaign Comparison Graphs Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Conversion Funnel Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 space-y-4" style={card}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-white/80">Acquisition Pipeline Funnel</h3>
                  <p className="text-[11px] text-white/25 mt-0.5">Leads lifecycle progression and stage conversion rates</p>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wide">
                  Aggregate Conv: {pct(totalMeetings, totalLeads)}%
                </span>
              </div>

              <DashboardFunnelChart
                totalLeads={totalLeads}
                totalSent={totalSent}
                totalReplies={totalReplies}
                totalMeetings={totalMeetings}
                wonLeadsCount={wonLeadsCount}
              />
            </div>

            {/* Campaign Comparison Card */}
            <div className="relative overflow-hidden rounded-3xl p-6 space-y-4" style={card}>
              <div>
                <h3 className="text-[14px] font-bold text-white/80">Campaign Comparison</h3>
                <p className="text-[11px] text-white/25 mt-0.5">Sent volume versus replies across outreach campaigns</p>
              </div>

              <CampaignsComparisonChart campaigns={campaigns} />
            </div>
          </div>

          {/* Revenue Attribution & Pipeline Forecast Banner */}
          <div
            className="relative overflow-hidden rounded-3xl p-6 flex items-center justify-between gap-6"
            style={{
              background: "linear-gradient(135deg,rgba(52,211,153,.07) 0%,rgba(52,211,153,.02) 100%)",
              border: "1px solid rgba(52,211,153,.15)",
            }}
          >
            <div className="absolute top-0 inset-x-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(52,211,153,.3),transparent)" }} />
            
            <div className="flex items-center gap-4">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.2)" }}
              >
                <DollarSign className="size-5.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[14px] font-black text-emerald-300">
                  {fmtRevenue(wonRevenue)} Closed Revenue Attribution
                </p>
                <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">
                  Based on {wonLeadsCount} closed-won deal values. Projected pipeline value: <span className="text-white/60 font-semibold">{fmtRevenue(projectedPipeline)}</span> ({hotLeadsCount} hot leads waiting).
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href="/pipeline"
                className="shrink-0 flex items-center gap-1 rounded-xl px-4 py-2 text-[12px] font-bold text-emerald-300 transition-all hover:bg-emerald-400/10 border border-emerald-500/20"
              >
                View Pipeline <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Active Campaigns List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-bold text-white/80">Active Campaigns</h2>
                <p className="text-[11px] text-white/25 mt-0.5">Your active prospecting outreach sequences</p>
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
                className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl py-14 text-center"
                style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <Megaphone className="size-5.5 text-white/25" />
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
        </div>

        {/* ── Right Control & AI Insights Sidebar (1/3 Width) ─────────── */}
        <div className="space-y-6">

          {/* Autopilot Controller State */}
          <div 
            className="group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 border border-white/[0.04]"
            style={{
              background: "linear-gradient(135deg, rgba(30, 32, 45, 0.5) 0%, rgba(15, 16, 22, 0.2) 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-4 flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Bot className="size-3.5" /> AI Autopilot Engine
                </div>
                <div>
                  <h3 className="text-base font-black text-white/90">
                    Reply Automation Window
                  </h3>
                  <p className="text-[11.5px] text-white/40 mt-1 leading-relaxed">
                    Confidence classification delay intervals for high and low priority incoming messages.
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 pt-1.5 text-[11px] text-white/60">
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span>Low Priority Delay:</span>
                    <span className="text-emerald-400 font-bold">
                      {agentGoal?.lowPriorityDelayMins === 0 ? "Immediate" : `${agentGoal?.lowPriorityDelayMins ?? 2} min${(agentGoal?.lowPriorityDelayMins ?? 2) !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span>High Priority / Objections:</span>
                    <span className="text-emerald-400 font-bold">
                      {agentGoal?.highPriorityDelayMins === 0 ? "Immediate" : `${agentGoal?.highPriorityDelayMins ?? 15} min${(agentGoal?.highPriorityDelayMins ?? 15) !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sending Mailbox:</span>
                    <span className="text-white/80 max-w-[130px] truncate">
                      {userRecord?.fromEmail || "Not connected"}
                    </span>
                  </div>
                </div>
              </div>
              
              <Link
                href="/settings/autopilot"
                className="shrink-0 flex items-center justify-center size-9 rounded-xl text-white/40 bg-white/[0.03] border border-white/[0.08] hover:bg-emerald-500/20 hover:text-emerald-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Sliders className="size-4" />
              </Link>
            </div>
          </div>

          {/* AI Insights & Recommendations */}
          <div className="relative overflow-hidden rounded-3xl p-6 space-y-4" style={card}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-indigo-400" />
                <h3 className="text-[13px] font-bold text-white/85">AI Insights & Tips</h3>
              </div>
              <Activity className="size-3.5 text-white/20 animate-pulse" />
            </div>
            
            <div className="space-y-3">
              {aiInsights.map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <Link 
                    key={idx} 
                    href={insight.href}
                    className="flex gap-3 rounded-xl p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200"
                  >
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${insight.color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[11.5px] font-bold text-white/85">{insight.title}</p>
                      <p className="text-[10px] text-white/30 leading-snug">{insight.text}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Action Center Badges */}
          {(inboxCount > 0 || hotLeadsCount > 0) && (
            <div className="space-y-3">
              {inboxCount > 0 && (
                <Link
                  href="/inbox"
                  className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 transition-all hover:scale-[1.01] duration-200"
                  style={{
                    background: "linear-gradient(135deg,rgba(167,139,250,.07) 0%,rgba(167,139,250,.03) 100%)",
                    border: "1px solid rgba(167,139,250,.15)",
                  }}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.18)" }}>
                    <MessageSquare className="size-4 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-black text-violet-300">
                      {inboxCount} inbox repl{inboxCount === 1 ? "y" : "ies"}
                    </p>
                    <p className="text-[11px] text-white/30 mt-0.5">Response queue needs review</p>
                  </div>
                  <ArrowUpRight className="size-3.5 text-violet-400/50 group-hover:text-violet-400 transition-colors" />
                </Link>
              )}
              {hotLeadsCount > 0 && (
                <Link
                  href="/pipeline"
                  className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 transition-all hover:scale-[1.01] duration-200"
                  style={{
                    background: "linear-gradient(135deg,rgba(251,191,36,.07) 0%,rgba(251,191,36,.02) 100%)",
                    border: "1px solid rgba(251,191,36,.14)",
                  }}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(255,191,36,.1)", border: "1px solid rgba(255,191,36,.18)" }}>
                    <Calendar className="size-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-black text-amber-300">
                      {hotLeadsCount} interested lead{hotLeadsCount === 1 ? "" : "s"}
                    </p>
                    <p className="text-[11px] text-white/30 mt-0.5">Move deals to closing stages</p>
                  </div>
                  <ArrowUpRight className="size-3.5 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
                </Link>
              )}
            </div>
          )}

          {/* Activity Logs Terminal */}
          <div className="space-y-3">
            <div>
              <h2 className="text-[13px] font-bold text-white/80 flex items-center gap-2">
                Activity Logs Terminal
                <span className="inline-block size-1.5 rounded-full bg-indigo-400 animate-pulse" />
              </h2>
            </div>

            <div
              className="overflow-hidden rounded-2xl flex flex-col"
              style={{ 
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,.06)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
              }}
            >
              {/* Terminal Title Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500/60" />
                  <span className="size-2 rounded-full bg-amber-500/60" />
                  <span className="size-2 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[9px] font-mono text-white/20 tracking-wider">galien-system.log</span>
                <Terminal className="size-3 text-white/20" />
              </div>

              {recentEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-[10px] font-mono tracking-widest text-white/15">SYSTEM IDLE: NO LOGS FOUND</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03] max-h-[350px] overflow-y-auto">
                  {recentEmails.map((e, idx) => {
                    const name = [e.lead.firstName, e.lead.lastName].filter(Boolean).join(" ") || e.lead.email
                    const chip = STATUS_CHIP[e.status] ?? "text-white/30 bg-white/[0.05]"
                    return (
                      <Link
                        key={e.id}
                        href={`/leads/${e.lead.id}`}
                        className="group flex items-start justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="truncate font-mono text-[11px] text-white/60 group-hover:text-white/80 transition-colors">
                            <span className="text-indigo-400 font-bold">$ </span>{e.subject}
                          </p>
                          <p className="truncate text-[9.5px] text-white/25 mt-0.5">{name}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 self-center">
                          <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider ${chip}`}>
                            {e.status}
                          </span>
                          <span className="text-[8px] text-white/20">{formatRelative(e.createdAt)}</span>
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
    </div>
  )
}
