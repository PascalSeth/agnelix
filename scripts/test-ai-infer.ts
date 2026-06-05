import "dotenv/config"
import OpenAI from "openai"
const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

async function main() {
  const r = await o.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: `Identify the likely decision maker(s) at this business.

Company: Bromley Plumbing
Industry: plumbing
Location: Bromley, London
Website context: local plumbing services, emergency callouts, bathroom installations, boiler repairs.

Return a JSON array. Be inclusive — include any title you can reasonably infer.
[{ "name": null, "title": "Owner" }]

JSON only, no markdown.` }],
    temperature: 0.2, max_tokens: 150,
    // @ts-ignore
    thinking: { type: "disabled" }
  })
  console.log(r.choices[0]?.message?.content)
}
main()
