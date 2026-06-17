/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { type } = await params
  const body = await req.json()
  const { targetVerticals, platformOptions, objectionHandlers, sequenceTemplates, proposalTemplates } = body

  try {
    const updated = await prisma.playbook.upsert({
      where: { type },
      update: {
        ...(targetVerticals !== undefined && { targetVerticals: targetVerticals }),
        ...(platformOptions !== undefined && { platformOptions: platformOptions }),
        ...(objectionHandlers !== undefined && { objectionHandlers: objectionHandlers }),
        ...(sequenceTemplates !== undefined && { sequenceTemplates: sequenceTemplates }),
        ...(proposalTemplates !== undefined && { proposalTemplates: proposalTemplates }),
      },
      create: {
        type,
        name: type === "social_media" ? "Social Media Agency"
              : type === "seo" ? "SEO Agency"
              : type === "ppc" ? "PPC & Paid Ads Agency"
              : type === "sales" ? "Sales & B2B Lead Gen"
              : type === "finance" ? "Fractional CFO & Finance"
              : type === "web_design" ? "Web Design & Development"
              : "Custom Agency Playbook",
        discoveryMethod: type === "linkedin" || type === "sales" || type === "finance" ? "linkedin" : "maps",
        targetVerticals: targetVerticals || [],
        platformOptions: platformOptions || [],
        objectionHandlers: objectionHandlers || [],
        sequenceTemplates: sequenceTemplates || [],
        proposalTemplates: proposalTemplates || [],
        reportMetrics: [],
        reportTemplates: [],
        portalTemplates: [],
        portalSections: [],
        toneOptions: ["Professional"],
      }
    })
    return NextResponse.json(updated)
  } catch (err: any) {
    console.error("Failed to update playbook:", err)
    return NextResponse.json({ error: err.message || "Failed to update playbook" }, { status: 500 })
  }
}
