import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardBg } from "@/components/dashboard-bg"
import Image from "next/image"

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  return (
    <>
      <style>{`
        @keyframes silver-sheen {
          0%   { left: -80px; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { left: 110%; opacity: 0; }
        }
        @keyframes status-ping {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: .4; transform: scale(1.4); }
        }
        .status-dot { animation: status-ping 2.5s ease-in-out infinite; }
      `}</style>

      <div className="relative h-screen flex flex-col bg-[#05060a]" style={{ backgroundColor: "#05060a", height: "100vh", overflow: "hidden" }}>
        <DashboardBg />

        {/* Top bar */}
        <header
          className="relative z-20 flex h-14 shrink-0 items-center justify-between px-6 border-b"
          style={{
            background: "rgba(26,28,36,.85)",
            borderColor: "rgba(255,255,255,.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          <Image src="/logo-hq.png" alt="Galien" width={110} height={28} className="object-contain" />
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-1.5"
            style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
          >
            <span className="status-dot size-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold text-white/35 tracking-wide">Account setup</span>
          </div>
        </header>

        {/* Content — full height below header */}
        <main className="relative z-10 flex-1 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
          {children}
        </main>
      </div>
    </>
  )
}
