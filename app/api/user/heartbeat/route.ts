import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const scopeId = getScopeId(session)
  await prisma.user.update({
    where: { id: scopeId },
    data: { lastActiveAt: new Date() },
  }).catch(() => {})

  return NextResponse.json({ ok: true, lastActiveAt: new Date() })
}
