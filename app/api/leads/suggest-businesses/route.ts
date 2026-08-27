import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"
import { getScopeId } from "@/lib/auth-helpers"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export type StructuredNiche = {
  title: string
  tag: string
  desc: string
  icon?: string
  color?: string
}

// GET — returns the user's profile pre-fill text and auto-generated tailored ICP niches
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ prefill: "", niches: [] })
  const scopeId = getScopeId(session)

  const user = await prisma.user.findUnique({
    where: { id: scopeId },
    select: {
      companyName: true,
      companyDesc: true,
      agencyName: true,
      title: true,
      flagshipOffer: true,
      playbookType: true,
    },
  })

  const agencyDisplayName = user?.agencyName || user?.companyName || "Your Agency"
  const offer = user?.flagshipOffer || user?.companyDesc || "Lead generation and client acquisition services"
  const prefill = [user?.agencyName || user?.companyName, user?.companyDesc, user?.flagshipOffer].filter(Boolean).join(" — ")

  return NextResponse.json({
    prefill,
    agencyName: agencyDisplayName,
    flagshipOffer: user?.flagshipOffer,
  })
}

// POST — takes user's description / agency profile and returns structured AI-suggested target business types
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { description, location } = await req.json()
  if (!description?.trim()) return NextResponse.json({ error: "description required" }, { status: 400 })

  const locationLine = location?.trim()
    ? `The user is targeting businesses in: ${location.trim()}`
    : "Location not specified — use globally common business types."

  const prompt = `You are a strategic B2B agency growth advisor. An agency or B2B sales firm described their business:

"${description.trim().slice(0, 500)}"

${locationLine}

Analyze their core offer, positioning, and target audience. Suggest 6 high-yield, specific local B2B niches they should prospect on Google Maps.

Return a JSON object with:
{
  "reply": "One punchy sentence explaining why these niches fit their agency offer (max 15 words).",
  "suggestions": ["Niche 1", "Niche 2", "Niche 3", "Niche 4", "Niche 5", "Niche 6"],
  "niches": [
    {
      "title": "Specific Search Query (1-4 words, e.g. Roofing Contractors)",
      "tag": "Industry Tag (e.g. Contractors, Healthcare, Legal, B2B Tech)",
      "desc": "Short 1-sentence explanation of why they need this agency's specific services (max 12 words)",
      "icon": "Flame | Award | Sparkles | Zap | Briefcase | TrendingUp | Shield | Target",
      "color": "text-amber-400 | text-sky-400 | text-fuchsia-400 | text-emerald-400 | text-indigo-400 | text-teal-400"
    }
  ]
}

Rules:
- Niches MUST be directly relevant to the agency's offer (e.g. if SEO agency, suggest businesses with high client lifetime value needing local search; if ad agency, suggest high-ticket service businesses).
- Titles must be actual searchable terms on Google Maps.
- JSON only, no markdown.`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 600,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const raw = res.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(raw.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim())
    
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : (parsed.niches?.map((n: StructuredNiche) => n.title) || [])
    const niches = Array.isArray(parsed.niches) && parsed.niches.length ? parsed.niches : defaultNiches(description)

    return NextResponse.json({
      reply: parsed.reply ?? "Curated high-yield niches matching your agency profile:",
      suggestions: suggestions.slice(0, 6),
      niches: niches.slice(0, 6),
    })
  } catch {
    return NextResponse.json({
      reply: "Curated high-yield niches matching your agency profile:",
      suggestions: [
        "Roofing Contractors", "Cosmetic Dentists", "Med Spas & Aesthetics",
        "HVAC & AC Repair", "Commercial Law Firms", "Real Estate Brokerages"
      ],
      niches: defaultNiches(description),
    })
  }
}

function defaultNiches(description?: string): StructuredNiche[] {
  const text = (description || "").toLowerCase()
  if (text.includes("dental") || text.includes("doctor") || text.includes("health") || text.includes("clinic")) {
    return [
      { title: "Cosmetic Dentists", tag: "Healthcare", desc: "Invisalign & implant practices with high patient lifetime value", icon: "Award", color: "text-sky-400" },
      { title: "Orthodontists", tag: "Healthcare", desc: "High-ticket braces and aligner patient acquisition", icon: "Sparkles", color: "text-indigo-400" },
      { title: "Med Spas & Aesthetics", tag: "Wellness", desc: "Botox, fillers & laser rejuvenation clinics", icon: "Sparkles", color: "text-fuchsia-400" },
      { title: "Plastic Surgeons", tag: "Healthcare", desc: "High-ticket elective procedures needing targeted leads", icon: "Award", color: "text-teal-400" },
      { title: "Dermatologists", tag: "Healthcare", desc: "Cosmetic and medical skin health practices", icon: "Shield", color: "text-emerald-400" },
      { title: "Chiropractors", tag: "Wellness", desc: "Recurring spinal care and injury therapy patients", icon: "Zap", color: "text-amber-400" },
    ]
  }

  if (text.includes("real estate") || text.includes("property") || text.includes("mortgage")) {
    return [
      { title: "Real Estate Brokerages", tag: "Real Estate", desc: "Residential & commercial brokers seeking seller listings", icon: "TrendingUp", color: "text-teal-400" },
      { title: "Property Management", tag: "Real Estate", desc: "Commercial & multi-family property managers", icon: "Building2", color: "text-indigo-400" },
      { title: "Commercial Real Estate", tag: "Real Estate", desc: "Office & industrial leasing agencies", icon: "Briefcase", color: "text-sky-400" },
      { title: "Mortgage Brokers", tag: "Financial", desc: "Loan originators seeking qualified home buyers", icon: "Award", color: "text-emerald-400" },
      { title: "Home Builders", tag: "Construction", desc: "Custom luxury home builders & developers", icon: "Flame", color: "text-amber-400" },
      { title: "Interior Designers", tag: "Design", desc: "High-end residential & commercial interior studios", icon: "Sparkles", color: "text-fuchsia-400" },
    ]
  }

  return [
    { title: "Roofing Contractors", tag: "Contractors", desc: "High-ticket residential and commercial roof restoration", icon: "Flame", color: "text-amber-400" },
    { title: "Cosmetic Dentists", tag: "Healthcare", desc: "Invisalign & implant high-ticket practices", icon: "Award", color: "text-sky-400" },
    { title: "Med Spas & Aesthetics", tag: "Wellness", desc: "Botox, laser & skin rejuvenation clinics", icon: "Sparkles", color: "text-fuchsia-400" },
    { title: "HVAC & AC Repair", tag: "Home Services", desc: "Emergency commercial & residential climate service", icon: "Zap", color: "text-emerald-400" },
    { title: "Commercial Law Firms", tag: "Legal", desc: "Corporate, litigation & real estate attorneys", icon: "Briefcase", color: "text-indigo-400" },
    { title: "Real Estate Brokerages", tag: "Real Estate", desc: "Luxury residential & commercial property agents", icon: "TrendingUp", color: "text-teal-400" },
  ]
}
