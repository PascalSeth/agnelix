import "dotenv/config"
import OpenAI from "openai"

const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

async function refine(agencyName: string, title: string, raw: string) {
  const r = await o.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{
      role: "user",
      content: `You are helping a business owner write a clear, compelling description of what their company does. This is used by an AI to write personalised cold outreach emails.

Business: ${agencyName}, Owner: ${title}
Their rough description: "${raw}"

Rewrite into 2-3 sentences that:
1. States what they do and who they help (specific if mentioned)
2. Mentions results or value delivered
3. Sounds natural in: "I work at ${agencyName} — we [description]"
4. First-person plural ("we help...", "we work with...")
5. Professional but not jargon-heavy, British English

Return ONLY the refined text.`
    }],
    temperature: 0.7, max_tokens: 200,
    // @ts-ignore
    thinking: { type: "disabled" }
  })
  return r.choices[0]?.message?.content?.trim()
}

async function main() {
  const tests = [
    { name: "Galien", title: "Founder", raw: "we do marketing for local businesses, mainly dentists and plumbers, help them get more leads online, we use ai" },
    { name: "Webb Digital", title: "Director", raw: "web design and seo for small businesses, mostly in the uk, we usually triple their leads in 3 months" },
    { name: "Clarity Finance", title: "CEO", raw: "bookkeeping and accounting for startups and small businesses, fixed monthly fee, xero experts" },
  ]

  for (const t of tests) {
    console.log(`\n[${t.name}]`)
    console.log(`Input:  "${t.raw}"`)
    console.log(`Output: "${await refine(t.name, t.title, t.raw)}"`)
  }
}

main()
