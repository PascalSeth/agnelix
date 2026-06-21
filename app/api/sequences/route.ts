/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const sequences = await prisma.sequence.findMany({
    where: { userId: scopeId },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(sequences)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { name, isDefault, steps } = body

  const sequence = await prisma.sequence.create({
    data: {
      userId: scopeId,
      name,
      isDefault: isDefault || false,
      steps: {
        createMany: {
          data: (steps || []).map((s: { stepNumber: number; delayDays: number; subjectTemplate?: string; bodyTemplate?: string; stepType?: any; aiPrompt?: string }) => ({
            stepNumber: s.stepNumber,
            delayDays: s.delayDays,
            subjectTemplate: s.subjectTemplate || null,
            bodyTemplate: s.bodyTemplate || null,
            stepType: s.stepType || "EMAIL",
            aiPrompt: s.aiPrompt || null,
          })),
        },
      },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  })

  return NextResponse.json(sequence)
}
