/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generatePlaybookTemplates } from "@/lib/ai"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        agencyName: true,
        companyDesc: true,
        playbookType: true,
        currency: true,
      },
    })

    const playbookType = user?.playbookType || "sales"
    const companyName = user?.agencyName || "Our Agency"
    const companyDesc = user?.companyDesc || ""
    const currency = user?.currency || "GBP"

    if (!companyDesc) {
      return NextResponse.json(
        { error: "Please configure your Agency Description in Settings first so the AI has context to generate templates." },
        { status: 400 }
      )
    }

    const generated = await generatePlaybookTemplates({
      companyName,
      companyDesc,
      playbookType,
      currency,
    })

    // Upsert the playbook record in the database for this specific playbook type
    const updatedPlaybook = await prisma.playbook.upsert({
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
        targetVerticals: generated.targetVerticals || [],
        discoveryMethod: playbookType === "linkedin" || playbookType === "sales" || playbookType === "finance" ? "linkedin" : "maps",
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

    return NextResponse.json(updatedPlaybook)
  } catch (err: any) {
    console.error("Failed to generate playbook templates via AI:", err)
    return NextResponse.json(
      { error: err.message || "An error occurred while generating templates." },
      { status: 500 }
    )
  }
}
