/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { CampaignPageShell } from "@/components/campaign-page-shell"

import { getScopeId } from "@/lib/auth-helpers"

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) notFound()

  const { id } = await params
  const { new: isNew } = await searchParams

  const scopeId = getScopeId(session)

  let campaign: any = null
  try {
    campaign = await prisma.campaign.findUnique({
      where: { id, userId: scopeId },
      include: {
        sequence: {
          select: {
            id: true,
            name: true,
            steps: { select: { id: true, stepNumber: true, delayDays: true, subjectTemplate: true, bodyTemplate: true }, orderBy: { stepNumber: "asc" } },
          },
        },
        campaignLeads: {
          orderBy: { enrolledAt: "desc" },
          include: {
            lead: {
              select: {
                id: true, firstName: true, lastName: true,
                email: true, company: true, status: true,
                recommendedApproach: true,
                contactsJson: true,
                emails: {
                  where: { campaignId: id },
                  select: {
                    id: true, subject: true, body: true, stepNumber: true,
                    status: true, sentAt: true, openedAt: true,
                    openCount: true, clickCount: true,
                  },
                  orderBy: { stepNumber: "asc" },
                },
              },
            },
          },
        },
      },
    })
  } catch {
    notFound()
  }
  if (!campaign) notFound()

  const leads = campaign.campaignLeads.map((cl: any) => cl.lead)
  const sequenceSteps = campaign.sequence.steps ?? []
  const stepCount = sequenceSteps.length || 1

  return (
    <CampaignPageShell
      campaignId={id}
      name={campaign.name}
      status={campaign.status}
      autonomous={campaign.autonomous}
      leads={leads}
      sequenceSteps={sequenceSteps}
      sequenceName={campaign.sequence.name}
      stepCount={stepCount}
      emailsSent={campaign.emailsSent}
      emailsOpened={campaign.emailsOpened}
      replies={campaign.replies}
      meetings={campaign.meetings}
      isNew={isNew === "1"}
    />
  )
}
