import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Verify lead belongs to user
  const lead = await prisma.lead.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Fetch all sent emails
  const emails = await prisma.email.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "asc" },
  })

  // Fetch all received replies
  const replies = await prisma.reply.findMany({
    where: { leadId: id },
    orderBy: { receivedAt: "asc" },
  })

  // Set of email IDs that have corresponding replies
  const repliedEmailIds = new Set(replies.map((r) => r.emailId).filter(Boolean))

  // Merge them chronologically
  const thread = [
    ...emails.map((e) => ({
      id: e.id,
      type: "sent" as const,
      subject: e.subject,
      body: e.body,
      timestamp: e.sentAt || e.createdAt,
      status: e.status,
      stepNumber: e.stepNumber,
      wasRepliedTo: repliedEmailIds.has(e.id),
    })),
    ...replies.map((r) => ({
      id: r.id,
      type: "received" as const,
      subject: r.subject,
      body: r.body,
      timestamp: r.receivedAt,
      fromEmail: r.fromEmail,
    })),
  ]

  // Sort by timestamp asc
  thread.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return NextResponse.json(thread)
}
