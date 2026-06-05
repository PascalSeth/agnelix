import { prisma } from "./db"
import { classifyReply, generateReplyDraft } from "./ai"
import { evaluateRiskPolicy, getOrCreateAgentGoal } from "./agent-core"

function detectMeetingIntent(replyBody: string): boolean {
  const lower = replyBody.toLowerCase()
  return ["book", "schedule", "calendar", "call next", "meet ", "meeting", "time works"].some((k) =>
    lower.includes(k)
  )
}

function detectProposalIntent(replyBody: string): boolean {
  const lower = replyBody.toLowerCase()
  return ["proposal", "pricing", "quote", "scope", "send details", "deck"].some((k) =>
    lower.includes(k)
  )
}

async function chooseResponseStyle(userId: string, fallback: string): Promise<string> {
  const recent = await prisma.agentMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { responseStyle: true, score: true },
  })

  const scoreByStyle = new Map<string, number>()
  for (const r of recent) {
    if (!r.responseStyle) continue
    scoreByStyle.set(r.responseStyle, (scoreByStyle.get(r.responseStyle) ?? 0) + r.score)
  }

  const ranked = [...scoreByStyle.entries()].sort((a, b) => b[1] - a[1])
  return ranked[0]?.[0] ?? fallback
}

function getNextBestAction(params: {
  intent: string
  meetingRequested: boolean
  proposalRequested: boolean
}): "SEND_REPLY" | "BOOK_MEETING" | "SEND_PROPOSAL" | "ENROLL_NURTURE" | "UPDATE_STAGE" {
  if (params.proposalRequested) return "SEND_PROPOSAL"
  if (params.meetingRequested || params.intent === "INTERESTED") return "BOOK_MEETING"
  if (params.intent === "NOT_NOW") return "ENROLL_NURTURE"
  if (params.intent === "OOO") return "UPDATE_STAGE"
  return "SEND_REPLY"
}

export async function processReply(replyId: string): Promise<void> {
  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    include: {
      lead: {
        include: {
          user: {
            select: {
              id: true, name: true, agencyName: true,
              companyName: true, companyDesc: true, tone: true,
              fromEmail: true, smtpPass: true, smtpHost: true, smtpPort: true,
            },
          },
        },
      },
      email: { select: { subject: true, body: true } },
    },
  })

  if (!reply) return

  const lead = reply.lead
  const user = lead.user
  const goal = await getOrCreateAgentGoal(user.id)

  // Skip if a pending action already exists for this reply
  const existing = await prisma.pendingAction.findFirst({
    where: { replyId, status: "PENDING" },
  })
  if (existing) return

  const classification = await classifyReply({
    replyBody: reply.body,
    originalEmailBody: reply.email?.body ?? "",
    leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
    company: lead.company ?? "their company",
  })

  const { intent } = classification
  const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email

  // Immediately handle unsubscribes — no queuing needed
  if (intent === "UNSUBSCRIBE") {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "NOT_INTERESTED" },
    })
    await prisma.email.updateMany({
      where: { leadId: lead.id, status: "QUEUED" },
      data: { status: "FAILED" },
    })
    await prisma.agentMemory.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        intent,
        outcome: "UNSUBSCRIBED",
        score: -1,
        notes: classification.summary,
      },
    })
    return
  }

  const meetingRequested = detectMeetingIntent(reply.body)
  const proposalRequested = detectProposalIntent(reply.body)
  const nextBestAction = getNextBestAction({ intent, meetingRequested, proposalRequested })

  const policy = await evaluateRiskPolicy({
    userId: user.id,
    intent,
    confidence: classification.confidence,
    replyBody: reply.body,
  })
  const expiresAt = new Date(Date.now() + policy.reviewWindowMins * 60 * 1000)

  // OOO — pause follow-ups, queue a stage note
  if (intent === "OOO") {
    await prisma.pendingAction.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        replyId,
        type: nextBestAction,
        intent,
        draftSubject: null,
        draftBody: "Lead is out of office. Resume outreach in 7 days.",
        metadata: {
          resumeAfterDays: 7,
          summary: classification.summary,
          confidence: classification.confidence,
          policyChecks: policy.policyChecks,
          nextBestAction,
        },
        riskLevel: policy.riskLevel,
        confidence: classification.confidence,
        expiresAt,
      },
    })
    return
  }

  // NOT_NOW — queue nurture enrollment
  if (intent === "NOT_NOW") {
    await prisma.pendingAction.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        replyId,
        type: nextBestAction,
        intent,
        draftSubject: null,
        draftBody: `${leadName} said not now. Enrolling in 60-day nurture sequence.`,
        metadata: {
          summary: classification.summary,
          confidence: classification.confidence,
          policyChecks: policy.policyChecks,
          nextBestAction,
        },
        riskLevel: policy.riskLevel,
        confidence: classification.confidence,
        expiresAt,
      },
    })
    return
  }

  // INTERESTED / QUESTION / OBJECTION — draft a reply
  const styleMap: Record<string, string> = {
    INTERESTED: "DIRECT",
    QUESTION: "VALUE-FIRST",
    OBJECTION: "SOFT",
  }
  const learnedStyle = await chooseResponseStyle(user.id, styleMap[intent] ?? "DIRECT")

  const draft = await generateReplyDraft({
    leadName,
    company: lead.company ?? "their company",
    replyBody: reply.body,
    originalEmailBody: reply.email?.body ?? "",
    senderName: user.name ?? "Your Name",
    senderCompany: user.agencyName ?? user.companyName ?? "Your Company",
    senderService: user.companyDesc ?? "our services",
    tone: user.tone ?? "Professional",
    responseStyle: learnedStyle,
  })

  let draftSubject = draft.subject
  let draftBody = draft.body
  if (nextBestAction === "BOOK_MEETING") {
    draftSubject = `Re: ${reply.subject ?? "Quick call?"}`
    draftBody = `${draft.body}\n\nIf it helps, I can do:\n- Tue 11:00\n- Wed 15:00\nReply with what works and I will lock it in.`
  }
  if (nextBestAction === "SEND_PROPOSAL") {
    draftSubject = `Re: ${reply.subject ?? "Proposal details"}`
    draftBody = `${draft.body}\n\nI can also send a tailored one-page proposal today with scope, timeline, and pricing options.`
  }

  await prisma.pendingAction.create({
    data: {
      userId: user.id,
      leadId: lead.id,
      replyId,
      type: nextBestAction,
      intent,
      draftSubject,
      draftBody,
      metadata: {
        summary: classification.summary,
        confidence: classification.confidence,
        style: learnedStyle,
        policyChecks: policy.policyChecks,
        nextBestAction,
        whyThisDraft: `Intent ${intent} with ${classification.confidence} confidence.`,
        planner: {
          meetingsPerMonth: goal.meetingsPerMonth,
          replyRateTarget: goal.replyRateTarget,
        },
      },
      riskLevel: policy.riskLevel,
      confidence: classification.confidence,
      expiresAt,
    },
  })

  // Deterministic stage updates
  if (nextBestAction === "BOOK_MEETING" && lead.status !== "MEETING_BOOKED") {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "INTERESTED" },
    })
  }
  if (intent === "QUESTION" || intent === "OBJECTION") {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "REPLIED" },
    })
  }
}
