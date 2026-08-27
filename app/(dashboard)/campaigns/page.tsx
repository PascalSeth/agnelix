import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"
import { CampaignsDashboard, CampaignRecord } from "@/components/campaigns-dashboard"

export const dynamic = "force-dynamic"

export default async function CampaignsPage() {
  const session = await auth()
  const scopeId = session ? getScopeId(session) : ""
  let campaigns: CampaignRecord[] = []

  try {
    const rawCampaigns = await prisma.campaign.findMany({
      where: { userId: scopeId },
      include: {
        sequence: {
          select: {
            id: true,
            name: true,
            steps: {
              select: { id: true, stepNumber: true, stepType: true },
              orderBy: { stepNumber: "asc" },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    campaigns = rawCampaigns as unknown as CampaignRecord[]
  } catch {
    // Database not ready or empty
  }

  return <CampaignsDashboard initialCampaigns={campaigns} />
}
