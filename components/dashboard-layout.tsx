"use client"

import { Menu } from "lucide-react"
import type { Session } from "next-auth"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { DashboardBg } from "@/components/dashboard-bg"
import { AiAdvisorBubble } from "@/components/ai-advisor-bubble"

interface DashboardLayoutProps {
  children: React.ReactNode
  session?: Session | null
  inboxCount?: number
}

export function DashboardLayout({ children, session, inboxCount = 0 }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(false)

  useEffect(() => {
    const handle = () => { if (window.innerWidth < 1024) setMobileOpen(false) }
    window.addEventListener("resize", handle)
    return () => window.removeEventListener("resize", handle)
  }, [])

  return (
    <>
      <style>{`
        @keyframes silver-sheen {
          0%   { left: -80px; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 110%; opacity: 0; }
        }
        @keyframes border-flow {
          0%,100% { background-position: 0% 0%; }
          50%     { background-position: 0% 100%; }
        }
        @keyframes logo-pulse {
          0%,100% { box-shadow: 0 2px 8px rgba(0,0,0,.25); }
          50%     { box-shadow: 0 0 0 5px rgba(255,255,255,.08), 0 4px 18px rgba(0,0,0,.3); }
        }
        @keyframes status-ping {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: .4; transform: scale(1.4); }
        }
        .sheen-strip {
          position: absolute; top: 0; bottom: 0; width: 60px;
          transform: skewX(-18deg);
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.12) 35%, rgba(220,225,235,.16) 50%, rgba(255,255,255,.12) 65%, transparent 100%);
          animation: silver-sheen 9s ease-in-out infinite;
        }
        .flicker-glow-bg {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(255,255,255,.04), transparent 65%);
        }
        .border-glow {
          background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,.2) 20%, rgba(255,255,255,.45) 50%, rgba(255,255,255,.2) 80%, transparent 100%);
          background-size: 100% 300%;
          animation: border-flow 5s ease-in-out infinite;
        }
        .status-dot { animation: status-ping 2.5s ease-in-out infinite; }
        @media (min-width: 1024px) {
          .main-content[data-collapsed="false"] { --sidebar-w: 220px; }
          .main-content[data-collapsed="true"]  { --sidebar-w: 72px;  }
        }
      `}</style>

      <div className="flex min-h-screen" style={{ background: "#1a1c24" }}>

        <DashboardBg />

        <Sidebar
          session={session}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          inboxCount={inboxCount}
          onMobileClose={() => setMobileOpen(false)}
          onToggleCollapse={() => setCollapsed(c => !c)}
        />

        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)} />
        )}

        {/* Main */}
        <div
          className={cn(
            "main-content relative z-10 flex min-w-0 flex-1 flex-col transition-all duration-300",
            collapsed ? "lg:pl-[72px]" : "lg:pl-[220px]"
          )}
          data-collapsed={String(collapsed)}
        >
          {/* Topbar */}
          <header
            className="sticky top-0 z-30 flex h-14 items-center justify-between px-6 backdrop-blur-xl"
            style={{
              background: "rgba(26,28,36,.85)",
              borderBottom: "1px solid rgba(255,255,255,.06)",
              boxShadow: "0 1px 0 rgba(0,0,0,.2)",
            }}
          >
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5 text-white/40" />
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5"
                style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                <span className="status-dot size-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-semibold text-white/35 tracking-wide">Systems live</span>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>

      <AiAdvisorBubble />
    </>
  )
}
