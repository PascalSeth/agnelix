"use client"

import { Menu, ChevronDown, Briefcase, Search, Bell, User, LogOut, Building2, ShieldCheck } from "lucide-react"
import type { Session } from "next-auth"
import { signOut } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { DashboardBg } from "@/components/dashboard-bg"
import { AiAdvisorBubble } from "@/components/ai-advisor-bubble"
import { usePlaybook } from "@/lib/playbook-context"
import { CommandPalette } from "@/components/command-palette"

interface DashboardLayoutProps {
  children: React.ReactNode
  session?: Session | null
  inboxCount?: number
  companyName?: string | null
}

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  MANAGER: "Manager",
  USER: "Member",
  ADMIN: "Member",
}

export function DashboardLayout({ children, session, inboxCount = 0, companyName }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { activePlaybook, playbooks, changePlaybook, isPending } = usePlaybook()

  const isOwner = !session?.user?.teamOwnerId
  const roleLabel = session?.user?.role === "SUPERADMIN"
    ? "Superadmin"
    : isOwner
      ? "Owner"
      : (ROLE_LABEL[session?.user?.role ?? "USER"] ?? "Member")

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
            className="sticky top-0 z-30 flex h-14 items-center justify-between px-6 backdrop-blur-md"
            style={{
              background: "rgba(22, 24, 30, 0.7)",
              borderBottom: "1px solid rgba(255,255,255,.05)",
            }}
          >
            {/* Left Section: Mobile Menu & Breadcrumb/Branding */}
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-1.5 -ml-1.5 rounded-md hover:bg-white/5 transition-colors" onClick={() => setMobileOpen(true)}>
                <Menu className="size-5 text-white/50" />
              </button>
              
              <div className="hidden sm:flex items-center gap-2 text-[13px] font-semibold text-white/50">
                <span className="text-white/80">Galien</span>
                <span className="text-white/20">/</span>
                <span className="text-white/80">{activePlaybook?.name || "Dashboard"}</span>
              </div>
            </div>

            {/* Center Section: Command Palette Trigger (Search Bar) */}
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div 
                className="group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white/40 border border-white/[0.08] bg-black/20 hover:bg-white/[0.04] hover:text-white/60 transition-all cursor-pointer shadow-inner shadow-black/20"
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
                  window.dispatchEvent(event);
                }}
              >
                <div className="flex items-center gap-2">
                  <Search className="size-4 opacity-50 group-hover:opacity-80 transition-opacity" />
                  <span>Search or jump to...</span>
                </div>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-mono font-medium text-white/40 bg-white/[0.05] border border-white/[0.05]">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </div>
            </div>

            {/* Right Section: Status, Playbook, Notifications, Profile */}
            <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
              
              {/* Playbook Selector */}
              {playbooks.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={isPending}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] sm:text-[12px] font-semibold text-white/70 transition-all",
                      "hover:bg-white/[0.06] hover:text-white",
                      isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    )}
                  >
                    <Briefcase className="size-3.5 text-white/40 shrink-0" />
                    <span className="truncate max-w-[80px] min-[380px]:max-w-[110px] min-[450px]:max-w-[160px] sm:max-w-none">
                      {activePlaybook?.name || "Select"}
                    </span>
                    <ChevronDown className={cn("size-3 text-white/30 transition-transform duration-200 shrink-0", dropdownOpen && "rotate-180")} />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <div
                        className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-white/[0.08] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                        style={{
                          background: "rgba(22, 24, 30, 0.98)",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">Playbooks</p>
                        <div className="space-y-0.5">
                          {playbooks.map((p) => {
                            const active = p.type === activePlaybook?.type
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  changePlaybook(p.type)
                                  setDropdownOpen(false)
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-all",
                                  active
                                    ? "bg-white/[0.06] text-white"
                                    : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                                )}
                              >
                                <span>{p.name}</span>
                                {active && (
                                  <span className="size-1.5 rounded-full bg-emerald-400" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile/Tablet Search Trigger */}
              <button 
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
                  window.dispatchEvent(event);
                }}
                className="flex md:hidden items-center justify-center size-8 rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white shrink-0"
                title="Search or jump to..."
              >
                <Search className="size-4" />
              </button>

              <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />

              {/* Systems Live Status (Dot only on desktop, full text maybe hidden or tooltip) */}
              <div 
                className="flex items-center justify-center size-8 rounded-full hover:bg-white/5 transition-colors cursor-help"
                title="Systems Live: All operational"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400"></span>
                </span>
              </div>

              {/* Notification Bell */}
              <button className="flex items-center justify-center size-8 rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white">
                <Bell className="size-4" />
              </button>

              {/* User Profile / Avatar */}
              <div className="relative ml-1">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center justify-center size-8 rounded-full border border-white/[0.1] overflow-hidden hover:border-white/[0.3] transition-colors cursor-pointer"
                >
                  {session?.user?.image ? (
                    <Image src={session.user.image} alt="User" width={32} height={32} className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-indigo-500/20 text-indigo-300">
                      <User className="size-4" />
                    </div>
                  )}
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div
                      className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-white/[0.08] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                      style={{
                        background: "rgba(22, 24, 30, 0.98)",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <div className="flex items-center gap-3 px-2.5 py-2.5">
                        <div className="size-9 rounded-full border border-white/[0.1] overflow-hidden shrink-0">
                          {session?.user?.image ? (
                            <Image src={session.user.image} alt="User" width={36} height={36} className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center bg-indigo-500/20 text-indigo-300">
                              <User className="size-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-white truncate">{session?.user?.name || "User"}</p>
                          <p className="text-[11px] text-white/40 truncate">{session?.user?.email}</p>
                        </div>
                      </div>

                      <div className="h-px bg-white/[0.06] my-1" />

                      <div className="px-2.5 py-1.5 space-y-1.5">
                        <div className="flex items-center gap-2 text-[12px] text-white/60">
                          {roleLabel === "Superadmin" ? (
                            <ShieldCheck className="size-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <ShieldCheck className="size-3.5 text-white/30 shrink-0" />
                          )}
                          <span className="font-medium">{roleLabel}</span>
                        </div>
                        {companyName && (
                          <div className="flex items-center gap-2 text-[12px] text-white/60">
                            <Building2 className="size-3.5 text-white/30 shrink-0" />
                            <span className="truncate">{companyName}</span>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-white/[0.06] my-1" />

                      {roleLabel === "Superadmin" && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/70 hover:bg-white/[0.04] hover:text-white transition-all"
                        >
                          <ShieldCheck className="size-3.5" />
                          Platform Overview
                        </Link>
                      )}

                      <button
                        onClick={() => signOut({ callbackUrl: "/sign-in" })}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/70 hover:bg-white/[0.04] hover:text-rose-300 transition-all cursor-pointer"
                      >
                        <LogOut className="size-3.5" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
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
      <CommandPalette />
    </>
  )
}
