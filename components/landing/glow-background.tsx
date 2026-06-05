"use client"

export function GlowBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">

      {/* ── Base: gray-to-black radial gradient ──────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 70% at 50% -5%,  #1c1d28 0%, #0e0f16 45%, #04040a 100%)
          `,
        }}
      />

      {/* ── Hard vignette on the four corners ────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #03030a 100%)
          `,
        }}
      />

      {/* ── PRIMARY GLOW — top-center, silver-blue, slow breathe ─────── */}
      <div
        className="absolute -top-[12%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(190,200,255,0.13) 0%, rgba(140,155,230,0.06) 40%, transparent 70%)",
          animation: "glowBreathe 9s ease-in-out infinite",
        }}
      />

      {/* ── SECONDARY GLOW — mid-left, cool indigo ───────────────────── */}
      <div
        className="absolute top-[30%] -left-[8%] w-[550px] h-[550px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(100,110,200,0.07) 0%, transparent 65%)",
          animation: "glowDrift 14s ease-in-out infinite",
        }}
      />

      {/* ── SECONDARY GLOW — mid-right, faint violet ─────────────────── */}
      <div
        className="absolute top-[35%] -right-[6%] w-[480px] h-[480px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(130,100,210,0.06) 0%, transparent 65%)",
          animation: "glowDrift 18s ease-in-out infinite reverse",
        }}
      />

      {/* ── ACCENT GLOW — lower center, warm gray-silver ─────────────── */}
      <div
        className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(160,165,200,0.05) 0%, transparent 65%)",
          animation: "glowBreathe 12s ease-in-out 3s infinite",
        }}
      />

      {/* ── Subtle dot grid ──────────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 30%, black 20%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 30%, black 20%, transparent 80%)",
        }}
      />

      {/* ── Top sheen bar (very subtle horizon line) ─────────────────── */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(200,210,255,0.18) 30%, rgba(220,225,255,0.28) 50%, rgba(200,210,255,0.18) 70%, transparent 100%)",
        }}
      />

      {/* ── Bottom fade-out ───────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 inset-x-0 h-64"
        style={{
          background: "linear-gradient(to top, #04040a 0%, transparent 100%)",
        }}
      />

      {/* ── Keyframes ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes glowBreathe {
          0%, 100% { opacity: 0.85; transform: translateX(-50%) scale(1);    }
          50%       { opacity: 1;    transform: translateX(-50%) scale(1.08); }
        }
        @keyframes glowDrift {
          0%, 100% { opacity: 0.8; transform: translateY(0px)  scale(1);    }
          50%       { opacity: 1;   transform: translateY(-24px) scale(1.06); }
        }
      `}</style>
    </div>
  )
}
