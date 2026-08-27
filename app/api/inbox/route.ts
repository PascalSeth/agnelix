import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  // 1. Fetch all prospect incoming replies
  const rawReplies = await prisma.reply.findMany({
    where: { lead: { userId: scopeId } },
    include: {
      lead: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          company: true, industry: true, status: true, battleCard: true,
          user: { select: { name: true, agencyName: true, companyName: true, companyDesc: true, tone: true } },
        },
      },
      email: {
        select: { id: true, subject: true, body: true, sentAt: true, stepNumber: true },
      },
      pendingActions: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          intent: true,
          draftSubject: true,
          draftBody: true,
          status: true,
          riskLevel: true,
          confidence: true,
          metadata: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { receivedAt: "desc" },
    take: 200,
  })

  // Deduplicate replies by leadId to keep only the latest reply for each lead
  const uniqueRepliesMap = new Map<string, any>()
  const repliedLeadIds = new Set<string>()

  for (const r of rawReplies) {
    if (!uniqueRepliesMap.has(r.leadId)) {
      const pa = r.pendingActions[0] || null
      const formattedReply = {
        id: r.id,
        leadId: r.leadId,
        emailId: r.emailId,
        fromEmail: r.fromEmail,
        subject: r.subject || `Re: ${r.email?.subject || "Outreach"}`,
        body: r.body,
        receivedAt: r.receivedAt.toISOString(),
        intent: pa?.intent || r.intent || "REPLY",
        aiDraft: pa?.draftBody || r.aiDraft || null,
        pendingAction: pa,
        lastActionStatus: pa?.status || null,
        isOutboundOnly: false,
        lead: r.lead,
        email: r.email,
      }
      uniqueRepliesMap.set(r.leadId, formattedReply)
      repliedLeadIds.add(r.leadId)
    }
  }

  // 2. Fetch all contacted leads who haven't replied yet
  const contactedLeads = await prisma.lead.findMany({
    where: {
      userId: scopeId,
      id: { notIn: Array.from(repliedLeadIds) },
      OR: [
        { status: { in: ["CONTACTED", "INTERESTED", "MEETING_BOOKED", "PROPOSAL_SENT", "WON"] } },
        { emails: { some: { status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] } } } },
      ],
    },
    include: {
      user: { select: { name: true, agencyName: true, companyName: true, companyDesc: true, tone: true } },
      emails: {
        where: { status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED", "QUEUED"] } },
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { id: true, subject: true, body: true, sentAt: true, stepNumber: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })

  // 3. Synthesize inbox entries for contacted leads
  const contactedEntries = contactedLeads.map(lead => {
    const latestEmail = lead.emails[0] || null
    const time = latestEmail?.sentAt ? latestEmail.sentAt.toISOString() : lead.updatedAt.toISOString()

    return {
      id: `contacted-${lead.id}`,
      leadId: lead.id,
      fromEmail: lead.email,
      subject: latestEmail?.subject || "Outreach Initiated",
      body: latestEmail?.body || `Outreach step ${latestEmail?.stepNumber || 1} sent to ${lead.firstName || lead.company || lead.email}`,
      receivedAt: time,
      isOutboundOnly: true,
      intent: "CONTACTED",
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        company: lead.company,
        industry: lead.industry,
        status: lead.status,
        battleCard: lead.battleCard,
        user: lead.user,
      },
      email: latestEmail ? {
        id: latestEmail.id,
        subject: latestEmail.subject,
        body: latestEmail.body,
        sentAt: latestEmail.sentAt ? latestEmail.sentAt.toISOString() : null,
        stepNumber: latestEmail.stepNumber,
      } : null,
    }
  })

  // Combine replies (highest priority) and contacted outbound leads
  const combined = [
    ...Array.from(uniqueRepliesMap.values()),
    ...contactedEntries,
  ].slice(0, 150)

  return NextResponse.json(combined)
}
