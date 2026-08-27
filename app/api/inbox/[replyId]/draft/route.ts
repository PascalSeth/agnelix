import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateReplyDraft } from "@/lib/ai"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST(req: NextRequest, { params }: { params: Promise<{ replyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { replyId } = await params
  let responseStyle = ""
  let customActionType = ""
  try {
    const body = await req.json()
    responseStyle = body.responseStyle || ""
    customActionType = body.actionType || ""
  } catch {
    // ignore
  }

  let lead: any = null
  let replyBody = ""
  let originalEmailBody = ""

  const leadSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    company: true,
    industry: true,
    website: true,
    painPoint: true,
    recentNews: true,
    battleCard: true,
    auditJson: true,
    researchNotes: true,
    painPoints: true,
    competitorAnalysis: true,
    buyingSignalsJson: true,
    user: {
      select: {
        id: true,
        name: true,
        agencyName: true,
        companyName: true,
        companyDesc: true,
        tone: true,
        title: true,
        calendarLink: true,
        playbookType: true,
        flagshipOffer: true,
      },
    },
    proposals: {
      take: 1,
      orderBy: { createdAt: "desc" as const },
      select: { title: true, totalValue: true, executiveSummary: true, pricingPackages: true, status: true },
    },
  }

  if (replyId.startsWith("contacted-")) {
    const leadId = replyId.replace("contacted-", "")
    lead = await prisma.lead.findFirst({
      where: { id: leadId, userId: scopeId },
      select: {
        ...leadSelect,
        emails: {
          where: { status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] } },
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
    })
    if (lead) {
      originalEmailBody = lead.emails[0]?.body || ""
      replyBody = `(Lead was contacted with subject: "${lead.emails[0]?.subject || ""}" — generate a natural follow-up/check-in message)`
    }
  } else {
    const reply = await prisma.reply.findFirst({
      where: { id: replyId, lead: { userId: scopeId } },
      include: {
        lead: {
          select: leadSelect,
        },
        email: { select: { subject: true, body: true } },
      },
    })
    if (reply) {
      lead = reply.lead
      replyBody = reply.body
      originalEmailBody = reply.email?.body || ""
    }
  }

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const user = lead.user

  // 1. Fetch full conversation history (all outgoing emails and incoming replies)
  const [emails, replies] = await Promise.all([
    prisma.email.findMany({
      where: { leadId: lead.id, status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED"] }, body: { not: "" } },
      orderBy: { sentAt: "asc" },
    }),
    prisma.reply.findMany({
      where: { leadId: lead.id },
      orderBy: { receivedAt: "asc" },
    }),
  ])

  // Merge and sort them chronologically
  const thread = [
    ...emails.map(e => ({
      type: "outgoing" as const,
      body: e.body,
      timestamp: e.sentAt || e.createdAt,
    })),
    ...replies.map(r => ({
      type: "incoming" as const,
      body: r.body,
      timestamp: r.receivedAt,
    })),
  ]
  thread.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const conversationHistory = thread
    .map(msg => `- ${msg.type.toUpperCase()}: ${msg.body}`)
    .join("\n")

  // 2. Synthesize Deep Research context
  const researchParts: string[] = []
  if (lead.website) researchParts.push(`- Website: ${lead.website}`)
  if (lead.industry) researchParts.push(`- Industry: ${lead.industry}`)
  if (lead.painPoint) researchParts.push(`- Core Pain Point: ${lead.painPoint}`)
  if (lead.recentNews) researchParts.push(`- Recent News: ${lead.recentNews}`)
  if (lead.competitorAnalysis) researchParts.push(`- Competitor Gaps: ${lead.competitorAnalysis}`)
  if (lead.auditJson) {
    try {
      const audit = typeof lead.auditJson === "string" ? JSON.parse(lead.auditJson) : lead.auditJson
      if (audit.techStack) researchParts.push(`- Tech Stack: ${Array.isArray(audit.techStack) ? audit.techStack.join(", ") : audit.techStack}`)
      if (audit.issuesFound) researchParts.push(`- Site/SEO Audit Issues: ${Array.isArray(audit.issuesFound) ? audit.issuesFound.join("; ") : audit.issuesFound}`)
      if (audit.summary) researchParts.push(`- Audit Summary: ${audit.summary}`)
    } catch {}
  }
  const researchContext = researchParts.join("\n")

  // 3. Synthesize Proposal & Offer context
  let proposalContext = ""
  if (lead.proposals?.[0]) {
    const p = lead.proposals[0]
    proposalContext = `- Active Proposal: "${p.title}" | Value: $${p.totalValue || "Custom"} | Status: ${p.status}\n- Summary/Deliverables: ${p.executiveSummary || "Full strategy and execution"}`
  }

  // 4. Handle specific user structure requests
  let effectiveResponseStyle = responseStyle
  if (customActionType === "USE_BATTLE_CARD") {
    effectiveResponseStyle = `Address the prospect's latest point using the counter-arguments and key talking points from their battle card. Be direct, authoritative, and helpful.`
  } else if (customActionType === "INJECT_RESEARCH") {
    effectiveResponseStyle = `Reference a specific technical gap, site audit issue, or competitor insight from the prospect's research data to establish immediate credibility.`
  } else if (customActionType === "PROPOSE_MEETING") {
    effectiveResponseStyle = `Smoothly steer the conversation toward booking a 15-minute discovery call. Propose 2 specific daytime options or offer the booking calendar link.`
  } else if (customActionType === "SEND_OFFER") {
    effectiveResponseStyle = `Present our flagship offer transformation clearly and ask if they'd like to see a brief 1-page breakdown.`
  }

  const draft = await generateReplyDraft({
    leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
    company: lead.company || "their company",
    replyBody,
    originalEmailBody,
    senderName: user.name || "Your Name",
    senderTitle: user.title,
    senderCompany: user.agencyName || user.companyName || "Your Company",
    senderService: user.companyDesc || "our services",
    tone: user.tone || "Professional",
    responseStyle: effectiveResponseStyle,
    conversationHistory,
    calendarLink: user.calendarLink,
    playbookType: user.playbookType,
    userId: user.id,
    battleCard: lead.battleCard,
    researchContext,
    proposalContext,
    flagshipOffer: user.flagshipOffer,
  })

  return NextResponse.json(draft)
}
