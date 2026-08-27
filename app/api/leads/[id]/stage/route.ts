import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateProposal } from "@/lib/ai"
import { generateCrossSellInsight } from "@/lib/cross-sell"
import { getScopeId } from "@/lib/auth-helpers"

const PIPELINE_STAGES = ["NEW", "CONTACTED", "REPLIED", "INTERESTED", "MEETING_BOOKED", "PROPOSAL_SENT", "WON", "LOST", "NOT_INTERESTED", "BOUNCED"]

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const { stage } = await req.json()

  if (!PIPELINE_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
  }

  const lead = await prisma.lead.findFirst({
    where: { id, userId: scopeId },
    include: {
      campaignLeads: { select: { campaignId: true } },
      user: { select: { id: true, name: true, agencyName: true, companyName: true, companyDesc: true } },
    },
  })

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const prevStatus = lead.status
  if (prevStatus === stage) return NextResponse.json({ ok: true })

  const campaignIds = lead.campaignLeads.map(cl => cl.campaignId)
  const ops: Promise<unknown>[] = []

  // Update lead status
  ops.push(prisma.lead.update({ where: { id }, data: { status: stage } }))

  // Activity log
  ops.push(prisma.activity.create({
    data: {
      leadId: id,
      type: "STAGE_CHANGED",
      note: `${prevStatus} → ${stage}`,
      metadata: { from: prevStatus, to: stage },
    },
  }))

  // Stage-specific automation
  if (stage === "MEETING_BOOKED") {
    // Cancel remaining queued follow-ups
    ops.push(prisma.email.deleteMany({ where: { leadId: id, status: "QUEUED" } }))
    // Increment meeting counter on campaigns
    if (campaignIds.length > 0) {
      ops.push(prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { meetings: { increment: 1 } } }))
    }
    ops.push(prisma.activity.create({ data: { leadId: id, type: "MEETING_BOOKED", note: "Meeting booked via pipeline" } }))
  }

  if (stage === "PROPOSAL_SENT" && prevStatus !== "PROPOSAL_SENT") {
    // We await this outside the ops array because we need it immediately
    const proposalMarkdown = await generateProposal({
      leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
      company: lead.company || "their company",
      industry: lead.industry || "business",
      painPoint: lead.painPoint,
      senderName: lead.user.name || "Your Name",
      senderCompany: lead.user.agencyName || lead.user.companyName || "Your Company",
      senderService: lead.user.companyDesc || "our services",
    })
    ops.push(prisma.activity.create({
      data: {
        leadId: id,
        type: "PROPOSAL_GENERATED",
        note: "AI generated a draft proposal",
        metadata: { proposalDraft: proposalMarkdown },
      }
    }))
  }

  if (stage === "WON") {
    // Cancel all remaining queued emails
    ops.push(prisma.email.deleteMany({ where: { leadId: id, status: "QUEUED" } }))
    ops.push(prisma.activity.create({ data: { leadId: id, type: "DEAL_WON", note: "Deal marked as Won" } }))
    // Surface a cross-sell pitch card on the dashboard (fire-and-forget)
    generateCrossSellInsight(id).catch(e => console.error("[cross-sell] insight generation failed:", e))
  }

  if (stage === "LOST") {
    // Cancel all remaining queued emails
    ops.push(prisma.email.deleteMany({ where: { leadId: id, status: "QUEUED" } }))
    ops.push(prisma.activity.create({ data: { leadId: id, type: "DEAL_LOST", note: "Deal marked as Lost" } }))
  }

  if (stage === "NOT_INTERESTED") {
    // Cancel all remaining queued emails
    ops.push(prisma.email.deleteMany({ where: { leadId: id, status: "QUEUED" } }))
    ops.push(prisma.activity.create({ data: { leadId: id, type: "DEAL_LOST", note: "Lead marked as Not Interested" } }))
  }

  if (stage === "BOUNCED") {
    // Cancel all remaining queued emails
    ops.push(prisma.email.deleteMany({ where: { leadId: id, status: "QUEUED" } }))
    ops.push(prisma.activity.create({ data: { leadId: id, type: "DEAL_LOST", note: "Lead email Bounced" } }))
  }

  // Sync campaign reply/meeting counters for status transitions
  if (campaignIds.length > 0) {
    if (prevStatus === "REPLIED") {
      ops.push(prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { replies: { decrement: 1 } } }))
    }
    if (prevStatus === "MEETING_BOOKED") {
      ops.push(prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { meetings: { decrement: 1 } } }))
    }
    if (stage === "REPLIED") {
      ops.push(prisma.campaign.updateMany({ where: { id: { in: campaignIds } }, data: { replies: { increment: 1 } } }))
    }
  }

  await Promise.all(ops)
  return NextResponse.json({ ok: true, stage })
}
