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

interface ReportCampaign {
  id: string
  name: string
}

interface ReportData {
  id: string
  campaign: ReportCampaign
  metricsJson: Record<string, number | string>
  periodStart: string
  periodEnd: string
}

interface ReportsOverviewChartProps {
  reports: ReportData[]
}

export function ReportsOverviewChart({ reports }: ReportsOverviewChartProps) {
  // Map reports to chart data format
  const chartData = reports.map((r) => {
    const sent = Number(r.metricsJson.emails_sent) || 0
    const replies = Number(r.metricsJson.replies) || 0
    const booked = Number(r.metricsJson.meetings_booked) || 0
    const start = new Date(r.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    
    return {
      name: r.campaign.name,
      label: `${r.campaign.name} (${start})`,
      sent,
      replies,
      booked,
    }
  })

  if (chartData.length === 0) {
    return null
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6 space-y-4"
      style={{
        background: "linear-gradient(135deg, rgba(30, 32, 45, 0.4) 0%, rgba(15, 16, 22, 0.2) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        backdropFilter: "blur(12px)"
      }}
    >
      <div>
        <h3 className="text-[14px] font-bold text-white/80">Campaign Reports Overview</h3>
        <p className="text-[11px] text-white/25 mt-0.5">
          Comparative analysis of client outreach volume, replies, and meetings booked across active reports
        </p>
      </div>

      <div className="w-full h-[240px] relative mt-4">
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
                      <p className="font-bold text-white/40 mb-1">{dataPoint.label}</p>
                      {payload.map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: p.fill }} />
                            <span className="text-white/60 capitalize">
                              {p.name === "sent" ? "Emails Sent" : p.name === "replies" ? "Replies" : "Meetings Booked"}:
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
                    {payload?.map((entry: any, index: number) => (
                      <span key={`item-${index}`} className="flex items-center gap-1.5" style={{ color: entry.color }}>
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.value === "sent" ? "Sent" : entry.value === "replies" ? "Replied" : "Booked"}
                      </span>
                    ))}
                  </div>
                )
              }}
            />
            <Bar dataKey="sent" name="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="replies" name="replies" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="booked" name="booked" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
