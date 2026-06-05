import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateEmail } from "@/lib/ai"
import { checkEmailQuota } from "@/lib/cost-guard"
import { generateAndQueueEmails } from "@/lib/campaign-sender"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { campaignId, leadId, preview } = await req.json()

  // Preview mode: generate emails on-the-fly, do not save to DB
  if (preview) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: session.user.id },
      include: {
        sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
        campaignLeads: {
          include: { lead: true },
          ...(leadId ? { where: { leadId } } : {}),
        },
        user: true,
      },
    })

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    if (campaign.campaignLeads.length === 0)
      return NextResponse.json({ error: "No leads in campaign" }, { status: 400 })

    const canSend = await checkEmailQuota(session.user.id)
    if (!canSend) return NextResponse.json({ error: "Daily email quota reached" }, { status: 429 })

    const emails = []
    for (const cl of campaign.campaignLeads) {
      const lead = cl.lead
      const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email
      for (const step of campaign.sequence.steps) {
        const generated = await generateEmail(
          {
            senderName:          campaign.user.name || "Your Name",
            senderTitle:         campaign.user.title || "Marketing Consultant",
            senderCompany:       campaign.user.agencyName || campaign.user.companyName || "Your Company",
            senderCompanyDesc:   campaign.user.companyDesc || "We help businesses grow.",
            prospectFirstName:   lead.firstName || lead.email.split("@")[0],
            prospectLastName:    lead.lastName || "",
            prospectTitle:       lead.title || "Decision Maker",
            prospectCompany:     lead.company || "their company",
            prospectCompanyDesc: lead.companyDesc || "",
            industry:            lead.industry || "business",
            recentNews:          lead.recentNews || "",
            painPoint:           lead.painPoint || "",
            tone:                campaign.user.tone || "Professional",
          },
          step.stepNumber
        )
        emails.push({ leadId: lead.id, leadName, stepNumber: step.stepNumber, subject: generated.subject, body: generated.body })
      }
    }

    return NextResponse.json(emails)
  }

  // Launch mode: generate + queue emails
  const { customEmails } = await req.json().catch(() => ({}))
  const result = await generateAndQueueEmails(campaignId, session.user.id, undefined, customEmails)
  return NextResponse.json({ sent: result.queued })
}
