"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { CustomSelect } from "@/components/ui/custom-select"

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "NEW",             label: "New" },
  { value: "CONTACTED",       label: "Contacted" },
  { value: "REPLIED",         label: "Replied" },
  { value: "MEETING_BOOKED",  label: "Meeting Booked" },
  { value: "NOT_INTERESTED",  label: "Not Interested" },
  { value: "BOUNCED",         label: "Bounced" },
]

export function LeadFilters({ 
  defaultQ, 
  defaultStatus, 
  defaultCampaignId,
  campaigns 
}: { 
  defaultQ?: string; 
  defaultStatus?: string;
  defaultCampaignId?: string;
  campaigns: { id: string; name: string }[]
}) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const CAMPAIGN_OPTIONS = [
    { value: "", label: "All campaigns" },
    ...campaigns.map(c => ({ value: c.id, label: c.name }))
  ]

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/leads?${params.toString()}`)
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value
        update("q", q)
      }}
    >
      <div
        className="relative flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-sm"
        style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
      >
        <Search className="size-3.5 text-white/25 shrink-0" />
        <input
          name="q"
          defaultValue={defaultQ}
          placeholder="Search leads…"
          className="bg-transparent text-[13px] text-white/70 outline-none placeholder:text-white/20 flex-1"
        />
      </div>

      <CustomSelect
        value={defaultStatus ?? ""}
        onChange={(v) => update("status", v)}
        options={STATUS_OPTIONS}
        className="w-44"
      />

      <CustomSelect
        value={defaultCampaignId ?? ""}
        onChange={(v) => update("campaignId", v)}
        options={CAMPAIGN_OPTIONS}
        className="w-56"
      />

      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold text-white/60 transition-all hover:text-white/80"
        style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}
      >
        Filter
      </button>
    </form>
  )
}
