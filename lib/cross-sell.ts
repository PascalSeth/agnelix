import { prisma } from "./db"
import { generateCrossSellPitch } from "./ai"

export const PLAYBOOK_LABELS: Record<string, string> = {
  social_media: "Social Media Management",
  seo: "SEO",
  ppc: "PPC & Paid Ads",
  sales: "Sales & Lead Gen",
  finance: "Fractional CFO & Finance",
  web_design: "Web Design & Development",
}

// Natural next-service chains: won with key → suggest values in order
const CROSS_SELL_MAP: Record<string, string[]> = {
  sales: ["web_design", "seo"],
  web_design: ["seo", "ppc"],
  seo: ["ppc", "social_media"],
  ppc: ["social_media", "seo"],
  social_media: ["ppc", "web_design"],
  finance: ["sales", "web_design"],
}

/**
 * Called when a deal is won. Looks at which playbooks have been used with this
 * lead, finds the natural upsell gap, and surfaces an AI pitch card on the
 * dashboard ("Galien Recommends") via AgentInsight.
 */
export async function generateCrossSellInsight(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      campaignLeads: { include: { campaign: { select: { playbookType: true } } } },
      user: { select: { id: true, playbookType: true, agencyName: true, companyName: true } },
    },
  })
  if (!lead) return

  const usedTypes = new Set(
    lead.campaignLeads
      .map((cl) => cl.campaign.playbookType)
      .filter((t): t is string => !!t)
  )
  if (usedTypes.size === 0 && lead.user.playbookType) usedTypes.add(lead.user.playbookType)
  if (usedTypes.size === 0) return

  let suggestion: string | null = null
  for (const t of usedTypes) {
    for (const candidate of CROSS_SELL_MAP[t] ?? []) {
      if (!usedTypes.has(candidate)) {
        suggestion = candidate
        break
      }
    }
    if (suggestion) break
  }
  if (!suggestion) return

  // One card per lead + suggested service
  const existing = await prisma.agentInsight.findFirst({
    where: {
      userId: lead.userId,
      leadId,
      type: "CROSS_SELL_OPPORTUNITY",
      metadata: { path: ["suggestedPlaybook"], equals: suggestion },
    },
    select: { id: true },
  })
  if (existing) return

  const suggestedLabel = PLAYBOOK_LABELS[suggestion] ?? suggestion
  const currentLabels = [...usedTypes].map((t) => PLAYBOOK_LABELS[t] ?? t)

  const pitch = await generateCrossSellPitch({
    clientCompany: lead.company || lead.email,
    industry: lead.industry || "business",
    currentServices: currentLabels,
    suggestedService: suggestedLabel,
    agencyName: lead.user.agencyName || lead.user.companyName || "your agency",
  })

  await prisma.agentInsight.create({
    data: {
      userId: lead.userId,
      leadId,
      type: "CROSS_SELL_OPPORTUNITY",
      title: `Cross-sell ${suggestedLabel} to ${lead.company || lead.email}`,
      body: pitch,
      cta: `/leads/${leadId}`,
      metadata: {
        suggestedPlaybook: suggestion,
        currentPlaybooks: [...usedTypes],
      },
    },
  })
}
