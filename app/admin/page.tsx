import { prisma } from "@/lib/db"
import { Users, Building2, Megaphone, Mail, FileText, UserPlus, type LucideIcon } from "lucide-react"

function StatCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2" style={{ backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-2 text-white/30">
        <Icon className="size-4" />
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub ? <p className="text-[11px] text-white/30">{sub}</p> : null}
    </div>
  )
}

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
    recentSignups,
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
      take: 10,
      select: { id: true, name: true, email: true, agencyName: true, createdAt: true, playbookType: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-400/70">Superadmin</p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Platform Overview</h1>
        <p className="text-sm text-white/40">Read-only monitoring across all agencies. No agency's leads, campaigns, or messages are accessible here.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Building2} label="Agencies" value={agencyCount} sub={`${memberCount} team seats`} />
        <StatCard icon={UserPlus} label="Signups (7d)" value={signups7d} sub={`${signups30d} in last 30d`} />
        <StatCard icon={Users} label="Leads in system" value={leadCount} />
        <StatCard icon={Megaphone} label="Campaigns" value={campaignCount} sub={`${activeCampaignCount} active`} />
        <StatCard icon={Mail} label="Emails sent" value={emailsSentAgg._sum.emailsSent ?? 0} />
        <StatCard icon={FileText} label="Proposals / Reports" value={`${proposalCount} / ${reportCount}`} />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5" style={{ backdropFilter: "blur(12px)" }}>
        <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Recent agency signups</p>
        <div className="space-y-2">
          {recentSignups.map(u => (
            <div key={u.id} className="flex items-center justify-between text-[12px] py-2 border-b border-white/[0.04] last:border-0">
              <div>
                <span className="text-white/80 font-semibold">{u.agencyName || u.name || u.email}</span>
                <span className="text-white/30 ml-2">{u.email}</span>
              </div>
              <div className="flex items-center gap-3 text-white/30">
                <span>{u.playbookType || "—"}</span>
                <span>{new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {recentSignups.length === 0 && <p className="text-xs text-white/20">No signups yet.</p>}
        </div>
      </div>
    </div>
  )
}
