import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST(req: NextRequest, { params }: { params: Promise<{ replyId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { replyId } = await params

  // Find the pending action for this reply
  const pendingAction = await prisma.pendingAction.findFirst({
    where: { replyId, lead: { userId: scopeId } }
  })

  if (!pendingAction) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Pause the timer by setting expiresAt to null, meaning it switches to manual review mode
  await prisma.pendingAction.update({
    where: { id: pendingAction.id },
    data: { expiresAt: null }
  })

  return NextResponse.json({ success: true })
}
