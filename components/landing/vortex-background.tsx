export function VortexBackground() {
  return (
    <div className="vortex-container">
      {/* Rotating Conic Vortex Layers */}
      <div className="vortex-layer anim-vortex-slow" style={{ animationDuration: '40s' }} />
      <div className="vortex-layer anim-vortex-fast" style={{ animationDuration: '25s', opacity: 0.7 }} />
      <div className="vortex-layer anim-vortex-slow" style={{ animationDuration: '60s', opacity: 0.5, transform: 'translate(-50%, -50%) rotate(120deg)' }} />

      {/* Partial Orb Arcs */}
      <div className="orb-arc anim-arc" style={{
        width: '600px', height: '600px',
        top: '10%', left: '5%',
        borderTopColor: 'rgba(99, 102, 241, 0.6)',
        borderRightColor: 'rgba(168, 85, 247, 0.4)',
        animationDuration: '15s'
      }} />
      <div className="orb-arc anim-arc" style={{
        width: '400px', height: '400px',
        top: '60%', right: '10%',
        borderTopColor: 'rgba(59, 130, 246, 0.5)',
        borderLeftColor: 'rgba(99, 102, 241, 0.3)',
        animationDuration: '20s',
        animationDirection: 'reverse'
      }} />
      <div className="orb-arc" style={{
        width: '800px', height: '800px',
        bottom: '-20%', left: '30%',
        borderTopColor: 'rgba(168, 85, 247, 0.3)',
        borderRightColor: 'rgba(59, 130, 246, 0.2)',
      }}>
        <div className="anim-arc" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'rgba(168, 85, 247, 0.5)', animationDuration: '30s' }} />
      </div>

      {/* Radial Energy Lines */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="radial-line" style={{
          transform: `rotate(${i * 30}deg)`,
          animation: `radial-line-grow ${4 + i * 0.5}s ease-in-out infinite`,
          animationDelay: `${i * 0.3}s`,
          opacity: 0.3 + (i % 3) * 0.2
        }} />
      ))}

      {/* Tornado Diffusion Blobs */}
      <div className="tornado-blob anim-diffuse" style={{
        width: '500px', height: '500px',
        top: '20%', left: '20%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 70%)',
        animationDelay: '0s'
      }} />
      <div className="tornado-blob anim-diffuse" style={{
        width: '400px', height: '400px',
        top: '50%', right: '15%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35), transparent 70%)',
        animationDelay: '3s'
      }} />
      <div className="tornado-blob anim-diffuse" style={{
        width: '600px', height: '600px',
        bottom: '10%', left: '40%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%)',
        animationDelay: '6s'
      }} />
      <div className="tornado-blob" style={{
        width: '300px', height: '300px',
        top: '40%', left: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent 70%)',
        animation: 'tornado-rise 15s ease-in-out infinite',
        animationDelay: '2s'
      }} />

      {/* Center Vortex Core */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-primary/20 via-purple-600/20 to-blue-600/20 blur-[100px] anim-radial-pulse" />
    </div>
  )
}
