export function CurveDarkToLight() {
  return (
    <div className="relative h-40 overflow-hidden">
      <div className="absolute inset-0 bg-[#f8f8fb]" style={{
        clipPath: 'ellipse(75% 100% at 50% 100%)',
        transform: 'translateY(1px)'
      }} />
      <div className="absolute inset-0 bg-[#0a0a0f]" style={{
        clipPath: 'ellipse(75% 100% at 50% 0%)',
        transform: 'translateY(-1px)'
      }} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[200%] rounded-[50%] bg-gradient-to-t from-[#f8f8fb] via-[#13131f] to-transparent opacity-80" style={{ transform: 'translateX(-50%) translateY(50%)' }} />
    </div>
  )
}

export function CurveLightToDark() {
  return (
    <div className="relative h-40 overflow-hidden bg-[#f8f8fb]">
      <div className="absolute inset-0 bg-[#0a0a0f]" style={{
        clipPath: 'ellipse(75% 100% at 50% 100%)',
        transform: 'translateY(1px)'
      }} />
      <div className="absolute inset-0 bg-[#f8f8fb]" style={{
        clipPath: 'ellipse(75% 100% at 50% 0%)',
        transform: 'translateY(-1px)'
      }} />
    </div>
  )
}
