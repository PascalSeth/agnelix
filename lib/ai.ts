import OpenAI from "openai"

export type ReplyIntent =
  | "INTERESTED"
  | "QUESTION"
  | "OBJECTION"
  | "NOT_NOW"
  | "UNSUBSCRIBE"
  | "OOO"

export interface ReplyClassification {
  intent: ReplyIntent
  confidence: "HIGH" | "MEDIUM" | "LOW"
  summary: string
}

export async function classifyReply(params: {
  replyBody: string
  originalEmailBody: string
  leadName: string
  company: string
}): Promise<ReplyClassification> {
  const prompt = `Classify the intent of this prospect reply to a cold email.

ORIGINAL EMAIL SENT:
${params.originalEmailBody.slice(0, 500)}

PROSPECT REPLY from ${params.leadName} at ${params.company}:
${params.replyBody.slice(0, 800)}

Classify the reply into exactly one of these intents:
- INTERESTED: Positive, wants to learn more, asking about pricing/next steps, open to a call
- QUESTION: Has a specific question about the service, not clearly positive or negative yet
- OBJECTION: Has a clear objection, soft refusal, or general resistance (e.g. "not interested", "we do this in-house", "we already have a vendor", "too expensive", "no budget"). These are standard sales hurdles that a skilled salesperson can negotiate or handle.
- NOT_NOW: Timing objection or request to delay (e.g. "not interested at this time", "busy right now", "try me next quarter", "contact me in 3 months").
- UNSUBSCRIBE: Explicit request to stop contacting, opt-out requests (e.g. "unsubscribe", "remove me", "do not email me again", "stop", "take me off your list"). Do NOT classify general objections or timing requests here unless they specifically request removal.
- OOO: Out of office auto-reply

Return JSON only:
{"intent":"<INTENT>","confidence":"HIGH|MEDIUM|LOW","summary":"<one sentence describing what they said>"}`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 120,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const text = res.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    return {
      intent: parsed.intent as ReplyIntent,
      confidence: parsed.confidence as "HIGH" | "MEDIUM" | "LOW",
      summary: parsed.summary as string,
    }
  } catch {
    return { intent: "QUESTION", confidence: "LOW", summary: "Could not classify reply." }
  }
}
import {
  buildStep1Prompt,
  buildStep2Prompt,
  buildStep3Prompt,
  FALLBACK_EMAIL,
  type EmailPromptParams,
} from "./prompts"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export interface GeneratedEmail {
  subject: string
  body: string
  prompt: string
}

function parseEmailResponse(text: string): { subject: string; body: string } {
  const lines = text.split("\n")
  const subjectLine = lines.find((l) => l.trim().startsWith("Subject:"))
  const subject = subjectLine?.replace(/^Subject:\s*/i, "").trim() || "Quick question"

  const bodyLines: string[] = []
  let pastSubject = false
  for (const line of lines) {
    if (line.trim().startsWith("Subject:")) { pastSubject = true; continue }
    if (pastSubject) bodyLines.push(line)
  }
  const body = bodyLines.join("\n").trim()
  return { subject, body }
}

function buildFallback(p: EmailPromptParams): { subject: string; body: string } {
  const subject = FALLBACK_EMAIL.subject
    .replace("{{company}}", p.prospectCompany)
  const body = FALLBACK_EMAIL.body
    .replace(/{{firstName}}/g, p.prospectFirstName)
    .replace(/{{company}}/g, p.prospectCompany)
    .replace(/{{industry}}/g, p.industry)
    .replace(/{{senderName}}/g, p.senderName)
  return { subject, body }
}

export interface BattleCard {
  summary: string
  talkingPoints: string[]
  likelyObjections: { objection: string; counter: string }[]
  suggestedNextStep: string
  urgencyAngle: string
}

export interface ReplyDraft {
  subject: string
  body: string
}

