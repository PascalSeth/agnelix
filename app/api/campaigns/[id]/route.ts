/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { drainDueQueue } from "@/lib/scheduler"
import { computeWorkflowPhase } from "@/lib/campaign-workflow"
import { WorkflowStage } from "@/app/generated/prisma/client"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: scopeId },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      campaignLeads: {
        include: {
          lead: {
            include: {
              emails: { orderBy: { stepNumber: "asc" } },
              activities: { orderBy: { createdAt: "desc" }, take: 20 },
            },
          },
        },
      },
    },
  })

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Dynamically calculate and sync campaign workflowStage
  const computedPhase = computeWorkflowPhase(campaign.status, campaign.autonomous, campaign.campaignLeads.map(cl => cl.lead))
  let stage: WorkflowStage = "ENRICH"
  if (computedPhase === "no-leads" || computedPhase === "enriching") {
    stage = "ENRICH"
  } else if (computedPhase === "ready" || computedPhase === "generating") {
    stage = "DRAFT"
  } else if (computedPhase === "review") {
    stage = "REVIEW"
  } else if (computedPhase === "sending") {
    stage = "SEND"
  } else if (computedPhase === "live") {
    stage = "LIVE"
  } else if (computedPhase === "paused") {
    const activePhase = computeWorkflowPhase("ACTIVE", campaign.autonomous, campaign.campaignLeads.map(cl => cl.lead))
    if (activePhase === "no-leads" || activePhase === "enriching") stage = "ENRICH"
    else if (activePhase === "ready" || activePhase === "generating") stage = "DRAFT"
    else if (activePhase === "review") stage = "REVIEW"
    else if (activePhase === "sending") stage = "SEND"
    else stage = "LIVE"
  }

  if (campaign.workflowStage !== stage) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { workflowStage: stage }
    })
    campaign.workflowStage = stage
  }

  // Dynamic queue trigger — fires after response is sent.
  // This is the local-testing cron workaround: every time the UI polls the
  // campaign (every 4 s), any QUEUED or expired-draft emails are processed.
  after(async () => {
    try {
      await drainDueQueue()
    } catch (err) {
      console.error("[Campaign GET] Background queue error:", err)
    }
  })

  return NextResponse.json(campaign)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const body = await req.json()

  // Find the campaign first to check ownership and capture status/autonomous values
  const existing = await prisma.campaign.findFirst({
    where: { id, userId: scopeId },
    select: { status: true, autonomous: true },
  })

  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  if (body.sequenceId !== undefined) {
    const validSeq = await prisma.sequence.findFirst({
      where: { id: body.sequenceId, userId: scopeId },
    })
    if (!validSeq) {
      return NextResponse.json({ error: "Sequence not found or invalid" }, { status: 400 })
    }
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      ...(body.status     !== undefined && { status:     body.status }),
      ...(body.name       !== undefined && { name:       body.name }),
      ...(body.autonomous !== undefined && { autonomous: body.autonomous }),
      ...(body.sequenceId !== undefined && { sequenceId: body.sequenceId }),
    },
  })

  // Trigger launch/autopilot pipeline if status is ACTIVE or autopilot is turned on
  const isNowActive = body.status === "ACTIVE" || (body.status === undefined && existing.status === "ACTIVE")
  const isAutopilotOn = body.autonomous === true || (body.autonomous === undefined && existing.autonomous)

  if (isNowActive || body.autonomous === true) {
    after(async () => {
      try {
        const { runLaunchPipeline } = await import("@/lib/campaign-sender")
        await runLaunchPipeline(id, scopeId)
      } catch (err) {
        console.error("[Campaign PATCH] Launch/Autopilot pipeline background error:", err)
      }
    })
  }

  return NextResponse.json({ updated: 1 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: scopeId },
    select: { id: true },
  })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const enrolledLeadIds = await prisma.campaignLead
    .findMany({ where: { campaignId: id }, select: { leadId: true } })
    .then((rows) => rows.map((r) => r.leadId))

  const sharedLeadIds = await prisma.campaignLead
    .findMany({
      where: { leadId: { in: enrolledLeadIds }, campaignId: { not: id } },
      select: { leadId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.leadId)))

  const exclusiveLeadIds = enrolledLeadIds.filter((lid) => !sharedLeadIds.has(lid))

  await prisma.$transaction([
    prisma.lead.deleteMany({ where: { id: { in: exclusiveLeadIds }, userId: scopeId } }),
    prisma.campaign.deleteMany({ where: { id, userId: scopeId } }),
  ])

  return NextResponse.json({ deleted: true, leadsDeleted: exclusiveLeadIds.length })
}
