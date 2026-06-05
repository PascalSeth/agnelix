import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

// GET — returns the user's profile pre-fill text for the prompt input
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ prefill: "" })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyName: true, companyDesc: true, agencyName: true, title: true },
  })

  const parts = [
    user?.agencyName || user?.companyName,
    user?.companyDesc,
  ].filter(Boolean)

  return NextResponse.json({ prefill: parts.join(" — ") })
}

// POST — takes user's description and returns AI-suggested target business types
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { description, location } = await req.json()
  if (!description?.trim()) return NextResponse.json({ error: "description required" }, { status: 400 })

  const locationLine = location?.trim()
    ? `The user is targeting businesses in: ${location.trim()}`
    : "Location not specified — use globally common business types."

  const prompt = `You are a B2B lead generation advisor. A sales person described their business:

"${description.trim().slice(0, 400)}"

${locationLine}

Your job: suggest the 8 best types of local businesses they should cold-prospect on Google Maps in that location.

IMPORTANT — use the locally correct terminology for that country/region:
- In the UK: "solicitors" not "law firms", "estate agents" not "real estate agents", "GP surgeries" for healthcare, "accountancy firms" etc.
- In Australia: "tradies", "conveyancers", "solicitors" etc.
- In the US: standard Google Maps categories work fine.
- In other countries: use what locals actually search for on Google Maps.

Return a JSON object with exactly two fields:
{
  "reply": "One punchy sentence explaining who they should be targeting and why (max 15 words, conversational tone, no filler phrases)",
  "suggestions": ["Business type 1", "Business type 2", "Business type 3", "Business type 4", "Business type 5", "Business type 6", "Business type 7", "Business type 8"]
}

Rules for suggestions:
- Each is 1-4 words — terms that actually return results on Google Maps in that location
- Order by highest to lowest fit for the described business
- Be specific (e.g. "Dental practices" not just "Healthcare")
- JSON only, no markdown`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 250,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const raw = res.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(raw.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim())
    if (!Array.isArray(parsed.suggestions) || !parsed.suggestions.length) throw new Error("bad response")
    return NextResponse.json({
      reply: parsed.reply ?? "Here are your best targets:",
      suggestions: parsed.suggestions.slice(0, 8),
    })
  } catch {
    return NextResponse.json({
      reply: "Here are some businesses likely to need your services:",
      suggestions: [
        "Dental practices", "Law firms", "Gyms & fitness",
        "Real estate agents", "Restaurants", "Plumbers",
        "Accountants", "Web design agencies",
      ],
    })
  }
}
