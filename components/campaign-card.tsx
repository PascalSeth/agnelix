import Link from "next/link"
import { ArrowUpRight, Mail, MousePointer2, MessageSquare, Calendar } from "lucide-react"
import { formatDate, pct } from "@/lib/utils"

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"

interface CampaignCardProps {
  id: string; name: string; status: CampaignStatus; totalLeads: number
  emailsSent: number; emailsOpened: number; emailsClicked: number
  replies: number; meetings: number; launchedAt: Date | null; createdAt: Date
}

const STATUS: Record<CampaignStatus, { label: string; dot: string; text: string }> = {
  DRAFT:     { label: "Draft",     dot: "bg-white/25",    text: "text-white/35"  },
  ACTIVE:    { label: "Active",    dot: "bg-emerald-400", text: "text-emerald-300" },
  PAUSED:    { label: "Paused",    dot: "bg-amber-400",   text: "text-amber-300"  },
  COMPLETED: { label: "Completed", dot: "bg-white/30",    text: "text-white/40"   },
}

export function CampaignCard({
  id, name, status, totalLeads, emailsSent, emailsOpened,
  replies, meetings, launchedAt, createdAt,
}: CampaignCardProps) {
  const s        = STATUS[status]
  const openRate = pct(emailsOpened, emailsSent)
  const replyRate= pct(replies, emailsSent)
  const sentPct  = totalLeads > 0 ? Math.round((emailsSent / totalLeads) * 100) : 0

  const metrics = [
    { icon: Mail,          label: "Sent",    value: emailsSent },
    { icon: MousePointer2, label: "Opens",   value: openRate   },
    { icon: MessageSquare, label: "Replies", value: replyRate  },
    { icon: Calendar,      label: "Booked",  value: meetings   },
  ]

  return (
    <Link
      href={`/campaigns/${id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(145deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.02) 100%)",
        border: "1px solid rgba(255,255,255,.07)",
        boxShadow: "0 1px 0 rgba(255,255,255,.03) inset",
      }}
    >
      {/* hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "radial-gradient(ellipse at top left,rgba(255,255,255,.04) 0%,transparent 65%)" }} />
      {/* top sheen */}
      <div className="absolute top-0 inset-x-6 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)" }} />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="font-bold text-[13px] text-white/80 truncate leading-snug">{name}</h3>
          <p className="text-[10px] text-white/25 mt-0.5">
            {totalLeads} leads ·{" "}
            {launchedAt ? `Launched ${formatDate(launchedAt)}` : `Created ${formatDate(createdAt)}`}
          </p>
        </div>
        <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${s.text}`}
          style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
          <span className={`size-1.5 rounded-full ${s.dot} ${status === "ACTIVE" ? "animate-pulse" : ""}`} />
          {s.label}
        </div>
      </div>

      {/* Progress bar */}
      {status !== "DRAFT" && totalLeads > 0 && (
        <div className="relative mb-4 space-y-1">
          <div className="flex justify-between text-[9px] text-white/20 font-semibold uppercase tracking-wide">
            <span>Progress</span>
            <span>{emailsSent} / {totalLeads}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${sentPct}%`,
                background: "linear-gradient(90deg,rgba(255,255,255,.3),rgba(255,255,255,.6))",
              }}
            />
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="relative grid grid-cols-4 gap-1 rounded-xl p-3"
        style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
        {metrics.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <Icon className="size-3.5 text-white/20" />
            <p className="text-[12px] font-black text-white/70">{value}</p>
            <p className="text-[8px] text-white/20 uppercase tracking-wide leading-none">{label}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative mt-3 flex items-center justify-end gap-1 text-[10px] font-bold text-white/20 group-hover:text-white/50 transition-colors uppercase tracking-wide">
        View <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  )
}
