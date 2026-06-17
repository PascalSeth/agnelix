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

interface ReportCardChartProps {
  metrics: Record<string, number | string>
}

export function ReportCardChart({ metrics }: ReportCardChartProps) {
  // Safe extraction of metrics
  const sent = Number(metrics.emails_sent) || 0
  const replies = Number(metrics.replies) || 0
  const meetings = Number(metrics.meetings_booked) || 0
  
  const openRateStr = String(metrics.open_rate || "0%")
  const openRate = parseFloat(openRateStr) || 0
  const opened = Math.round((sent * openRate) / 100)

  // Construct chart data
  const data = [
    { name: "Sent", value: sent, color: "#3b82f6" },       // blue-500
    { name: "Opened", value: opened, color: "#0ea5e9" },   // sky-500
    { name: "Replied", value: replies, color: "#10b981" }, // emerald-500
    { name: "Booked", value: meetings, color: "#fbbf24" },  // amber-500
  ]

  // If there is no activity yet, don't render an empty graph
  if (sent === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-xl bg-white/[0.01] border border-white/[0.04] text-[11px] text-white/20">
        No sending activity recorded to visualize
      </div>
    )
  }

  return (
    <div className="w-full h-[120px] relative mt-2 bg-white/[0.01] border border-white/[0.04] rounded-xl p-2.5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 15, left: -20, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            stroke="rgba(255,255,255,0.4)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.02)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload
                return (
                  <div
                    className="rounded-lg px-2.5 py-1.5 text-[10px] backdrop-blur-md"
                    style={{
                      background: "rgba(15, 16, 22, 0.9)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    }}
                  >
                    <span className="font-bold" style={{ color: item.color }}>
                      {item.name}:
                    </span>{" "}
                    <span className="font-extrabold text-white">{item.value}</span>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
