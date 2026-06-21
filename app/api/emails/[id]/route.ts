import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { id } = await params
  const { subject, body } = await req.json()

  // 1. Verify email exists and verify ownership via lead relationship
  const email = await prisma.email.findFirst({
    where: {
      id,
      lead: { userId: scopeId }
    },
    select: { id: true, status: true }
  })

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 })
  }

  // 2. Only allow editing DRAFT emails
  if (email.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft emails can be edited" }, { status: 400 })
  }

  // 3. Update the email
  const updated = await prisma.email.update({
    where: { id },
    data: {
      ...(subject !== undefined && { subject }),
      ...(body !== undefined && { body })
    }
  })

  return NextResponse.json({ success: true, email: updated })
}
