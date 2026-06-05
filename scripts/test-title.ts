import "dotenv/config"
import OpenAI from "openai"
const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

async function main() {
  const tests = ["i run the company", "marketing guy", "freelancer doing websites", "co-founder", "pascal the boss"]
  for (const t of tests) {
    const r = await o.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: `Convert this rough job title into a clean professional title (2-5 words max) for B2B cold email. Standard UK titles like Founder, Managing Director, Head of X. Return ONLY the title. Input: "${t}"` }],
      temperature: 0.3, max_tokens: 15,
      // @ts-ignore
      thinking: { type: "disabled" }
    })
    console.log(`  "${t.padEnd(30)}" → "${r.choices[0]?.message?.content?.trim()}"`)
  }
}
main()
