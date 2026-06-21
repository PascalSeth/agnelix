import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { CampaignCard } from "@/components/campaign-card"
import { CampaignCardActions } from "@/components/campaign-card-actions"
import Link from "next/link"
import { Plus, Megaphone, Layers, Users, Mail, MessageSquare, Calendar } from "lucide-react"
import { pct } from "@/lib/utils"

import { getScopeId } from "@/lib/auth-helpers"

export default async function CampaignsPage() {
  const session = await auth()
  const scopeId = session ? getScopeId(session) : ""
  let campaigns: {
    id: string; name: string; status: string; totalLeads: number
    emailsSent: number; emailsOpened: number; emailsClicked: number
    replies: number; meetings: number; launchedAt: Date | null; createdAt: Date; updatedAt: Date
  }[] = []

  try {
    campaigns = await prisma.campaign.findMany({
      where: { userId: scopeId },
      orderBy: { updatedAt: "desc" },
    })
  } catch {
    // DB not configured yet
  }

  const active = campaigns.filter(c => c.status === "ACTIVE").length
  const totalLeads = campaigns.reduce((s, c) => s + c.totalLeads, 0)
  const totalSent = campaigns.reduce((s, c) => s + c.emailsSent, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.replies, 0)
  const totalMeetings = campaigns.reduce((s, c) => s + c.meetings, 0)

  const stats = [
    { label: "Live",      sub: "campaigns", value: active,                      icon: Layers,        accent: "#34d399" },
    { label: "Leads",     sub: "enrolled",  value: totalLeads,                  icon: Users,         accent: "#818cf8" },
    { label: "Emails",    sub: "sent",      value: totalSent,                   icon: Mail,          accent: "#38bdf8" },
    { label: "Reply",     sub: "rate",      value: pct(totalReplies, totalLeads),icon: MessageSquare, accent: "#a78bfa" },
    { label: "Meetings",  sub: "booked",    value: totalMeetings,               icon: Calendar,      accent: "#fbbf24" },
  ]

  return (
    <div className="space-y-8">

      {/* Hero header */}
      <div
        className="relative overflow-hidden rounded-3xl p-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        style={{
          background: "linear-gradient(135deg, rgba(30, 32, 45, 0.7) 0%, rgba(15, 16, 22, 0.4) 100%)",
          border: "1px solid rgba(255,255,255,.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.05), 0 20px 40px rgba(0,0,0,0.3)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Glow vector backs */}
        <div className="absolute -left-16 -top-16 size-44 rounded-full bg-sky-500/10 blur-[80px]" />
        <div className="absolute -right-16 -bottom-16 size-44 rounded-full bg-indigo-500/10 blur-[80px]" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] mb-3 bg-white/[0.04] border border-white/[0.06] text-white/40">
            <span className="size-1.5 rounded-full bg-sky-400" style={{ boxShadow: "0 0 6px rgba(125,211,252,.9)" }} />
            Outreach Engine
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">
            Campaigns
          </h1>
          <p className="mt-2 text-[13px] text-white/30 font-medium">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            {active > 0 && <span className="text-emerald-400"> · {active} live</span>}
          </p>
        </div>

        <Link
          href="/campaigns/new"
          className="relative z-10 inline-flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-[13px] font-bold text-black transition-all hover:scale-[1.02] active:scale-[.98]"
          style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
        >
          <Plus className="size-4" />
          New Campaign
        </Link>
      </div>

      {/* Stats strip */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ label, sub, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.015) 100%)",
                border: "1px solid rgba(255,255,255,.07)",
                boxShadow: "0 1px 0 rgba(255,255,255,.03) inset, 0 4px 20px rgba(0,0,0,0.15)",
              }}
            >
              <div className="absolute top-0 inset-x-0 h-px"
                style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
                style={{ background: `radial-gradient(circle at center,${accent}15 0%,transparent 70%)` }} />

              <div className="relative flex items-center justify-between mb-4">
                <div className="flex size-8 items-center justify-center rounded-xl"
                  style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
                  <Icon className="size-4" style={{ color: accent }} />
                </div>
              </div>

              <p className="relative text-2xl font-black tracking-tight text-white/90 leading-none">{value}</p>
              <div className="relative mt-2 flex items-baseline gap-1">
                <span className="text-[12px] font-bold text-white/60">{label}</span>
                <span className="text-[10px] text-white/25">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {campaigns.length === 0 ? (
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl py-20 text-center"
          style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}
        >
          <div className="absolute top-0 inset-x-6 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)" }} />
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
            <Megaphone className="size-6 text-white/25" />
          </div>
          <p className="font-bold text-white/40">No campaigns yet</p>
          <p className="mt-1 text-[12px] text-white/20 mb-6 max-w-xs">
            Create a campaign to start sending personalised AI email sequences to your leads
          </p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-black"
            style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}
          >
            <Plus className="size-3.5" />
            Create First Campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <div key={c.id} className="flex flex-col">
              <CampaignCard
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
              <CampaignCardActions
                id={c.id}
                status={c.status as "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
