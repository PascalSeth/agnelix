import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { CampaignControls } from "@/components/campaign-controls"
import { CampaignView } from "@/components/campaign-view"
import Link from "next/link"
import {
  ArrowLeft,
  Mail, Eye, MessageSquare, Calendar, Users,
} from "lucide-react"
import { pct } from "@/lib/utils"

const STATUS_BADGE: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT:     { label: "Draft",     color: "rgba(255,255,255,.3)",  dot: "rgba(255,255,255,.3)"  },
  ACTIVE:    { label: "Live",      color: "rgba(52,211,153,.9)",   dot: "#34d399"               },
  PAUSED:    { label: "Paused",    color: "rgba(251,191,36,.9)",   dot: "#fbbf24"               },
  COMPLETED: { label: "Completed", color: "rgba(255,255,255,.4)",  dot: "rgba(255,255,255,.3)"  },
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let campaign: any = null
  try {
    campaign = await prisma.campaign.findUnique({
      where: { id, userId: session?.user?.id ?? "" },
      include: {
        sequence: {
          select: {
            id: true,
            name: true,
            steps: { select: { id: true, stepNumber: true }, orderBy: { stepNumber: "asc" } },
          },
        },
        campaignLeads: {
          orderBy: { enrolledAt: "desc" },
          include: {
            lead: {
              select: {
                id: true, firstName: true, lastName: true,
                email: true, company: true, status: true,
                emails: {
                  where: { campaignId: id },
                  select: {
                    id: true, subject: true, body: true, stepNumber: true,
                    status: true, sentAt: true, openedAt: true,
                    openCount: true, clickCount: true,
                  },
                  orderBy: { stepNumber: "asc" },
                },
              },
            },
          },
        },
      },
    })
  } catch {
    notFound()
  }
  if (!campaign) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads          = campaign.campaignLeads.map((cl: any) => cl.lead)
  const sequenceSteps  = campaign.sequence.steps ?? []
  const stepCount  = campaign.sequence.steps?.length ?? 1
  const badge      = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.DRAFT
  const hasLeads   = leads.length > 0

  // Stats
  const stats = [
    { label: "Leads",    value: leads.length,                                          icon: Users,          color: "rgba(255,255,255,.4)"  },
    { label: "Sent",     value: campaign.emailsSent,                                   icon: Mail,           color: "rgba(125,211,252,.7)"  },
    { label: "Opened",   value: pct(campaign.emailsOpened, campaign.emailsSent),       icon: Eye,            color: "rgba(52,211,153,.7)"   },
    { label: "Replied",  value: pct(campaign.replies, campaign.emailsSent),            icon: MessageSquare,  color: "rgba(167,139,250,.7)"  },
    { label: "Meetings", value: campaign.meetings,                                     icon: Calendar,       color: "rgba(251,191,36,.7)"   },
  ]

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div
        className="shrink-0 px-6 pt-5 pb-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}
      >
        {/* Header row: back + name + status + controls */}
        <div className="flex items-start gap-4">
          <Link
            href="/campaigns"
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:text-white/70"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-[20px] font-black tracking-tight text-white/90 truncate">
                {campaign.name}
              </h1>
              {/* Status badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="size-1.5 rounded-full" style={{ background: badge.dot, boxShadow: `0 0 5px ${badge.dot}` }} />
                <span className="text-[11px] font-bold" style={{ color: badge.color }}>{badge.label}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/25">
              {campaign.sequence.name} · {stepCount} email{stepCount !== 1 ? "s" : ""}
              {hasLeads && ` · ${leads.length} lead${leads.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Action controls */}
          <CampaignControls
            id={id}
            status={campaign.status}
            autonomous={campaign.autonomous}
            hasLeads={hasLeads}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 mt-4 pl-12 flex-wrap">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="size-3 shrink-0" style={{ color }} />
              <span className="text-[13px] font-bold text-white/70">{value}</span>
              <span className="text-[11px] text-white/25">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leads + Sequence tabs ── */}
      <div className="flex-1 min-h-0">
        <CampaignView
          campaignId={id}
          status={campaign.status}
          leads={leads}
          sequenceSteps={sequenceSteps}
        />
      </div>
    </div>
  )
}
