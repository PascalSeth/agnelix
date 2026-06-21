import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isSuperadmin } from "@/lib/auth-helpers"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")
  if (!isSuperadmin(session)) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {children}
    </div>
  )
}