export async function generateBattleCard(params: {
  leadName: string
  company: string
  industry: string
  website: string | null
  painPoint: string | null
  recentNews: string | null
  originalEmailSubject: string
  originalEmailBody: string
  replyBody: string
  senderName: string
  senderCompany: string
  senderService: string
}): Promise<BattleCard> {
  const prompt = `You are a sales intelligence assistant. A prospect has replied to an outreach email. Generate a battle card for the sales rep to use in the next interaction.

PROSPECT: ${params.leadName} at ${params.company} (${params.industry})
WEBSITE: ${params.website || "unknown"}
PAIN POINT IDENTIFIED: ${params.painPoint || "none identified"}
RECENT NEWS: ${params.recentNews || "none"}

ORIGINAL EMAIL SENT (Subject: ${params.originalEmailSubject}):
${params.originalEmailBody}

PROSPECT'S REPLY:
${params.replyBody}

SENDER: ${params.senderName} from ${params.senderCompany} offering ${params.senderService}

Return a JSON object with exactly this structure:
{
  "summary": "2-sentence summary of where this deal stands and the prospect's intent",
  "talkingPoints": ["point 1", "point 2", "point 3"],
  "likelyObjections": [
    {"objection": "objection text", "counter": "counter response"},
    {"objection": "objection text", "counter": "counter response"}
  ],
  "suggestedNextStep": "specific next action to take",
  "urgencyAngle": "why they should act now"
}

Return only valid JSON, no markdown.`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,
      // @ts-expect-error — DeepSeek thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })
    const text = response.choices[0]?.message?.content || "{}"
    return JSON.parse(text) as BattleCard
  } catch {
    return {
      summary: `${params.leadName} from ${params.company} has replied. Review their message and respond promptly.`,
      talkingPoints: ["Reference their specific reply", "Address their main concern", "Propose a clear next step"],
      likelyObjections: [
        { objection: "We already have a solution", counter: "Ask what they wish it did better" },
        { objection: "Not the right time", counter: "Ask when would be a better time and schedule it now" },
      ],
      suggestedNextStep: "Reply within the hour to keep momentum",
      urgencyAngle: "Replies go cold fast — respond today",
    }
  }
}

export async function generateReplyDraft(params: {
  leadName: string
  company: string
  replyBody: string
  originalEmailBody: string
  senderName: string
  senderTitle?: string | null
  senderCompany: string
  senderService: string
  tone: string
  responseStyle?: string
  conversationHistory?: string
  calendarLink?: string | null
}): Promise<ReplyDraft> {
  const stylePrompt = params.responseStyle === "SOFT" 
    ? "Be conversational, warm, and low-pressure. Answer their questions but don't push hard for a meeting immediately."
    : params.responseStyle === "DIRECT"
    ? "Be confident, concise, and straight to the point. Answer their questions clearly, give numbers/prices if relevant, and propose specific times to talk."
    : params.responseStyle === "VALUE-FIRST"
    ? "Lead with immense value. Offer to send a free resource, audit, or case study before asking for a meeting or discussing pricing."
    : `TONE: ${params.tone}`;

  const historySection = params.conversationHistory
    ? `\nCONVERSATION TRANSCRIPT (CHRONOLOGICAL):\n${params.conversationHistory}\n`
    : `\nORIGINAL EMAIL YOU SENT:\n${params.originalEmailBody}\n\nTHEIR REPLY:\n${params.replyBody}\n`;

  const calendarSection = params.calendarLink
    ? `You can offer your calendar link for booking: ${params.calendarLink}`
    : `Suggest a 15-minute call and ask which times work.`;

  const titleString = params.senderTitle ? `, ${params.senderTitle}` : "";

  const prompt = `You are a senior sales representative writing a reply to a prospect who responded to a cold email.

YOUR PROFILE:
- Name: ${params.senderName}${titleString}
- Company: ${params.senderCompany}
- Business Bio / Description of Services: ${params.senderService}
- Preferred Tone: ${params.tone}

PROSPECT DETAILS:
- Name: ${params.leadName}
- Company: ${params.company}

STYLE INSTRUCTION: ${stylePrompt}
${calendarSection}

${historySection}
Write a concise, highly natural follow-up response. Keep it under 120 words.
Be human, authentic, and empathetic. Do NOT sound like an AI, do NOT use boilerplate sales jargon, and do NOT use opening cliches like "Hope you're having a good week" or "I wanted to follow up". Start directly.

Directly address the prospect's latest message, concerns, objections, or questions based on the full conversation history.

GUIDELINES FOR COMMON SCENARIOS:
1. REFERRALS / DEPARTMENT FORWARDING: If the prospect refers you to someone else (e.g., "talk to X at x@email.com"), thank them politely, state you will reach out to X and mention their introduction, and ask if they would mind CC'ing/introducing you to make it a warm transition.
2. PRICING / BUDGET INQUIRIES: If they ask for pricing, do NOT invent arbitrary details. Reference general rates or pricing ranges from your Bio/Description if any are provided. Otherwise, explain that pricing depends on their specific needs and offer a quick 5-minute call or a custom proposal to give them an accurate quote.
3. OBJECTIONS / NOT RIGHT NOW (Sales Negotiation & Re-engagement): Do not just roll over or say goodbye. Acknowledge and validate their current situation (e.g., "Totally understand—most people we reach out to say they aren't interested initially, or already have an agency/in-house team handling this."). Pivot to a low-friction value hook: offer to send a quick, free resource (e.g., a 2-page checklist, a case study relevant to their space, or a quick video audit of their site) to demonstrate expertise without asking for a meeting yet. End with a light, non-pushy question to probe further (e.g., "Would you be open to seeing a quick 3-line case study of how we did this for another local agency, or is the timing just completely off right now?").
   - ALIGNMENT: When offering a case study or resource, always align it with your business description/services (e.g., if you help marketing agencies, offer a case study of helping a marketing agency, not a software firm). Do not invent credentials or case studies that do not match your service profile.
4. SERVICE / TECHNICAL QUESTIONS: Answer their questions accurately using details from your Bio/Description. If the answer is not in the Bio, state that you can verify this on a brief call or offer to find out and get back to them.
5. POSITIVE INTEREST: Propose next steps immediately (offer calendar link or check their availability for a call).
6. UNSUBSCRIBES / OPT-OUTS (Strict Opt-Outs): ONLY use this if they explicitly say "remove me", "unsubscribe", "stop", "don't email", "spam", etc. Write a very brief, polite opt-out confirmation confirming you have updated your list to ensure they won't receive future emails, and thank them (e.g., "Understood. I've updated our list so we won't email you again. Thanks for letting me know."). Do NOT use this for standard objections like "not interested" or "not interested at this time" — handle those as objections/timing hurdles instead.

Format:
Subject: Re: [subject]
[body]`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 250,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const text = response.choices[0]?.message?.content || ""
    const lines = text.split("\n")
    const subjectLine = lines.find(l => l.trim().startsWith("Subject:"))
    const subject = subjectLine?.replace(/^Subject:\s*/i, "").trim() || `Re: Following up`
    const bodyLines: string[] = []
    let past = false
    for (const line of lines) {
      if (line.trim().startsWith("Subject:")) { past = true; continue }
      if (past) bodyLines.push(line)
    }
    return { subject, body: bodyLines.join("\n").trim() }
  } catch {
    return {
      subject: `Re: Following up`,
      body: `Hi ${params.leadName.split(" ")[0]},\n\nThanks for getting back to me.\n\nWould you be open to a quick 15-minute call this week? I'd love to show you specifically how we can help ${params.company}.\n\nBest,\n${params.senderName}`,
    }
  }
}

