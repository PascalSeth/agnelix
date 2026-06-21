/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element */
"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send, Loader2, Sparkles } from "lucide-react"
import { usePathname } from "next/navigation"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function AiAdvisorBubble() {
  const pathname = usePathname()
  const [open, setOpen]               = useState(false)
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState("")
  const [loading, setLoading]         = useState(false)
  const [isVisible, setIsVisible]     = useState(false)
  const bottomRef                     = useRef(null as HTMLDivElement | null)
  const inputRef                      = useRef(null as HTMLInputElement | null)
  const initializedRef                = useRef(false)

  useEffect(() => {
    if (!open || initializedRef.current) return
    initializedRef.current = true
    fetch("/api/ai-advisor")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.greeting) setMessages([{ role: "assistant", content: data.greeting }])
      })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading, bottomRef])

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true)
      setIsVisible(true)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
    window.addEventListener("open-ai-advisor", handleOpen)
    return () => window.removeEventListener("open-ai-advisor", handleOpen)
  }, [])

  const toggleChat = () => {
    setOpen(o => {
      const next = !o
      if (next) {
        setIsVisible(true)
        setTimeout(() => inputRef.current?.focus(), 300)
      } else {
        setTimeout(() => setIsVisible(false), 300)
      }
      return next
    })
  }

  const closeChat = () => {
    setOpen(false)
    setTimeout(() => setIsVisible(false), 300)
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    const next: Message[] = [...messages, { role: "user", content: text }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: "assistant", content: data.reply ?? "…" }])
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Something went wrong. Try again." }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (pathname?.includes("/inbox")) return null;

  return (
    <>
      <style>{`
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); filter: hue-rotate(0deg); }
          33% { transform: scale(1.06); filter: hue-rotate(8deg); }
          66% { transform: scale(1.03); filter: hue-rotate(-5deg); }
        }
        @keyframes orb-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orb-glow {
          0%, 100% { opacity: .6; transform: scale(1.2); }
          50% { opacity: .9; transform: scale(1.5); }
        }
        @keyframes orb-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes panel-in {
          0% { opacity: 0; transform: scale(0.3) translateY(40px); filter: blur(12px); }
          60% { opacity: 1; transform: scale(1.02) translateY(-4px); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
        @keyframes panel-out {
          0% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
          100% { opacity: 0; transform: scale(0.8) translateY(20px); filter: blur(8px); }
        }
        @keyframes msg-in {
          0% { opacity: 0; transform: translateY(12px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dot-wave {
          0%, 100% { transform: translateY(0); opacity: .4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .agnel-orb {
          position: relative;
          border-radius: 50%;
          overflow: hidden;
          animation: orb-breathe 4s ease-in-out infinite;
        }
        .agnel-orb::before {
          content: '';
          position: absolute;
          inset: -30%;
          background: conic-gradient(from 0deg, transparent, rgba(56, 189, 248, .4), transparent, rgba(236, 72, 153, .4), transparent, rgba(99, 102, 241, .4), transparent);
          animation: orb-rotate 8s linear infinite;
          filter: blur(8px);
        }
        .agnel-orb::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: 
            radial-gradient(circle at 35% 35%, rgba(255, 255, 255, .8) 0%, transparent 25%),
            radial-gradient(circle at 50% 50%, rgba(236, 72, 153, .9) 0%, rgba(236, 72, 153, .4) 30%, transparent 60%),
            radial-gradient(circle at 65% 65%, rgba(56, 189, 248, .6) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(99, 102, 241, .3) 0%, transparent 70%);
          box-shadow: 
            inset -6px -6px 16px rgba(0, 0, 0, .4),
            inset 6px 6px 16px rgba(255, 255, 255, .2),
            0 0 30px rgba(236, 72, 153, .4),
            0 0 60px rgba(99, 102, 241, .2),
            0 0 100px rgba(56, 189, 248, .1);
        }
        .agnel-orb-glow {
          position: absolute;
          inset: -20%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(236, 72, 153, .3), rgba(99, 102, 241, .2), transparent 70%);
          animation: orb-glow 3s ease-in-out infinite;
          pointer-events: none;
        }
        .panel-enter { animation: panel-in .5s cubic-bezier(.22, 1, .36, 1) forwards; }
        .panel-exit { animation: panel-out .3s ease-in forwards; }
        .msg-appear { animation: msg-in .35s cubic-bezier(.22, 1, .36, 1) forwards; }
        .glass-panel {
          background: rgba(12, 12, 18, .85);
          backdrop-filter: blur(24px) saturate(1.2);
          -webkit-backdrop-filter: blur(24px) saturate(1.2);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── Chat Panel ── */}
      {isVisible && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 z-50 w-auto sm:w-[380px]">
          <div
            className={`flex flex-col overflow-hidden w-full ${open ? 'panel-enter' : 'panel-exit'}`}
            style={{
              height: "min(540px, calc(100vh - 120px))",
              borderRadius: "28px",
              background: "linear-gradient(180deg, rgba(20, 20, 30, .95) 0%, rgba(10, 10, 16, .98) 100%)",
              border: "1px solid rgba(255, 255, 255, .08)",
              boxShadow: "0 40px 100px rgba(0, 0, 0, .7), 0 0 0 1px rgba(255, 255, 255, .03), inset 0 1px 0 rgba(255, 255, 255, .06)",
            }}
          >
            {/* Header */}
            <div
              className="shrink-0 flex items-center justify-between px-6 py-5 relative"
              style={{
                borderBottom: "1px solid rgba(255, 255, 255, .08)",
                background: "linear-gradient(180deg, rgba(20, 21, 33, 0.96) 0%, rgba(13, 14, 22, 0.98) 100%)",
                boxShadow: "0 4px 24px rgba(0,0,0,.2)"
              }}
            >
              {/* Pulsing Neon Glow Line at bottom of header */}
              <div
                className="absolute bottom-0 inset-x-12 h-[1px]"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(236, 72, 153, .3), rgba(99, 102, 241, .3), transparent)"
                }}
              />

              <div className="flex items-center gap-4">
                {/* Holographic Orb Avatar */}
                <div className="relative flex size-10 shrink-0 items-center justify-center">
                  {/* Rotating dashed outer ring */}
                  <div
                    className="absolute inset-0 rounded-full border border-dashed border-indigo-400/35"
                    style={{ animation: "orb-rotate 12s linear infinite" }}
                  />
                  {/* Glowing core wrapper */}
                  <div
                    className="absolute inset-1 rounded-full bg-gradient-to-tr from-pink-500/15 to-indigo-500/15 blur-[1px]"
                    style={{ animation: "orb-breathe 4s ease-in-out infinite" }}
                  />
                  {/* Solid Center Orb */}
                  <img
                    src="/chatbubble.png"
                    alt="Agnel"
                    className="relative z-10 size-9 object-contain"
                    style={{
                      filter: "drop-shadow(0 0 10px rgba(56,189,248,.55)) drop-shadow(0 0 18px rgba(99,102,241,.3))",
                      animation: "float 3.5s ease-in-out infinite"
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[15px] font-extrabold tracking-tight text-white"
                      style={{ textShadow: "0 2px 8px rgba(255,255,255,.05)" }}
                    >
                      Agnel
                    </span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest select-none"
                      style={{
                        background: "linear-gradient(135deg, rgba(236, 72, 153, .12), rgba(99, 102, 241, .12))",
                        color: "#f472b6",
                        border: "1px solid rgba(236, 72, 153, .2)",
                        boxShadow: "0 0 8px rgba(236, 72, 153, .1)"
                      }}
                    >
                      Co-Pilot
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 animate-ping" style={{ animationDuration: "2s" }} />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[10px] text-white/45 font-medium tracking-wide">Advisor Operational</span>
                  </div>
                </div>
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm("Reset conversation?")) {
                        setMessages(messages.slice(0, 1))
                      }
                    }}
                    title="Reset chat"
                    className="flex size-8 items-center justify-center rounded-xl text-white/30 transition-all duration-200 hover:text-red-400/80 hover:bg-red-500/10 hover:scale-105 active:scale-95"
                    style={{
                      background: "rgba(255,255,255,.02)",
                      border: "1px solid rgba(255,255,255,.04)"
                    }}
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={closeChat}
                  className="flex size-8 items-center justify-center rounded-xl text-white/30 transition-all duration-200 hover:text-white/70 hover:bg-white/10 hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.05)"
                  }}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2.5 msg-appear ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {msg.role === "assistant" && (
                    <img
                      src="/chatbubble.png"
                      alt="Agnel"
                      className="size-7 shrink-0 mb-0.5 object-contain"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,.45))" }}
                    />
                  )}

                  <div
                    className="max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg, rgba(236, 72, 153, .2) 0%, rgba(99, 102, 241, .15) 100%)",
                          color: "rgba(255, 255, 255, .9)",
                          border: "1px solid rgba(236, 72, 153, .3)",
                          borderBottomRightRadius: "6px",
                          boxShadow: "0 4px 16px rgba(236, 72, 153, .08), inset 0 1px 0 rgba(255, 255, 255, .05)"
                        }
                      : {
                          background: "linear-gradient(135deg, rgba(255, 255, 255, .04) 0%, rgba(255, 255, 255, .01) 100%)",
                          color: "rgba(255, 255, 255, .8)",
                          border: "1px solid rgba(255, 255, 255, .06)",
                          borderBottomLeftRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                          borderLeft: "2.5px solid rgba(99, 102, 241, .4)"
                        }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing */}
              {loading && (
                <div className="flex items-end gap-2.5 msg-appear">
                  <img
                    src="/chatbubble.png"
                    alt="Agnel"
                    className="size-7 shrink-0 mb-0.5 object-contain"
                    style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,.45))" }}
                  />
                  <div
                    className="flex items-center gap-1.5 rounded-2xl px-5 py-3.5"
                    style={{
                      background: "linear-gradient(135deg, rgba(255, 255, 255, .04), rgba(255, 255, 255, .02))",
                      border: "1px solid rgba(255, 255, 255, .06)",
                      borderBottomLeftRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                      borderLeft: "2.5px solid rgba(236, 72, 153, .4)"
                    }}
                  >
                    <span className="size-1.5 rounded-full bg-pink-400/60" style={{ animation: "dot-wave 1.4s ease-in-out infinite", animationDelay: "0ms" }} />
                    <span className="size-1.5 rounded-full bg-indigo-400/60" style={{ animation: "dot-wave 1.4s ease-in-out infinite", animationDelay: "150ms" }} />
                    <span className="size-1.5 rounded-full bg-cyan-400/60" style={{ animation: "dot-wave 1.4s ease-in-out infinite", animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="shrink-0 px-5 pb-5 pt-3 relative"
              style={{
                borderTop: "1px solid rgba(255, 255, 255, .05)",
                background: "linear-gradient(0deg, rgba(20, 20, 30, .98) 0%, transparent 100%)"
              }}
            >
              {/* Neon border glow line at top of input area */}
              <div
                className="absolute top-0 inset-x-16 h-[1px]"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(236, 72, 153, .15), rgba(99, 102, 241, .15), transparent)"
                }}
              />
              <div
                className="flex items-center gap-2.5 rounded-2xl px-4 py-2.5 transition-all duration-300 focus-within:shadow-[0_0_15px_rgba(99,102,241,.15)] focus-within:border-indigo-500/40"
                style={{
                  background: "rgba(255, 255, 255, .02)",
                  border: "1px solid rgba(255, 255, 255, .06)",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,.2)",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask Agnel anything..."
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-white/80 placeholder:text-white/15 outline-none"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-15 hover:scale-110 active:scale-90"
                  style={{
                    background: input.trim() && !loading
                      ? "linear-gradient(135deg, rgba(236, 72, 153, .3), rgba(99, 102, 241, .25))"
                      : "transparent",
                    border: input.trim() && !loading ? "1px solid rgba(236, 72, 153, .25)" : "1px solid transparent",
                    boxShadow: input.trim() && !loading ? "0 0 16px rgba(236, 72, 153, .15)" : "none"
                  }}
                >
                  {loading
                    ? <Loader2 className="size-4 text-white/30 animate-spin" />
                    : <Send className={`size-4 ${input.trim() ? "text-pink-300" : "text-white/20"}`} />
                  }
                </button>
              </div>
              <p className="mt-2 text-center text-[9px] text-white/10 tracking-[0.2em] uppercase font-semibold">
                Agnel · AI Business Advisor
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Glowing Orb Trigger ── */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-4 sm:right-6 z-50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90"
        aria-label={open ? "Close Agnel" : "Open Agnel"}
      >
        {/* Outer glow layers */}
        <div className="agnel-orb-glow" />
        <div className="agnel-orb-glow" style={{ animationDelay: "-1.5s", background: "radial-gradient(circle, rgba(56,189,248,.2), rgba(99,102,241,.15), transparent 70%)" }} />
        
        {/* The Orb */}
        <div
          className="agnel-orb relative flex items-center justify-center"
          style={{
            width: open ? "52px" : "64px",
            height: open ? "52px" : "64px",
            transition: "all .4s cubic-bezier(.22, 1, .36, 1)",
          }}
        >
          {open ? (
            <X className="relative z-10 size-5 text-white/60" />
          ) : (
            <img
              src="/chatbubble.png"
              alt="Agnel"
              className="relative z-10 size-12 object-contain"
              style={{
                animation: "float 3.5s ease-in-out infinite",
                filter: "drop-shadow(0 0 14px rgba(56,189,248,.6)) drop-shadow(0 0 28px rgba(99,102,241,.35))",
              }}
            />
          )}
        </div>
      </button>
    </>
  )
}