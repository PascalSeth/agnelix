/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PlaybookProvider } from "@/lib/playbook-context"
import { mergePlaybooksWithDefaults } from "@/lib/playbook-defaults"
import { getScopeId } from "@/lib/auth-helpers"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const scopeId = getScopeId(session)
  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { onboardingDone: true, playbookType: true, agencyName: true, companyName: true },
  })

  if (!session.user.teamOwnerId && !user?.onboardingDone) redirect("/onboarding")

  let inboxCount = 0
  let dbPlaybooks: any[] = []
  try {
    inboxCount = await prisma.reply.count({ where: { lead: { userId: scopeId } } })
    dbPlaybooks = await prisma.playbook.findMany({
      orderBy: { name: "asc" }
    })
  } catch { /* DB not configured */ }

  // Merge DB rows over hardcoded defaults server-side so the client bundle
  // only receives the final playbook list (defaults stay out of the bundle).
  const playbooks = mergePlaybooksWithDefaults(dbPlaybooks)

  return (
    <PlaybookProvider initialType={user?.playbookType || "sales"} playbooks={playbooks}>
      <DashboardLayout session={session} inboxCount={inboxCount} companyName={user?.agencyName || user?.companyName || null}>
        {children}
      </DashboardLayout>
    </PlaybookProvider>
  )
}
