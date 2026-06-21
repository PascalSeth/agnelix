import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateCaseStudySummary } from "@/lib/ai"
import { getScopeId } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const caseStudies = await prisma.caseStudy.findMany({
    where: { userId: scopeId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(caseStudies)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { clientName, industry, nicheTags, challenge, solution, results, testimonialQuote, metrics } = body

  if (!clientName || !industry || !challenge || !solution || !results) {
    return NextResponse.json({ error: "clientName, industry, challenge, solution and results are required" }, { status: 400 })
  }

  const aiSummary = await generateCaseStudySummary({ clientName, industry, challenge, solution, results })

  const caseStudy = await prisma.caseStudy.create({
    data: {
      userId: scopeId,
      clientName,
      industry,
      nicheTags: Array.isArray(nicheTags) ? nicheTags : [],
      challenge,
      solution,
      results,
      testimonialQuote: testimonialQuote || null,
      metrics: metrics || null,
      aiSummary,
    },
  })

  return NextResponse.json(caseStudy)
}
