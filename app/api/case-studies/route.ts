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
  const {
    clientName,
    industry,
    nicheTags,
    challenge,
    solution,
    results,
    testimonialQuote,
    metrics,
    aiSummary: customSummary,
  } = body

  if (!clientName?.trim() || !results?.trim()) {
    return NextResponse.json(
      { error: "Please provide at least a Client Name and the Results/Outcome." },
      { status: 400 }
    )
  }

  const finalIndustry = industry?.trim() || "B2B Business"
  const finalChallenge = challenge?.trim() || `Needed consistent customer acquisition and improved conversion rates in the ${finalIndustry} space.`
  const finalSolution = solution?.trim() || `Implemented targeted growth strategy and conversion funnel optimization.`
  const finalResults = results.trim()

  const aiSummary = customSummary?.trim()
    ? customSummary.trim()
    : await generateCaseStudySummary({
        clientName: clientName.trim(),
        industry: finalIndustry,
        challenge: finalChallenge,
        solution: finalSolution,
        results: finalResults,
      })

  const caseStudy = await prisma.caseStudy.create({
    data: {
      userId: scopeId,
      clientName: clientName.trim(),
      industry: finalIndustry,
      nicheTags: Array.isArray(nicheTags) ? nicheTags : [],
      challenge: finalChallenge,
      solution: finalSolution,
      results: finalResults,
      testimonialQuote: testimonialQuote?.trim() || null,
      metrics: metrics || null,
      aiSummary,
    },
  })

  return NextResponse.json(caseStudy)
}
