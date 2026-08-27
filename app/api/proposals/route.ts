import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateProposalContent } from "@/lib/ai"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const proposals = await prisma.proposal.findMany({
    where: { userId: scopeId },
    include: { lead: { select: { id: true, firstName: true, lastName: true, company: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(proposals)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { leadId, templateId, currency: customCurrency } = body
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 })

  const [lead, user] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: leadId, userId: scopeId },
      include: { campaignLeads: { select: { campaignId: true, campaign: { select: { clientGoal: true } } } } },
    }),
    prisma.user.findUnique({
      where: { id: scopeId },
      select: { name: true, agencyName: true, companyName: true, companyDesc: true, playbookType: true, currency: true, flagshipOffer: true },
    }),
  ])

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  type ProposalTemplate = { id: string; name: string; description: string; price: number; setupPrice: number; period: string; currency: string }
  let template: ProposalTemplate | null = null
  if (user?.playbookType) {
    const playbook = await prisma.playbook.findUnique({ where: { type: user.playbookType } })
    if (playbook && playbook.proposalTemplates) {
      let templates: ProposalTemplate[] = []
      try {
        templates = typeof playbook.proposalTemplates === "string"
          ? JSON.parse(playbook.proposalTemplates)
          : (Array.isArray(playbook.proposalTemplates) ? playbook.proposalTemplates as ProposalTemplate[] : [])
      } catch {
        templates = []
      }
      template = (templateId ? templates.find(t => t?.id === templateId || t?.name === templateId) : templates[0]) ?? templates[0] ?? null
    }
  }

  const currency = customCurrency || user?.currency || lead.dealCurrency || "USD"
  const painPoints: string[] = lead.painPoints
    ? (Array.isArray(lead.painPoints) ? (lead.painPoints as unknown[]).map(String) : [])
    : (lead.painPoint ? [lead.painPoint] : [])

  // Feedback loop: learn from this agency's recently signed and declined proposals
  const pastOutcomes = await prisma.proposal.findMany({
    where: { userId: scopeId, status: { in: ["SIGNED", "DECLINED"] } },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { title: true, status: true, declineReason: true, totalValue: true, currency: true },
  })
  const pastProposalLearnings = pastOutcomes.length
    ? pastOutcomes
        .map(p =>
          p.status === "SIGNED"
            ? `- WON: "${p.title}"${p.totalValue ? ` (${p.currency} ${p.totalValue})` : ""}`
            : `- LOST: "${p.title}"${p.declineReason ? ` — client's reason: ${p.declineReason}` : ""}`
        )
        .join("\n")
    : null

  const flagshipOffer = user?.flagshipOffer as { name: string; transformation: string; deliverable: string } | null
  const clientGoal = lead.campaignLeads.find(cl => cl.campaign?.clientGoal)?.campaign?.clientGoal ?? null

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
    flagshipOffer,
    clientGoal,
    pastProposalLearnings,
    playbookType: user?.playbookType,
    userId: scopeId,
  })

  const pricingPackages = template
    ? [{ id: template.id, name: template.name, description: template.description, price: template.price, setupPrice: template.setupPrice, period: template.period, currency: template.currency || currency }]
    : [{ id: "default", name: "Growth Engagement", description: "Tailored monthly engagement", price: 1000, setupPrice: 500, period: "monthly", currency }]

  const totalValue = pricingPackages.reduce((s, p) => s + (p.price || 0), 0)

  const proposal = await prisma.proposal.create({
    data: {
      userId: scopeId,
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
