"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"

export type SelectOption = { value: string; label: string; badge?: string }

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  icon?: React.ReactNode
  className?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  icon,
  className = "w-full",
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 })
  const triggerRef      = useRef<HTMLButtonElement>(null)
  const selected        = options.find(o => o.value === value)

  function calcPos() {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  function handleToggle() {
    calcPos()
    setOpen(o => !o)
  }

  // Reposition on scroll / resize so it tracks the trigger
  useEffect(() => {
    if (!open) return
    const handler = () => calcPos()
    window.addEventListener("scroll", handler, true)
    window.addEventListener("resize", handler)
    return () => {
      window.removeEventListener("scroll", handler, true)
      window.removeEventListener("resize", handler)
    }
  }, [open])

  return (
    <div className={`relative ${className}`}>
      {/* Full-screen backdrop to close on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-[998]"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center gap-2.5 rounded-xl py-2.5 pr-4 text-[13px] text-left transition-colors ${icon ? "pl-10" : "pl-4"}`}
        style={{
          background: "rgba(255,255,255,.04)",
          border: open ? "1px solid rgba(255,255,255,.14)" : "1px solid rgba(255,255,255,.08)",
        }}
      >
        {icon && (
          <span className="absolute left-3.5 flex items-center pointer-events-none text-white/25">
            {icon}
          </span>
        )}
        <span className={`flex-1 truncate ${selected ? "text-white/75" : "text-white/25"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-white/25 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown — fixed so it escapes any overflow:hidden parent */}
      {open && (
        <div
          className="fixed z-[999] rounded-xl overflow-hidden py-1"
          style={{
            top:      pos.top,
            left:     pos.left,
            width:    Math.max(pos.width, 160),
            minWidth: "160px",
            background: "#13151c",
            border: "1px solid rgba(255,255,255,.1)",
            boxShadow: "0 12px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04) inset",
          }}
        >
          {options.map(opt => {
            const isActive = value === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-left transition-colors hover:bg-white/5"
                style={isActive
                  ? { color: "rgba(255,255,255,.85)", background: "rgba(255,255,255,.06)" }
                  : { color: "rgba(255,255,255,.5)" }}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.badge && (
                  <span
                    className="shrink-0 rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.3)" }}
                  >
                    {opt.badge}
                  </span>
                )}
                {isActive && <Check className="size-3 shrink-0 text-white/40" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
