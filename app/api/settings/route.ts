import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generatePlaybookTemplates } from "@/lib/ai"

import { getScopeId, isTeamOwner } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  const scopeId = getScopeId(session)
  const owner = isTeamOwner(session)
  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: {
      agencyName: true,
      fromEmail: true,
      // Only the owner needs to see whether SMTP creds are configured/editable
      smtpPass: owner,
      smtpHost: true,
      smtpPort: true,
      companyDesc: true,
      title: true,
      tone: true,
      agencyLogo: true,
      onboardingDone: true,
      calendarLink: true,
      playbookType: true,
    },
  })

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  if (!isTeamOwner(session)) return new NextResponse("Only the team owner can update agency settings", { status: 403 })

  const scopeId = getScopeId(session)
  const body = await req.json()

  // Validate calendar link if provided
  if ("calendarLink" in body) {
    const val = body.calendarLink ? String(body.calendarLink).trim() : ""
    if (val) {
      try {
        const hasProtocol = val.startsWith("http://") || val.startsWith("https://")
        const urlStr = hasProtocol ? val : `https://${val}`
        const parsed = new URL(urlStr)
        if (!parsed.hostname.includes(".")) {
          throw new Error("Invalid domain")
        }
        body.calendarLink = urlStr
      } catch {
        return new NextResponse("Please enter a valid calendar link (e.g. https://calendly.com/your-name). The link must include a valid domain name like '.com' or '.co'.", { status: 400 })
      }
    } else {
      body.calendarLink = null
    }
  }

  const allowed = ["agencyName", "fromEmail", "smtpPass", "smtpHost", "smtpPort", "companyDesc", "title", "tone", "agencyLogo", "onboardingDone", "calendarLink", "playbookType"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const user = await prisma.user.update({
    where: { id: scopeId },
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
      playbookType: true,
    },
  })

  // If onboarding was just marked done, trigger playbook templates auto-generation!
  if (body.onboardingDone === true && user.companyDesc) {
    try {
      const playbookType = user.playbookType || "sales"
      const generated = await generatePlaybookTemplates({
        companyName: user.agencyName || "Our Agency",
        companyDesc: user.companyDesc,
        playbookType,
        currency: "GBP",
      })

      await prisma.playbook.upsert({
        where: { type: playbookType },
        update: {
          targetVerticals: generated.targetVerticals || [],
          platformOptions: generated.platformOptions || [],
          sequenceTemplates: generated.sequenceTemplates as any,
          proposalTemplates: generated.proposalTemplates as any,
          objectionHandlers: generated.objectionHandlers as any,
        },
        create: {
          type: playbookType,
          name: playbookType === "social_media" ? "Social Media Agency"
                : playbookType === "seo" ? "SEO Agency"
                : playbookType === "ppc" ? "PPC & Paid Ads Agency"
                : playbookType === "sales" ? "Sales & B2B Lead Gen"
                : playbookType === "finance" ? "Fractional CFO & Finance"
                : playbookType === "web_design" ? "Web Design & Development"
                : "Custom Agency Playbook",
          discoveryMethod: playbookType === "linkedin" || playbookType === "sales" || playbookType === "finance" ? "linkedin" : "maps",
          targetVerticals: generated.targetVerticals || [],
          platformOptions: generated.platformOptions || [],
          sequenceTemplates: generated.sequenceTemplates as any,
          proposalTemplates: generated.proposalTemplates as any,
          objectionHandlers: generated.objectionHandlers as any,
          reportMetrics: [],
          reportTemplates: [],
          portalTemplates: [],
          portalSections: [],
          toneOptions: ["Professional"],
        },
      })
    } catch (err) {
      console.error("Failed to auto-generate templates on onboarding:", err)
    }
  }

  return NextResponse.json(user)
}
