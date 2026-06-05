import "dotenv/config"
import OpenAI from "openai"

const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

async function main() {
  // Simulate research profile from the API
  const fakeProfile = {
    whatTheyDo: "Emergency and planned plumbing for residential and commercial properties in Leeds. Known for same-day callouts.",
    specializations: ["emergency callouts", "boiler installs", "drain unblocking"],
    targetCustomers: "Homeowners and landlords in West Yorkshire needing urgent or planned plumbing work",
    positioning: "Speed and reliability — premium pricing but strong reputation for turning up on time",
    reviewHighlights: {
      praise: ["fast response time", "polite engineers", "sorted the problem first visit"],
      complaints: ["slow invoicing", "hard to get a quote upfront"],
      notableQuote: "Called at 10pm, had someone here by midnight — can't ask for more than that"
    },
    contentGaps: ["no pricing guide on site", "no mention of insurance or guarantees"],
    outreachAngles: [
      "Their speed positioning is a genuine USP but the site doesn't sell it — the homepage doesn't mention emergency callouts",
      "Slow invoicing frustration in reviews suggests an admin bottleneck that costs repeat work",
      "No upfront pricing creates friction for new customers who could otherwise convert on first contact"
    ]
  }

  const profileContext = [
    `What they do: ${fakeProfile.whatTheyDo}`,
    `Specialisations: ${fakeProfile.specializations.join(", ")}`,
    `Customers praise: ${fakeProfile.reviewHighlights.praise.join("; ")}`,
    `Customer frustrations: ${fakeProfile.reviewHighlights.complaints.join("; ")}`,
    `Notable review: "${fakeProfile.reviewHighlights.notableQuote}"`,
    `Research-based angles: ${fakeProfile.outreachAngles.join(" | ")}`,
  ].map(l => `- ${l}`).join("\n")

  const SHARED_SYSTEM = `You are a specialist B2B outreach writer. ONE sentence, British English, under 35 words, no "I noticed"/"I came across"/"I hope", no pitch, plain text.`

  const approaches = [
    {
      label: "Website (no SSL)",
      prompt: `${SHARED_SYSTEM}\n\nBusiness: Apex Plumbing, Leeds. Their first name is Sarah.\nBusiness intelligence:\n${profileContext}\nTechnical finding: site shows as 'Not Secure' in Chrome — kills 15-25% of traffic before anyone reads a word\n\nWrite an opener referencing this finding, weaving in something specific about what this business does or their customers. Write the sentence now:`
    },
    {
      label: "Local Rank (3.8★, 47 reviews)",
      prompt: `${SHARED_SYSTEM}\n\nBusiness: Apex Plumbing, Leeds. Their first name is Sarah.\nBusiness intelligence:\n${profileContext}\nGoogle presence: 3.8 stars with 47 reviews\n\nWrite an opener referencing their Google presence, using the business intel to make it specific. Write the sentence now:`
    },
    {
      label: "Social Proof",
      prompt: `${SHARED_SYSTEM}\n\nBusiness: Apex Plumbing, Leeds.\nBusiness intelligence:\n${profileContext}\n\nWrite an opener referencing a result from a similar business, making it relevant to their situation (emergency plumbing, invoicing friction, etc). Write the sentence now:`
    },
  ]

  for (const a of approaches) {
    const r = await o.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: a.prompt }],
      temperature: 0.88, max_tokens: 100,
      // @ts-ignore
      thinking: { type: "disabled" }
    })
    const out = r.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") ?? ""
    console.log(`\n[${a.label}]\n  ${out}`)
  }
}

main()
