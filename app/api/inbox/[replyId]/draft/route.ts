import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateReplyDraft } from "@/lib/ai"

export async function POST(req: NextRequest, { params }: { params: Promise<{ replyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { replyId } = await params
  let responseStyle = ""
  try {
    const body = await req.json()
    responseStyle = body.responseStyle
  } catch {
    // ignore
  }

  const reply = await prisma.reply.findFirst({
    where: { id: replyId, lead: { userId: session.user.id } },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
          user: {
            select: {
              name: true,
              agencyName: true,
              companyName: true,
              companyDesc: true,
              tone: true,
              title: true,
              calendarLink: true,
            },
          },
        },
      },
      email: { select: { subject: true, body: true } },
    },
  })

  if (!reply) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const lead = reply.lead
  const user = lead.user

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

  // Format the thread history into a transcript block
  const conversationHistory = thread
    .map(msg => `- ${msg.type.toUpperCase()}: ${msg.body}`)
    .join("\n")

  const draft = await generateReplyDraft({
    leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
    company: lead.company || "their company",
    replyBody: reply.body,
    originalEmailBody: reply.email?.body || "",
    senderName: user.name || "Your Name",
    senderTitle: user.title,
    senderCompany: user.agencyName || user.companyName || "Your Company",
    senderService: user.companyDesc || "our services",
    tone: user.tone || "Professional",
    responseStyle,
    conversationHistory,
    calendarLink: user.calendarLink,
  })

  return NextResponse.json(draft)
}
