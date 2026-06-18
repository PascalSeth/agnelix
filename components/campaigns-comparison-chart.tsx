"use client"

import React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"

interface CampaignRow {
  id: string
  name: string
  status: string
  emailsSent: number
  replies: number
}

interface CampaignsComparisonChartProps {
  campaigns: CampaignRow[]
}

export function CampaignsComparisonChart({ campaigns }: CampaignsComparisonChartProps) {
  // Map to chart data
  const chartData = campaigns.map((c) => ({
    name: c.name,
    sent: c.emailsSent,
    replies: c.replies,
  }))

  if (campaigns.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl bg-white/[0.01] border border-white/[0.04] text-[12px] text-white/25">
        Launch your first campaign to compare outreach performance
      </div>
    )
  }

  return (
    <div className="w-full h-[200px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="name"
            stroke="rgba(255,255,255,0.3)"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            dx={-8}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const dataPoint = payload[0].payload
                return (
                  <div
                    className="rounded-xl p-3 space-y-1.5 text-[10.5px] backdrop-blur-md"
                    style={{
                      background: "rgba(15, 16, 22, 0.85)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                  >
                    <p className="font-bold text-white/90 mb-1">{dataPoint.name}</p>
                    {payload.map((p) => (
                      <div key={p.name} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: p.fill }} />
                          <span className="text-white/60 capitalize">
                            {p.name === "sent" ? "Emails Sent" : "Replies Received"}:
                          </span>
                        </div>
                        <span className="font-bold text-white">{p.value}</span>
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            content={({ payload }) => {
              return (
                <div className="flex items-center justify-end gap-4 text-[9px] font-extrabold uppercase tracking-wider mb-2">
                  {payload?.map((entry, index) => (
                    <span key={`item-${index}`} className="flex items-center gap-1.5" style={{ color: entry.color }}>
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.value === "sent" ? "Sent Volume" : "Replies"}
                    </span>
                  ))}
                </div>
              )
            }}
          />
          <Bar dataKey="sent" name="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={25} />
          <Bar dataKey="replies" name="replies" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={25} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
