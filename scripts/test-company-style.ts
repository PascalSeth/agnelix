import "dotenv/config"
import OpenAI from "openai"

const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

const profile = {
  whatTheyDo: "Emergency and planned plumbing for residential and landlord clients in Leeds. Known for same-day callouts.",
  positioning: "Speed and reliability at premium pricing",
  specializations: ["emergency callouts", "boiler installs", "bathroom refits"],
  reviewHighlights: {
    praise: ["fast response", "polite engineers", "fixed on first visit"],
    complaints: ["slow invoicing", "hard to get upfront quotes"],
    notableQuote: "Called at 11pm, had someone here within the hour"
  },
  outreachAngles: [
    "Emergency callout is their USP but the homepage barely mentions it",
    "Invoicing friction is costing them repeat landlord work",
    "No SSL undermines trust at first click"
  ]
}

const profileCtx = [
  `What they do: ${profile.whatTheyDo}`,
  `Positioning: ${profile.positioning}`,
  `Specialisations: ${profile.specializations.join(", ")}`,
  `Customers praise: ${profile.reviewHighlights.praise.join("; ")}`,
  `Frustrations: ${profile.reviewHighlights.complaints.join("; ")}`,
  `Notable review: "${profile.reviewHighlights.notableQuote}"`,
  `Research angles: ${profile.outreachAngles.join(" | ")}`,
].map(l => `  - ${l}`).join("\n")

function buildPersona(senderCompany?: string, senderDesc?: string) {
  const senderLine = senderCompany
    ? `\nThe sender's company is "${senderCompany}"${senderDesc ? ` — ${senderDesc}` : ""}. If instructed to include it, weave it in naturally at the end — brief, unpushy, connects to why you're reaching out.`
    : ""
  return `You are a senior B2B sales professional writing cold outreach to UK business owners.

You are writing the OPENING of a cold email. Style: company-first. Reference the company by name — not the person.

Format: 2–3 sentences. Under 65 words. British English.

Rules:
- Start with "I've been looking at [Company]..." or "I had a look at [Company]..." — always reference the company name
- Show you've done real research — reference something specific
- Do NOT say: "I hope this", "I wanted to reach out", "I came across", "I noticed that"
- No pitch in the opening. No exclamation marks. Plain text only.${senderLine}`
}

async function gen(label: string, prompt: string) {
  const r = await o.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.85, max_tokens: 150,
    // @ts-ignore
    thinking: { type: "disabled" }
  })
  console.log(`\n[${label}]\n${r.choices[0]?.message?.content?.trim()}`)
}

async function main() {
  const ctx = `Company: Apex Plumbing, a plumbing in Leeds.\nResearch:\n${profileCtx}`

  // Without sender company
  await gen("Website — no sender company", `${buildPersona()}

${ctx}
Technical finding: the site is showing as 'Not Secure' in Chrome — for a service where someone needs to trust you quickly, that's a credibility problem before they've read a word

Write the opening referencing the company by name. Use the research — emergency callouts, trust positioning, the SSL issue undermining it.

Write the opening now:`)

  // With sender company
  await gen("Website — with sender company (LeadGenZ)", `${buildPersona("Agnelix", "AI-powered lead generation for local service businesses")}

${ctx}
Technical finding: the site is showing as 'Not Secure' in Chrome — for a service where someone needs to trust you quickly, that's a credibility problem before they've read a word

Write the opening referencing the company by name. Use the research. End with a natural mention of Agnelix.

Write the opening now:`)

  // Social proof with sender
  await gen("Social Proof — with sender company", `${buildPersona("Agnelix", "AI-powered lead generation for local service businesses")}

${ctx}
Write the opening referencing a result from a similar trades business. Make it relevant to their situation (emergency plumbing, invoicing, landlord clients). End with a natural mention of Agnelix.

Write the opening now:`)
}

main()
