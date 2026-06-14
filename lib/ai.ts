/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
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

export interface ReplyClassification {
  intent: ReplyIntent
  confidence: "HIGH" | "MEDIUM" | "LOW"
  summary: string
  extractedObjection?: string | null
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
{"intent":"<INTENT>","confidence":"HIGH|MEDIUM|LOW","summary":"<one sentence describing what they said>","extractedObjection":"<if intent is OBJECTION or NOT_NOW, extract the specific objection they made, otherwise null>"}`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const text = res.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    return {
      intent: parsed.intent as ReplyIntent,
      confidence: parsed.confidence as "HIGH" | "MEDIUM" | "LOW",
      summary: parsed.summary as string,
      extractedObjection: parsed.extractedObjection
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
import { prisma } from "./db"

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
  personaConfig?: any
  objectionHandlers?: any
}): Promise<ReplyDraft> {
  const isCustomInstruction = params.responseStyle && !["SOFT", "DIRECT", "VALUE-FIRST"].includes(params.responseStyle) && params.responseStyle.trim() !== "";

  let stylePrompt = params.responseStyle === "SOFT" 
    ? "Be conversational, warm, and low-pressure. Answer their questions but don't push hard for a meeting immediately."
    : params.responseStyle === "DIRECT"
    ? "Be confident, concise, and straight to the point. Answer their questions clearly, give numbers/prices if relevant, and propose specific times to talk."
    : params.responseStyle === "VALUE-FIRST"
    ? "Lead with immense value. Offer to send a free resource, audit, or case study before asking for a meeting or discussing pricing."
    : `TONE: ${params.tone}`;

  if (params.personaConfig) {
    const p = params.personaConfig;
    let personaStr = "[AGENCY AI PERSONA RULES]:\n";
    if (p.proposalPriceRange) personaStr += `- Proposal Price Range: ${p.proposalPriceRange}\n`;
    if (p.meetingAvailability) personaStr += `- Meeting Availability: ${p.meetingAvailability}\n`;
    if (p.coreServices) personaStr += `- Core Services: ${p.coreServices}\n`;
    if (p.additionalRules) personaStr += `- Additional Rules: ${p.additionalRules}\n`;
    personaStr += "\n(Follow these rules strictly above all other style guidelines.)";
    
    if (p.proposalPriceRange || p.meetingAvailability || p.coreServices || p.additionalRules) {
      stylePrompt = personaStr;
    }
  }

  let objectionPrompt = ""
  if (params.objectionHandlers) {
    try {
      const handlers = (typeof params.objectionHandlers === "string"
        ? JSON.parse(params.objectionHandlers)
        : params.objectionHandlers) as Array<{ objection: string, response: string }>
      if (Array.isArray(handlers) && handlers.length > 0) {
        objectionPrompt = "[PLAYBOOK OBJECTION RESPONSE GUIDELINES]:\n" + 
          handlers.map(h => `- When prospect objects: "${h.objection}"\n  You MUST handle it exactly like this response outline: "${h.response}"`).join("\n") +
          "\n\nIf the prospect's reply matches or relates to any of the objections above, you MUST respond to their objection exactly as outlined in the active playbook response instructions.";
      }
    } catch (err) {
      console.error("Failed to parse objectionHandlers in generateReplyDraft:", err)
    }
  }

  const customInstructionBlock = isCustomInstruction 
    ? `\n\n==================================================\nCRITICAL OVERRIDE INSTRUCTION FROM THE USER:\n"${params.responseStyle}"\n\nYOU MUST DO EXACTLY WHAT THE USER REQUESTS ABOVE. DO NOT TRY TO BE AGREEABLE TO THE PROSPECT IF THE USER TELLS YOU TO REJECT THEM OR PROPOSE SOMETHING ELSE. THE USER IS YOUR BOSS. THE OVERRIDE INSTRUCTION DICTATES THE ENTIRE RESPONSE.\n==================================================`
    : "";

  const historySection = params.conversationHistory
    ? `\nCONVERSATION TRANSCRIPT (CHRONOLOGICAL):\n${params.conversationHistory}\n`
    : `\nORIGINAL EMAIL YOU SENT:\n${params.originalEmailBody}\n\nTHEIR REPLY:\n${params.replyBody}\n`;

  const calendarSection = isCustomInstruction 
    ? "" 
    : (params.calendarLink
        ? `You can offer your calendar link for booking: ${params.calendarLink}`
        : `Suggest a 15-minute call and ask which times work.`);

  const titleString = params.senderTitle ? `, ${params.senderTitle}` : "";

  const prompt = `You are a world-class, highly strategic B2B sales representative writing a reply to a prospect who responded to a cold email.
Use the best salesperson approach: analyze the prospect's underlying needs, concerns, or hidden objections. Address them with high emotional intelligence, build credibility, pivot to a low-pressure value hook (like a custom audit, checklist, or case study), and guide them smoothly toward the next step (booking a meeting or continuing the conversation).

YOUR PROFILE:
- Name: ${params.senderName}${titleString}
- Company: ${params.senderCompany}
- Business Bio / Description of Services: ${params.senderService}
- Preferred Tone: ${params.tone}

PROSPECT DETAILS:
- Name: ${params.leadName}
- Company: ${params.company}

STYLE INSTRUCTION: ${stylePrompt}
${objectionPrompt ? `\n${objectionPrompt}\n` : ""}
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
5. POSITIVE INTEREST: Propose next steps immediately (offer calendar link or check their availability for a call). If they suggest a day/time, confirm it or offer specific slots on that day.
6. UNSUBSCRIBES / OPT-OUTS (Strict Opt-Outs): ONLY use this if they explicitly say "remove me", "unsubscribe", "stop", "don't email", "spam", etc. Write a very brief, polite opt-out confirmation confirming you have updated your list so we won't email you again, and thank them (e.g., "Understood. I've updated our list so we won't email you again. Thanks for letting me know."). Do NOT use this for standard objections like "not interested" or "not interested at this time" — handle those as objections/timing hurdles instead.
7. FINALIZING MEETING TIMES: If the prospect has already agreed to a call/meeting or is suggesting/confirming a time (e.g. "Is Friday ok?", "Wednesday works"), do NOT pitch your services, case studies, audits, or repeat boilerplate reassurance (like "no prep needed"). Simply agree to the time, offer options/confirm the slot, and state you will send a calendar invite.
8. CONVERSATION MEMORY: Do not repeat topics, value props, offers, or reassurance phrases that you (the sender) already made earlier in the transcript (e.g., if you already offered a case study or said "no prep is needed" in a previous message, do not repeat it or say you will send it again). Focus only on moving the conversation forward to the next logical step.
${customInstructionBlock}

Format:
Subject: Re: [subject]
[body]`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      // @ts-expect-error — DeepSeek thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
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
    // Fall back to the full response if no "Subject:" line was found
    const body = (subjectLine ? bodyLines.join("\n") : text).trim()
    return { subject, body: body || text.trim() }
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

export interface ProposalSection {
  title: string
  content: string
}

export interface ProposalContent {
  executiveSummary: string
  sections: ProposalSection[]
}

export async function generateProposalContent(params: {
  leadName: string
  company: string
  industry: string
  painPoints: string[]
  researchNotes: string | null
  senderName: string
  senderCompany: string
  senderService: string
  proposalTemplateName: string
  currency: string
}): Promise<ProposalContent> {
  const prompt = `You are a senior agency consultant writing a client-facing proposal.

CLIENT: ${params.leadName} at ${params.company} (${params.industry})
PAIN POINTS: ${params.painPoints.length ? params.painPoints.join("; ") : "General growth and visibility"}
RESEARCH NOTES: ${params.researchNotes || "none"}

AGENCY: ${params.senderName} from ${params.senderCompany}, offering ${params.senderService}
PROPOSAL TYPE: ${params.proposalTemplateName}
CURRENCY: ${params.currency}

Write a proposal as JSON with this exact structure:
{
  "executiveSummary": "2-3 sentence summary of the opportunity and the proposed engagement",
  "sections": [
    {"title": "Current Situation", "content": "1-2 paragraphs describing the client's current state and the issues found"},
    {"title": "Proposed Solution", "content": "1-2 paragraphs describing what we'll do and how it solves their problems"},
    {"title": "Scope of Work", "content": "bullet list (use \\n- ) of specific deliverables"},
    {"title": "Timeline", "content": "1 short paragraph or bullet list describing rollout phases"},
    {"title": "Why ${params.senderCompany}", "content": "1 short paragraph on credibility/approach"}
  ]
}

Be specific to ${params.company} and the ${params.industry} industry. Plain text only inside fields, no markdown headers. Return only valid JSON.`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6000,
      // @ts-expect-error — DeepSeek thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })
    const text = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    return {
      executiveSummary: parsed.executiveSummary || "",
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    }
  } catch {
    return {
      executiveSummary: `A tailored engagement to help ${params.company} address ${params.painPoints[0] || "key growth challenges"} and improve results in the ${params.industry} space.`,
      sections: [
        { title: "Current Situation", content: `${params.company} is facing challenges around ${params.painPoints.join(", ") || "visibility and growth"}.` },
        { title: "Proposed Solution", content: `${params.senderCompany} will deliver ${params.senderService} tailored to ${params.company}.` },
        { title: "Scope of Work", content: "- Discovery & audit\n- Implementation\n- Ongoing optimisation" },
        { title: "Timeline", content: "Engagement kicks off within 1-2 weeks, with initial results visible within 30 days." },
        { title: `Why ${params.senderCompany}`, content: `${params.senderCompany} specialises in helping businesses like ${params.company} grow.` },
      ],
    }
  }
}

export interface CaseStudySummaryParams {
  clientName: string
  industry: string
  challenge: string
  solution: string
  results: string
}

export async function generateCaseStudySummary(params: CaseStudySummaryParams): Promise<string> {
  const prompt = `Write a punchy 2-3 sentence summary of this client success story, suitable for use in a sales proposal or pitch.

Client: ${params.clientName} (${params.industry})
Challenge: ${params.challenge}
Solution: ${params.solution}
Results: ${params.results}

Return only the summary text, no markdown, no quotes.`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 150,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    return response.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || ""
  } catch {
    return `${params.clientName} (${params.industry}) saw real results: ${params.results}`
  }
}

export interface CompetitorAnalysisResult {
  summary: string
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  talkingPoints: string[]
}

export async function generateCompetitorAnalysis(params: {
  businessName: string
  industry: string
  competitorName: string
  competitorWebsite?: string | null
  competitorNotes?: string | null
}): Promise<CompetitorAnalysisResult> {
  const prompt = `You are a competitive intelligence analyst helping an agency win a deal.

CLIENT (prospect): ${params.businessName} (${params.industry})
COMPETITOR: ${params.competitorName}${params.competitorWebsite ? ` (${params.competitorWebsite})` : ""}
NOTES: ${params.competitorNotes || "none"}

Analyse the competitor relative to the prospect's industry and return JSON only:
{
  "summary": "2-3 sentence overview of how this competitor operates and positions itself",
  "strengths": ["competitor strength 1", "competitor strength 2"],
  "weaknesses": ["competitor weakness or gap 1", "competitor weakness or gap 2"],
  "opportunities": ["opportunity for ${params.businessName} to differentiate 1", "opportunity 2"],
  "talkingPoints": ["sales talking point referencing this competitor 1", "talking point 2"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      // @ts-expect-error — DeepSeek thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "medium",
    })
    const text = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    return {
      summary: parsed.summary || "",
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      opportunities: parsed.opportunities || [],
      talkingPoints: parsed.talkingPoints || [],
    }
  } catch {
    return {
      summary: `${params.competitorName} is an active player in the ${params.industry} space.`,
      strengths: ["Established presence"],
      weaknesses: ["Limited personalisation"],
      opportunities: [`Position ${params.businessName} as the more responsive, modern alternative`],
      talkingPoints: [`Highlight what ${params.competitorName} doesn't offer that we do`],
    }
  }
}

