import { prisma } from "@/lib/db"
import {
  Users,
  Building2,
  Megaphone,
  Mail,
  FileText,
  UserPlus,
  Bot,
  CheckCircle2,
  XCircle,
  Gauge,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
  Cpu,
  Radio,
  ArrowUpRight,
  type LucideIcon
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { AdminTrainingStudio } from "@/components/admin-training-studio"
import { WORKSPACES } from "@/lib/workspaces"

export default async function AdminDashboard() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    agencyCount,
    memberCount,
    leadCount,
    campaignCount,
    activeCampaignCount,
    emailsSentAgg,
    proposalCount,
    reportCount,
    signups7d,
    signups30d,
    agencies,
    workspaceCounts,
    actionsByStatus,
    styleScores,
    trainingRuleCount,
  ] = await Promise.all([
    prisma.user.count({ where: { teamOwnerId: null, role: { not: "SUPERADMIN" } } }),
    prisma.user.count({ where: { teamOwnerId: { not: null } } }),
    prisma.lead.count(),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.campaign.aggregate({ _sum: { emailsSent: true } }),
    prisma.proposal.count(),
    prisma.clientReport.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, role: { not: "SUPERADMIN" } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo }, role: { not: "SUPERADMIN" } } }),
    prisma.user.findMany({
      where: { teamOwnerId: null, role: { not: "SUPERADMIN" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        agencyName: true,
        createdAt: true,
        playbookType: true,
        fromEmail: true,
        smtpPass: true,
        _count: { select: { leads: true, campaigns: true, proposals: true, teamMembers: true } },
      },
    }),
    prisma.user.groupBy({
      by: ["playbookType"],
      where: { teamOwnerId: null, role: { not: "SUPERADMIN" } },
      _count: { _all: true },
    }),
    prisma.pendingAction.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.agentMemory.groupBy({
      by: ["responseStyle"],
      where: { responseStyle: { not: null } },
      _avg: { score: true },
      _count: { _all: true },
      orderBy: { _avg: { score: "desc" } },
      take: 5,
    }),
    prisma.aiTrainingRule.count({ where: { enabled: true } }),
  ])

  const actionCount = (status: string) => actionsByStatus.find(a => a.status === status)?._count._all ?? 0
  const executed = actionCount("APPROVED") + actionCount("AUTO_EXECUTED")
  const rejected = actionCount("REJECTED")
  const approvalRate = executed + rejected > 0 ? Math.round((executed / (executed + rejected)) * 100) : null

  return (
    <div className="p-6 lg:p-8 space-y-8 min-w-0 max-w-7xl mx-auto">
      {/* ── 1. Fluid Luminous Hero Horizon ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/40 via-[#161824]/90 to-violet-950/30 border border-white/[0.08] backdrop-blur-2xl shadow-2xl space-y-6">
        {/* Background Mesh Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-0 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between flex-wrap gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[.18em] text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-3 py-1 rounded-full shadow-sm">
                <ShieldCheck className="size-3.5" /> Superadmin Mission Control
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[.18em] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full shadow-sm">
                <Activity className="size-3.5 text-emerald-400 animate-pulse" /> Neural Synapse Active
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans">
              Platform Intelligence &amp; Neural Hub
            </h1>

            <p className="text-[13px] text-white/50 leading-relaxed">
              Global multi-tenant governance, live conversational reasoning, dynamic few-shot objection benchmarks, and continuous dataset fine-tuning.
            </p>
          </div>

          {/* Quick Neural Gauges */}
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-black/50 border border-emerald-500/30 px-5 py-3.5 text-right shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                Approval Quotient
              </div>
              <p className="text-3xl font-black text-emerald-300 font-mono tracking-tight">
                {approvalRate != null ? `${approvalRate}%` : "100%"}
              </p>
            </div>

            <div className="rounded-2xl bg-black/50 border border-indigo-500/30 px-5 py-3.5 text-right shadow-lg backdrop-blur-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/80">Directives</p>
              <p className="text-3xl font-black text-indigo-300 font-mono tracking-tight">
                {trainingRuleCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Fluid Stat Horizon ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { icon: Building2, label: "Agencies", value: agencyCount, sub: `${memberCount} seats`, color: "#818cf8", bg: "from-indigo-500/10" },
          { icon: UserPlus, label: "Signups", value: signups7d, sub: `${signups30d} (30d)`, color: "#38bdf8", bg: "from-cyan-500/10" },
          { icon: Users, label: "Leads", value: leadCount, sub: "Pipeline", color: "#34d399", bg: "from-emerald-500/10" },
          { icon: Megaphone, label: "Campaigns", value: campaignCount, sub: `${activeCampaignCount} active`, color: "#fbbf24", bg: "from-amber-500/10" },
          { icon: Mail, label: "Emails Sent", value: emailsSentAgg._sum.emailsSent ?? 0, sub: "Delivered", color: "#f472b6", bg: "from-pink-500/10" },
          { icon: FileText, label: "Proposals", value: proposalCount, sub: `${reportCount} reports`, color: "#a78bfa", bg: "from-violet-500/10" },
        ].map((s, idx) => {
          const Icon = s.icon
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-2xl p-4.5 space-y-2 border border-white/[0.07] bg-gradient-to-b ${s.bg} to-white/[0.015] backdrop-blur-xl hover:border-white/20 transition-all shadow-md group`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex size-7 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]"
                  style={{ color: s.color }}
                >
                  <Icon className="size-3.5" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{s.label}</p>
              </div>
              <p className="text-2xl font-black text-white font-mono tracking-tight">{s.value}</p>
              <p className="text-[11px] text-white/35 font-medium">{s.sub}</p>
            </div>
          )
        })}
      </div>

      {/* ── 3. Conversational Studio & Few-Shot Center ───────────────────── */}
      <AdminTrainingStudio />

      {/* ── 4. Strategic Performance Grid ───────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Agent Quality */}
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-6 space-y-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60">
              <Bot className="size-4 text-cyan-300" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Autonomous Agent Health</h4>
            </div>
            <span className="text-[10.5px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {approvalRate != null ? `${approvalRate}% Win` : "100%"}
            </span>
          </div>

          <div className="space-y-2.5 text-[12.5px]">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/[0.04]">
              <span className="flex items-center gap-2 text-white/60">
                <CheckCircle2 className="size-4 text-emerald-400" /> Approved / Auto
              </span>
              <span className="font-bold text-white font-mono">{executed}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/[0.04]">
              <span className="flex items-center gap-2 text-white/60">
                <XCircle className="size-4 text-rose-400" /> Rep Rejections
              </span>
              <span className="font-bold text-white font-mono">{rejected}</span>
            </div>
          </div>

          <p className="text-[11px] text-white/30 leading-relaxed">
            Rejection signals are automatically indexed into the live radar to uncover friction points and reinforce few-shot benchmarks.
          </p>
        </div>

        {/* Response Styles by Score */}
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-6 space-y-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2 text-white/60">
            <TrendingUp className="size-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Empirical Strategy Scores</h4>
          </div>

          <div className="space-y-2 text-[12.5px]">
            {styleScores.length === 0 ? (
              <p className="text-[11.5px] text-white/30 py-6 text-center">
                Outcome scores populate dynamically as reply drafts convert into booked calls.
              </p>
            ) : (
              styleScores.map(s => (
                <div key={s.responseStyle} className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/[0.04]">
                  <span className="text-white/70 font-medium truncate">{s.responseStyle}</span>
                  <span className="font-bold text-white font-mono tabular-nums">
                    {(s._avg.score ?? 0).toFixed(2)}{" "}
                    <span className="text-white/30 font-normal">({s._count._all})</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Playbook Distribution */}
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-6 space-y-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2 text-white/60">
            <Zap className="size-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Tenants by Playbook OS</h4>
          </div>

          <div className="space-y-2 text-[12.5px]">
            {workspaceCounts.map(w => (
              <div key={w.playbookType ?? "none"} className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/[0.04]">
                <span className="flex items-center gap-2 text-white/70">
                  <span
                    className="size-2 rounded-full shadow-sm"
                    style={{ background: WORKSPACES[w.playbookType ?? ""]?.accent ?? "#818cf8" }}
                  />
                  {WORKSPACES[w.playbookType ?? ""]?.name ?? w.playbookType ?? "General"}
                </span>
                <span className="font-bold text-white font-mono">{w._count._all}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Fluid Tenant Matrix Directory ────────────────────────────── */}
      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] via-black/40 to-black/60 backdrop-blur-2xl overflow-hidden shadow-2xl">
        <div className="px-7 py-5 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Agency Tenant Directory</h3>
            <p className="text-[11.5px] text-white/40">Real-time status, playbook configuration, and infrastructure health</p>
          </div>
          <span className="text-[11px] font-mono font-bold text-cyan-300 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            {agencies.length} Active Tenants
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                {["Agency Tenant", "Playbook OS", "Leads", "Campaigns", "Proposals", "Seats", "SMTP Status", "Joined"].map(h => (
                  <th key={h} className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-white/35 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {agencies.map(u => {
                const ws = WORKSPACES[u.playbookType ?? ""]
                const smtpReady = !!(u.fromEmail && u.smtpPass)
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-[13px] font-bold text-white tracking-tight">{u.agencyName || u.name || "—"}</p>
                      <p className="text-[11px] text-white/35 font-mono">{u.email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/80 font-medium px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                        <span className="size-2 rounded-full" style={{ background: ws?.accent ?? "#818cf8" }} />
                        {ws?.name ?? u.playbookType ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12.5px] font-bold text-white/75 font-mono tabular-nums">{u._count.leads}</td>
                    <td className="px-6 py-4 text-[12.5px] font-bold text-white/75 font-mono tabular-nums">{u._count.campaigns}</td>
                    <td className="px-6 py-4 text-[12.5px] font-bold text-white/75 font-mono tabular-nums">{u._count.proposals}</td>
                    <td className="px-6 py-4 text-[12.5px] text-white/40 font-mono tabular-nums">{u._count.teamMembers + 1}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          smtpReady
                            ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                            : "text-white/35 bg-white/[0.03] border-white/[0.06]"
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${smtpReady ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                        {smtpReady ? "Connected" : "Pending Setup"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11.5px] text-white/35 font-mono whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                )
              })}
              {agencies.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-white/20">
                    No agency tenants onboarded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
