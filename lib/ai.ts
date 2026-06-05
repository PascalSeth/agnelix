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
- OBJECTION: Has a clear objection (price, timing, current vendor, not relevant)
- NOT_NOW: Interested but not right now (mentions future quarter, busy period, etc.)
- UNSUBSCRIBE: Wants to be removed, stop emailing, not interested at all
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
  senderCompany: string
  senderService: string
  tone: string
  responseStyle?: string
}): Promise<ReplyDraft> {
  const stylePrompt = params.responseStyle === "SOFT" 
    ? "Be conversational, warm, and low-pressure. Answer their questions but don't push hard for a meeting immediately."
    : params.responseStyle === "DIRECT"
    ? "Be confident, concise, and straight to the point. Answer their questions clearly, give numbers/prices if relevant, and propose specific times to talk."
    : params.responseStyle === "VALUE-FIRST"
    ? "Lead with immense value. Offer to send a free resource, audit, or case study before asking for a meeting or discussing pricing."
    : `TONE: ${params.tone}`;

  const prompt = `You are a senior sales rep writing a reply to a prospect who responded to a cold email.

YOUR DETAILS: ${params.senderName} from ${params.senderCompany}, offering ${params.senderService}
PROSPECT: ${params.leadName} at ${params.company}
STYLE INSTRUCTION: ${stylePrompt}

ORIGINAL EMAIL YOU SENT:
${params.originalEmailBody}

THEIR REPLY:
${params.replyBody}

Write a concise, natural follow-up reply. Keep it under 120 words. Be human, not salesy.
Do not use phrases like "I hope this finds you well" or "I wanted to reach out".
End with a single clear call-to-action (e.g. propose a 15-min call with 2 specific time options).

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
