import "dotenv/config"
import OpenAI from "openai"

const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

async function ask(companyName: string, city: string, industry: string, websiteUrl?: string) {
  console.log(`\n=== ${companyName} (${city}) ===`)
  const r = await o.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{
      role: "user",
      content: `Search your training data thoroughly for this company. Find any founders, owners, CEOs, directors, co-founders, managing directors, or other senior people associated with it.

Company: ${companyName}
Industry: ${industry}
Location: ${city}
${websiteUrl ? `Website: ${websiteUrl}` : ""}

Return every person you find. Include people you're confident about (high score) and people you think you recognise but aren't 100% sure (medium score). If no real names found, include an inferred role (Owner, Founder etc) with null name and low score.

For LinkedIn URLs: include any you believe you know. Leave null if unsure — do not make them up.

JSON array: [{ name, firstName, lastName, title, linkedinUrl, score }] (score 0-100)
Be inclusive. JSON only.`
    }],
    temperature: 0.1,
    max_tokens: 8000,
    // @ts-ignore
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  })

  const raw = r.choices[0]?.message?.content ?? "[]"
  try {
    const parsed = JSON.parse(raw.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim())
    parsed.forEach((p: { name: string; title: string; linkedinUrl: string; score: number }) => {
      let score = p.score
      if (score > 0 && score <= 1) score = Math.round(score * 100)
      console.log(`  ${score}% | ${p.name ?? "Name unknown"} | ${p.title} | ${p.linkedinUrl ?? "no URL"}`)
    })
  } catch { console.log("Raw:", raw.slice(0, 400)) }
}

async function main() {
  await ask("Social Media 55", "Montreal", "digital marketing agency", "https://socialmedia55.com")
  await ask("The Influence Agency", "Toronto", "influencer marketing agency")
  await ask("Bromley Plumbing", "Bromley", "plumbing")
}

main()
