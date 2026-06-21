import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { uploadLogo } from "@/lib/storage"

import { getScopeId, isTeamOwner } from "@/lib/auth-helpers"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  if (!isTeamOwner(session)) return new NextResponse("Only the team owner can update agency branding", { status: 403 })

  const scopeId = getScopeId(session)
  const fd = await req.formData()
  const file = fd.get("file")
  if (!(file instanceof File)) return new NextResponse("No file", { status: 400 })

  const url = await uploadLogo(file, scopeId)

  await prisma.user.update({
    where: { id: scopeId },
    data: { agencyLogo: url },
  })

  return NextResponse.json({ url })
}
