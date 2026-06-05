import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { CampaignCard } from "@/components/campaign-card"
import { CampaignCardActions } from "@/components/campaign-card-actions"
import Link from "next/link"
import { Plus, Megaphone } from "lucide-react"

export default async function CampaignsPage() {
  const session = await auth()
  let campaigns: {
    id: string; name: string; status: string; totalLeads: number
    emailsSent: number; emailsOpened: number; emailsClicked: number
    replies: number; meetings: number; launchedAt: Date | null; createdAt: Date; updatedAt: Date
  }[] = []

  try {
    campaigns = await prisma.campaign.findMany({
      where: { userId: session?.user?.id ?? "" },
      orderBy: { updatedAt: "desc" },
    })
  } catch {
    // DB not configured yet
  }

  const active = campaigns.filter(c => c.status === "ACTIVE").length

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between pt-2">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-1.5 rounded-full bg-sky-400" style={{ boxShadow: "0 0 6px rgba(125,211,252,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">
              Outreach Engine
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">
            Campaigns
          </h1>
          <p className="mt-2 text-[13px] text-white/25 font-medium">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            {active > 0 && <span className="text-emerald-400"> · {active} live</span>}
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
