"use client"

export function GlowBackground() {
  return (
    <>
      <style>{`
        /* ── glow orbs ─────────────────────────────────────────────── */
        @keyframes orb-a {
          0%,100% { opacity:.45; transform:scale(1)   translateY(0px); }
          50%     { opacity:.75; transform:scale(1.12) translateY(-30px); }
        }
        @keyframes orb-b {
          0%,100% { opacity:.3;  transform:scale(1)   translateY(0px); }
          50%     { opacity:.55; transform:scale(1.08) translateY(24px); }
        }
        @keyframes orb-c {
          0%,100% { opacity:.25; transform:scale(1)   translateX(0px); }
          50%     { opacity:.45; transform:scale(1.06) translateX(-20px); }
        }

        /* ── scan line ─────────────────────────────────────────────── */
        @keyframes scan-down {
          0%   { top: -2px; opacity:0; }
          3%   { opacity:1; }
          97%  { opacity:.6; }
          100% { top: 100vh; opacity:0; }
        }
        .scan-line {
          position:absolute; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.08) 25%,rgba(255,255,255,.16) 50%,rgba(255,255,255,.08) 75%,transparent 100%);
          box-shadow:0 0 12px rgba(255,255,255,.06);
          animation:scan-down 15s linear infinite;
        }

        /* ── circuit path traveling dots ───────────────────────────── */
        @keyframes travel-1  { from{stroke-dashoffset:0} to{stroke-dashoffset:-203} }
        @keyframes travel-2  { from{stroke-dashoffset:0} to{stroke-dashoffset:-183} }
        @keyframes travel-3  { from{stroke-dashoffset:0} to{stroke-dashoffset:-163} }

        /* ── hairline pulse ────────────────────────────────────────── */
        @keyframes line-pulse {
          0%,100% { opacity:.2; }
          50%     { opacity:.4; }
        }
      `}</style>

      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[#111216]">
        {/* ── 1. Ambient glow orbs ─────────────────────────────────── */}
        <div style={{
          position:"absolute", top:"-8%", left:"50%", transform:"translateX(-50%)",
          width:800, height:500, borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(255,255,255,.03) 0%,transparent 68%)",
          animation:"orb-a 12s ease-in-out infinite",
        }} />
        <div style={{
          position:"absolute", bottom:"-5%", left:"-5%",
          width:600, height:600, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(200,210,230,.02) 0%,transparent 65%)",
          animation:"orb-b 18s ease-in-out 2s infinite",
        }} />
        <div style={{
          position:"absolute", top:"35%", right:"-8%",
          width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(210,220,240,.025) 0%,transparent 65%)",
          animation:"orb-c 15s ease-in-out 4s infinite",
        }} />

        {/* ── 2. Fine dot grid ─────────────────────────────────────── */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"radial-gradient(rgba(255,255,255,.02) 1px,transparent 1px)",
          backgroundSize:"28px 28px",
          maskImage:"radial-gradient(ellipse 90% 80% at 50% 40%,black 20%,transparent 100%)",
          WebkitMaskImage:"radial-gradient(ellipse 90% 80% at 50% 40%,black 20%,transparent 100%)",
        }} />

        {/* ── 3. SVG — circuit traces + traveling dots ─────────────── */}
        <svg
          style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {/* Static trace lines */}
          <path d="M -40 190 C 180 170, 380 230, 620 210 S 980 170, 1200 225 L 1480 215"
            stroke="rgba(255,255,255,.03)" strokeWidth="1" />
          <path d="M 380 -20 L 380 140 L 720 140 L 720 320 L 1100 320 L 1100 490"
            stroke="rgba(255,255,255,.025)" strokeWidth="1" />
          <path d="M -40 740 C 250 700, 500 760, 750 730 S 1100 690, 1480 730"
            stroke="rgba(255,255,255,.02)" strokeWidth="1" />

          {/* Junction dots on circuit corners */}
          {[[380,140],[720,140],[720,320],[1100,320]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="2.5" fill="rgba(255,255,255,.08)" />
          ))}

          {/* Traveling dots */}
          <path d="M -40 190 C 180 170, 380 230, 620 210 S 980 170, 1200 225 L 1480 215"
            stroke="rgba(255,255,255,.3)" strokeWidth="1.2"
            strokeDasharray="3 200"
            style={{ animation:"travel-1 9s linear infinite" }} />
          <path d="M 380 -20 L 380 140 L 720 140 L 720 320 L 1100 320 L 1100 490"
            stroke="rgba(255,255,255,.25)" strokeWidth="1.2"
            strokeDasharray="3 180"
            style={{ animation:"travel-2 12s linear infinite 1.5s" }} />
          <path d="M -40 740 C 250 700, 500 760, 750 730 S 1100 690, 1480 730"
            stroke="rgba(255,255,255,.2)" strokeWidth="1.2"
            strokeDasharray="3 160"
            style={{ animation:"travel-3 10s linear infinite 3s" }} />

          {/* Horizontal hairlines */}
          <line x1="0" y1="360" x2="1440" y2="360"
            stroke="rgba(255,255,255,.015)"
            style={{ animation:"line-pulse 8s ease-in-out infinite" }} />
          <line x1="0" y1="540" x2="1440" y2="540"
            stroke="rgba(255,255,255,.01)"
            style={{ animation:"line-pulse 10s ease-in-out 2s infinite" }} />
        </svg>

        {/* ── 4. Scan line ─────────────────────────────────────────── */}
        <div className="scan-line" />

        {/* Layered, silk-like silver-blue misty waves in bottom-left */}
        <div className="absolute bottom-[-100px] left-[-100px] w-[600px] h-[500px] select-none pointer-events-none opacity-40">
          <svg 
            viewBox="0 0 600 500" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="waveGrad1" x1="0" y1="500" x2="600" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1a2230" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#161b24" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#111216" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="waveGrad2" x1="0" y1="500" x2="500" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#161e29" stopOpacity="0.75" />
                <stop offset="70%" stopColor="#11161f" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#111216" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Wave Layer 2 */}
            <path 
              d="M 0 500 L 0 350 C 120 290, 220 410, 390 310 C 470 260, 520 200, 600 160 L 600 500 Z" 
              fill="url(#waveGrad2)" 
            />
            
            {/* Wave Layer 1 */}
            <path 
              d="M 0 500 L 0 380 C 100 320, 180 420, 350 330 C 440 280, 490 220, 600 200 L 600 500 Z" 
              fill="url(#waveGrad1)" 
            />

            {/* Elegant contour line overlays in silver/chrome */}
            <path 
              d="M 0 380 C 100 320, 180 420, 350 330 C 440 280, 490 220, 600 200" 
              stroke="rgba(255, 255, 255, 0.25)" 
              strokeWidth="1.2" 
              className="anim-wave-flow"
            />
            <path 
              d="M 0 395 C 95 335, 175 425, 345 335 C 435 285, 485 225, 600 205" 
              stroke="rgba(255, 255, 255, 0.12)" 
              strokeWidth="0.8" 
              className="anim-wave-flow"
              style={{ animationDelay: "-3s" }}
            />
            <path 
              d="M 0 350 C 120 290, 220 410, 390 310 C 470 260, 520 200, 600 160" 
              stroke="rgba(255, 255, 255, 0.08)" 
              strokeWidth="0.6" 
              className="anim-wave-flow"
              style={{ animationDelay: "-6s" }}
            />
          </svg>
        </div>

        {/* Subtle premium glass sheen horizon line */}
        <div 
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.04) 30%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 70%, transparent 100%)"
          }}
        />
      </div>
    </>
  )
}


