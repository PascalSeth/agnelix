import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generatePlaybookTemplates } from "@/lib/ai"
import { encryptSecret } from "@/lib/crypto"

import { getScopeId, isTeamOwner } from "@/lib/auth-helpers"

// Placeholder returned instead of the stored SMTP password. When the client
// sends it back unchanged on save, the stored credential is left untouched.
const SMTP_PASS_MASK = "********"

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
      flagshipOffer: true,
      currency: true,
    },
  })

  if (user && "smtpPass" in user && user.smtpPass) {
    user.smtpPass = SMTP_PASS_MASK
  }
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

  const allowed = ["agencyName", "fromEmail", "smtpPass", "smtpHost", "smtpPort", "companyDesc", "title", "tone", "agencyLogo", "onboardingDone", "calendarLink", "playbookType", "flagshipOffer", "currency"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  // Validate currency if provided
  if ("currency" in data && data.currency) {
    const validCurrencies = ["USD", "EUR", "GBP", "CAD", "GHS", "NGN"]
    const upper = String(data.currency).toUpperCase()
    if (validCurrencies.includes(upper)) {
      data.currency = upper
    } else {
      delete data.currency
    }
  }

  // Flagship offer: accept { name, transformation, deliverable } or null to clear
  if ("flagshipOffer" in data) {
    const fo = data.flagshipOffer as Record<string, unknown> | null
    if (fo && typeof fo === "object" && typeof fo.name === "string" && fo.name.trim()) {
      data.flagshipOffer = {
        name: String(fo.name).trim(),
        transformation: typeof fo.transformation === "string" ? fo.transformation.trim() : "",
        deliverable: typeof fo.deliverable === "string" ? fo.deliverable.trim() : "",
      }
    } else {
      data.flagshipOffer = null as never
    }
  }

  // SMTP password: the mask means "unchanged"; anything else is encrypted at rest
  if ("smtpPass" in data) {
    const pass = typeof data.smtpPass === "string" ? data.smtpPass.trim() : ""
    if (pass === SMTP_PASS_MASK) {
      delete data.smtpPass
    } else {
      data.smtpPass = pass ? encryptSecret(pass) : null
    }
  }

  // Check previous onboarding status to avoid running heavy LLM tasks on routine saves
  const existingUser = await prisma.user.findUnique({
    where: { id: scopeId },
    select: { onboardingDone: true },
  })
  const wasJustOnboarded = existingUser?.onboardingDone === false && body.onboardingDone === true

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
      flagshipOffer: true,
      currency: true,
    },
  })

  // If user completed onboarding for the first time, generate playbook templates asynchronously in background
  if (wasJustOnboarded && user.companyDesc) {
    after(async () => {
      try {
        const playbookType = user.playbookType || "sales"
        const generated = await generatePlaybookTemplates({
          companyName: user.agencyName || "Our Agency",
          companyDesc: user.companyDesc || "",
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
    })
  }

  return NextResponse.json({ ...user, smtpPass: user.smtpPass ? SMTP_PASS_MASK : null })
}
