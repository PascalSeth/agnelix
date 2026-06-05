import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { findContacts } from "@/lib/contact-finder"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { websiteUrl, companyName } = await req.json()
  if (!websiteUrl) return NextResponse.json({ error: "websiteUrl required" }, { status: 400 })

  try {
    const contacts = await findContacts(websiteUrl, companyName ?? "")
    return NextResponse.json({ contacts })
  } catch (err: unknown) {
    console.error("Contact search error:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Contact search failed", contacts: [] }, { status: 500 })
  }
}
