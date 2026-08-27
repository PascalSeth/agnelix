import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { isSuperadmin } from "@/lib/auth-helpers"
import { MASTER_SALES_BOOKS } from "@/lib/ai-master-books"
import { invalidateTrainingCache } from "@/lib/ai-training"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !isSuperadmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { bookId, action = "inject" } = await req.json().catch(() => ({}))
    const book = MASTER_SALES_BOOKS.find(b => b.id === bookId)

    if (!book) {
      return NextResponse.json({ error: "Book not found in master catalog" }, { status: 404 })
    }

    if (action === "remove") {
      // Remove all rules originating from this book
      await prisma.aiTrainingRule.deleteMany({
        where: {
          source: "master_book",
          sourceRef: book.title,
        },
      })
      invalidateTrainingCache()
      return NextResponse.json({ success: true, message: `Removed directives for "${book.title}"` })
    }

    // Check if already injected
    const existing = await prisma.aiTrainingRule.findMany({
      where: {
        source: "master_book",
        sourceRef: book.title,
      },
    })

    if (existing.length > 0) {
      // Delete existing and re-insert fresh
      await prisma.aiTrainingRule.deleteMany({
        where: {
          source: "master_book",
          sourceRef: book.title,
        },
      })
    }

    // Insert directives into database
    const createdRules = await prisma.$transaction(
      book.directives.map(d =>
        prisma.aiTrainingRule.create({
          data: {
            scope: d.ruleScope || "global",
            surface: (book.surface || "REPLY") as never,
            title: `[${book.badge}] ${d.title}`,
            instruction: d.instruction,
            goodExample: d.goodExample,
            badExample: d.badExample,
            priority: 10, // Higher priority for master book methodologies
            source: "master_book",
            sourceRef: book.title,
            createdBy: session.user.email ?? session.user.id,
          },
        })
      )
    )

    invalidateTrainingCache()

    return NextResponse.json({
      success: true,
      bookTitle: book.title,
      injectedCount: createdRules.length,
      rules: createdRules,
    })
  } catch (error) {
    console.error("[Book Inject API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to inject book directives" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || !isSuperadmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get active injected books
    const injectedRules = await prisma.aiTrainingRule.findMany({
      where: { source: "master_book" },
      select: { sourceRef: true, id: true, enabled: true },
    })

    const activeBooks = Array.from(new Set(injectedRules.map(r => r.sourceRef).filter(Boolean)))

    return NextResponse.json({
      catalog: MASTER_SALES_BOOKS,
      activeBooks,
    })
  } catch (error) {
    console.error("[Book Inject API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch book catalog" }, { status: 500 })
  }
}
