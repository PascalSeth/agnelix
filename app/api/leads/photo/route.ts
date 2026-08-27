import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get("name")
  const maxW = searchParams.get("maxWidth") || "600"
  const maxH = searchParams.get("maxHeight") || "450"

  if (!name) {
    return NextResponse.json({ error: "Photo name required" }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  try {
    const googleUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxW}&maxHeightPx=${maxH}&skipHttpRedirect=true&key=${apiKey}`
    const res = await fetch(googleUrl, { next: { revalidate: 86400 } })
    if (res.ok) {
      const data = await res.json()
      if (data.photoUri) {
        return NextResponse.redirect(data.photoUri)
      }
    }
  } catch {
    // fall through to direct url redirect
  }

  const directUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxW}&maxHeightPx=${maxH}&key=${apiKey}`
  return NextResponse.redirect(directUrl)
}