export async function generateProposal(params: {
  leadName: string
  company: string
  industry: string
  painPoint: string | null
  senderName: string
  senderCompany: string
  senderService: string
}): Promise<string> {
  const prompt = `You are a sales professional generating a short, 1-page proposal for a client.
CLIENT: ${params.leadName} at ${params.company} (${params.industry})
PAIN POINT IDENTIFIED: ${params.painPoint || "General growth and optimization"}

YOUR DETAILS: ${params.senderName} from ${params.senderCompany}, offering ${params.senderService}

Generate a concise 3-part proposal using markdown. Do not include any pleasantries or "Here is the proposal". Just return the markdown:
1. Current State (Highlight the issues/pain points in a professional way)
2. The Fix (Our blueprint/solution, tailored to their industry)
3. Pricing & Timeline (Give a realistic setup fee and monthly retainer, e.g. $1,500 setup, $500/mo, and a timeline for delivery).`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6000,
      // @ts-expect-error — DeepSeek thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })
    return response.choices[0]?.message?.content || "Proposal generation failed."
  } catch {
    return `### 1. Current State
Your current setup at ${params.company} has some inefficiencies, particularly regarding ${params.painPoint || "growth"}.

### 2. The Fix
We will implement our ${params.senderService} blueprint tailored for the ${params.industry} space to optimize your pipeline.

### 3. Pricing & Timeline
- **Setup:** $1,500 (2 weeks)
- **Retainer:** $500/mo`
  }
}

export async function generateEmail(
  params: EmailPromptParams,
  stepNumber: number
): Promise<GeneratedEmail> {
  const prompt =
    stepNumber === 1
      ? buildStep1Prompt(params)
      : stepNumber === 2
      ? buildStep2Prompt(params)
      : buildStep3Prompt(params)

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })

    const text = response.choices[0]?.message?.content || ""
    const parsed = parseEmailResponse(text)

    return { ...parsed, prompt }
  } catch (err) {
    console.error("OpenAI error, using fallback:", err)
    const fallback = buildFallback(params)
    return { ...fallback, prompt }
  }
}
