import "dotenv/config"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

const SHARED_SYSTEM = `You are a specialist B2B outreach writer. Your openers consistently get 15-25% reply rates because they feel like they came from a real, intelligent person who genuinely looked at the business — not a tool, not a template, not a marketer.

Rules that CANNOT be broken:
- ONE sentence only. Hard stop.
- British English spelling and phrasing throughout
- Under 35 words
- No opener words: "I noticed", "I came across", "I hope this", "I wanted to reach out", "I saw that", "I was looking at"
- No exclamation marks
- No pitch, no mention of your service, no call to action — this is purely the hook
- Plain text only — no markdown, no quotes around the sentence
- Sound like a smart consultant who happened to spot something, not a sales rep running a sequence`

async function gen(label: string, extra: string) {
  const res = await openai.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: `${SHARED_SYSTEM}\n\n${extra}\n\nWrite the sentence now:` }],
    temperature: 0.88, max_tokens: 100,
    // @ts-ignore
    thinking: { type: "disabled" },
  })
  const out = res.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") ?? ""
  console.log(`\n[${label}]\n  ${out}`)
}

async function main() {
  const biz = `Business: Apex Plumbing — a plumbing in Leeds. Their first name is Sarah.`

  await gen("1. Website — No SSL",
    `${biz}\nTechnical observation: the site is flagged as 'Not Secure' in Chrome — visitors see a security warning before they read a single word, which typically kills 15–25% of traffic immediately\n\nYour task: Write a single opening sentence that references this finding in a way that feels like you genuinely noticed it while browsing their site — not like you ran an automated scan. The tone should be matter-of-fact, slightly conversational, like a consultant who spotted something while looking them up.`)

  await gen("2. Local Rank — Low reviews",
    `${biz}\nObservation about their local Google presence: they only have 8 Google reviews — a thin profile that makes it harder for new customers to trust them\n\nYour task: Write a single opening sentence that references this in a way that frames it as a business observation — not a criticism. Sound like someone who understands local SEO and what it means for their pipeline.`)

  await gen("3. Competitor Intel",
    `${biz}\n\nYour task: Write a single opening sentence that implies you've observed a pattern among their competitors or similar businesses in their area — without naming anyone. The hook is curiosity: they want to know what that thing is. Sound like someone with genuine market visibility.`)

  await gen("4. Industry Shift",
    `${biz}\n\nYour task: Write a single opening sentence that references a real, plausible shift happening in the plumbing industry — something that's changing how businesses in this space get customers. Ground it in something specific to their sector and Leeds.`)

  await gen("5. Question",
    `${biz}\n\nYour task: Write a single opening question that's genuinely interesting and relevant to their business situation. Should make them pause and think. Like a sharp consultant would ask after two minutes of research.`)

  await gen("6. Social Proof",
    `${biz}\n\nYour task: Write a single opening sentence that references a result from a similar business — specific enough to be credible, general enough to be plausible. Matter-of-fact tone, not a sales pitch.`)
}

main()
