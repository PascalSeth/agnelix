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
          firstName: true, lastName: true, email: true, company: true,
          user: { select: { name: true, agencyName: true, companyName: true, companyDesc: true, tone: true } },
        },
      },
      email: { select: { subject: true, body: true } },
    },
  })

  if (!reply) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const lead = reply.lead
  const user = lead.user

  const draft = await generateReplyDraft({
    leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email,
    company: lead.company || "their company",
    replyBody: reply.body,
    originalEmailBody: reply.email?.body || "",
    senderName: user.name || "Your Name",
    senderCompany: user.agencyName || user.companyName || "Your Company",
    senderService: user.companyDesc || "our services",
    tone: user.tone || "Professional",
    responseStyle,
  })

  return NextResponse.json(draft)
}
