import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import { invalidateTrainingCache } from "@/lib/ai-training"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || !isSuperadmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const documents = await prisma.trainingDocument.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("[Training Documents API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !isSuperadmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    const doc = await prisma.trainingDocument.findUnique({
      where: { id },
    })

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const cleanTitle = doc.title.trim()
    const titleWithoutExt = cleanTitle.replace(/\.(pdf|txt|md|epub|docx)$/i, "").trim()

    // Delete all associated rules / directives
    const deleteRulesResult = await prisma.aiTrainingRule.deleteMany({
      where: {
        OR: [
          // exact doc title, stripped title, or ID
          { sourceRef: cleanTitle },
          { sourceRef: titleWithoutExt },
          { sourceRef: doc.id },
          // sourceRef starting with doc title (e.g. "DocTitle — Chapter 1" or "DocTitle.pdf — Page 4")
          { sourceRef: { startsWith: cleanTitle } },
          { sourceRef: { startsWith: titleWithoutExt } },
          // sourceRef containing doc title (case-insensitive for safety)
          ...(cleanTitle.length >= 3 ? [{ sourceRef: { contains: cleanTitle, mode: "insensitive" as const } }] : []),
          ...(titleWithoutExt.length >= 3 && titleWithoutExt !== cleanTitle ? [{ sourceRef: { contains: titleWithoutExt, mode: "insensitive" as const } }] : []),
        ],
      },
    })

    await prisma.trainingDocument.delete({
      where: { id },
    })

    invalidateTrainingCache()

    return NextResponse.json({
      success: true,
      message: `Deleted "${doc.title}" and its ${deleteRulesResult.count} distilled directives`,
      deletedDirectivesCount: deleteRulesResult.count,
    })
  } catch (error) {
    console.error("[Training Documents API DELETE] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document" },
      { status: 500 }
    )
  }
}
