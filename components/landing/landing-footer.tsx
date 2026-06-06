import { Zap } from "lucide-react"

export function LandingFooter() {
  return (
    <footer className="bg-[#111216] border-t border-white/[0.05] px-6 py-10">
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#101e35] border border-[#c5a880]/30 shadow-sm">
            <Zap className="h-4 w-4 text-[#c5a880]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-neutral-900 font-luxury-sans">Agnelix</span>
        </div>
        <p className="text-sm text-neutral-400 font-medium">
          © 2026 Agnelix. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm text-neutral-400 font-semibold">
          <span className="hover:text-neutral-700 transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-neutral-700 transition-colors cursor-pointer">Terms</span>
          <span className="hover:text-neutral-700 transition-colors cursor-pointer">API Docs</span>
        </div>
      </div>
    </footer>
  )
}

