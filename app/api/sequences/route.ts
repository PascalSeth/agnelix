import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sequences = await prisma.sequence.findMany({
    where: { userId: session.user.id },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(sequences)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, isDefault, steps } = body

  const sequence = await prisma.sequence.create({
    data: {
      userId: session.user.id,
      name,
      isDefault: isDefault || false,
      steps: {
        createMany: {
          data: (steps || []).map((s: { stepNumber: number; delayDays: number; subjectTemplate?: string; bodyTemplate?: string }) => ({
            stepNumber: s.stepNumber,
            delayDays: s.delayDays,
            subjectTemplate: s.subjectTemplate || null,
            bodyTemplate: s.bodyTemplate || null,
          })),
        },
      },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  })

  return NextResponse.json(sequence)
}
