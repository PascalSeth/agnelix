import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { LeadTable } from "@/components/lead-table"
import { LeadFilters } from "@/components/lead-filters"
import Link from "next/link"
import { Upload, Users, MapPin } from "lucide-react"
import { LeadRow } from "@/components/lead-table"
import { LeadStatus } from "@/app/generated/prisma/client"

type SearchParams = { q?: string; status?: string; campaignId?: string }

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  const { q, status, campaignId } = await searchParams
  const userId = session?.user?.id ?? ""

  let leads: LeadRow[] = []
  let total = 0
  let campaigns: { id: string; name: string }[] = []

  try {
    const [leadsData, totalCount, campaignsData] = await Promise.all([
      prisma.lead.findMany({
        where: {
          userId,
          ...(status ? { status: status as LeadStatus } : {}),
          ...(campaignId ? { campaignLeads: { some: { campaignId } } } : {}),
          ...(q
            ? {
                OR: [
                  { email: { contains: q, mode: "insensitive" } },
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { company: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          campaignLeads: {
            include: {
              campaign: {
                select: { name: true }
              }
            }
          }
        }
      }),
      prisma.lead.count({ where: { userId } }),
      prisma.campaign.findMany({
        where: { userId },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      })
    ])
    
    leads = leadsData.map(l => ({
      ...l,
      campaigns: l.campaignLeads.map(cl => cl.campaign.name)
    })) as LeadRow[]
    total = totalCount
    campaigns = campaignsData
  } catch (err) {
    console.error("DB Error:", err)
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between pt-2">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 6px rgba(167,139,250,.9)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">
              Pipeline
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">
            Leads
          </h1>
          <p className="mt-2 text-[13px] text-white/25 font-medium">
            {total.toLocaleString()} total{leads.length < total ? ` · showing ${leads.length}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <Link
            href="/leads/find"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white/70 transition-all hover:text-white/90"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}
          >
            <MapPin className="size-4" />
            Find via Maps
          </Link>
          <Link
            href="/leads/upload"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98]"
            style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)" }}
          >
            <Upload className="size-4" />
            Upload CSV
          </Link>
        </div>
      </div>

      {/* Search & filter */}
      <LeadFilters 
        defaultQ={q} 
        defaultStatus={status} 
        defaultCampaignId={campaignId}
        campaigns={campaigns} 
      />

      {/* Table */}
      {leads.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
          style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}
        >
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
            <Users className="size-6 text-white/25" />
          </div>
          <p className="font-bold text-white/40">No leads found</p>
          <p className="mt-1 text-[12px] text-white/20 mb-6 max-w-xs">
            Find leads via Google Maps or upload a CSV to start campaigns
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/leads/find"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-white/70"
              style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)" }}
            >
              <MapPin className="size-3.5" />
              Find via Maps
            </Link>
            <Link
              href="/leads/upload"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-black"
              style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}
            >
              <Upload className="size-3.5" />
              Upload CSV
            </Link>
          </div>
        </div>
      ) : (
        <LeadTable leads={leads} />
      )}
    </div>
  )
}
