/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { type } = await params
  const body = await req.json()
  const { targetVerticals, platformOptions, objectionHandlers } = body

  try {
    const updated = await prisma.playbook.update({
      where: { type },
      data: {
        ...(targetVerticals !== undefined && { targetVerticals: targetVerticals }),
        ...(platformOptions !== undefined && { platformOptions: platformOptions }),
        ...(objectionHandlers !== undefined && { objectionHandlers: objectionHandlers }),
      }
    })
    return NextResponse.json(updated)
  } catch (err: any) {
    console.error("Failed to update playbook:", err)
    return NextResponse.json({ error: err.message || "Failed to update playbook" }, { status: 500 })
  }
}
