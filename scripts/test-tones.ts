import "dotenv/config"
import OpenAI from "openai"

const o = new OpenAI({ apiKey: process.env.NEXT_DEEPSEEKER_API_KEY, baseURL: "https://api.deepseek.com" })

const TONE_GUIDE: Record<string, string> = {
  "Professional":  "professional and measured — authoritative without being stiff",
  "Friendly":      "warm and conversational — approachable and personable",
  "Direct":        "concise and straight to the point — no pleasantries, no filler",
  "Consultative":  "curious and advisory — frames observations as questions or insights",
}

async function gen(tone: string) {
  const persona = `You are a senior B2B sales professional. Tone: ${TONE_GUIDE[tone]}.
Write the OPENING of a cold email. Company-first style. Under 65 words. British English.
Start with "I've been looking at..." or "I had a look at...". No pitch. Plain text.`

  const r = await o.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: `${persona}

Company: Apex Plumbing, plumbing in Leeds.
Technical finding: site is showing as 'Not Secure' in Chrome — for a service where someone needs to trust you quickly, that's a credibility problem before they've read a word.

Write the opening now:` }],
    temperature: 0.85, max_tokens: 120,
    // @ts-ignore
    thinking: { type: "disabled" }
  })
  return r.choices[0]?.message?.content?.trim()
}

async function main() {
  for (const tone of ["Professional", "Friendly", "Direct", "Consultative"]) {
    console.log(`\n[${tone}]`)
    console.log(await gen(tone))
  }
}
main()
