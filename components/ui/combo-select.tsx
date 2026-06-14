"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Pencil } from "lucide-react"

interface Props {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
  dropUp?: boolean
}

export function ComboSelect({ value, onChange, options, placeholder = "Select or type…", className = "w-full", dropUp = false }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isCustom = value && !options.includes(value)
  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  function select(opt: string) {
    onChange(opt)
    setQuery("")
    setOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    onChange(e.target.value)
  }

  function handleOpen() {
    setOpen(true)
    setQuery(isCustom ? value : "")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    if (open) document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>

      {/* Trigger / input */}
      {open ? (
        <input
          ref={inputRef}
          value={query || value}
          onChange={handleInputChange}
          onKeyDown={e => {
            if (e.key === "Enter") {
              if (filtered.length > 0 && !query) select(filtered[0])
              else { setOpen(false); setQuery("") }
            }
            if (e.key === "Escape") { setOpen(false); setQuery("") }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/25 pr-9"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.14)" }}
        />
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] text-left transition-colors"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}
        >
          <span className={`flex-1 truncate ${value ? "text-white/75" : "text-white/25"}`}>
            {value || placeholder}
          </span>
          {isCustom
            ? <Pencil className="size-3 shrink-0 text-white/25" />
            : <ChevronDown className="size-3.5 shrink-0 text-white/25" />
          }
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute w-full z-50 rounded-xl overflow-hidden py-1 max-h-52 overflow-y-auto ${dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
          style={{
            background: "#13151c",
            border: "1px solid rgba(255,255,255,.1)",
            boxShadow: "0 12px 40px rgba(0,0,0,.6)",
          }}
        >
          {/* Custom value hint */}
          {query && !options.includes(query) && (
            <button
              type="button"
              onMouseDown={() => select(query)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-left hover:bg-white/5"
              style={{ color: "rgba(255,255,255,.65)" }}
            >
              <Pencil className="size-3 shrink-0 text-white/30" />
              <span className="flex-1 truncate">Use &ldquo;{query}&rdquo;</span>
            </button>
          )}

          {filtered.length === 0 && !query && (
            <p className="px-4 py-3 text-[12px] text-white/25">No matches</p>
          )}

          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={() => select(opt)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-left transition-colors hover:bg-white/5"
              style={value === opt
                ? { color: "rgba(255,255,255,.85)", background: "rgba(255,255,255,.06)" }
                : { color: "rgba(255,255,255,.5)" }
              }
            >
              <span className="flex-1">{opt}</span>
              {value === opt && <Check className="size-3 shrink-0 text-white/40" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
