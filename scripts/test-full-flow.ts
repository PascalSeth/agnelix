import "dotenv/config"
import OpenAI from "openai"

const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

const PERSONA = `You are a senior B2B sales professional writing cold outreach to UK business owners. Your emails consistently get replied to because they feel like they came from someone who genuinely researched the business.

You are writing the OPENING of a cold email. 2–3 sentences maximum. Under 60 words. British English.
No: "I hope this finds you well", "I wanted to reach out", "I came across", "I noticed that"
No pitch yet. No exclamation marks. Plain text only.`

async function main() {
  // Step 1: Simulate research output with recommendedApproach
  const profile = {
    whatTheyDo: "Emergency and scheduled plumbing for residential and landlord clients in Leeds. Known for same-day emergency response.",
    specializations: ["emergency callouts", "boiler installs", "bathroom refits"],
    positioning: "Speed and reliability — premium pricing but strong local reputation for showing up on time",
    reviewHighlights: {
      praise: ["fast response times", "polite engineers", "problem fixed on first visit"],
      complaints: ["slow invoicing", "hard to get upfront quotes"],
      notableQuote: "Called at 11pm, had someone here within the hour — genuinely saved us"
    },
    contentGaps: ["no emergency callout mention on homepage", "no pricing guide"],
    outreachAngles: [
      "Emergency callout is their clear USP but the site barely mentions it",
      "Invoicing friction is costing them repeat work from landlords",
      "No SSL + no analytics means they're invisible and measuring nothing"
    ],
    recommendedApproach: {
      id: "website",
      label: "Website Issues",
      reason: "No SSL plus the homepage doesn't lead with emergency callouts — two concrete, visible problems that directly undermine the thing they're best known for"
    }
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

  console.log(`Recommended approach: ${profile.recommendedApproach.label}`)
  console.log(`Reason: ${profile.recommendedApproach.reason}\n`)

  // Step 2: Generate opener using recommended approach
  const tests = [
    {
      label: "Website (recommended)",
      prompt: `${PERSONA}

Business: Apex Plumbing, a plumbing in Leeds. Recipient: Sarah.
Research on this business:
${profileCtx}

Technical finding: the site is showing as 'Not Secure' in Chrome — for a service where someone needs to trust you quickly, that warning is a credibility problem before they've read a word

Write the opening of a cold email referencing this specific issue. Use the research — the fact that they're known for emergency callouts, trusted for being fast, but the site undermines that at the first click. Direct, professional, shows you've actually looked at them.

Write the opening now:`
    },
    {
      label: "Social Proof",
      prompt: `${PERSONA}

Business: Apex Plumbing, a plumbing in Leeds. Recipient: Sarah.
Research on this business:
${profileCtx}

Write the opening of a cold email referencing a result from a similar business — make it relevant to their specific situation (emergency plumbing, invoicing friction, landlord clients). Real-sounding numbers. Matter-of-fact, mentioned in passing.

Write the opening now:`
    },
    {
      label: "Question",
      prompt: `${PERSONA}

Business: Apex Plumbing, a plumbing in Leeds.
Research on this business:
${profileCtx}

Write the opening of a cold email that leads to a sharp, relevant question. Use what you know — emergency callouts are their USP but the site doesn't show it, invoicing is a friction point, customers trust them but can't easily find them. Make it feel like it came from someone who's done their homework.

Write the opening now:`
    },
  ]

  for (const t of tests) {
    const r = await o.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: t.prompt }],
      temperature: 0.85, max_tokens: 150,
      // @ts-ignore
      thinking: { type: "disabled" }
    })
    const out = r.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") ?? ""
    console.log(`[${t.label}]\n${out}\n`)
  }
}

main()
