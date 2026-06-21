import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { verifySmtp, resolveSmtp } from "@/lib/email"

import { getScopeId, isTeamOwner } from "@/lib/auth-helpers"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isTeamOwner(session)) return NextResponse.json({ error: "Only the team owner can manage SMTP settings" }, { status: 403 })

  const scopeId = getScopeId(session)
  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { fromEmail: true, smtpPass: true, smtpHost: true, smtpPort: true },
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  try {
    const smtp = resolveSmtp(user)
    await verifySmtp(smtp)
    return NextResponse.json({ ok: true, email: smtp.user })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
