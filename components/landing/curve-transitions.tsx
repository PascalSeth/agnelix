export function CurveDarkToLight() {
  return (
    <div className="relative h-24 w-full overflow-hidden pointer-events-none select-none bg-transparent">
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 1440 96" 
        preserveAspectRatio="none" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M0,48 Q360,96 720,48 T1440,48 L1440,96 L0,96 Z" 
          fill="#111216" 
        />
        <path 
          d="M0,48 Q360,96 720,48 T1440,48" 
          stroke="rgba(255, 255, 255, 0.08)" 
          strokeWidth="1.5" 
        />
      </svg>
    </div>
  )
}

export function CurveLightToDark() {
  return (
    <div className="relative h-24 w-full overflow-hidden pointer-events-none select-none bg-transparent">
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 1440 96" 
        preserveAspectRatio="none" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M0,48 Q360,0 720,48 T1440,48 L1440,96 L0,96 Z" 
          fill="#111216" 
        />
        <path 
          d="M0,48 Q360,0 720,48 T1440,48" 
          stroke="rgba(255, 255, 255, 0.08)" 
          strokeWidth="1.5" 
        />
      </svg>
    </div>
  )
}


