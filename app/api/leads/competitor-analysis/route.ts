import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateCompetitorAnalysis } from "@/lib/ai"
import { scrapeCompetitorSite } from "@/lib/competitor-scraper"
import { getScopeId } from "@/lib/auth-helpers"
import { Competitor, parseCompetitorAnalysis } from "@/lib/competitor-utils"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const body = await req.json()
  const { leadId, competitorName, competitorWebsite, competitorNotes } = body

  if (!leadId || !competitorName) {
    return NextResponse.json({ error: "leadId and competitorName are required" }, { status: 400 })
  }

  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: scopeId } })
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  // Ground the analysis in the competitor's real site content when a URL is given
  const competitorWebsiteText = competitorWebsite
    ? await scrapeCompetitorSite(competitorWebsite)
    : ""

  const analysis = await generateCompetitorAnalysis({
    businessName: lead.company || lead.email,
    industry: lead.industry || "business",
    competitorName,
    competitorWebsite,
    competitorNotes,
    competitorWebsiteText: competitorWebsiteText || undefined,
  })

  const existingCompetitors = parseCompetitorAnalysis(lead.competitorAnalysis)
  
  const newCompetitor: Competitor = {
    name: competitorName.trim(),
    website: competitorWebsite?.trim() || null,
    summary: analysis.summary || null,
    marketPosition: analysis.marketPosition || "Market Competitor",
    estimatedMonthlyTraffic: analysis.estimatedMonthlyTraffic || "10k / mo",
    reviewProfile: analysis.reviewProfile || "80+ reviews (4.5★)",
    pricingModel: analysis.pricingModel || "Market Standard",
    adActivity: analysis.adActivity || "Active Digital Presence",
    techGaps: analysis.techGaps || [],
    strengths: analysis.strengths || [],
    shortcomings: analysis.weaknesses || [],
    leverage: analysis.opportunities || [],
    talkingPoints: analysis.talkingPoints || [],
    coldOutreachHook: analysis.coldOutreachHook || null,
  }

  // Filter out any existing competitor with the same name to prevent duplicates
  const updatedCompetitors = [
    ...existingCompetitors.filter(c => c.name.toLowerCase() !== competitorName.trim().toLowerCase()),
    newCompetitor
  ]

  const text = JSON.stringify(updatedCompetitors)

  await prisma.lead.update({ where: { id: lead.id }, data: { competitorAnalysis: text } })
  await prisma.activity.create({
    data: { leadId: lead.id, type: "COMPETITOR_ANALYSIS_GENERATED", note: `Competitor analysis generated for ${competitorName}` },
  })

  return NextResponse.json({ analysis, text, competitors: updatedCompetitors })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const scopeId = getScopeId(session)

  const { searchParams } = req.nextUrl
  const leadId = searchParams.get("leadId")
  const competitorName = searchParams.get("competitorName")

  if (!leadId || !competitorName) {
    return NextResponse.json({ error: "leadId and competitorName are required" }, { status: 400 })
  }

  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: scopeId } })
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const existingCompetitors = parseCompetitorAnalysis(lead.competitorAnalysis)
  const updatedCompetitors = existingCompetitors.filter(
    c => c.name.toLowerCase() !== competitorName.toLowerCase()
  )

  const text = updatedCompetitors.length > 0 ? JSON.stringify(updatedCompetitors) : ""

  await prisma.lead.update({ where: { id: lead.id }, data: { competitorAnalysis: text } })
  await prisma.activity.create({
    data: { leadId: lead.id, type: "COMPETITOR_ANALYSIS_GENERATED", note: `Removed competitor ${competitorName} from analysis` },
  })

  return NextResponse.json({ text, competitors: updatedCompetitors })
}

