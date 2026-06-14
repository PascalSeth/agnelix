import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateCompetitorAnalysis } from "@/lib/ai"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { leadId, competitorName, competitorWebsite, competitorNotes } = body

  if (!leadId || !competitorName) {
    return NextResponse.json({ error: "leadId and competitorName are required" }, { status: 400 })
  }

  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: session.user.id } })
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const analysis = await generateCompetitorAnalysis({
    businessName: lead.company || lead.email,
    industry: lead.industry || "business",
    competitorName,
    competitorWebsite,
    competitorNotes,
  })

  const text = [
    `Competitor: ${competitorName}${competitorWebsite ? ` (${competitorWebsite})` : ""}`,
    "",
    analysis.summary,
    "",
    "Strengths:",
    ...analysis.strengths.map(s => `- ${s}`),
    "",
    "Weaknesses:",
    ...analysis.weaknesses.map(s => `- ${s}`),
    "",
    "Opportunities for us:",
    ...analysis.opportunities.map(s => `- ${s}`),
    "",
    "Talking points:",
    ...analysis.talkingPoints.map(s => `- ${s}`),
  ].join("\n")

  await prisma.lead.update({ where: { id: lead.id }, data: { competitorAnalysis: text } })
  await prisma.activity.create({
    data: { leadId: lead.id, type: "COMPETITOR_ANALYSIS_GENERATED", note: `Competitor analysis generated for ${competitorName}` },
  })

  return NextResponse.json({ analysis, text })
}
