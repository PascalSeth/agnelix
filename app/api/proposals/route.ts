import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateProposalContent } from "@/lib/ai"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const proposals = await prisma.proposal.findMany({
    where: { userId: session.user.id },
    include: { lead: { select: { id: true, firstName: true, lastName: true, company: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(proposals)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { leadId, templateId } = body
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 })

  const [lead, user] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: leadId, userId: session.user.id },
      include: { campaignLeads: { select: { campaignId: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, agencyName: true, companyName: true, companyDesc: true, playbookType: true, currency: true },
    }),
  ])

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  type ProposalTemplate = { id: string; name: string; description: string; price: number; setupPrice: number; period: string; currency: string }
  let template: ProposalTemplate | null = null
  if (user?.playbookType) {
    const playbook = await prisma.playbook.findUnique({ where: { type: user.playbookType } })
    if (playbook) {
      const templates = JSON.parse(playbook.proposalTemplates as string) as ProposalTemplate[]
      template = (templateId ? templates.find(t => t?.id === templateId) : templates[0]) ?? templates[0] ?? null
    }
  }

  const currency = user?.currency || lead.dealCurrency || "GBP"
  const painPoints: string[] = lead.painPoints
    ? (Array.isArray(lead.painPoints) ? (lead.painPoints as unknown[]).map(String) : [])
    : (lead.painPoint ? [lead.painPoint] : [])

  const content = await generateProposalContent({
    leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
    company: lead.company || "their company",
    industry: lead.industry || "business",
    painPoints,
    researchNotes: lead.researchNotes,
    senderName: user?.name || "Your Name",
    senderCompany: user?.agencyName || user?.companyName || "Your Agency",
    senderService: user?.companyDesc || "our services",
    proposalTemplateName: template?.name || "Growth Engagement",
    currency,
  })

  const pricingPackages = template
    ? [{ id: template.id, name: template.name, description: template.description, price: template.price, setupPrice: template.setupPrice, period: template.period, currency: template.currency || currency }]
    : [{ id: "default", name: "Growth Engagement", description: "Tailored monthly engagement", price: 1000, setupPrice: 500, period: "monthly", currency }]

  const totalValue = pricingPackages.reduce((s, p) => s + (p.price || 0), 0)

  const proposal = await prisma.proposal.create({
    data: {
      userId: session.user.id,
      leadId: lead.id,
      campaignId: lead.campaignLeads[0]?.campaignId ?? null,
      title: `${template?.name || "Proposal"} for ${lead.company || lead.email}`,
      contentJson: content as unknown as object,
      executiveSummary: content.executiveSummary,
      pricingPackages: pricingPackages as unknown as object,
      totalValue,
      currency,
      status: "DRAFT",
    },
  })

  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: "PROPOSAL_GENERATED",
      note: `AI generated proposal "${proposal.title}"`,
      metadata: { proposalId: proposal.id },
    },
  })

  return NextResponse.json(proposal)
}
