import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params

  // Verify lead belongs to user
  const lead = await prisma.lead.findFirst({
    where: { id, userId: scopeId },
    select: { id: true },
  })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Fetch only genuinely sent emails with non-empty bodies (exclude DRAFT, FAILED, and empty ghosts)
  const sentEmails = await prisma.email.findMany({
    where: {
      leadId: id,
      status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED"] },
      body: { not: "" },
    },
    orderBy: { sentAt: "asc" },
  })

  // Fetch all received replies
  const rawReplies = await prisma.reply.findMany({
    where: { leadId: id },
    orderBy: { receivedAt: "asc" },
  })

  // Deduplicate replies by body + fromEmail
  const seenReplies = new Set<string>()
  const uniqueReplies = []
  for (const r of rawReplies) {
    const key = `${r.fromEmail}:${r.body.trim()}`
    if (!seenReplies.has(key)) {
      seenReplies.add(key)
      uniqueReplies.push(r)
    }
  }

  // Set of email IDs that have corresponding replies
  const repliedEmailIds = new Set(uniqueReplies.map((r) => r.emailId).filter(Boolean))

  // Merge them chronologically
  const thread = [
    ...sentEmails.map((e) => ({
      id: e.id,
      type: "sent" as const,
      subject: e.subject,
      body: e.body,
      timestamp: e.sentAt || e.createdAt,
      status: e.status,
      stepNumber: e.stepNumber,
      wasRepliedTo: repliedEmailIds.has(e.id),
      openCount: e.openCount,
      openedAt: e.openedAt,
    })),
    ...uniqueReplies.map((r) => ({
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
