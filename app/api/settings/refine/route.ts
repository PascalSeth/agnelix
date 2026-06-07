import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { agencyName, title, rawDescription, rawTitle, mode } = await req.json()

  // ── Mode: refine job title ────────────────────────────────────────────────
  if (mode === "title") {
    if (!rawTitle?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

    const prompt = `Convert this rough job title into a clean, professional title suitable for B2B cold email outreach.

Company: ${agencyName || "their company"}
Rough title: "${rawTitle}"
${rawDescription ? `Company context: ${rawDescription}` : ""}

Rules:
- Return a short, professional job title (2-5 words max)
- Use standard UK business titles: Founder, Co-Founder, CEO, Managing Director, Director, Head of [X], etc.
- If they run the company, prefer "Founder" or "Managing Director"
- Do NOT add their name or company name to the title
- Return ONLY the title text, nothing else`

    try {
      const res = await openai.chat.completions.create({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 20,
        // @ts-expect-error — disable DeepSeek thinking for fast tasks
        thinking: { type: "disabled" },
      })
      const refined = res.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") ?? ""
      return NextResponse.json({ refined })
    } catch {
      return NextResponse.json({ error: "Refinement failed" }, { status: 500 })
    }
  }

  // ── Mode: refine company description (default) ────────────────────────────
  if (!rawDescription?.trim()) {
    return NextResponse.json({ error: "Description required" }, { status: 400 })
  }

  const prompt = `You are helping a business owner write a clear, compelling description of what their company does.
This description is used by an AI to write personalised cold outreach emails on their behalf.
The better the description, the more relevant and convincing the emails will be.

Business name: ${agencyName || "their company"}
Owner's title: ${title || "Founder"}
Their rough description: "${rawDescription}"

Rewrite this into a concise, professional 2–3 sentence description that:
1. States clearly what they do and who they help (specific industries or business types if mentioned)
2. Describes the kind of results or value they deliver (be specific if the user gave any hints)
3. Sounds natural in context: "I work at ${agencyName || "our company"} — we [your description]"
4. Written in first-person plural ("we help...", "we work with...", "we specialise in...")
5. Professional but not corporate-jargon-heavy — sounds like a real person
6. British English spelling throughout

Return ONLY the refined description text. No quotes, no labels, no explanation.`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const refined = res.choices[0]?.message?.content?.trim() ?? ""
    return NextResponse.json({ refined })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown"
    console.error("Refine error:", msg)
    return NextResponse.json({ error: "Refinement failed" }, { status: 500 })
  }
}
