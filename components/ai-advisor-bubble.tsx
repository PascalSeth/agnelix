/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element */
"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send, Loader2, RotateCcw, Sparkles } from "lucide-react"
import { usePathname } from "next/navigation"

interface Message {
  role: "user" | "assistant"
  content: string
}

const CSS = `
  @keyframes orb-spin    { to { transform: rotate(360deg); } }
  @keyframes orb-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
  @keyframes orb-glow    { 0%,100%{opacity:.4;transform:scale(1.1)} 50%{opacity:.78;transform:scale(1.48)} }
  @keyframes float-soft  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

  @keyframes panel-up {
    0%   { opacity:0; transform:translateY(40px) scale(.96); filter:blur(4px); }
    60%  { opacity:1; filter:blur(0); }
    80%  { transform:translateY(-4px) scale(1.01); }
    100% { transform:translateY(0) scale(1); }
  }
  @keyframes panel-down {
    0%   { opacity:1; transform:translateY(0) scale(1); }
    100% { opacity:0; transform:translateY(20px) scale(.96); filter:blur(3px); }
  }

  @keyframes msg-user { 0%{opacity:0;transform:translateX(10px)} 100%{opacity:1;transform:none} }
  @keyframes msg-bot  { 0%{opacity:0;transform:translateX(-8px)} 100%{opacity:1;transform:none} }
  @keyframes dot      { 0%,80%,100%{transform:translateY(0);opacity:.28} 40%{transform:translateY(-3.5px);opacity:1} }
  @keyframes ping     { 75%,100%{transform:scale(2.1);opacity:0} }
  @keyframes badge    { 0%{transform:scale(0) rotate(-12deg)} 70%{transform:scale(1.15)} 100%{transform:scale(1) rotate(0)} }
  @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .gc-cursor {
    display:inline-block; width:1.5px; height:0.9em;
    background:rgba(99,102,241,.7); margin-left:1px;
    vertical-align:text-bottom; border-radius:1px;
    animation: cursor-blink .55s ease-in-out infinite;
  }

  /* orb shell */
  .gc-orb {
    position:relative; border-radius:50%; overflow:hidden;
    animation: orb-breathe 3.5s ease-in-out infinite;
  }
  .gc-orb::before {
    content:''; position:absolute; inset:-44%;
    background:conic-gradient(from 0deg,
      transparent 0deg,
      rgba(56,189,248,.52) 52deg,
      transparent 108deg,
      rgba(236,72,153,.52) 192deg,
      transparent 248deg,
      rgba(99,102,241,.52) 312deg,
      transparent 360deg);
    animation: orb-spin 6.5s linear infinite; filter:blur(5px);
  }
  .gc-orb::after {
    content:''; position:absolute; inset:0; border-radius:50%;
    background:
      radial-gradient(circle at 33% 28%, rgba(255,255,255,.8)  0%, transparent 20%),
      radial-gradient(circle at 61% 67%, rgba(56,189,248,.5)   0%, transparent 30%),
      radial-gradient(circle at 50% 50%, rgba(236,72,153,.88)  0%, rgba(236,72,153,.3) 38%, transparent 62%),
      radial-gradient(circle at 50% 50%, rgba(99,102,241,.24)  0%, transparent 70%);
    box-shadow:
      inset -4px -4px 10px rgba(0,0,0,.45),
      inset  4px  4px 10px rgba(255,255,255,.18),
      0 0 22px rgba(236,72,153,.48),
      0 0 48px rgba(99,102,241,.22);
  }
  .gc-orb-glow { position:absolute; inset:-46%; border-radius:50%; pointer-events:none; animation:orb-glow 3s ease-in-out infinite; }

  /* panel */
  .gc-enter { animation: panel-up   .32s cubic-bezier(.22,1,.36,1) forwards; }
  .gc-exit  { animation: panel-down .22s ease-in forwards; }
  .gc-glass {
    background: rgba(11,11,20,.94);
    backdrop-filter: blur(30px) saturate(1.55);
    -webkit-backdrop-filter: blur(30px) saturate(1.55);
  }

  /* messages */
  .gc-mu { animation: msg-user .24s cubic-bezier(.22,1,.36,1) forwards; }
  .gc-mb { animation: msg-bot  .24s cubic-bezier(.22,1,.36,1) forwards; }

  /* dots */
  .gc-d  { animation: dot 1.3s ease-in-out infinite; border-radius:50%; display:inline-block; }
  .gc-d:nth-child(2) { animation-delay:.16s; }
  .gc-d:nth-child(3) { animation-delay:.32s; }

  /* scroll */
  .gc-sc::-webkit-scrollbar { width:3px; }
  .gc-sc::-webkit-scrollbar-track { background:transparent; }
  .gc-sc::-webkit-scrollbar-thumb { background:rgba(255,255,255,.07); border-radius:9px; }
  .gc-sc { scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.07) transparent; }

  /* input */
  .gc-iw:focus-within { border-color:rgba(99,102,241,.42) !important; box-shadow:0 0 0 3px rgba(99,102,241,.08) !important; }

  /* misc */
  .gc-ping { animation: ping 2.2s cubic-bezier(0,0,.2,1) infinite; }

  /* ── Splash screen ── */
  @keyframes splash-orb-in {
    0%   { opacity:0; transform:scale(.42) translateY(18px); filter:blur(12px); }
    60%  { opacity:.9; filter:blur(1px); }
    100% { opacity:1; transform:scale(1) translateY(0); filter:blur(0); }
  }
  @keyframes splash-text-in {
    0%   { opacity:0; transform:translateY(14px); }
    100% { opacity:1; transform:translateY(0); }
  }
  @keyframes splash-tag-in {
    0%   { opacity:0; transform:translateY(6px); }
    100% { opacity:1; transform:translateY(0); }
  }
  @keyframes splash-lift {
    0%   { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
    30%  { opacity:.9; }
    100% { opacity:0; transform:translateY(-28px) scale(.98); filter:blur(3px); }
  }
  @keyframes scan-line {
    0%   { transform:translateY(-100%); opacity:0; }
    8%   { opacity:1; }
    92%  { opacity:1; }
    100% { transform:translateY(700%); opacity:0; }
  }
  /* delays pushed 300ms later so panel lands before content reveals */
  .gc-splash-orb  { animation: splash-orb-in  .72s cubic-bezier(.16,1,.3,1) .42s both; }
  .gc-splash-name { animation: splash-text-in .55s cubic-bezier(.16,1,.3,1) .96s both; }
  .gc-splash-tag  { animation: splash-tag-in  .5s  cubic-bezier(.16,1,.3,1) 1.38s both; }
  .gc-splash-lift { animation: splash-lift    .72s cubic-bezier(.4,0,.6,1) 3.0s both; }

  @media (max-width:520px) {
    .gc-wrap { left:10px !important; right:10px !important; width:auto !important; }
  }
`

