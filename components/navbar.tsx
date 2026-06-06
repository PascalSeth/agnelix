"use client"

import { useState, useEffect } from "react"
import {
  Menu, X,
  Mail, BarChart2, Users, TrendingUp, Target,
  MessageSquare, AtSign, Zap, Phone, Send,
  UserPlus, Inbox, Megaphone, Calendar,
} from "lucide-react"
import { NavbarCTA } from "@/components/navbar-cta"
import Link from "next/link"
import Image from "next/image"

const NAV_LINKS = [
  { label: "Features",     href: "#features" },
  { label: "Solutions",    href: "#solutions" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing",      href: "#pricing" },
  { label: "Docs",         href: "/docs" },
]

/* Left-to-right spectrum: violet → indigo → blue → cyan → teal → emerald */
const SPECTRUM = [
  "#c5a880", // champagne gold
  "#a8b9c9", // mist blue
  "#728972", // sage green
  "#b5966d", // sand gold
  "#1d2a44", // deep navy
  "#4a5d4e", // dark olive
  "#c5a880",
  "#a8b9c9",
  "#728972",
  "#b5966d",
  "#1d2a44",
  "#4a5d4e",
]

const BG_ICONS: {
  Icon: React.ElementType
  left: string
  top: string
  size: number
  deg: number
  delay: number   // animation delay (s)
  dur: number     // animation duration (s)
}[] = [
  { Icon: Mail,          left: "2.5%",  top: "22%", size: 15, deg: -18, delay: 0,    dur: 4.2 },
  { Icon: BarChart2,     left: "8%",    top: "60%", size: 19, deg:  10, delay: 0.6,  dur: 5.1 },
  { Icon: AtSign,        left: "15%",   top: "28%", size: 13, deg: -10, delay: 1.1,  dur: 3.8 },
  { Icon: Send,          left: "21%",   top: "68%", size: 16, deg:  20, delay: 0.3,  dur: 4.6 },
  { Icon: Users,         left: "29%",   top: "20%", size: 18, deg:  -6, delay: 0.9,  dur: 5.4 },
  { Icon: TrendingUp,    left: "37%",   top: "65%", size: 17, deg:  14, delay: 0.5,  dur: 4.0 },
  { Icon: Target,        left: "45%",   top: "25%", size: 16, deg: -20, delay: 1.4,  dur: 3.6 },
  { Icon: Megaphone,     left: "52%",   top: "70%", size: 15, deg:   8, delay: 0.2,  dur: 5.8 },
  { Icon: MessageSquare, left: "59%",   top: "22%", size: 14, deg: -12, delay: 0.8,  dur: 4.3 },
  { Icon: Calendar,      left: "66%",   top: "64%", size: 17, deg:  16, delay: 1.6,  dur: 3.9 },
  { Icon: UserPlus,      left: "73%",   top: "26%", size: 16, deg:  -8, delay: 0.4,  dur: 5.2 },
  { Icon: Inbox,         left: "80%",   top: "60%", size: 18, deg:  12, delay: 1.2,  dur: 4.7 },
  { Icon: Phone,         left: "87%",   top: "28%", size: 14, deg: -16, delay: 0.7,  dur: 3.7 },
  { Icon: Zap,           left: "93%",   top: "62%", size: 19, deg:   6, delay: 1.8,  dur: 5.0 },
  { Icon: Mail,          left: "97.5%", top: "30%", size: 13, deg:  22, delay: 0.1,  dur: 4.4 },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav className="fixed inset-x-0 top-0 z-[100]">

      {/* Keyframe definitions */}
      <style>{`
        @keyframes navIconFloat {
          0%, 100% { opacity: 0.04; transform: rotate(var(--deg)) translateY(0px) scale(1);   }
          50%       { opacity: 0.15; transform: rotate(var(--deg)) translateY(-4px) scale(1.1); }
        }
      `}</style>

      {/* Header background wrapper (fixed height of top bar, overflow hidden for floating icons) */}
      <div className="absolute inset-x-0 top-0 h-[68px] overflow-hidden pointer-events-none">
        {/* ── Gray gradient — only visible after scroll ────────────────── */}
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{
            background: "rgba(26, 28, 36, 0.85)",
            opacity: scrolled ? 1 : 0,
          }}
        />

        {/* ── Radial depth wash ────────────────────────────────────────── */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background:
              "radial-gradient(ellipse 60% 140% at 50% -20%, rgba(255, 255, 255, 0.04) 0%, transparent 70%)",
            opacity: scrolled ? 1 : 0,
          }}
        />

        {/* ── Top sheen ────────────────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transition-opacity duration-500"
          style={{ opacity: scrolled ? 1 : 0 }}
        />

        {/* ── Bottom border ────────────────────────────────────────────── */}
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-opacity duration-500"
          style={{ opacity: scrolled ? 1 : 0 }}
        />

        {/* ── Backdrop blur (scroll only) ───────────────────────────────── */}
        <div
          className="absolute inset-0 backdrop-blur-xl transition-opacity duration-700"
          style={{ opacity: scrolled ? 1 : 0 }}
        />

        {/* ── Spectrum-colored floating icons ──────────────────────────── */}
        <div className="absolute inset-0">
          {BG_ICONS.map(({ Icon, left, top, size, deg, delay, dur }, i) => (
            <span
              key={i}
              className="absolute"
              style={
                {
                  left,
                  top,
                  color: SPECTRUM[i % SPECTRUM.length],
                  "--deg": `${deg}deg`,
                  animation: `navIconFloat ${dur}s ease-in-out ${delay}s infinite`,
                } as React.CSSProperties
              }
            >
              <Icon style={{ width: size, height: size }} strokeWidth={1.25} />
            </span>
          ))}
        </div>
      </div>

      {/* ── Nav content ─────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex h-[68px] items-center justify-between gap-8">

          {/* Logo */}
          <Link href="/" className="shrink-0 opacity-90 transition-opacity hover:opacity-100">
            <Image
              src="/logo-hq.png"
              alt="Agnelix"
              width={120}
              height={80}
              className="rounded-lg object-contain filter brightness-110 contrast-125"
            />
          </Link>

          {/* Center pill */}
          <div className="hidden md:flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 backdrop-blur-sm shadow-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-slate-300 transition-all hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <NavbarCTA />
            </div>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              className="flex md:hidden size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 transition-all hover:bg-white/[0.05] hover:text-white shadow-sm"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="relative border-t border-white/[0.06] md:hidden"
          style={{ background: "rgba(26, 28, 36, 0.96)" }}
        >
          <div className="mx-auto max-w-7xl px-6 py-4 space-y-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-white/[0.06] pt-3">
              <NavbarCTA />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

