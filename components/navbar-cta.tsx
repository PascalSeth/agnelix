"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, LayoutDashboard } from "lucide-react"
import { initials } from "@/lib/utils"

export function NavbarCTA() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="h-9 w-28 rounded-xl bg-white/[0.05] animate-pulse" />
  }

  if (session?.user) {
    const name = session.user.name ?? session.user.email ?? "User"
    const firstName = name.split(" ")[0]
    const img = session.user.image

    return (
      <Link
        href="/dashboard"
        className="group flex items-center gap-0 overflow-hidden rounded-xl border border-white/[0.08] transition-all duration-300 hover:border-emerald-400/25 hover:shadow-[0_0_20px_rgba(52,211,153,.12)]"
        style={{ background: "linear-gradient(135deg,rgba(255,255,255,.06) 0%,rgba(255,255,255,.03) 100%)" }}
      >
        {/* User identity section */}
        <div className="flex items-center gap-2.5 px-3 py-1.5">
          {/* Live pulse dot */}
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>

          {/* Avatar */}
          <div
            className="size-6 shrink-0 overflow-hidden rounded-lg"
            style={{ boxShadow: "0 0 0 1.5px rgba(255,255,255,.12)" }}
          >
            {img ? (
              <Image src={img} alt={name} width={24} height={24} className="size-full object-cover" />
            ) : (
              <div
                className="flex size-full items-center justify-center text-[9px] font-black text-white/70"
                style={{ background: "linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.06))" }}
              >
                {initials(name)}
              </div>
            )}
          </div>

          {/* Name */}
          <span className="text-[12px] font-semibold text-white/65 transition-colors group-hover:text-white/85">
            {firstName}
          </span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-white/[0.08]" />

        {/* Dashboard CTA */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-emerald-400/80 transition-all duration-200 group-hover:text-emerald-300"
          style={{ background: "rgba(52,211,153,.04)" }}
        >
          <LayoutDashboard className="size-3.5" />
          <span>Dashboard</span>
          <ArrowRight className="size-3 translate-x-0 opacity-60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/sign-in"
        className="inline-flex items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-white/70 transition-all hover:bg-white/[0.1] hover:border-white/[0.18] hover:text-white"
      >
        Sign in
      </Link>
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold text-black transition-all hover:brightness-110 active:scale-[.98]"
        style={{
          background: "linear-gradient(135deg,#ffffff,#cbd5e1)",
          boxShadow: "0 2px 10px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)",
        }}
      >
        Get Started
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  )
}
