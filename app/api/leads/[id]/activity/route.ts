import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id: leadId } = await params
  const body = await req.json().catch(() => ({}))
  const { type, note, metadata } = body

  // Verify lead ownership
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: scopeId },
  })
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  // Record activity
  const activity = await prisma.activity.create({
    data: {
      leadId,
      type: type || "NOTE_ADDED",
      note,
      metadata,
    },
  })

  return NextResponse.json(activity)
}
