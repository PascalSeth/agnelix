import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { cancelledEnrichments } from "@/lib/lead-enricher"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify the lead belongs to the user
  const lead = await prisma.lead.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  // Register cancellation in-memory
  cancelledEnrichments.add(id)

  // Update contactsJson in database to [] so UI updates immediately
  // and check isEnrichmentCancelled detects cancellation
  await prisma.lead.update({
    where: { id },
    data: {
      contactsJson: "[]",
    },
  })

  // Log activity
  await prisma.activity.create({
    data: {
      leadId: id,
      type: "NOTE_ADDED",
      note: "Enrichment stopped by user.",
    },
  })

  return NextResponse.json({ success: true })
}
