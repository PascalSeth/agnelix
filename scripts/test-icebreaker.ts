import "dotenv/config"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

const scenarios = [
  { label: "No SSL",      hook: "their site showing as 'Not Secure' in Chrome",  biz: "Greenfield Landscaping",       loc: "Manchester", industry: "landscaping", name: "Dave" },
  { label: "Low reviews", hook: "only 8 Google reviews so far",                   biz: "The Corner Dental Practice",    loc: "Bristol",    industry: "dentistry",   name: null  },
  { label: "Low rating",  hook: "sitting at 3.7 stars on Google",                 biz: "Apex Plumbing",                 loc: "Leeds",      industry: "plumbing",    name: "Sarah" },
  { label: "Slow site",   hook: "their site taking 5.2s to load",                 biz: "Riverside Solicitors",          loc: "Birmingham", industry: "law firm",    name: null  },
]

async function main() {
for (const s of scenarios) {
  const prompt = `You write cold email openers that sound like they came from a real person — direct, confident, slightly casual. British English.

Writing the opening line of a cold email to the owner of ${s.biz}, a ${s.industry} in ${s.loc}.${s.name ? ` Name: ${s.name}.` : ""}
Specific thing spotted: ${s.hook}

ONE sentence. Sounds human — like a smart person who actually looked at their business. Curious, not pushy. No: "I noticed", "I came across", "I hope", "I wanted to reach out". No pitch. Under 30 words. British English. No quotes around the sentence.`

  const res = await openai.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
    max_tokens: 80,
    // @ts-ignore
    thinking: { type: "disabled" },
  })
  console.log(`[${s.label}] ${res.choices[0]?.message?.content?.trim()}`)
}
}
main()
