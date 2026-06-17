"use client"

import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

type ChartData = {
  date: string
  sent: number
  replies: number
  opens: number
}

interface DashboardChartsProps {
  data: ChartData[]
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  return (
    <div className="w-full h-[220px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.2)" 
            fontSize={9} 
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.2)" 
            fontSize={9} 
            tickLine={false}
            axisLine={false}
            dx={-8}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div 
                    className="rounded-xl p-3 space-y-1.5 text-[10.5px] backdrop-blur-md"
                    style={{ 
                      background: "rgba(15, 16, 22, 0.85)", 
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)" 
                    }}
                  >
                    <p className="font-bold text-white/40 mb-1">{payload[0].payload.date}</p>
                    {payload.map((p: any) => (
                      <div key={p.name} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: p.stroke || p.color }} />
                          <span className="text-white/60 capitalize">{p.name}:</span>
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
          <Area 
            type="monotone" 
            dataKey="sent" 
            name="sent"
            stroke="#3b82f6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorSent)" 
          />
          <Area 
            type="monotone" 
            dataKey="opens" 
            name="opened"
            stroke="#0ea5e9" 
            strokeWidth={1.5}
            fillOpacity={1} 
            fill="url(#colorOpens)" 
          />
          <Line 
            type="monotone" 
            dataKey="replies" 
            name="replied"
            stroke="#10b981" 
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: "#10b981" }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
