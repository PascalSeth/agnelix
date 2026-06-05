import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { uploadLogo } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const fd = await req.formData()
  const file = fd.get("file")
  if (!(file instanceof File)) return new NextResponse("No file", { status: 400 })

  const url = await uploadLogo(file, session.user.id)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { agencyLogo: url },
  })

  return NextResponse.json({ url })
}
