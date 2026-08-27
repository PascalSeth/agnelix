import { prisma } from "./db"
import { classifyReply, generateReplyDraft } from "./ai"
import { evaluateRiskPolicy, getOrCreateAgentGoal } from "./agent-core"
import { getWorkspace } from "./workspaces"

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
              title: true, calendarLink: true, playbookType: true,
              lastActiveAt: true,
            },
          },
        },
      },
      email: {
        select: {
          id: true,
          subject: true,
          body: true,
          campaign: { select: { autonomous: true, playbookType: true } },
        }
      },
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

  // Handle unsubscribes immediately but continue to create a pending opt-out confirmation draft
  if (intent === "UNSUBSCRIBE") {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "NOT_INTERESTED" },
    })
    await prisma.email.deleteMany({
      where: { leadId: lead.id, status: "QUEUED" },
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
  // AI determines priority based on intent criticality, risk level, and user online/offline presence
  const isHighPriority = policy.riskLevel === "HIGH"
  
  // 1. Check if user is actively online in the dashboard (active within last 10 minutes)
  const isUserOnline = user.lastActiveAt ? (Date.now() - new Date(user.lastActiveAt).getTime()) < 10 * 60 * 1000 : false

  // 2. Determine base delay based on message criticality & intent
  let targetDelayMins = 2
  if (intent === "INTERESTED" || meetingRequested) {
    // Critical / Hot Leads: fastest response to capture warm prospect
    targetDelayMins = goal.criticalDelayMins ?? 1
  } else if (intent === "QUESTION") {
    // Medium Criticality: Inquiries & feature questions
    targetDelayMins = goal.questionDelayMins ?? 5
  } else if (intent === "OBJECTION" || intent === "NOT_NOW") {
    // Sensitive Criticality: Objections & timing friction
    targetDelayMins = goal.objectionDelayMins ?? 15
  } else {
    // Low Criticality / Generic
    targetDelayMins = isHighPriority ? (goal.highPriorityDelayMins ?? 15) : (goal.lowPriorityDelayMins ?? 30)
  }

  // 3. Apply Offline Auto-Pilot Override
  if (!isUserOnline && goal.autoSendOnlyWhenOffline) {
    targetDelayMins = goal.offlineDelayMins ?? 2
  } else if (isUserOnline && goal.autoSendOnlyWhenOffline) {
    targetDelayMins = Math.max(targetDelayMins, goal.reviewWindowMins ?? 5)
  }

  let delayMs = 0
  if (targetDelayMins > 0) {
    const jitterMs = Math.floor((Math.random() * 20 - 10) * 1000)
    delayMs = Math.max(0, targetDelayMins * 60 * 1000 + jitterMs)
  }
  
  const expiresAt = new Date(Date.now() + delayMs)

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

  // Handle NOT_NOW immediately (safety/nurture state) but continue to generate a timing objection confirmation draft
  if (intent === "NOT_NOW") {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "NOT_INTERESTED" },
    })
    await prisma.email.deleteMany({
      where: { leadId: lead.id, status: "QUEUED" },
    })
    await prisma.agentMemory.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        intent,
        outcome: "NURTURED",
        score: -0.2,
        notes: classification.summary,
      },
    })
  }

  // INTERESTED / QUESTION / OBJECTION / UNSUBSCRIBE / NOT_NOW — draft a reply
  const styleMap: Record<string, string> = {
    INTERESTED: "DIRECT",
    QUESTION: "VALUE-FIRST",
    OBJECTION: "SOFT",
    UNSUBSCRIBE: "SOFT",
    NOT_NOW: "SOFT",
  }
  const learnedStyle = await chooseResponseStyle(user.id, styleMap[intent] ?? "DIRECT")

  // Fetch full conversation history (all outgoing emails and incoming replies)
  const [emails, replies] = await Promise.all([
    prisma.email.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "asc" },
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

  // Format the thread history into a transcript block. Keep it signal-dense:
  // only the last 12 messages, each trimmed, and the latest reply clearly
  // marked so the model answers *that* instead of drifting across the thread.
  const recentThread = thread.slice(-12)
  const conversationHistory = recentThread
    .map((msg, i) => {
      const who = msg.type === "outgoing" ? "YOU" : "PROSPECT"
      const body = msg.body.length > 600 ? msg.body.slice(0, 600).trimEnd() + " […trimmed]" : msg.body
      const isLatest = i === recentThread.length - 1
      return `${isLatest ? "→ LATEST — " : ""}${who}:\n${body}`
    })
    .join("\n---\n")

  // Resolve the playbook from the campaign this reply belongs to, so a
  // full-service agency running SEO + PPC + Social campaigns side-by-side gets
  // campaign-appropriate objection handling. Falls back to the lead's most
  // recent campaign, then the user's global playbook.
  let effectivePlaybookType = reply.email?.campaign?.playbookType ?? null
  if (!effectivePlaybookType) {
    const latestEnrollment = await prisma.campaignLead.findFirst({
      where: { leadId: lead.id },
      orderBy: { enrolledAt: "desc" },
      select: { campaign: { select: { playbookType: true } } },
    })
    effectivePlaybookType = latestEnrollment?.campaign?.playbookType ?? null
  }
  effectivePlaybookType = effectivePlaybookType ?? user.playbookType

  let objectionHandlers = null
  if (effectivePlaybookType) {
    const playbook = await prisma.playbook.findUnique({
      where: { type: effectivePlaybookType },
      select: { objectionHandlers: true },
    })
    if (playbook) {
      objectionHandlers = playbook.objectionHandlers
    }
  }

  // Speak as the workspace's specialist (Closer, Analyst, Creative Director…);
  // user-configured persona rules still take precedence via spread order.
  const wsPersona = getWorkspace(effectivePlaybookType).persona
  const personaConfig = {
    workspaceRole: wsPersona.role,
    workspaceVoice: wsPersona.voice,
    ...(typeof goal.personaConfig === "object" && goal.personaConfig ? (goal.personaConfig as Record<string, unknown>) : {}),
  }

  const draft = await generateReplyDraft({
    leadName,
    company: lead.company ?? "their company",
    replyBody: reply.body,
    originalEmailBody: reply.email?.body ?? "",
    senderName: user.name ?? "Your Name",
    senderTitle: user.title,
    senderCompany: user.agencyName ?? user.companyName ?? "Your Company",
    senderService: user.companyDesc ?? "our services",
    tone: user.tone ?? "Professional",
    responseStyle: learnedStyle,
    conversationHistory,
    calendarLink: user.calendarLink,
    personaConfig,
    objectionHandlers,
    playbookType: effectivePlaybookType,
    userId: user.id,
  })

  let draftSubject = draft.subject
  let draftBody = draft.body
  if (nextBestAction === "BOOK_MEETING") {
    draftSubject = `Re: ${reply.subject ?? "Quick call?"}`
    if (user.calendarLink) {
      if (!draftBody.includes(user.calendarLink)) {
        draftBody = `${draft.body}\n\nHere is my calendar link if you want to book a time directly: ${user.calendarLink}`
      }
    } else {
      const schedulingKeywords = ["mon", "tue", "wed", "thu", "fri", "sat", "sun", "calendar", "time", "hour", "day", "slot", "schedule", "meet", "call"];
      const containsScheduling = schedulingKeywords.some(kw => 
        draftBody.toLowerCase().includes(kw) || reply.body.toLowerCase().includes(kw)
      );
      if (!containsScheduling) {
        draftBody = `${draft.body}\n\nIf it helps, I can do:\n- Tue 11:00\n- Wed 15:00\nReply with what works and I will lock it in.`
      }
    }
  }
  if (nextBestAction === "SEND_PROPOSAL") {
    draftSubject = `Re: ${reply.subject ?? "Proposal details"}`
    if (!draftBody.toLowerCase().includes("proposal")) {
      draftBody = `${draft.body}\n\nI can also send a tailored one-page proposal today with scope, timeline, and pricing options.`
    }
  }

  const createdAction = await prisma.pendingAction.create({
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
        extractedObjection: classification.extractedObjection,
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
    include: {
      lead: { include: { user: true } },
    },
  })

  const canAutoSend = goal.autoSendEnabled && (!goal.autoSendOnlyWhenOffline || !isUserOnline)
  if (expiresAt <= new Date() && canAutoSend) {
    const isAutonomous = reply.email?.campaign?.autonomous ?? false
    const shouldSkip = nextBestAction === "SEND_REPLY" && isHighPriority && !isAutonomous
    if (!shouldSkip) {
      const { executePendingAction } = await import("./agent-core")
      await executePendingAction(createdAction, "auto").catch(e =>
        console.error("[processReply] Instant execution error:", e)
      )
    }
  }

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
