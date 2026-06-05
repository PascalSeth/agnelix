import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingDone: true },
  })

  if (!user?.onboardingDone) redirect("/onboarding")

  let inboxCount = 0
  try {
    inboxCount = await prisma.reply.count({ where: { lead: { userId: session.user.id } } })
  } catch { /* DB not configured */ }

  return <DashboardLayout session={session} inboxCount={inboxCount}>{children}</DashboardLayout>
}
