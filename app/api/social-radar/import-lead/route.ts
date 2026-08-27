import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getScopeId } from "@/lib/auth-helpers"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scopeId = getScopeId(session)

  try {
    const body = await req.json()
    const {
      title,
      body: postBody,
      author = "anonymous",
      platform = "REDDIT",
      subreddit,
      permalink,
      matchedKeyword,
      intentCategory = "GENERAL_TRANSPORT",
      dmMessage,
      publicComment,
    } = body

    const cleanAuthor = author.replace(/^u\//, "").trim()
    const fallbackEmail = `${cleanAuthor.toLowerCase().replace(/[^a-z0-9_]/g, "") || "prospect"}@reddit.social`

    // Check if lead already exists by website/permalink or email
    let lead = await prisma.lead.findFirst({
      where: {
        userId: scopeId,
        OR: [
          { website: permalink },
          { email: fallbackEmail },
        ],
      },
    })

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          userId: scopeId,
          email: fallbackEmail,
          firstName: cleanAuthor,
          lastName: "(B2C Consumer)",
          company: subreddit ? `Reddit (${subreddit})` : "Reddit Community",
          companyDesc: title,
          industry: intentCategory.replace(/_/g, " "),
          website: permalink,
          platformFocus: platform,
          sourceQuery: matchedKeyword || "social radar",
          icebreaker: dmMessage || null,
          painPoint: title,
          notes: `B2C Social Lead from ${platform}\n\nPOST TITLE: ${title}\n\nPOST DETAILS: ${postBody || "(No body text)"}\n\nPUBLIC REPLY DRAFT: ${publicComment || "(None)"}\n\nDIRECT MESSAGE: ${dmMessage || "(None)"}`,
          status: "NEW",
        },
      })
    } else {
      // Update existing lead with latest pitch and notes
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          icebreaker: dmMessage || lead.icebreaker,
          notes: `${lead.notes || ""}\n\n[Updated Draft]: ${dmMessage || ""}`,
        },
      })
    }

    // Create a Pending Action in Gale's task queue so it can be managed
    if (dmMessage) {
      await prisma.pendingAction.create({
        data: {
          userId: scopeId,
          leadId: lead.id,
          type: "LINKEDIN_TASK", // Action task type for manual social send/DM
          intent: "SOCIAL_DM",
          draftSubject: `Direct Message to ${author}`,
          draftBody: dmMessage,
          riskLevel: "LOW",
          confidence: "HIGH",
          metadata: {
            platform,
            permalink,
            publicComment,
            author,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
    })
  } catch (error: any) {
    console.error("Social lead import error:", error)
    return NextResponse.json({ error: "Failed to import social lead" }, { status: 500 })
  }
}
