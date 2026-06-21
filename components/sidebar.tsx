"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"
import {
  LayoutDashboard, Users, Megaphone, GitBranch,
  Settings, LogOut, X, ChevronLeft, ChevronRight,
  KanbanSquare, Inbox, Sparkles,
  Search, FileText, Briefcase, Swords, Globe, BarChart3,
  ClipboardList, BookOpen, Copy, Zap, Bot
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, initials } from "@/lib/utils"
import Image from "next/image"

const navGroups = [
  {
    label: "Command Center",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pipeline",  label: "Pipeline",  icon: KanbanSquare },
      { href: "/inbox",     label: "Inbox",     icon: Inbox },
    ],
  },
  {
    label: "Acquisition",
    items: [
      { href: "/leads/find", label: "Find Leads", icon: Search },
      { href: "/auto-prospecting", label: "Auto-Prospecting", icon: Zap },
      { href: "/leads",      label: "Leads Database", icon: Users },
      { href: "/campaigns",  label: "Campaigns", icon: Megaphone },
      { href: "/sequences",  label: "Sequences", icon: GitBranch },
      { href: "/playground", label: "Playground", icon: Sparkles },
    ],
  },
  {
    label: "Convert",
    items: [
      { href: "/proposals",        label: "Proposals", icon: FileText },
      { href: "/case-studies",     label: "Case Studies", icon: Briefcase },
      { href: "/competitor-intel", label: "Competitor Intel", icon: Swords },
    ],
  },
  {
    label: "Client Layer",
    items: [
      { href: "/portals",    label: "Client Portals", icon: Globe },
      { href: "/reports",    label: "Reports", icon: BarChart3 },
      { href: "/onboarding", label: "Onboarding", icon: ClipboardList },
    ],
  },
  {
    label: "Assets & Playbooks",
    items: [
      { href: "/playbooks",    label: "Playbook Settings", icon: BookOpen },
      { href: "/templates",    label: "Templates", icon: Copy },
      { href: "/battle-cards", label: "Battle Cards", icon: Zap },
    ],
  },
  {
    label: "Automation & Settings",
    items: [
      { href: "/settings/autopilot", label: "Autopilot", icon: Bot },
      { href: "/settings/agency",    label: "Agency Profile", icon: Settings },
      { href: "/settings/team",      label: "Team Seats", icon: Users },
    ],
  },
]

interface SidebarProps {
  session?: Session | null
  collapsed: boolean
  mobileOpen: boolean
  inboxCount?: number
  onMobileClose: () => void
  onToggleCollapse: () => void
}

export function Sidebar({ session, collapsed, mobileOpen, inboxCount = 0, onMobileClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[220px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: "linear-gradient(180deg, #32353f 0%, #1e2029 50%, #32353f 100%)",
        boxShadow: "2px 0 24px rgba(0,0,0,.22), inset -1px 0 0 rgba(255,255,255,.03)",
      }}
    >
      {/* Decorative layer — overflow:hidden so sheen clips cleanly */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="sheen-strip" />
        <div className="flicker-glow-bg" />
        <div className="absolute inset-x-0 top-0 h-40"
          style={{ background: "linear-gradient(180deg,rgba(255,255,255,.07) 0%,transparent 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-28"
          style={{ background: "linear-gradient(0deg,rgba(0,0,0,.14) 0%,transparent 100%)" }} />
      </div>

      {/* Animated right-edge border */}
      <div className="border-glow absolute right-0 top-0 bottom-0 w-px pointer-events-none" style={{ zIndex: 1 }} />

      {/* Brand */}
      <div className="relative z-10 flex h-16 shrink-0 items-center border-b border-white/[0.07] px-4">
        <Link href="/dashboard" className="flex items-center">
          {collapsed ? (
            <Image src="/logo.png" alt="Galien" width={36} height={36} className="object-contain" />
          ) : (
            <Image src="/logo-hq.png" alt="Galien" width={130} height={30} className="object-contain object-left" />
          )}
        </Link>

        {/* Desktop collapse toggle */}
        <button
          className="ml-auto hidden lg:flex size-6 items-center justify-center rounded-lg text-white/25 hover:text-white/60 transition-colors"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>

        {/* Mobile close */}
        <button
          className="ml-auto lg:hidden text-white/30 hover:text-white/60 transition-colors"
          onClick={onMobileClose}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-2.5 py-4">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-1 pt-1" : ""}>
            {/* Group label + divider */}
            {gi > 0 && (
              <div className={cn("mb-1 px-3", collapsed && "px-0")}>
                <div className="h-px mb-2" style={{ background: "rgba(255,255,255,.06)" }} />
                {!collapsed && group.label && (
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-white/20 mb-1">{group.label}</p>
                )}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.filter(item => item.href !== "/settings/agency" || !session?.user?.teamOwnerId).map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                      active
                        ? "text-white"
                        : "text-white/40 hover:bg-white/[0.04] hover:text-white/70",
                      collapsed && "justify-center px-0"
                    )}
                    style={active ? {
                      background: "linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.05))",
                      border: "1px solid rgba(255,255,255,.11)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
                    } : {}}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full"
                        style={{ background: "linear-gradient(180deg,#e2e5ed,#9ca3af)" }}
                      />
                    )}

                    <item.icon
                      className={cn(
                        "relative size-[17px] shrink-0 transition-colors",
                        active ? "text-white/90" : "text-white/30 group-hover:text-white/60"
                      )}
                    />

                    {!collapsed && <span className="relative flex-1 truncate">{item.label}</span>}

                    {!collapsed && item.href === "/inbox" && inboxCount > 0 && (
                      <span
                        className="relative ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-white"
                        style={{ background: "rgba(239,68,68,.85)" }}
                      >
                        {inboxCount > 99 ? "99+" : inboxCount}
                      </span>
                    )}

                    {collapsed && item.href === "/inbox" && inboxCount > 0 && (
                      <span
                        className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full text-[8px] font-black text-white"
                        style={{ background: "rgba(239,68,68,.85)" }}
                      >
                        {inboxCount > 9 ? "9+" : inboxCount}
                      </span>
                    )}

                    {collapsed && (
                      <span
                        className="absolute left-[calc(100%+12px)] hidden rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/80 group-hover:block whitespace-nowrap"
                        style={{
                          background: "rgba(40,43,54,.97)",
                          border: "1px solid rgba(255,255,255,.08)",
                          boxShadow: "0 4px 16px rgba(0,0,0,.35)",
                          zIndex: 200,
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="relative z-10 border-t border-white/[0.07] p-3 space-y-1">
        <div className={cn("flex items-center gap-2.5 p-2", collapsed && "justify-center")}>
          <Avatar
            className="size-8 shrink-0"
            style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.14), 0 2px 6px rgba(0,0,0,.2)" }}
          >
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback
              className="text-[11px] font-bold text-white/75"
              style={{ background: "linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.05))" }}
            >
              {initials(session?.user?.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white/70">
                {session?.user?.name ?? "User"}
              </p>
              <p className="truncate text-[10px] text-white/30">
                {session?.user?.email ?? ""}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium text-white/25 transition-all hover:bg-red-500/10 hover:text-red-400",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="size-3.5 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