export function AiAdvisorBubble() {
  const pathname = usePathname()
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [unread, setUnread]     = useState(0)
  const [showSplash, setShowSplash] = useState(false)
  // Typewriter state
  const [typingIdx, setTypingIdx]     = useState(-1)
  const [typingChars, setTypingChars] = useState(0)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const initRef     = useRef(false)
  const typeTimer   = useRef<ReturnType<typeof setInterval> | null>(null)
  const splashShown = useRef(false)   // only show splash once per session

  useEffect(() => {
    if (!open || initRef.current) return
    initRef.current = true
    fetch("/api/ai-advisor")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.greeting) setMessages([{ role: "assistant", content: d.greeting }]) })
      .catch(() => {})
  }, [open])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading, typingChars])

  // Typewriter — fires whenever a new bot message lands
  useEffect(() => {
    const lastIdx = messages.length - 1
    if (lastIdx < 0) return
    const last = messages[lastIdx]
    if (last.role !== "assistant") return
    // Start typing from char 0 for this message
    if (typeTimer.current) clearInterval(typeTimer.current)
    setTypingIdx(lastIdx)
    setTypingChars(0)
    let count = 0
    const total = last.content.length
    typeTimer.current = setInterval(() => {
      count += 1
      setTypingChars(count)
      if (count >= total) {
        clearInterval(typeTimer.current!)
        setTimeout(() => setTypingIdx(-1), 1100)
      }
    }, 42)
    return () => { if (typeTimer.current) clearInterval(typeTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  useEffect(() => {
    const h = () => { setOpen(true); setVisible(true); setUnread(0); setTimeout(() => inputRef.current?.focus(), 300) }
    window.addEventListener("open-ai-advisor", h)
    return () => window.removeEventListener("open-ai-advisor", h)
  }, [])

  const toggleChat = () => {
    setOpen(p => {
      const n = !p
      if (n) {
        setVisible(true); setUnread(0)
        if (!splashShown.current) {
          splashShown.current = true
          // Delay 280ms so panel float-up lands before splash content appears
          setTimeout(() => setShowSplash(true), 280)
          // Lift at 3.0s CSS + 280ms delay = ~3.3s total, unmount 700ms after
          setTimeout(() => setShowSplash(false), 4100)
          // Focus after splash fully gone
          setTimeout(() => inputRef.current?.focus(), 4200)
        } else {
          setTimeout(() => inputRef.current?.focus(), 300)
        }
      } else {
        setTimeout(() => setVisible(false), 240)
      }
      return n
    })
  }

  const closeChat = () => { setOpen(false); setTimeout(() => setVisible(false), 240) }
  const resetChat = () => { if (confirm("Start a new conversation?")) setMessages(messages.slice(0, 1)) }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    const next: Message[] = [...messages, { role: "user", content: text }]
    setMessages(next); setLoading(true)
    try {
      const res  = await fetch("/api/ai-advisor", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages: next }) })
      const data = await res.json()
      setMessages(m => [...m, { role:"assistant", content: data.reply ?? "…" }])
    } catch {
      setMessages(m => [...m, { role:"assistant", content:"Something went wrong — please try again." }])
    } finally { setLoading(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (pathname?.includes("/inbox")) return null

  return (
    <>
      <style>{CSS}</style>

      {/* ── Panel ── */}
      {visible && (
        <div className="gc-wrap fixed z-[60]" style={{ bottom:82, right:16, width:356 }}>
          <div
            className={`gc-glass gc-${open ? "enter" : "exit"} flex flex-col`}
            style={{
              maxHeight: "min(540px, calc(100svh - 110px))",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,.07)",
              boxShadow: "0 28px 72px rgba(0,0,0,.72), 0 0 0 1px rgba(255,255,255,.03), inset 0 1px 0 rgba(255,255,255,.06)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* ════ SPLASH SCREEN — first open only ════ */}
            {showSplash && (
              <div
                className="gc-splash-lift"
                style={{
                  position: "absolute", inset: 0, zIndex: 50,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 0,
                  // blocks ALL interaction underneath
                  pointerEvents: "all",
                  borderRadius: 20, overflow: "hidden",
                  background: "linear-gradient(170deg, rgba(18,10,38,.99) 0%, rgba(9,9,18,.99) 55%, rgba(15,8,30,.99) 100%)",
                }}
              >
                {/* Ambient glow blobs */}
                <div style={{ position:"absolute", top:"15%", left:"50%", transform:"translateX(-50%)", width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,.18) 0%, transparent 70%)", filter:"blur(32px)", pointerEvents:"none" }} />
                <div style={{ position:"absolute", bottom:"20%", left:"30%", width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle, rgba(236,72,153,.14) 0%, transparent 70%)", filter:"blur(28px)", pointerEvents:"none" }} />

                {/* Subtle scan-line sweep */}
                <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", borderRadius:20 }}>
                  <div style={{
                    position:"absolute", left:0, right:0, height:"18%",
                    background:"linear-gradient(180deg, transparent 0%, rgba(99,102,241,.04) 50%, transparent 100%)",
                    animation: "scan-line 2.4s linear infinite",
                  }} />
                </div>

                {/* Mesh grid overlay */}
                <div style={{ position:"absolute", inset:0, pointerEvents:"none", borderRadius:20, backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize:"28px 28px" }} />

                {/* ── Orb ── */}
                <div className="gc-splash-orb" style={{ position:"relative", width:80, height:80, marginBottom:22 }}>
                  {/* Outer halo rings */}
                  <div style={{ position:"absolute", inset:-10, borderRadius:"50%", border:"1px dashed rgba(99,102,241,.3)", animation:"orb-spin 16s linear infinite" }} />
                  <div style={{ position:"absolute", inset:-18, borderRadius:"50%", border:"1px dashed rgba(236,72,153,.15)", animation:"orb-spin 26s linear infinite reverse" }} />
                  {/* Glow */}
                  <div style={{ position:"absolute", inset:"-55%", borderRadius:"50%", background:"radial-gradient(circle,rgba(236,72,153,.28) 0%,rgba(99,102,241,.18) 45%,transparent 70%)", animation:"orb-glow 3s ease-in-out infinite" }} />
                  <div className="gc-orb" style={{ width:80, height:80, position:"relative" }}>
                    <img
                      src="/chatbubble.png" alt="Galien"
                      style={{ position:"relative", zIndex:10, width:64, height:64, objectFit:"contain", margin:"8px auto", display:"block",
                        animation:"float-soft 3.5s ease-in-out infinite",
                        filter:"drop-shadow(0 0 14px rgba(56,189,248,.65)) drop-shadow(0 0 28px rgba(99,102,241,.42))" }}
                    />
                  </div>
                </div>

                {/* ── Name ── */}
                <div className="gc-splash-name" style={{ textAlign:"center", marginBottom:8 }}>
                  <div style={{ fontSize:26, fontWeight:800, color:"rgba(255,255,255,.96)", letterSpacing:"-.025em", lineHeight:1 }}>
                    Galien
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginTop:7 }}>
                    <span style={{ fontSize:9, fontWeight:900, textTransform:"uppercase", letterSpacing:".16em", background:"linear-gradient(135deg,rgba(236,72,153,.18),rgba(99,102,241,.18))", color:"#f472b6", border:"1px solid rgba(236,72,153,.28)", borderRadius:6, padding:"2px 8px" }}>Co-Pilot</span>
                  </div>
                </div>

                {/* ── Tagline ── */}
                <div className="gc-splash-tag" style={{ textAlign:"center", padding:"0 28px" }}>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,.32)", fontWeight:500, lineHeight:1.65, letterSpacing:".01em" }}>
                    Your AI business advisor —<br/>always ready to help you grow.
                  </p>
                </div>

                {/* ── Loading dots ── */}
                <div className="gc-splash-tag" style={{ display:"flex", gap:5, marginTop:24 }}>
                  <span className="gc-d" style={{ width:4, height:4, background:"rgba(236,72,153,.55)" }} />
                  <span className="gc-d" style={{ width:4, height:4, background:"rgba(99,102,241,.55)" }} />
                  <span className="gc-d" style={{ width:4, height:4, background:"rgba(56,189,248,.55)" }} />
                </div>
              </div>
            )}


            {/* ──────────── HEADER ──────────── */}
            <div
              style={{
                flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"11px 12px 11px 14px",
                background: "rgba(255,255,255,.025)",
                borderBottom: "1px solid rgba(255,255,255,.06)",
              }}
            >
              {/* Left — avatar + identity */}
              <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                {/* Small orb avatar */}
                <div style={{ position:"relative", width:36, height:36, flexShrink:0 }}>
                  {/* Rotating halo */}
                  <div style={{ position:"absolute", inset:-4, borderRadius:"50%", border:"1px dashed rgba(99,102,241,.28)", animation:"orb-spin 16s linear infinite" }} />
                  <div className="gc-orb-glow" style={{ background:"radial-gradient(circle,rgba(236,72,153,.22) 0%,rgba(99,102,241,.14) 45%,transparent 70%)" }} />
                  <div className="gc-orb" style={{ width:36, height:36, position:"relative" }}>
                    <img
                      src="/chatbubble.png" alt="Galien"
                      style={{ position:"relative", zIndex:10, width:28, height:28, objectFit:"contain", margin:"4px auto", display:"block",
                        animation:"float-soft 3.5s ease-in-out infinite",
                        filter:"drop-shadow(0 0 7px rgba(56,189,248,.58)) drop-shadow(0 0 14px rgba(99,102,241,.34))" }}
                    />
                  </div>
                </div>

                {/* Name + status */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                    <span style={{ fontSize:13.5, fontWeight:700, color:"rgba(255,255,255,.92)", letterSpacing:"-.01em" }}>Galien</span>
                    <span style={{
                      fontSize:8, fontWeight:900, textTransform:"uppercase", letterSpacing:".13em",
                      background:"linear-gradient(135deg,rgba(236,72,153,.15),rgba(99,102,241,.15))",
                      color:"#f472b6", border:"1px solid rgba(236,72,153,.24)", borderRadius:5, padding:"1px 5px",
                    }}>Co-Pilot</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ position:"relative", display:"inline-flex", width:6, height:6 }}>
                      <span className="gc-ping" style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#34d399", opacity:.65 }} />
                      <span style={{ position:"relative", width:6, height:6, borderRadius:"50%", background:"#34d399", display:"inline-block" }} />
                    </span>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,.34)", fontWeight:500 }}>Online · AI Business Advisor</span>
                  </div>
                </div>
              </div>

              {/* Right — actions */}
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                {messages.length > 1 && (
                  <button
                    onClick={resetChat} title="New conversation"
                    style={{ background:"transparent", border:"1px solid transparent", borderRadius:8, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.28)", cursor:"pointer", transition:"all .18s" }}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLElement; b.style.color="rgba(251,191,36,.75)"; b.style.background="rgba(251,191,36,.07)"; b.style.borderColor="rgba(251,191,36,.15)" }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLElement; b.style.color="rgba(255,255,255,.28)"; b.style.background="transparent"; b.style.borderColor="transparent" }}
                  ><RotateCcw size={11}/></button>
                )}
                <button
                  onClick={closeChat} title="Close"
                  style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.36)", cursor:"pointer", transition:"all .18s" }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLElement; b.style.color="rgba(255,255,255,.78)"; b.style.background="rgba(255,255,255,.08)" }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLElement; b.style.color="rgba(255,255,255,.36)"; b.style.background="rgba(255,255,255,.04)" }}
                ><X size={12}/></button>
              </div>
            </div>

            {/* ──────────── MESSAGES ──────────── */}
            <div
              className="gc-sc flex-1 overflow-y-auto flex flex-col gap-3"
              style={{ padding:"14px 13px", overscrollBehavior:"contain", minHeight:0 }}
            >
              {/* Empty state */}
              {messages.length === 0 && !loading && (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:"32px 16px", textAlign:"center" }}>
                  {/* Icon tile */}
                  <div style={{
                    width:52, height:52, borderRadius:15,
                    background:"linear-gradient(135deg,rgba(99,102,241,.1),rgba(236,72,153,.07))",
                    border:"1px solid rgba(255,255,255,.06)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 6px 24px rgba(99,102,241,.1)",
                  }}>
                    <img src="/chatbubble.png" alt="" style={{ width:34, height:34, objectFit:"contain", animation:"float-soft 3.5s ease-in-out infinite", filter:"drop-shadow(0 0 6px rgba(56,189,248,.42))" }} />
                  </div>
                  <div>
                    <p style={{ fontSize:13.5, fontWeight:600, color:"rgba(255,255,255,.7)", marginBottom:5 }}>How can I help?</p>
                    <p style={{ fontSize:11.5, color:"rgba(255,255,255,.28)", lineHeight:1.65 }}>Ask about your leads, campaigns,<br/>or anything about your business.</p>
                  </div>
                  {/* Suggestion chips */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginTop:2 }}>
                    {["Analyze my leads", "Campaign ideas", "Best follow-up time"].map(chip => (
                      <button key={chip}
                        onClick={() => { setInput(chip); setTimeout(() => inputRef.current?.focus(), 50) }}
                        style={{ fontSize:11, fontWeight:500, padding:"5px 11px", borderRadius:20, background:"rgba(99,102,241,.07)", border:"1px solid rgba(99,102,241,.18)", color:"rgba(255,255,255,.48)", cursor:"pointer", transition:"all .18s" }}
                        onMouseEnter={e => { const b = e.currentTarget as HTMLElement; b.style.background="rgba(99,102,241,.14)"; b.style.color="rgba(255,255,255,.82)" }}
                        onMouseLeave={e => { const b = e.currentTarget as HTMLElement; b.style.background="rgba(99,102,241,.07)"; b.style.color="rgba(255,255,255,.48)" }}
                      >{chip}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => msg.role === "user" ? (
                /* ── User ── */
                <div key={i} className="gc-mu" style={{ display:"flex", justifyContent:"flex-end", animationDelay:`${i*25}ms` }}>
                  <div style={{
                    maxWidth:"76%", padding:"9px 13px",
                    borderRadius:"16px 16px 3px 16px",
                    background:"linear-gradient(135deg,rgba(236,72,153,.25),rgba(99,102,241,.2))",
                    border:"1px solid rgba(236,72,153,.26)",
                    boxShadow:"0 2px 12px rgba(236,72,153,.09), inset 0 1px 0 rgba(255,255,255,.06)",
                    color:"rgba(255,255,255,.9)", fontSize:13, lineHeight:1.55, whiteSpace:"pre-wrap",
                  }}>{msg.content}</div>
                </div>
              ) : (
                /* ── Bot ── with typewriter */
                <div key={i} className="gc-mb" style={{ display:"flex", flexDirection:"column", gap:5, animationDelay:`${i*25}ms` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <img src="/chatbubble.png" alt="Galien" style={{ width:18, height:18, objectFit:"contain", flexShrink:0, filter:"drop-shadow(0 0 4px rgba(56,189,248,.38))" }} />
                    <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.3)", letterSpacing:".03em" }}>Galien</span>
                  </div>
                  <div style={{
                    maxWidth:"88%", marginLeft:25, padding:"9px 12px",
                    borderRadius:"3px 14px 14px 14px",
                    background:"rgba(255,255,255,.038)",
                    border:"1px solid rgba(255,255,255,.07)",
                    borderLeft:"2px solid rgba(99,102,241,.4)",
                    color:"rgba(255,255,255,.76)", fontSize:13, lineHeight:1.58, whiteSpace:"pre-wrap",
                  }}>
                    {/* Show partial text while typing, full text when done */}
                    {typingIdx === i
                      ? <>{msg.content.slice(0, typingChars)}<span className="gc-cursor" /></>
                      : msg.content
                    }
                  </div>
                </div>
              ))}


              {/* Typing */}
              {loading && (
                <div className="gc-mb" style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <img src="/chatbubble.png" alt="Galien" style={{ width:18, height:18, objectFit:"contain", flexShrink:0, filter:"drop-shadow(0 0 4px rgba(56,189,248,.38))" }} />
                    <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.3)" }}>Galien</span>
                  </div>
                  <div style={{ marginLeft:25, padding:"10px 13px", borderRadius:"3px 14px 14px 14px", background:"rgba(255,255,255,.038)", border:"1px solid rgba(255,255,255,.07)", borderLeft:"2px solid rgba(236,72,153,.35)", display:"flex", alignItems:"center", gap:4 }}>
                    <span className="gc-d" style={{ width:4.5, height:4.5, background:"rgba(236,72,153,.6)" }} />
                    <span className="gc-d" style={{ width:4.5, height:4.5, background:"rgba(99,102,241,.6)" }} />
                    <span className="gc-d" style={{ width:4.5, height:4.5, background:"rgba(56,189,248,.6)" }} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ──────────── INPUT ──────────── */}
            <div style={{
              flexShrink:0, padding:"10px 12px 13px",
              borderTop:"1px solid rgba(255,255,255,.055)",
              background:"linear-gradient(0deg,rgba(8,8,17,.98),rgba(8,8,17,.82))",
            }}>
              <div
                className="gc-iw"
                style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"8px 8px 8px 13px", transition:"border-color .22s, box-shadow .22s", boxShadow:"inset 0 1px 3px rgba(0,0,0,.25)" }}
              >
                <input
                  ref={inputRef} type="text" value={input}
                  onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Message Galien…"
                  style={{ flex:1, minWidth:0, background:"transparent", fontSize:12.5, color:"rgba(255,255,255,.82)", caretColor:"#f472b6", border:"none", outline:"none", lineHeight:1.5 }}
                />
                <button
                  onClick={send} disabled={!input.trim() || loading}
                  style={{
                    flexShrink:0, width:30, height:30, borderRadius:9,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:input.trim()&&!loading?"pointer":"default",
                    opacity:!input.trim()&&!loading?".22":"1",
                    background:input.trim()&&!loading?"linear-gradient(135deg,rgba(236,72,153,.36),rgba(99,102,241,.28))":"transparent",
                    border:input.trim()&&!loading?"1px solid rgba(236,72,153,.3)":"1px solid transparent",
                    boxShadow:input.trim()&&!loading?"0 0 14px rgba(236,72,153,.18)":"none",
                    transition:"all .2s",
                  }}
                  onMouseEnter={e => { if (input.trim()&&!loading) (e.currentTarget as HTMLElement).style.transform="scale(1.1)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="scale(1)" }}
                >
                  {loading
                    ? <Loader2 size={12} className="animate-spin" style={{ color:"rgba(255,255,255,.3)" }} />
                    : <Send size={12} style={{ color:input.trim()?"#f9a8d4":"rgba(255,255,255,.22)" }} />
                  }
                </button>
              </div>
              <p style={{ textAlign:"center", fontSize:8.5, color:"rgba(255,255,255,.1)", letterSpacing:".15em", textTransform:"uppercase", fontWeight:600, marginTop:7 }}>Powered by Galien AI</p>
            </div>
          </div>

          {/* Tail connector */}
          <div style={{
            position:"absolute", bottom:-5, right:25,
            width:10, height:10, background:"rgba(11,11,20,.94)",
            border:"1px solid rgba(255,255,255,.07)", borderTop:"none", borderLeft:"none",
            transform:"rotate(45deg)",
          }} />
        </div>
      )}

      {/* ── Orb trigger ── */}
      <button
        onClick={toggleChat}
        aria-label={open ? "Close Galien" : "Open Galien AI Advisor"}
        style={{ position:"fixed", bottom:16, right:16, zIndex:61, background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .28s cubic-bezier(.22,1,.36,1)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="scale(1.1)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="scale(1)" }}
        onMouseDown={e  => { (e.currentTarget as HTMLElement).style.transform="scale(.92)" }}
        onMouseUp={e    => { (e.currentTarget as HTMLElement).style.transform="scale(1.06)" }}
      >
        <div className="gc-orb-glow" style={{ background:"radial-gradient(circle,rgba(236,72,153,.28) 0%,rgba(99,102,241,.16) 42%,transparent 70%)" }} />
        <div className="gc-orb-glow" style={{ background:"radial-gradient(circle,rgba(56,189,248,.14) 0%,rgba(99,102,241,.09) 42%,transparent 70%)", animationDelay:"-1.5s" }} />

        <div className="gc-orb" style={{ width:open?50:62, height:open?50:62, position:"relative", transition:"width .38s cubic-bezier(.22,1,.36,1),height .38s cubic-bezier(.22,1,.36,1)" }}>
          {open
            ? <div style={{ position:"relative", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%" }}><X size={17} style={{ color:"rgba(255,255,255,.68)" }} /></div>
            : <img src="/chatbubble.png" alt="Galien" style={{ position:"relative", zIndex:10, width:46, height:46, objectFit:"contain", margin:"8px auto", display:"block", animation:"float-soft 3.5s ease-in-out infinite", filter:"drop-shadow(0 0 11px rgba(56,189,248,.62)) drop-shadow(0 0 20px rgba(99,102,241,.38))" }} />
          }
        </div>

        {unread > 0 && !open && (
          <div style={{ position:"absolute", top:0, right:0, width:16, height:16, borderRadius:"50%", background:"linear-gradient(135deg,#ec4899,#6366f1)", border:"2px solid rgba(11,11,20,.95)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:"#fff", animation:"badge .38s cubic-bezier(.22,1,.36,1) forwards" }}>
            {unread}
          </div>
        )}
      </button>
    </>
  )
}
