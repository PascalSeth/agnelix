export function LandingStyles() {
  return (
    <style>{`
      @keyframes vortex-spin {
        0% { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.1); }
        100% { transform: rotate(360deg) scale(1); }
      }
      @keyframes vortex-spin-reverse {
        0% { transform: rotate(360deg) scale(1.2); }
        50% { transform: rotate(180deg) scale(1); }
        100% { transform: rotate(0deg) scale(1.2); }
      }
      @keyframes radial-pulse {
        0% { transform: scale(0.8) rotate(0deg); opacity: 0.3; }
        50% { transform: scale(1.2) rotate(180deg); opacity: 0.6; }
        100% { transform: scale(0.8) rotate(360deg); opacity: 0.3; }
      }
      @keyframes tornado-rise {
        0% { transform: translateY(100vh) translateX(-50%) scale(0.5) rotate(0deg); opacity: 0; }
        20% { opacity: 0.8; }
        80% { opacity: 0.4; }
        100% { transform: translateY(-100vh) translateX(50%) scale(2) rotate(720deg); opacity: 0; }
      }
      @keyframes arc-sweep {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes radial-line-grow {
        0% { transform: scaleX(0) translateY(0); opacity: 0; }
        50% { transform: scaleX(1) translateY(-20px); opacity: 1; }
        100% { transform: scaleX(0.5) translateY(-40px); opacity: 0; }
      }
      @keyframes diffuse-glow {
        0%, 100% { filter: blur(60px) hue-rotate(0deg); transform: scale(1); }
        33% { filter: blur(80px) hue-rotate(30deg); transform: scale(1.2); }
        66% { filter: blur(50px) hue-rotate(-20deg); transform: scale(0.9); }
      }
      @keyframes fade-up {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scale-in {
        from { opacity: 0; transform: scale(0.95) translateY(15px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-12px) rotate(2deg); }
      }
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes energy-ripple {
        0% { transform: scale(0.8); opacity: 0.6; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      
      .anim-vortex-slow { animation: vortex-spin 30s linear infinite; }
      .anim-vortex-fast { animation: vortex-spin-reverse 20s linear infinite; }
      .anim-radial-pulse { animation: radial-pulse 15s ease-in-out infinite; }
      .anim-tornado { animation: tornado-rise 12s ease-in-out infinite; }
      .anim-arc { animation: arc-sweep 20s linear infinite; }
      .anim-diffuse { animation: diffuse-glow 10s ease-in-out infinite; }
      .anim-fade-up { animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .anim-scale-in { animation: scale-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .anim-shimmer { background-size: 200% auto; animation: shimmer 4s linear infinite; }
      .anim-float { animation: float 6s ease-in-out infinite; }
      .anim-marquee { animation: marquee 40s linear infinite; }
      
      .glass {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .glass-light {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 0, 0, 0.06);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
      }
      .card-elevated {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .card-elevated:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.12);
        transform: translateY(-4px);
        box-shadow: 0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(168, 85, 247, 0.15);
      }
      .card-light {
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(0, 0, 0, 0.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .card-light:hover {
        background: rgba(255, 255, 255, 0.95);
        border-color: rgba(0, 0, 0, 0.1);
        transform: translateY(-4px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      }
      .text-gradient-w {
        background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.55) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .text-gradient-b {
        background: linear-gradient(135deg, #171717 0%, #525252 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .text-gradient-accent {
        background: linear-gradient(135deg, #c4b5fd 0%, #818cf8 50%, #60a5fa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      /* Curved Section Dividers */
      .curve-divider {
        position: relative;
        height: 120px;
        overflow: hidden;
      }
      .curve-divider::before {
        content: '';
        position: absolute;
        width: 200%;
        height: 200%;
        border-radius: 50%;
        left: 50%;
        transform: translateX(-50%);
      }
      .curve-dark-to-light::before {
        top: 0;
        background: #f8f8fb;
        box-shadow: 0 -50px 100px #0a0a0f;
      }
      .curve-light-to-dark::before {
        bottom: 0;
        background: #0a0a0f;
        box-shadow: 0 50px 100px #f8f8fb;
      }
    `}</style>
  )
}
