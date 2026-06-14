/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateEmail } from "@/lib/ai"
import { performCompanyResearch } from "@/lib/research"
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// ── Technical website audit helper ──────────────────────────────────────────
async function runWebsiteAudit(url: string) {
  try {
    const targetUrl = url.startsWith("http") ? url : `https://${url}`
    const start = Date.now()
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: { "User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9" },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    })
    const speed = Date.now() - start
    const html = await res.text()
    const $ = cheerio.load(html)
    const lowerHtml = html.toLowerCase()

    const ssl = res.url.startsWith("https")
    const pixel = html.includes("fbevents.js") || html.includes("connect.facebook.net") || html.includes("fb.com/tr")
    const gAnalytics = /gtag\(['"]\s*config['"]\s*,\s*['"]G-/.test(html) || html.includes("google-analytics.com/analytics.js") || html.includes("ga.js")
    const gtm = html.includes("googletagmanager.com/gtm.js") || html.includes("GTM-")
    const mobile = lowerHtml.includes("viewport") || $("meta[name='viewport']").length > 0
    const metaDesc = $("meta[name='description']").attr("content") ?? ""
    const noMetaDesc = !metaDesc.trim()

    return { ssl, speed, pixel, googleAnalytics: gAnalytics, googleTagManager: gtm, mobile, noMetaDesc }
  } catch (err) {
    console.error("Error in on-the-fly audit:", err)
    return null
  }
}

// ── Google Place details helper ──────────────────────────────────────────────
async function fetchPlaceDetails(placeId: string, apiKey: string) {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,rating,userRatingCount,formattedAddress,displayName,primaryType"
      }
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error("Error fetching place details:", err)
    return null
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campaignId, leadId } = await params
  const { approach } = await req.json()

  // 1. Verify campaign ownership and load sequence steps
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: session.user.id },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      user: true
    }
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  // 2. Fetch the target lead
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: session.user.id }
  })
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const user = campaign.user
  const steps = campaign.sequence.steps
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  let finalApproach = approach ?? "competitor"
  let rating: number | null = null
  let reviewCount: number | null = null
  let auditData: Record<string, unknown> | null = null

  // 3. Fetch Place details if local-rank approach is requested
  if (finalApproach === "local-rank" && lead.googlePlaceId && apiKey) {
    const place = await fetchPlaceDetails(lead.googlePlaceId, apiKey)
    if (place) {
      rating = place.rating ?? null
      reviewCount = place.userRatingCount ?? null
    } else {
      // Fallback if place fetch fails
      finalApproach = "competitor"
    }
  } else if (finalApproach === "local-rank") {
    finalApproach = "competitor"
  }

  // 4. Run website audit if website approach is requested
  if (finalApproach === "website") {
    if (lead.auditJson) {
      try {
        auditData = JSON.parse(lead.auditJson)
      } catch {
        auditData = null
      }
    }
    if (!auditData && lead.website) {
      const audit = await runWebsiteAudit(lead.website)
      if (audit) {
        auditData = audit
      }
    }
    if (!auditData) {
      // Fallback if audit fails / not found
      finalApproach = "competitor"
    }
  }

  // 4.5. Run extensive company research
  const companyResearch = await performCompanyResearch(
    lead.company || lead.email.split("@")[0],
    lead.website,
    user.agencyName || user.companyName || "our agency",
    user.companyDesc || ""
  )

  const now = new Date()
  const emails: {
    leadId: string
    campaignId: string
    subject: string
    body: string
    aiPrompt: string
    stepNumber: number
    status: "DRAFT"
    scheduledAt: Date
  }[] = []

  // 5. Generate emails for each step of the sequence
  let prevSubject = ""
  let prevBody = ""

  for (const step of steps) {
    const scheduledAt = new Date(now)
    if (step.stepNumber > 1) {
      let daysOffset = 0
      for (let i = 1; i < step.stepNumber; i++) daysOffset += steps[i - 1]?.delayDays ?? 1
      scheduledAt.setDate(scheduledAt.getDate() + daysOffset)
    }

    const generated = await generateEmail(
      {
        userId:            session.user.id,
        senderName:        user.name || "Your Name",
        senderTitle:       user.title || "Marketing Consultant",
        senderCompany:     user.agencyName || user.companyName || "Your Company",
        senderCompanyDesc: user.companyDesc || "We help businesses grow.",
        prospectFirstName: lead.firstName || lead.email.split("@")[0],
        prospectLastName:  lead.lastName || "",
        prospectTitle:     lead.title || "Decision Maker",
        prospectCompany:   lead.company || "their company",
        prospectCompanyDesc: lead.companyDesc || "",
        industry:          lead.industry || "business",
        recentNews:        lead.recentNews || "",
        painPoint:         lead.painPoint || "",
        tone:              user.tone || "Professional",
        // Pass approach data
        approach:          finalApproach,
        rating,
        reviewCount,
        auditData:         auditData as any,
        companyResearch,
        subjectTemplate:   step.subjectTemplate,
        bodyTemplate:      step.bodyTemplate,
        previousEmailSubject: prevSubject || null,
        previousEmailBody: prevBody || null,
        calendarLink:      user.calendarLink
      },
      step.stepNumber
    )

    prevSubject = generated.subject
    prevBody = generated.body

    emails.push({
      leadId: lead.id,
      campaignId,
      subject: generated.subject,
      body: generated.body,
      aiPrompt: `${finalApproach} approach`,
      stepNumber: step.stepNumber,
      status: "DRAFT" as const,
      scheduledAt
    })
  }

  // 6. Delete existing draft emails and save new ones in a transaction
  const createdEmails = await prisma.$transaction(async (tx) => {
    // Delete any existing DRAFT emails
    await tx.email.deleteMany({
      where: { leadId: lead.id, campaignId, status: "DRAFT" }
    })

    // Create the new DRAFT emails
    const created = []
    for (const e of emails) {
      const email = await tx.email.create({ data: e })
      created.push(email)
    }
    return created
  })

  // 7. Record an activity log
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: "BATTLE_CARD_GENERATED", // Use an existing type or Stage change
      note: `Generated campaign outreach drafts using the ${finalApproach} approach.`,
    }
  })

  return NextResponse.json({ success: true, emails: createdEmails })
}
