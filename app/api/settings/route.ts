import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      agencyName: true,
      fromEmail: true,
      smtpPass: true,
      smtpHost: true,
      smtpPort: true,
      companyDesc: true,
      title: true,
      tone: true,
      agencyLogo: true,
      onboardingDone: true,
      calendarLink: true,
    },
  })

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const body = await req.json()
  const allowed = ["agencyName", "fromEmail", "smtpPass", "smtpHost", "smtpPort", "companyDesc", "title", "tone", "agencyLogo", "onboardingDone", "calendarLink"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      agencyName: true,
      fromEmail: true,
      smtpPass: true,
      smtpHost: true,
      smtpPort: true,
      companyDesc: true,
      title: true,
      tone: true,
      agencyLogo: true,
      onboardingDone: true,
      calendarLink: true,
    },
  })

  return NextResponse.json(user)
}