export interface ClientReportNarrativeParams {
  campaignName: string
  industry: string
  metrics: Record<string, number | string>
  periodLabel: string
}

export async function generateReportNarrative(params: ClientReportNarrativeParams): Promise<string> {
  const metricsText = Object.entries(params.metrics).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ")
  const prompt = `Write a short, client-friendly performance summary (2-3 paragraphs) for a marketing/sales report.

Campaign: ${params.campaignName} (${params.industry})
Reporting period: ${params.periodLabel}
Metrics: ${metricsText}

Tone: confident, plain English, written for a non-technical client. Highlight wins, contextualise any weaker numbers constructively, and end with a brief note on what's planned next. No markdown headers, plain paragraphs only.`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 400,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    return response.choices[0]?.message?.content?.trim() || ""
  } catch {
    return `During ${params.periodLabel}, the ${params.campaignName} campaign generated the following results: ${metricsText}. We'll continue optimising performance over the coming period.`
  }
}

export async function generateEmail(
  params: EmailPromptParams,
  stepNumber: number
): Promise<GeneratedEmail> {
  const basePrompt =
    stepNumber === 1
      ? buildStep1Prompt(params)
      : stepNumber === 2
      ? buildStep2Prompt(params)
      : buildStep3Prompt(params)

  let agencyGuidelines = ""
  if (params.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          playbookType: true,
          agentGoal: {
            select: { personaConfig: true }
          }
        }
      })
      if (user) {
        let coreServices = ""
        let pricing = ""
        let availability = ""
        let additionalRules = ""
        
        if (user.agentGoal?.personaConfig) {
          const p = user.agentGoal.personaConfig as any
          if (p.coreServices) coreServices = p.coreServices
          if (p.proposalPriceRange) pricing = p.proposalPriceRange
          if (p.meetingAvailability) availability = p.meetingAvailability
          if (p.additionalRules) additionalRules = p.additionalRules
        }
        
        let objectionContext = ""
        if (user.playbookType) {
          const playbook = await prisma.playbook.findUnique({
            where: { type: user.playbookType },
            select: { objectionHandlers: true }
          })
          if (playbook?.objectionHandlers) {
            const handlers = (typeof playbook.objectionHandlers === "string" 
              ? JSON.parse(playbook.objectionHandlers) 
              : playbook.objectionHandlers) as Array<{ objection: string, response: string }>
            if (Array.isArray(handlers) && handlers.length > 0) {
              objectionContext = handlers.map(h => `- Objection: "${h.objection}"\n  Positioning/Counter: "${h.response}"`).join("\n")
            }
          }
        }
        
        if (coreServices || pricing || availability || additionalRules || objectionContext) {
          agencyGuidelines = `\n\n[AGENCY OBJECTIVES & SYSTEMS (AI CONFIG & PLAYBOOK)]\n`
          if (coreServices) agencyGuidelines += `- Core Services: ${coreServices}\n`
          if (pricing) agencyGuidelines += `- Pricing Details: ${pricing}\n`
          if (availability) agencyGuidelines += `- Meeting Availability: ${availability}\n`
          if (additionalRules) agencyGuidelines += `- Additional Guidelines: ${additionalRules}\n`
          if (objectionContext) {
            agencyGuidelines += `- Active Playbook & Objection Handling Guidelines:\n${objectionContext}\n`
          }
          agencyGuidelines += `\n(You MUST adapt your outbound email structure, service focus, value pitch, objection handling, and booking CTAs to strictly align with these custom agency systems above.)`
        }
      }
    } catch (err) {
      console.error("Failed to fetch agency settings for generateEmail:", err)
    }
  }

  const prompt = basePrompt + agencyGuidelines

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

export async function generateAutoSearchQuery(params: {
  companyDesc: string
  personaConfig: any
  targetRegions?: string
}): Promise<{ query: string; location: string } | null> {
  const prompt = `You are an expert lead generation AI. 
Based on the agency description and persona below, generate a Google Maps search query to find their ideal B2B clients.

Agency Description: ${params.companyDesc}
Persona Rules: ${JSON.stringify(params.personaConfig || {})}
Target Regions: ${params.targetRegions || "Pick a random major city"}

Instructions:
1. Identify the exact type of business the agency targets (e.g., "dental practices", "plumbers", "SaaS companies").
2. Select a location based on "Target Regions". If none provided, pick a random major city in the US or UK to ensure fresh leads.
3. Keep the query simple and optimized for Google Maps (e.g. "dental clinics").

Return JSON ONLY:
{
  "query": "the business type to search",
  "location": "the city and country"
}`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 150,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })
    const text = res.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    if (parsed.query && parsed.location) return parsed
    return null
  } catch (err) {
    console.error("Failed to generate auto search query:", err)
    return null
  }
}
