import { Zap } from "lucide-react"

export function LandingFooter() {
  return (
    <footer className="bg-[#f8f8fb] border-t border-neutral-200/60 px-6 py-10">
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-neutral-900">Agnelix</span>
        </div>
        <p className="text-sm text-neutral-400">
          © 2026 Agnelix. Built for technical founders who ship.
        </p>
        <div className="flex items-center gap-6 text-sm text-neutral-400">
          <span className="hover:text-neutral-600 transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-neutral-600 transition-colors cursor-pointer">Terms</span>
          <span className="hover:text-neutral-600 transition-colors cursor-pointer">API Docs</span>
        </div>
      </div>
    </footer>
  )
}
