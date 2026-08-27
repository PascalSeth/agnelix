import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { isSuperadmin } from "@/lib/auth-helpers"
import { BUILT_IN_EXEMPLARS, type ConversationExemplar } from "@/lib/ai-exemplars"

// In-memory runtime storage for dynamic exemplars added via admin UI in addition to built-ins
const customExemplars: ConversationExemplar[] = []

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const allExemplars = [...customExemplars, ...BUILT_IN_EXEMPLARS]
  return NextResponse.json({ exemplars: allExemplars })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !isSuperadmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { title, category, surface, scope, prospectMessage, winningResponse, rationale } = body

  if (!title || !prospectMessage || !winningResponse) {
    return NextResponse.json({ error: "Title, prospect message, and winning response are required" }, { status: 400 })
  }

  const newExemplar: ConversationExemplar = {
    id: `custom-ex-${Date.now()}`,
    title: String(title).trim(),
    category: category || "OBJECTION_IN_HOUSE",
    surface: surface || "REPLY",
    scope: scope || "global",
    prospectMessage: String(prospectMessage).trim(),
    winningResponse: String(winningResponse).trim(),
    rationale: String(rationale || "Admin custom benchmark").trim(),
    metrics: "100% custom benchmark score",
    tags: ["custom", "admin-created"],
  }

  customExemplars.unshift(newExemplar)
  BUILT_IN_EXEMPLARS.unshift(newExemplar)

  return NextResponse.json({ exemplar: newExemplar })
}
