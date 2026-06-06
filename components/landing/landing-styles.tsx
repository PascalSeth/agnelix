export function LandingStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

      .font-luxury-serif {
        font-family: 'Cormorant Garamond', Georgia, serif;
      }
      .font-luxury-sans {
        font-family: 'Outfit', sans-serif;
      }

      @keyframes leaf-sway {
        0%, 100% { transform: rotate(0deg) skewX(0deg); }
        50% { transform: rotate(1.2deg) skewX(0.4deg); }
      }
      @keyframes leaf-sway-slow {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-0.8deg) translateY(1px); }
      }
      @keyframes luxury-float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes luxury-float-delayed {
        0%, 100% { transform: translateY(-4px); }
        50% { transform: translateY(4px); }
      }
      @keyframes wave-flow {
        0% { stroke-dashoffset: 1000; }
        100% { stroke-dashoffset: 0; }
      }
      @keyframes soft-pulse {
        0%, 100% { opacity: 0.8; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.03); }
      }
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(calc(-100% - 24px)); }
      }

      .anim-marquee {
        animation: marquee 30s linear infinite;
      }
      .anim-sway {
        animation: leaf-sway 8s ease-in-out infinite;
        transform-origin: bottom center;
      }
      .anim-sway-slow {
        animation: leaf-sway-slow 10s ease-in-out infinite;
        transform-origin: bottom left;
      }
      .anim-luxury-float {
        animation: luxury-float 7s ease-in-out infinite;
      }
      .anim-luxury-float-delayed {
        animation: luxury-float-delayed 8s ease-in-out infinite;
      }
      .anim-wave-flow {
        stroke-dasharray: 200 10;
        animation: wave-flow 60s linear infinite;
      }
      .anim-soft-pulse {
        animation: soft-pulse 4s ease-in-out infinite;
      }

      .glass-luxury {
        background: rgba(26, 28, 36, 0.65);
        backdrop-filter: blur(24px) saturate(140%);
        -webkit-backdrop-filter: blur(24px) saturate(140%);
        border: 1px solid rgba(255, 255, 255, 0.07);
        box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.35), 
                    0 2px 8px rgba(255, 255, 255, 0.01), 
                    inset 0 1px 0 rgba(255, 255, 255, 0.04);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .glass-luxury:hover {
        background: rgba(26, 28, 36, 0.8);
        border-color: rgba(255, 255, 255, 0.12);
        transform: translateY(-4px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45), 
                    0 0 0 1px rgba(197, 168, 128, 0.12);
      }

      .glass-luxury-dark {
        background: rgba(19, 20, 26, 0.85);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 
                    inset 0 1px 0 rgba(255, 255, 255, 0.03);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .glass-luxury-dark:hover {
        background: rgba(22, 23, 30, 0.95);
        border-color: rgba(255, 255, 255, 0.09);
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
      }

      .text-gradient-gold {
        background: linear-gradient(135deg, #c5a880 0%, #b5966d 50%, #9e7f55 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .text-gradient-silver {
        background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 55%, #94a3b8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .text-gradient-navy {
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .border-gold-metal {
        border-color: rgba(197, 168, 128, 0.25);
      }
      .border-chrome-metal {
        border-color: rgba(255, 255, 255, 0.08);
      }

      /* Premium slatted wood / fluted wall texture */
      .fluted-texture {
        background: repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.03),
          rgba(255, 255, 255, 0.03) 4px,
          rgba(255, 255, 255, 0.01) 4px,
          rgba(255, 255, 255, 0.01) 8px
        );
      }
      .fluted-texture-dark {
        background: repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.02),
          rgba(255, 255, 255, 0.02) 6px,
          rgba(255, 255, 255, 0.01) 6px,
          rgba(255, 255, 255, 0.01) 12px
        );
      }

      /* Base transition curve for sections */
      .premium-curve {
        position: relative;
        height: 140px;
        overflow: hidden;
      }
      .premium-curve::before {
        content: '';
        position: absolute;
        width: 150%;
        height: 300%;
        border-radius: 50%;
        left: 50%;
        transform: translateX(-50%);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
    `}</style>
  )
}


