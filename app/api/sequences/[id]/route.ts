/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, steps } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  // Verify ownership
  const existing = await prisma.sequence.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Sequence not found" }, { status: 404 })

  if (steps && Array.isArray(steps)) {
    await prisma.$transaction([
      prisma.sequenceStep.deleteMany({ where: { sequenceId: id } }),
      prisma.sequence.update({
        where: { id, userId: session.user.id },
        data: {
          name: name.trim(),
          steps: {
            createMany: {
              data: steps.map((s: { stepNumber: number; delayDays: number; subjectTemplate?: string | null; bodyTemplate?: string | null; stepType?: any; aiPrompt?: string | null }) => ({
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
      }),
    ])
  } else {
    await prisma.sequence.update({
      where: { id, userId: session.user.id },
      data: { name: name.trim() },
    })
  }

  const updatedSequence = await prisma.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  })

  return NextResponse.json(updatedSequence)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.sequence.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ deleted: true })
}
