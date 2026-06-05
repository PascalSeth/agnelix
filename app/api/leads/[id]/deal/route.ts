import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { dealValue } = await req.json()

  const val = dealValue !== null && dealValue !== undefined ? Number(dealValue) : null
  if (val !== null && isNaN(val)) return NextResponse.json({ error: "Invalid value" }, { status: 400 })

  await prisma.lead.updateMany({
    where: { id, userId: session.user.id },
    data: { dealValue: val },
  })

  return NextResponse.json({ ok: true })
}
