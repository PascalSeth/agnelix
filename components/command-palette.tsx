/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Compass, Database, Settings, ArrowRight, X, Command } from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!open) return
    const activeItem = containerRef.current?.querySelector("[data-active='true']")
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex, open])

  // Define commands
  const commands = [
    {
      id: "dash",
      title: "Go to Dashboard",
      description: "View agency analytics & pipeline overview",
      category: "Navigation",
      icon: Compass,
      action: () => { router.push("/dashboard"); setOpen(false) }
    },
    {
      id: "leads",
      title: "Go to Leads Database",
      description: "Browse acquired leads and prospects",
      category: "Navigation",
      icon: Database,
      action: () => { router.push("/leads"); setOpen(false) }
    },
    {
      id: "campaigns",
      title: "Go to Campaigns",
      description: "Manage outreach campaigns and workflow stages",
      category: "Navigation",
      icon: Search,
      action: () => { router.push("/campaigns"); setOpen(false) }
    },
    {
      id: "settings",
      title: "Go to Settings",
      description: "Manage agency profile and autopilots",
      category: "Navigation",
      icon: Settings,
      action: () => { router.push("/settings/agency"); setOpen(false) }
    },
    {
      id: "advisor",
      title: "Ask Galien AI Advisor",
      description: "Focus the Galien chat bubble directly",
      category: "Quick Actions",
      icon: Sparkles,
      action: () => {
        const chatInput = document.querySelector("#ai-advisor-input") as HTMLInputElement
        if (chatInput) {
          chatInput.focus()
          toast.success("AI advisor chat focused!")
        } else {
          toast.info("Galien chat is ready on the bottom right.")
        }
        setOpen(false)
      }
    }
  ]

  // Filter commands
  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  // Reset index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Handle arrows + enter key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filtered.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, selectedIndex, filtered])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-[6px]"
        onClick={() => setOpen(false)}
      />

      {/* Palette Container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: "rgba(20, 22, 28, 0.98)",
          boxShadow: "0 0 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,.05)",
        }}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5">
          <Search className="size-4 text-white/30 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/20"
            autoFocus
          />
          <button 
            onClick={() => setOpen(false)}
            className="rounded p-0.5 text-white/25 hover:text-white/50 hover:bg-white/5 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* List items */}
        <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[11px] text-white/20">No matching commands found.</p>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === selectedIndex
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  data-active={active}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                    active
                      ? "text-white bg-white/[0.05]"
                      : "text-white/50 hover:bg-white/[0.02]"
                  }`}
                  style={active ? {
                    border: "1px solid rgba(255,255,255,.06)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.03)",
                  } : {
                    border: "1px solid transparent"
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        active 
                          ? "border-violet-500/20 bg-violet-500/10 text-violet-400" 
                          : "border-white/5 bg-white/5 text-white/30"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold tracking-tight">{item.title}</p>
                      <p className="text-[10px] text-white/30 mt-0.5 truncate">{item.description}</p>
                    </div>
                  </div>

                  {active && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-violet-400 shrink-0">
                      <span>Execute</span>
                      <ArrowRight className="size-3" />
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/20 px-4 py-2 text-[10px] text-white/20 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.25 font-mono text-[9px]">Esc</kbd> Close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.25 font-mono text-[9px]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.25 font-mono text-[9px]">Enter</kbd> Trigger
            </span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <Command className="size-3 text-white/35" />
            <span>Command Menu</span>
          </div>
        </div>
      </div>
    </div>
  )
}
