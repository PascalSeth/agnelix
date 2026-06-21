import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const leads = await prisma.lead.findMany({
    where: { userId: scopeId },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      company: true, industry: true, status: true, dealValue: true,
      createdAt: true, updatedAt: true,
      emails: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(leads)
}
