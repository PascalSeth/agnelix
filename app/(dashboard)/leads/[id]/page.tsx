import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { LeadEditPanel } from "@/components/lead-edit-panel"
import { LeadPipelinePanel } from "@/components/lead-pipeline-panel"
import { LeadTabsPanel } from "@/components/lead-tabs-panel"
import Link from "next/link"
import { ArrowLeft, Mail, Globe, Building2, Briefcase, MapPin, Inbox } from "lucide-react"
import { formatDate, initials } from "@/lib/utils"

const LEAD_STATUS: Record<string, { text: string; bg: string }> = {
  NEW:            { text: "text-white/40",    bg: "rgba(255,255,255,.06)"  },
  CONTACTED:      { text: "text-sky-300",     bg: "rgba(125,211,252,.1)"  },
  REPLIED:        { text: "text-violet-300",  bg: "rgba(167,139,250,.1)"  },
  INTERESTED:     { text: "text-amber-300",   bg: "rgba(251,191,36,.1)"   },
  MEETING_BOOKED: { text: "text-emerald-300", bg: "rgba(52,211,153,.1)"   },
  PROPOSAL_SENT:  { text: "text-orange-300",  bg: "rgba(249,115,22,.1)"   },
  WON:            { text: "text-emerald-400", bg: "rgba(52,211,153,.12)"  },
  LOST:           { text: "text-red-400",     bg: "rgba(239,68,68,.1)"    },
  NOT_INTERESTED: { text: "text-white/30",    bg: "rgba(255,255,255,.04)" },
  BOUNCED:        { text: "text-red-400",     bg: "rgba(239,68,68,.1)"    },
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const { id } = await params
  const userId = session.user.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lead: any = null
  try {
    lead = await prisma.lead.findUnique({
      where: { id, userId },
      include: {
        emails: {
          orderBy: { stepNumber: "asc" },
          select: {
            id: true, subject: true, body: true, stepNumber: true,
            status: true, sentAt: true, openCount: true, clickCount: true,
          },
        },
      },
    })
  } catch { notFound() }
  if (!lead) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activities: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let replies: any[] = []

  try {
    const [acts, reps] = await Promise.all([
      prisma.activity.findMany({
        where: { leadId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, type: true, note: true, createdAt: true, metadata: true },
      }),
      prisma.reply.findMany({
        where: { leadId: id },
        orderBy: { receivedAt: "desc" },
        take: 10,
        select: { id: true, fromEmail: true, subject: true, body: true, receivedAt: true },
      }),
    ])
    activities = acts
    replies = reps
  } catch { /* graceful degrade */ }

  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email
  const ls = LEAD_STATUS[lead.status] ?? LEAD_STATUS.NEW

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div
        className="shrink-0 px-6 pt-5 pb-4 flex items-center gap-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}
      >
        <Link
          href="/leads"
          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 hover:text-white/70 transition-colors"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <ArrowLeft className="size-4" />
        </Link>

        {/* Avatar */}
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white/60"
          style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" }}
        >
          {initials(name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h1 className="text-[20px] font-black tracking-tight text-white/90 truncate leading-none">
              {name}
            </h1>
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${ls.text}`}
              style={{ background: ls.bg }}
            >
              {lead.status.replace(/_/g, " ")}
            </span>
            {replies.length > 0 && (
              <Link
                href="/inbox"
                className="flex items-center gap-1 text-[9px] font-black text-violet-300 uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "rgba(167,139,250,.1)" }}
              >
                <Inbox className="size-2.5" />
                {replies.length} repl{replies.length === 1 ? "y" : "ies"}
              </Link>
            )}
          </div>
          <p className="text-[12px] text-white/30 truncate">
            {[lead.title, lead.company].filter(Boolean).join(" · ") || lead.email}
          </p>
        </div>

        <LeadEditPanel lead={{
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          title: lead.title,
          company: lead.company,
          notes: lead.notes,
          status: lead.status,
        }} />
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left sidebar */}
        <div
          className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 overflow-y-auto p-4 gap-4"
          style={{ borderRight: "1px solid rgba(255,255,255,.05)" }}
        >
          {/* Lead info card */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
              border: "1px solid rgba(255,255,255,.07)",
            }}
          >
            <p className="text-[10px] font-black text-white/25 uppercase tracking-[.18em]">Lead Info</p>

            {[
              { icon: Mail,      label: "Email",    val: lead.email        },
              { icon: Building2, label: "Company",  val: lead.company      },
              { icon: Briefcase, label: "Title",    val: lead.title        },
              { icon: Globe,     label: "Industry", val: lead.industry     },
              { icon: Globe,     label: "Website",  val: lead.website, url: true },
              { icon: MapPin,    label: "Added",    val: formatDate(lead.createdAt) },
            ].filter(r => r.val).map(({ icon: Icon, label, val, url }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon className="size-3 text-white/20 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-wide">{label}</p>
                  {url ? (
                    <a
                      href={val as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400/70 hover:text-sky-400 truncate block transition-colors"
                    >
                      {(val as string).replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  ) : (
                    <p className="text-[12px] text-white/60 truncate">{val as string}</p>
                  )}
                </div>
              </div>
            ))}

            {lead.notes && (
              <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-[11px] text-white/45 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Pipeline + activities */}
          <LeadPipelinePanel
            leadId={lead.id}
            initialStatus={lead.status}
            initialDealValue={lead.dealValue ?? null}
            initialBattleCard={lead.battleCard ?? null}
            initialActivities={activities}
          />
        </div>

        {/* Right: tabs panel */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5">
          {/* Mobile: lead info (above tabs, only on mobile) */}
          <div
            className="lg:hidden rounded-2xl p-4 mb-4 space-y-2"
            style={{
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.07)",
            }}
          >
            {lead.company && <p className="text-[12px] font-semibold text-white/60"><Building2 className="size-3 inline mr-1.5 opacity-50" />{lead.company}</p>}
            <p className="text-[11px] text-white/35 font-mono">{lead.email}</p>
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-sky-400/60 truncate block">
                {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            )}
          </div>

          <LeadTabsPanel
            leadId={lead.id}
            leadEmail={lead.email}
            leadWebsite={lead.website ?? null}
            leadCompany={lead.company ?? null}
            emails={lead.emails}
            replies={replies}
          />

          {/* Mobile: pipeline panel below tabs */}
          <div className="lg:hidden mt-4">
            <LeadPipelinePanel
              leadId={lead.id}
              initialStatus={lead.status}
              initialDealValue={lead.dealValue ?? null}
              initialBattleCard={lead.battleCard ?? null}
              initialActivities={activities}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
