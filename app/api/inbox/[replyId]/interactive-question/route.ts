import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

/**
 * Generate an interactive clarification question based on lead research/review data
 * Instead of auto-replying, ask the user a specific, contextual question
 * to ground the response in facts about the lead's situation.
 *
 * Example: if lead mentioned budget, ask "What's your typical budget range for this?"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { replyId } = await params
  const body = await req.json().catch(() => ({}))

  // Fetch the reply and associated lead/email context
  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    include: {
      lead: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              agencyName: true,
              companyName: true,
              title: true,
            },
          },
        },
      },
      email: {
        select: {
          subject: true,
          body: true,
          stepNumber: true,
        },
      },
    },
  })

  if (!reply || reply.lead.user.id !== scopeId) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 })
  }

  const lead = reply.lead
  const askedQuestions = (await prisma.activity.findMany({
    where: {
      leadId: lead.id,
      type: "NOTE_ADDED",
      note: { contains: "[AI_QUESTION]" },
    },
    select: { note: true },
    take: 10,
  })).map(a => a.note || "")

  // Generate contextual questions based on lead's research data
  const questions = generateContextualQuestions({
    replyBody: reply.body,
    leadCompany: lead.company,
    leadTitle: lead.title,
    leadPainPoints: lead.painPoints ? JSON.parse(lead.painPoints as string) : null,
    leadResearchNotes: lead.researchNotes,
    leadBuyingSignals: lead.buyingSignalsJson ? JSON.parse(lead.buyingSignalsJson) : null,
    originalEmailSubject: reply.email?.subject ?? null,
    originalEmailBody: reply.email?.body ?? null,
    senderName: lead.user.name || "You",
    senderCompany: lead.user.agencyName || lead.user.companyName,
    askedQuestions,
  })

  return NextResponse.json({
    questions: questions.slice(0, 3), // Return top 3 contextual questions
    example: questions[0],
  })
}

interface QuestionGeneratorParams {
  replyBody: string
  leadCompany: string | null
  leadTitle: string | null
  leadPainPoints: unknown
  leadResearchNotes: string | null
  leadBuyingSignals: unknown
  originalEmailSubject: string | null
  originalEmailBody: string | null
  senderName: string
  senderCompany: string | null
  askedQuestions: string[]
}

function generateContextualQuestions(params: QuestionGeneratorParams): Array<{
  question: string
  context: string
  timeoutSeconds: number
  followUpPrompt: string
}> {
  const {
    replyBody,
    leadCompany,
    leadTitle,
    leadResearchNotes,
    leadBuyingSignals,
    senderName,
  } = params

  const questions: Array<{
    question: string
    context: string
    timeoutSeconds: number
    followUpPrompt: string
  }> = []

  const replyLower = replyBody.toLowerCase()
  const leadResearchLower = leadResearchNotes?.toLowerCase() || ""

  // Pattern 1: Budget/timeline questions
  if (
    replyLower.includes("pricing") ||
    replyLower.includes("cost") ||
    replyLower.includes("budget") ||
    replyLower.includes("how much")
  ) {
    questions.push({
      question: `${leadCompany ? `At ${leadCompany}, ` : ""}what's your typical budget for solutions in this area?`,
      context: `Lead mentioned budget/pricing — ground your response in their actual constraints.`,
      timeoutSeconds: 120,
      followUpPrompt: `Use their budget range to suggest value-aligned next steps, not sticker-shock pricing.`,
    })
  }

  // Pattern 2: Timeline/urgency questions
  if (
    replyLower.includes("timeline") ||
    replyLower.includes("when") ||
    replyLower.includes("soon") ||
    replyLower.includes("ready")
  ) {
    questions.push({
      question: `When are you looking to get this started?`,
      context: `Lead is asking about timeline — clarify their urgency and resources.`,
      timeoutSeconds: 120,
      followUpPrompt: `Sync your proposal/next steps to their actual timeline, not your standard sequence.`,
    })
  }

  // Pattern 3: Problem/pain point questions
  if (
    replyLower.includes("not sure") ||
    replyLower.includes("struggling") ||
    replyLower.includes("challenge") ||
    replyLower.includes("problem")
  ) {
    const painPoint = Array.isArray(leadResearchNotes)
      ? (leadResearchNotes as unknown[]).join(", ")
      : leadResearchNotes

    questions.push({
      question: `Which of these is your biggest blocker: ${painPoint || "speed, cost, or quality"}?`,
      context: `Lead flagged pain — confirm which one hurts most before proposing.`,
      timeoutSeconds: 120,
      followUpPrompt: `Only pitch solutions that address their TOP blocker. Other benefits are secondary.`,
    })
  }

  // Pattern 4: Decision-maker/buying process
  if (
    replyLower.includes("need to check") ||
    replyLower.includes("need approval") ||
    replyLower.includes("team") ||
    replyLower.includes("boss")
  ) {
    questions.push({
      question: `Who else needs to be involved in the decision?`,
      context: `Lead is not a solo buyer — map the full decision committee.`,
      timeoutSeconds: 120,
      followUpPrompt: `Ask for intros to stakeholders or suggest a group call. Solo pitches waste time.`,
    })
  }

  // Pattern 5: Current solution/competitor
  if (
    replyLower.includes("using") ||
    replyLower.includes("current") ||
    replyLower.includes("competitor") ||
    replyLower.includes("alternative")
  ) {
    questions.push({
      question: `What's working with your current solution, and what isn't?`,
      context: `Lead is comparing you to existing vendors — find the switching triggers.`,
      timeoutSeconds: 120,
      followUpPrompt: `Position yourself as an upgrade to their pain points, not just a replacement.`,
    })
  }

  // Pattern 6: Authority/credibility check
  if (
    replyLower.includes("case study") ||
    replyLower.includes("reference") ||
    replyLower.includes("proof") ||
    replyLower.includes("example")
  ) {
    questions.push({
      question: `Are you in ${leadCompany ? `a company similar to ${leadCompany}` : "a similar industry"}? (For a relevant case study.)`,
      context: `Lead wants proof of ROI — serve a credible peer case study.`,
      timeoutSeconds: 120,
      followUpPrompt: `Share the closest matching case study to their vertical + use case.`,
    })
  }

  // If no specific pattern matched, ask a general discovery question
  if (questions.length === 0) {
    questions.push({
      question: `What's the biggest blocker stopping you from moving forward right now?`,
      context: `Generic high-value question when other signals are weak.`,
      timeoutSeconds: 150,
      followUpPrompt: `Listen to their real objection, not the polite one. Respond to the blocker, not the surface text.`,
    })
  }

  return questions
}
