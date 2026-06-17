"use client"

import React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts"

interface DashboardFunnelChartProps {
  totalLeads: number
  totalSent: number
  totalReplies: number
  totalMeetings: number
  wonLeadsCount: number
}

export function DashboardFunnelChart({
  totalLeads,
  totalSent,
  totalReplies,
  totalMeetings,
  wonLeadsCount,
}: DashboardFunnelChartProps) {
  
  function getPct(part: number, total: number) {
    if (!total) return "0%"
    return `${Math.round((part / total) * 100)}%`
  }

  const data = [
    { name: "Leads Found", value: totalLeads, rate: "100%", color: "#818cf8" },
    { name: "Outreach Sent", value: totalSent, rate: getPct(totalSent, totalLeads), color: "#38bdf8" },
    { name: "Replies Recvd", value: totalReplies, rate: getPct(totalReplies, totalSent), color: "#34d399" },
    { name: "Meetings Booked", value: totalMeetings, rate: getPct(totalMeetings, totalReplies), color: "#fbbf24" },
    { name: "Deals Closed", value: wonLeadsCount, rate: getPct(wonLeadsCount, totalMeetings), color: "#059669" },
  ]

  return (
    <div className="w-full h-[180px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 35, left: 10, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            stroke="rgba(255,255,255,0.4)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.02)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload
                return (
                  <div
                    className="rounded-xl p-3 space-y-1 text-[11px] backdrop-blur-md"
                    style={{
                      background: "rgba(15, 16, 22, 0.9)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                  >
                    <p className="font-extrabold text-white">{item.name}</p>
                    <p className="text-white/60">
                      Volume: <span className="font-extrabold text-white">{item.value}</span>
                    </p>
                    <p className="text-white/60">
                      Conv. Rate: <span className="font-extrabold" style={{ color: item.color }}>{item.rate}</span>
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 6, 6, 0]}
            barSize={14}
            label={(props: any) => {
              const { x, y, width, value, index } = props
              if (index === undefined || x === undefined || y === undefined || width === undefined) return null
              const item = data[index]
              if (!item) return null
              return (
                <text
                  x={Number(x) + Number(width) + 8}
                  y={Number(y) + 11}
                  fill="rgba(255,255,255,0.7)"
                  fontSize={10}
                  fontWeight="bold"
                  textAnchor="start"
                >
                  {value} ({item.rate})
                </text>
              )
            }}
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
