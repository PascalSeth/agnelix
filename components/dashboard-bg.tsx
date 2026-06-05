export function DashboardBg() {
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
        @keyframes orb-d {
          0%,100% { opacity:.2;  transform:scale(1); }
          50%     { opacity:.4;  transform:scale(1.15); }
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
          background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.12) 25%,rgba(255,255,255,.2) 50%,rgba(255,255,255,.12) 75%,transparent 100%);
          box-shadow:0 0 12px rgba(255,255,255,.08);
          animation:scan-down 14s linear infinite;
        }

        /* ── circuit path traveling dots ───────────────────────────── */
        @keyframes travel-1  { from{stroke-dashoffset:0} to{stroke-dashoffset:-203} }
        @keyframes travel-2  { from{stroke-dashoffset:0} to{stroke-dashoffset:-183} }
        @keyframes travel-3  { from{stroke-dashoffset:0} to{stroke-dashoffset:-163} }
        @keyframes travel-4  { from{stroke-dashoffset:0} to{stroke-dashoffset:-143} }
        @keyframes travel-5  { from{stroke-dashoffset:0} to{stroke-dashoffset:-123} }

        /* ── corner arc ────────────────────────────────────────────── */
        @keyframes arc-spin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes arc-spin-rev {
          from { transform:rotate(360deg); }
          to   { transform:rotate(0deg); }
        }

        /* ── hairline pulse ────────────────────────────────────────── */
        @keyframes line-pulse {
          0%,100% { opacity:.25; }
          50%     { opacity:.55; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">

        {/* ── 1. Ambient glow orbs ─────────────────────────────────── */}
        {/* Primary — top-center */}
        <div style={{
          position:"absolute", top:"-8%", left:"50%", transform:"translateX(-50%)",
          width:800, height:500, borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(255,255,255,.055) 0%,transparent 68%)",
          animation:"orb-a 12s ease-in-out infinite",
        }} />
        {/* Secondary — bottom-left */}
        <div style={{
          position:"absolute", bottom:"-5%", left:"-5%",
          width:600, height:600, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(200,210,230,.04) 0%,transparent 65%)",
          animation:"orb-b 18s ease-in-out 2s infinite",
        }} />
        {/* Tertiary — right-center */}
        <div style={{
          position:"absolute", top:"35%", right:"-8%",
          width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(210,220,240,.04) 0%,transparent 65%)",
          animation:"orb-c 15s ease-in-out 4s infinite",
        }} />
        {/* Accent — top-right */}
        <div style={{
          position:"absolute", top:"5%", right:"12%",
          width:280, height:280, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(255,255,255,.045) 0%,transparent 65%)",
          animation:"orb-d 10s ease-in-out 1s infinite",
        }} />

        {/* ── 2. Fine dot grid ─────────────────────────────────────── */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"radial-gradient(rgba(255,255,255,.028) 1px,transparent 1px)",
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
          {/* Trace A: top-left → right, gentle S */}
          <path d="M -40 190 C 180 170, 380 230, 620 210 S 980 170, 1200 225 L 1480 215"
            stroke="rgba(255,255,255,.055)" strokeWidth="1" />
          {/* Trace B: right-angle L (vertical then horizontal) */}
          <path d="M 380 -20 L 380 140 L 720 140 L 720 320 L 1100 320 L 1100 490"
            stroke="rgba(255,255,255,.05)" strokeWidth="1" />
          {/* Trace C: bottom sweep */}
          <path d="M -40 740 C 250 700, 500 760, 750 730 S 1100 690, 1480 730"
            stroke="rgba(255,255,255,.045)" strokeWidth="1" />
          {/* Trace D: diagonal right-angle */}
          <path d="M 900 -20 L 900 80 L 1150 80 L 1150 260 L 1350 260 L 1350 440 L 1480 440"
            stroke="rgba(255,255,255,.04)" strokeWidth="1" />
          {/* Trace E: short left-area trace */}
          <path d="M -40 480 L 120 480 L 120 620 L 300 620 L 300 780"
            stroke="rgba(255,255,255,.04)" strokeWidth="1" />

          {/* Junction dots on circuit corners */}
          {[[380,140],[720,140],[720,320],[1100,320],[900,80],[1150,80],[1150,260],[1350,260],[120,480],[120,620],[300,620]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="2.5" fill="rgba(255,255,255,.12)" />
          ))}

          {/* Traveling dots — same paths but animated dashoffset */}
          <path d="M -40 190 C 180 170, 380 230, 620 210 S 980 170, 1200 225 L 1480 215"
            stroke="rgba(255,255,255,.55)" strokeWidth="1.5"
            strokeDasharray="3 200"
            style={{ animation:"travel-1 9s linear infinite" }} />
          <path d="M 380 -20 L 380 140 L 720 140 L 720 320 L 1100 320 L 1100 490"
            stroke="rgba(255,255,255,.5)" strokeWidth="1.5"
            strokeDasharray="3 180"
            style={{ animation:"travel-2 12s linear infinite 1.5s" }} />
          <path d="M -40 740 C 250 700, 500 760, 750 730 S 1100 690, 1480 730"
            stroke="rgba(255,255,255,.45)" strokeWidth="1.5"
            strokeDasharray="3 160"
            style={{ animation:"travel-3 10s linear infinite 3s" }} />
          <path d="M 900 -20 L 900 80 L 1150 80 L 1150 260 L 1350 260 L 1350 440 L 1480 440"
            stroke="rgba(255,255,255,.5)" strokeWidth="1.5"
            strokeDasharray="3 140"
            style={{ animation:"travel-4 14s linear infinite 0.5s" }} />
          <path d="M -40 480 L 120 480 L 120 620 L 300 620 L 300 780"
            stroke="rgba(255,255,255,.4)" strokeWidth="1.5"
            strokeDasharray="3 120"
            style={{ animation:"travel-5 8s linear infinite 5s" }} />

          {/* ── Corner arc decorations ─────────────────────────────── */}
          {/* Top-right: nested arcs */}
          <g style={{ transformOrigin:"1400px 60px", animation:"arc-spin 40s linear infinite" }}>
            <path d="M 1340 60 A 60 60 0 0 1 1400 0" stroke="rgba(255,255,255,.09)" strokeWidth="1" />
            <path d="M 1310 60 A 90 90 0 0 1 1400 -30" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
          </g>
          <g style={{ transformOrigin:"1400px 60px", animation:"arc-spin-rev 28s linear infinite" }}>
            <path d="M 1370 60 A 30 30 0 0 1 1400 30" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
          </g>

          {/* Bottom-left: bracket */}
          <g style={{ transformOrigin:"60px 830px", animation:"arc-spin 55s linear infinite" }}>
            <path d="M 0 830 A 60 60 0 0 0 60 900" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
            <path d="M 0 800 A 90 90 0 0 0 90 900" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
          </g>

          {/* Horizontal hairlines (full width, staggered) */}
          <line x1="0" y1="360" x2="1440" y2="360"
            stroke="rgba(255,255,255,.035)"
            style={{ animation:"line-pulse 8s ease-in-out infinite" }} />
          <line x1="0" y1="540" x2="1440" y2="540"
            stroke="rgba(255,255,255,.025)"
            style={{ animation:"line-pulse 10s ease-in-out 2s infinite" }} />
          <line x1="0" y1="180" x2="1440" y2="180"
            stroke="rgba(255,255,255,.03)"
            style={{ animation:"line-pulse 12s ease-in-out 4s infinite" }} />

          {/* Vertical hairlines */}
          <line x1="360" y1="0" x2="360" y2="900"
            stroke="rgba(255,255,255,.025)"
            style={{ animation:"line-pulse 9s ease-in-out 1s infinite" }} />
          <line x1="1080" y1="0" x2="1080" y2="900"
            stroke="rgba(255,255,255,.02)"
            style={{ animation:"line-pulse 11s ease-in-out 3s infinite" }} />
        </svg>

        {/* ── 4. Scan line ─────────────────────────────────────────── */}
        <div className="scan-line" />

        {/* ── 5. Vignette (edges fade to darker) ───────────────────── */}
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 100% 100% at 50% 50%,transparent 50%,rgba(0,0,0,.35) 100%)",
        }} />
      </div>
    </>
  )
}
