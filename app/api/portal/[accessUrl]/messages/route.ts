import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ accessUrl: string }> }) {
  const { accessUrl } = await params
  const body = await req.json()
  const { token, content, direction } = body

  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 })

  const portal = await prisma.clientPortal.findUnique({ where: { accessUrl } })
  if (!portal || !portal.isActive || portal.accessToken !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const message = await prisma.portalMessage.create({
    data: {
      portalId: portal.id,
      direction: direction === "agency" ? "agency" : "client",
      content: content.trim(),
    },
  })

  return NextResponse.json(message)
}
