/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PlaybookProvider } from "@/lib/playbook-context"
import { mergePlaybooksWithDefaults } from "@/lib/playbook-defaults"
import { getScopeId, isSuperadmin } from "@/lib/auth-helpers"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")
  if (!isSuperadmin(session)) redirect("/dashboard")

  const scopeId = getScopeId(session)
  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { onboardingDone: true, playbookType: true, agencyName: true, companyName: true },
  })

  let inboxCount = 0
  let dbPlaybooks: any[] = []
  try {
    inboxCount = await prisma.reply.count({ where: { lead: { userId: scopeId } } })
    dbPlaybooks = await prisma.playbook.findMany({
      orderBy: { name: "asc" },
    })
  } catch {
    /* DB not configured */
  }

  const playbooks = mergePlaybooksWithDefaults(dbPlaybooks)

  return (
    <PlaybookProvider initialType={user?.playbookType || "sales"} playbooks={playbooks}>
      <DashboardLayout session={session} inboxCount={inboxCount} companyName={user?.agencyName || user?.companyName || null}>
        {children}
      </DashboardLayout>
    </PlaybookProvider>
  )
}
