/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PlaybookProvider } from "@/lib/playbook-context"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingDone: true, playbookType: true },
  })

  if (!user?.onboardingDone) redirect("/onboarding")

  let inboxCount = 0
  let playbooks: any[] = []
  try {
    inboxCount = await prisma.reply.count({ where: { lead: { userId: session.user.id } } })
    playbooks = await prisma.playbook.findMany({
      orderBy: { name: "asc" }
    })
  } catch { /* DB not configured */ }

  return (
    <PlaybookProvider initialType={user?.playbookType || "sales"} playbooks={playbooks}>
      <DashboardLayout session={session} inboxCount={inboxCount}>
        {children}
      </DashboardLayout>
    </PlaybookProvider>
  )
}
