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
  extractedObjection?: string | null
}

export async function classifyReply(params: {
  replyBody: string
  originalEmailBody: string
  leadName: string
  company: string
}): Promise<ReplyClassification> {
  const prompt = buildClassifyReplyPrompt(params)

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
  buildClassifyReplyPrompt,
  buildLinkedInMessagePrompt,
  buildAutoSearchQueryPrompt,
  buildSmartOutboundHookPrompt,
  buildSequencePresetPrompt,
  buildOperationalPresetPrompt,
  buildSuggestTargetingPrompt,
  buildCrossSellPitchPrompt,
  buildSocialOutreachPrompt,
  FALLBACK_EMAIL,
  HUMAN_WRITING_RULES,
  type EmailPromptParams,
} from "./prompts"
import { prisma } from "./db"
import { getTrainingBlock } from "./ai-training"
import { getMatchingExemplars, buildExemplarPromptBlock } from "./ai-exemplars"

export const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export interface GeneratedEmail {
  subject: string
  body: string
  prompt: string
}

function parseEmailResponse(text: string, stepNumber = 1): { subject: string; body: string } {
  if (!text || !text.trim()) {
    return { subject: "Quick question", body: "" }
  }

  const lines = text.split("\n")
  let subject = ""
  let subjectLineIndex = -1

  // Find subject line across markdown formatting: "Subject:", "**Subject:**", "## Subject:", etc.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const match = line.match(/^(?:\*{1,3}|#{1,4}\s*)?Subject\s*[:\-]\s*(?:\*{1,3})?\s*(.*)$/i)
    if (match) {
      subject = match[1]?.replace(/^[\*\_\"\'\`]+|[\*\_\"\'\`]+$/g, "").trim()
      subjectLineIndex = i
      break
    }
  }

  // If no explicit "Subject:" line, check if the first line looks like a subject or heading
  if (subjectLineIndex === -1 && lines.length > 1) {
    const firstLine = lines[0].trim()
    if (firstLine.length < 80 && (firstLine.startsWith("#") || firstLine.startsWith("**") || !firstLine.includes("."))) {
      subject = firstLine.replace(/^[#\*\_\"\'\`\s]+|[#\*\_\"\'\`\s]+$/g, "").trim()
      subjectLineIndex = 0
    }
  }

  const bodyLines: string[] = []
  if (subjectLineIndex !== -1) {
    for (let i = subjectLineIndex + 1; i < lines.length; i++) {
      bodyLines.push(lines[i])
    }
  } else {
    // If no subject recognized, use entire text as body
    bodyLines.push(...lines)
  }

  let body = bodyLines.join("\n").trim()
  // Clean leading markdown separators or bold artifacts
  body = body.replace(/^(?:---|\*\*\*|___)\s*/, "").trim()

  // Post-processing: clean any accidental "Hi contact," / "Hi info," / "Hi admin," placeholders
  body = body.replace(/^(?:Hi|Hello|Hey|Dear)\s+(?:contact|info|admin|support|team|there\s+team|user|lead|client|prospect|undefined|null)\s*[,:\-]\s*/im, "Hi there,\n\n")

  if (!subject) {
    subject = stepNumber === 1
      ? "Quick question"
      : stepNumber === 2
      ? "Re: Quick question"
      : "Should I close the loop?"
  }

  return { subject, body }
}

function buildFallback(p: EmailPromptParams, stepNumber = 1): { subject: string; body: string } {
  const greeting = (p.prospectFirstName && !["contact", "info", "admin", "support", "hello", "team", "undefined", "null"].includes(p.prospectFirstName.toLowerCase()))
    ? `Hi ${p.prospectFirstName}`
    : "Hi there"

  if (stepNumber === 2) {
    const prevSub = p.previousEmailSubject ? (p.previousEmailSubject.toLowerCase().startsWith("re:") ? p.previousEmailSubject : `Re: ${p.previousEmailSubject}`) : `Re: Quick question for ${p.prospectCompany}`
    return {
      subject: prevSub,
      body: `${greeting},\n\nJust floating this to the top of your inbox in case you missed it. Thought you might find our client growth insights for the ${p.industry} space relevant for ${p.prospectCompany}.\n\nOpen to a brief 5-minute chat this week?\n\nBest,\n${p.senderName}`,
    }
  }

  if (stepNumber >= 3) {
    return {
      subject: `Should I close the loop for ${p.prospectCompany}?`,
      body: `${greeting},\n\nI haven't heard back, so I assume this isn't a priority for ${p.prospectCompany} right now.\n\nI'll step back so I don't clutter your inbox. If things shift down the road and you'd like to explore scaling your pipeline, feel free to reach back out.\n\nWishing you all the best,\n\nBest,\n${p.senderName}`,
    }
  }

  const subject = FALLBACK_EMAIL.subject.replace("{{company}}", p.prospectCompany)
  const body = FALLBACK_EMAIL.body
    .replace(/{{firstName}}/g, greeting.replace(/^Hi\s+/, ""))
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
  playbookType?: string | null
  userId?: string | null
  battleCard?: any | null
  researchContext?: string | null
  proposalContext?: string | null
  flagshipOffer?: any | null
}): Promise<ReplyDraft> {
  const isCustomInstruction = params.responseStyle && !["SOFT", "DIRECT", "VALUE-FIRST"].includes(params.responseStyle) && params.responseStyle.trim() !== "";
  const trainingBlock = await getTrainingBlock("REPLY", params.playbookType, params.userId)

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
    if (p.workspaceRole) personaStr += `- You are the agency's ${p.workspaceRole}. ${p.workspaceVoice ?? ""}\n`;
    if (p.proposalPriceRange) personaStr += `- Proposal Price Range: ${p.proposalPriceRange}\n`;
    if (p.meetingAvailability) personaStr += `- Meeting Availability: ${p.meetingAvailability}\n`;
    if (p.coreServices) personaStr += `- Core Services: ${p.coreServices}\n`;
    if (p.additionalRules) personaStr += `- Additional Rules: ${p.additionalRules}\n`;
    personaStr += "\n(Follow these rules strictly above all other style guidelines.)";
    
    if (p.proposalPriceRange || p.meetingAvailability || p.coreServices || p.additionalRules) {
      stylePrompt = personaStr;
    }
  }

  let battleCardSection = ""
  if (params.battleCard) {
    try {
      const bc = typeof params.battleCard === "string" ? JSON.parse(params.battleCard) : params.battleCard
      battleCardSection = `\n[LEAD BATTLE CARD & OBJECTION INTELLIGENCE]:\n- Summary: ${bc.summary || "N/A"}\n`
      if (Array.isArray(bc.likelyObjections) && bc.likelyObjections.length > 0) {
        battleCardSection += `- Identified Objections & Counter-Arguments:\n` + bc.likelyObjections.map((o: any) => `  * "${o.objection}" -> Strategy: "${o.counter}"`).join("\n") + "\n"
      }
      if (Array.isArray(bc.talkingPoints) && bc.talkingPoints.length > 0) {
        battleCardSection += `- Key Talking Points: ` + bc.talkingPoints.join("; ") + "\n"
      }
      if (bc.suggestedNextStep) {
        battleCardSection += `- Recommended Next Step: ${bc.suggestedNextStep}\n`
      }
      if (bc.urgencyAngle) {
        battleCardSection += `- Urgency Hook: ${bc.urgencyAngle}\n`
      }
    } catch {
      if (typeof params.battleCard === "string" && params.battleCard.trim()) {
        battleCardSection = `\n[LEAD BATTLE CARD]:\n${params.battleCard}\n`
      }
    }
  }

  let researchSection = ""
  if (params.researchContext && params.researchContext.trim()) {
    researchSection = `\n[PROSPECT DEEP RESEARCH, TECH STACK & WEBSITE AUDIT]:\n${params.researchContext}\n`
  }

  let proposalSection = ""
  if (params.proposalContext && params.proposalContext.trim()) {
    proposalSection = `\n[AGENCY PROPOSAL & OFFER INTELLIGENCE]:\n${params.proposalContext}\n`
  } else if (params.flagshipOffer) {
    const fo = typeof params.flagshipOffer === "string" ? JSON.parse(params.flagshipOffer) : params.flagshipOffer
    proposalSection = `\n[AGENCY FLAGSHIP OFFER]:\n- Offer Name: ${fo.name || "Custom Growth Sprint"}\n- Core Transformation: ${fo.transformation || "Turn browsers into booked clients"}\n- Primary Deliverable: ${fo.deliverable || "Full audit & execution roadmap"}\n`
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

  const matchingExemplars = getMatchingExemplars({
    surface: "REPLY",
    playbookType: params.playbookType,
    queryText: params.replyBody,
    limit: 2,
  })
  const exemplarBlock = buildExemplarPromptBlock(matchingExemplars, params.replyBody, params.playbookType || undefined)

  const prompt = `You are a world-class, highly strategic B2B sales representative writing a reply to a prospect who responded to a cold email.
Use the best salesperson approach: analyze the prospect's underlying needs, concerns, or hidden objections. Address them with high emotional intelligence, build credibility, pivot to a low-pressure value hook (like a custom audit, checklist, or case study), and guide them smoothly toward the next step (booking a meeting or continuing the conversation).

YOUR PROFILE & COMPANY IDENTITY:
- Name: ${params.senderName}${titleString}
- Company: ${params.senderCompany}
- Business Bio / Description of Services: ${params.senderService}
- Preferred Tone: ${params.tone}

PROSPECT DETAILS:
- Name: ${params.leadName}
- Company: ${params.company}
${battleCardSection}${researchSection}${proposalSection}
STYLE INSTRUCTION: ${stylePrompt}
${objectionPrompt ? `\n${objectionPrompt}\n` : ""}
${calendarSection}

${historySection}
CONVERSATION INTELLIGENCE — read the whole thread first, then apply:
1. ANSWER FIRST: your first sentence must respond to the actual thing they said or asked — never open with pleasantries, gratitude, or a pitch.
2. MIRROR THEM: match their length and register. If their reply is one or two lines, yours stays under 50 words. If they write "Hey" and lowercase, be casual; if they're formal, stay professional. Never send three paragraphs to a one-line reply.
3. MULTIPLE QUESTIONS: if they asked several things, answer each in one short line, in the order they asked — then stop. Don't add a pitch after the answers unless the thread naturally calls for it.
4. READ THE SUBTEXT: a short, curt reply means they're busy — be brief and easy to say yes to. A detailed reply means they're engaged — you've earned one more sentence of substance.
5. ONE SPECIFIC: reference at most one concrete detail from the thread or their business. More than that reads as trying too hard.
6. KNOW WHEN TO STOP SELLING: if they've already agreed to something, just lock in the logistics. Every extra sentence after a "yes" risks the deal.
7. UTILIZE BATTLE CARD & RESEARCH: If the prospect raises an objection or question, draw directly upon the counter-strategies in the Battle Card and the deep research audit rather than giving generic answers.
${exemplarBlock}${trainingBlock}${HUMAN_WRITING_RULES}
Write the reply now. Hard cap 120 words; if their latest message is under 25 words, hard cap 60 words.

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
  flagshipOffer?: { name: string; transformation: string; deliverable: string } | null
  clientGoal?: string | null
  pastProposalLearnings?: string | null
  playbookType?: string | null
  userId?: string | null
}): Promise<ProposalContent> {
  const trainingBlock = await getTrainingBlock("PROPOSAL", params.playbookType, params.userId)
  const flagshipBlock = params.flagshipOffer?.name
    ? `\nFLAGSHIP OFFER (the agency's signature offer — build the proposal around it):
- Name: ${params.flagshipOffer.name}
- Transformation it promises: ${params.flagshipOffer.transformation}
- Deliverable: ${params.flagshipOffer.deliverable}\n`
    : ""
  const goalLine = params.clientGoal
    ? `\nCLIENT'S PRIMARY GOAL: ${params.clientGoal.replace(/_/g, " ")} — every section should connect back to achieving this.\n`
    : ""
  const learningsBlock = params.pastProposalLearnings
    ? `\nLEARNINGS FROM THIS AGENCY'S PAST PROPOSALS (apply them — repeat what won, avoid what lost):
${params.pastProposalLearnings}\n`
    : ""

  const prompt = `You are a senior agency consultant writing a client-facing proposal.
Frame the entire proposal as a TRANSFORMATION: where the client is today, where they will be after the engagement, and how we get them there. Never write a generic services list.

CLIENT: ${params.leadName} at ${params.company} (${params.industry})
PAIN POINTS: ${params.painPoints.length ? params.painPoints.join("; ") : "General growth and visibility"}
RESEARCH NOTES: ${params.researchNotes || "none"}
${flagshipBlock}${goalLine}${learningsBlock}${trainingBlock}
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

export interface PlaybookTemplatesResult {
  targetVerticals: string[]
  platformOptions: string[]
  sequenceTemplates: Array<{ id: string; name: string; steps: number; description: string }>
  proposalTemplates: Array<{ id: string; name: string; description: string; price: number; setupPrice: number; period: string; currency: string }>
  objectionHandlers: Array<{ objection: string; response: string }>
}

export async function generatePlaybookTemplates(params: {
  companyName: string
  companyDesc: string
  playbookType: string
  currency: string
  strategyFocus?: string
}): Promise<PlaybookTemplatesResult> {
  const prompt = `You are an elite B2B sales strategist and copy chief specializing in outbound sales psychology, high-converting cold email sequences, Chris Voss negotiation techniques, and agency pricing packages.

Generate a comprehensive, custom acquisition playbook for this agency:

AGENCY PROFILE:
- Agency Name: ${params.companyName}
- Services & Fulfillment: ${params.companyDesc}
- Category: ${params.playbookType}
- Currency: ${params.currency}
${params.strategyFocus ? `- Strategic Acquisition Focus: ${params.strategyFocus}` : ""}

COPYWRITING & CONVERSION STANDARDS (MANDATORY — STRICTLY ENFORCED):
1. ZERO AI SLOP: NEVER generate generic, corporate filler phrases. Banned phrases: "I hope this email finds you well", "Wanted to reach out", "Checking in", "Touch base", "In today's fast-paced digital world", "elevate", "synergy", "streamline", "game-changer", "leverage", "unlock", "seamless".
2. OPENING LINE DIRECTIVES: Openers must be company-first, observation-anchored, and frictionless. Directives must tell the copywriter to spot a real friction point, missing asset, or performance gap in the prospect's business.
3. CLOSING QUESTION DIRECTIVES: Closers must be low-friction, conversational, and permission-based (e.g. "Worth a quick look?" / "Open to exploring this?" / "Mind if I send over a 90-second Loom teardown?"). Never ask for a 30-minute demo upfront.
4. TACTICAL EMPATHY OBJECTION HANDLERS: Counter sales pushback (e.g. "handled in-house", "too expensive", "already have an agency") by first labeling their constraint respectfully (first 6-10 words), removing sales friction, and offering a zero-risk 2-minute audit or proof asset.
5. PROPOSAL MODELS: Provide distinct, highly tangible packages (e.g. Starter Audit & Fix, Growth Pipeline Accelerator, Enterprise Full-Funnel Retainer) with realistic monthly retainers and setup fees in ${params.currency}.

TASK BREAKDOWN:
1. "targetVerticals": 4-6 specific, high-intent buyer niches in lowercase (e.g. ["dental clinics", "roofing contractors", "luxury transport", "dtc ecommerce", "commercial hvac"]).
2. "platformOptions": 3-4 actual discovery channels to source these prospects (e.g. ["Google Maps Local Pack", "LinkedIn Sales Navigator", "Yelp Directories", "Instagram Business Profiles"]).
3. "sequenceTemplates": Exactly 3 distinct, high-converting outbound sequence angles. Each must have:
   - "id": unique string (e.g. "seq_audit", "seq_competitor", "seq_speed")
   - "name": punchy, professional sequence angle name (e.g. "Friction Audit & 90s Teardown", "Competitor Ad Gap Benchmark", "Performance ROI Cadence")
   - "steps": integer (typically 3 or 4 steps)
   - "description": detailed multi-step strategy detailing Step 1 (Observation hook + soft ask), Step 2 (Peer proof asset + value drop), Step 3 (Permission breakup close).
4. "proposalTemplates": Exactly 3 structured pricing tiers:
   - "id": unique string (e.g. "p_starter", "p_growth", "p_scale")
   - "name": package name (e.g. "Foundation Setup & Audit", "Growth Retainer", "Scale & Acceleration Tier")
   - "description": specific, concrete deliverables (e.g. "Custom landing page rebuild + 3 ad creatives/wk + conversion tracking + weekly CRO reports")
   - "price": realistic recurring monthly or one-off rate in ${params.currency} as an integer
   - "setupPrice": realistic setup/onboarding fee in ${params.currency} as an integer
   - "period": "monthly" or "one-off"
   - "currency": "${params.currency}"
5. "objectionHandlers": Exactly 4 tactical empathy objection handling rules for this specific niche:
   - "objection": realistic sales pushback (e.g. "We already work with an agency", "We handle marketing in-house", "No budget right now", "Send me information first")
   - "response": tactical, Chris Voss-style response script that acknowledges their reality, removes pressure, and offers a frictionless micro-step.

Return ONLY a valid JSON object matching this structure:
{
  "targetVerticals": ["string", ...],
  "platformOptions": ["string", ...],
  "sequenceTemplates": [
    { "id": "string", "name": "string", "steps": 3, "description": "string" }
  ],
  "proposalTemplates": [
    { "id": "string", "name": "string", "description": "string", "price": 1500, "setupPrice": 500, "period": "monthly", "currency": "${params.currency}" }
  ],
  "objectionHandlers": [
    { "objection": "string", "response": "string" }
  ]
}
No markdown outside JSON, no explanations.`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6000,
      // @ts-expect-error — AI thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })
    const text = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    return {
      targetVerticals: Array.isArray(parsed.targetVerticals) ? parsed.targetVerticals.map((v: string) => v.toLowerCase()) : [],
      platformOptions: Array.isArray(parsed.platformOptions) ? parsed.platformOptions : [],
      sequenceTemplates: Array.isArray(parsed.sequenceTemplates) ? parsed.sequenceTemplates : [],
      proposalTemplates: Array.isArray(parsed.proposalTemplates) ? parsed.proposalTemplates : [],
      objectionHandlers: Array.isArray(parsed.objectionHandlers) ? parsed.objectionHandlers : [],
    }
  } catch (err) {
    console.error("AI template generation failed, falling back to defaults:", err)
    return {
      targetVerticals: ["dental clinics", "roofing contractors", "med spas", "dtc brands", "commercial hvac"],
      platformOptions: ["Google Maps Local Pack", "LinkedIn Sales Navigator", "Yelp Directories", "Instagram Business Profiles"],
      sequenceTemplates: [
        {
          id: "seq_1",
          name: "Observation Audit & 90s Teardown",
          steps: 3,
          description: "Step 1: Reference a specific conversion leak or technical gap on their website with a zero-pressure ask to share a 90-second video fix. Step 2: Share a 2-sentence case study of a similar business solving this exact bottleneck. Step 3: Low-friction permission close checking if this is still a priority this quarter."
        },
        {
          id: "seq_2",
          name: "Competitor Market Gap Benchmark",
          steps: 3,
          description: "Step 1: Point out how their top local competitor is ranking for high-intent keywords they are missing. Step 2: Provide a 1-page keyword revenue gap calculation. Step 3: Polite loop closure asking if they want to review the full gap analysis."
        },
        {
          id: "seq_3",
          name: "Performance & Growth Architecture",
          steps: 3,
          description: "Step 1: Direct, consultative value pitch offering a guaranteed pipeline framework. Step 2: Walkthrough of the exact sprint deliverables. Step 3: Graceful breakup closing the loop."
        }
      ],
      proposalTemplates: [
        { id: "p1", name: "Growth Foundation Tier", description: "Audit & conversion fixes + 3 ad campaigns + weekly pipeline tracking", price: 1200, setupPrice: 450, period: "monthly", currency: params.currency },
        { id: "p2", name: "Scale & Revenue Retainer", description: "Complete multi-channel acquisition engine + dedicated lead nurturing + weekly strategy calls", price: 2500, setupPrice: 750, period: "monthly", currency: params.currency },
        { id: "p3", name: "Enterprise Acceleration Tier", description: "Full-funnel custom creative production + omni-channel scaling + revenue share integration", price: 4500, setupPrice: 1500, period: "monthly", currency: params.currency }
      ],
      objectionHandlers: [
        {
          objection: "We already work with an agency / handled in-house",
          response: "Acknowledge and respect their existing team immediately. Offer to share a complimentary 2-minute benchmark audit to give them ideas without asking them to switch vendors."
        },
        {
          objection: "Too expensive / no budget right now",
          response: "Validate their budget constraints with tactical empathy. Propose a lower-scope starter package or performance-tied milestone to prove ROI before scaling."
        },
        {
          objection: "Send me some information / case studies first",
          response: "Agree immediately. Provide a concise 2-sentence transformation summary from a peer client, then ask if a 5-minute intro makes sense next Tuesday."
        },
        {
          objection: "Bad timing / reach out next quarter",
          response: "Thank them, confirm the exact month to reconnect, and offer a quick value checklist they can use internally in the meantime."
        }
      ]
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

export interface ExtractedCaseStudy {
  clientName: string
  industry: string
  nicheTags: string[]
  challenge: string
  solution: string
  results: string
  testimonialQuote?: string | null
  aiSummary: string
  metrics?: {
    primaryMetric?: string
    percentageIncrease?: string
    timeframe?: string
  }
}

export async function extractCaseStudyFromRawText(params: {
  rawText: string
  agencyName?: string
  playbookType?: string
}): Promise<ExtractedCaseStudy | null> {
  const prompt = `You are an expert agency case study analyst and conversion copywriter.
Extract and structure a professional, high-converting B2B case study from the following raw notes, review, client feedback, or bullet points:

RAW INPUT:
"""
${params.rawText}
"""
${params.agencyName ? `AGENCY CONTEXT: ${params.agencyName}` : ""}
${params.playbookType ? `PLAYBOOK NICHE: ${params.playbookType}` : ""}

TASK:
Analyze the input and structure it into clean, punchy case study fields. If specific details (like exact industry or challenge) are not explicitly stated, infer the most plausible and professional details based on the context.

Generate a JSON object matching this schema:
{
  "clientName": "Client or Brand Name (e.g. 'Apex Dental Care', 'Lumina Skin', 'Horizon Logistics')",
  "industry": "Clean industry name (e.g. 'Cosmetic Dentistry', 'DTC E-Commerce', 'Commercial Roofing')",
  "nicheTags": ["tag1", "tag2", "tag3"],
  "challenge": "1-2 clear sentences explaining the initial bottleneck, low conversions, slow load speed, or lack of pipeline.",
  "solution": "1-2 clear sentences explaining the strategic execution or services provided.",
  "results": "The tangible, concrete metrics or outcome (e.g. '+42% booking rate, 34 implant inquiries in 60 days, $28k added MRR').",
  "testimonialQuote": "A short, credible 1-sentence quote summarizing client satisfaction, or null if not present",
  "aiSummary": "A punchy 1-2 sentence peer-proof snippet for cold emails or sales calls (e.g. 'Helped Apex Dental scale from 8 to 34 monthly consultations in 60 days by restructuring their local Google search pipeline.')",
  "metrics": {
    "primaryMetric": "e.g. '+42% bookings' or '$28k MRR'",
    "timeframe": "e.g. '60 days' or '30 days'"
  }
}

Return ONLY valid JSON, no markdown outside JSON.`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 800,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })
    const text = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    if (parsed.clientName && parsed.results) {
      return parsed as ExtractedCaseStudy
    }
    return null
  } catch (err) {
    console.error("AI case study extraction failed:", err)
    return null
  }
}

export interface CompetitorAnalysisResult {
  summary: string
  marketPosition?: string
  estimatedMonthlyTraffic?: string
  reviewProfile?: string
  pricingModel?: string
  adActivity?: string
  techGaps?: string[]
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  talkingPoints: string[]
  coldOutreachHook?: string
}

export async function generateCompetitorAnalysis(params: {
  businessName: string
  industry: string
  competitorName: string
  competitorWebsite?: string | null
  competitorNotes?: string | null
  competitorWebsiteText?: string | null
}): Promise<CompetitorAnalysisResult> {
  const prompt = `You are an elite B2B competitive intelligence and market teardown analyst helping an agency win a deal.

CLIENT (prospect): ${params.businessName} (${params.industry})
COMPETITOR: ${params.competitorName}${params.competitorWebsite ? ` (${params.competitorWebsite})` : ""}
NOTES: ${params.competitorNotes || "none"}
${params.competitorWebsiteText ? `\nSCRAPED COMPETITOR WEBSITE CONTENT (ground your analysis in this, may be partial):\n${params.competitorWebsiteText.slice(0, 4000)}\n` : ""}
Analyse the competitor relative to the prospect's industry and return JSON only:
{
  "summary": "2-3 sentence overview of how this competitor operates and positions itself",
  "marketPosition": "Archetype (e.g. Dominant Local Leader, Aggressive Ads Spender, Discount Volume Player, Niche Boutique)",
  "estimatedMonthlyTraffic": "Estimated monthly visitors (e.g. 14.5k / mo)",
  "reviewProfile": "Realistic review standing (e.g. 138 reviews (4.6★))",
  "pricingModel": "Pricing model (e.g. Premium Retainers ($3k+), Per-Project, Low-Cost Transactional)",
  "adActivity": "Ad footprint (e.g. Active Google Search & Meta Retargeting, Organic SEO Only)",
  "techGaps": ["specific technical or conversion gap 1", "gap 2"],
  "strengths": ["competitor strength 1", "competitor strength 2"],
  "weaknesses": ["competitor weakness or gap 1", "competitor weakness or gap 2"],
  "opportunities": ["opportunity for ${params.businessName} to differentiate 1", "opportunity 2"],
  "talkingPoints": ["sales talking point referencing this competitor 1", "talking point 2"],
  "coldOutreachHook": "1-sentence punchy cold email observation comparing prospect vs this competitor"
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
      marketPosition: parsed.marketPosition || "Market Player",
      estimatedMonthlyTraffic: parsed.estimatedMonthlyTraffic || "10k / mo",
      reviewProfile: parsed.reviewProfile || "80+ reviews (4.5★)",
      pricingModel: parsed.pricingModel || "Market Standard",
      adActivity: parsed.adActivity || "Active Digital Presence",
      techGaps: parsed.techGaps || [],
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || parsed.shortcomings || [],
      opportunities: parsed.opportunities || parsed.leverage || [],
      talkingPoints: parsed.talkingPoints || [],
      coldOutreachHook: parsed.coldOutreachHook || `Noticed ${params.competitorName} has some visible gaps in their funnel that ${params.businessName} can capitalize on.`
    }
  } catch {
    return {
      summary: `${params.competitorName} is an active player in the ${params.industry} space.`,
      marketPosition: "Market Competitor",
      estimatedMonthlyTraffic: "12k / mo",
      reviewProfile: "95 reviews (4.6★)",
      pricingModel: "Market Standard",
      adActivity: "Active Digital Presence",
      techGaps: ["Mobile load friction", "Missing retargeting pixel"],
      strengths: ["Established presence"],
      weaknesses: ["Limited personalisation"],
      opportunities: [`Position ${params.businessName} as the more responsive, modern alternative`],
      talkingPoints: [`Highlight what ${params.competitorName} doesn't offer that we do`],
      coldOutreachHook: `Noticed ${params.competitorName} is actively bidding on your core terms while leaving clear gaps in mobile conversion.`
    }
  }
}

export interface AIRebuttalResult {
  tacticalEmpathyLabel: string
  pivotAndProof: string
  closingQuestion: string
  fullScript: string
}

export async function generateAIRebuttal(params: {
  objection: string
  prospectContext?: string
  agencyName?: string
  playbookType?: string
  userId?: string | null
}): Promise<AIRebuttalResult | null> {
  const trainingBlock = await getTrainingBlock("REPLY", params.playbookType, params.userId)

  const prompt = `You are a master B2B sales negotiation coach trained in Chris Voss tactical empathy principles.
A prospect just gave this sales pushback / objection:

PROSPECT OBJECTION:
"${params.objection}"
${params.prospectContext ? `PROSPECT CONTEXT / INDUSTRY: ${params.prospectContext}` : ""}
${params.agencyName ? `AGENCY NAME: ${params.agencyName}` : ""}
${params.playbookType ? `AGENCY NICHE: ${params.playbookType}` : ""}
${trainingBlock ? `\n${trainingBlock}\n` : ""}

TASK:
Craft an elite, calm, non-needy response that dissolves the objection and opens the door for a frictionless micro-step.

RULES:
1. Label the constraint in the first 6-10 words (e.g. "Makes total sense you're heads-down on...", "Fair enough — if you're fully satisfied with your current team...").
2. Remove all sales pressure (zero arguing, zero feature dumping).
3. Offer a low-friction micro-resource or diagnostic (e.g. "Mind if I share a 2-minute checklist / audit for your team to use internally?").
4. End with a soft, no-oriented or low-friction closing question.
5. Max 50 words total for the full script.

Return ONLY a JSON object:
{
  "tacticalEmpathyLabel": "First sentence acknowledging their reality",
  "pivotAndProof": "Second sentence offering frictionless micro-value",
  "closingQuestion": "Low-friction closing question",
  "fullScript": "Complete natural spoken/written rebuttal (under 50 words)"
}`

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 350,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })
    const text = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    if (parsed.fullScript) {
      return parsed as AIRebuttalResult
    }
    return null
  } catch (err) {
    console.error("AI rebuttal generation failed:", err)
    return null
  }
}

export interface ClientReportNarrativeParams {
  campaignName: string
  industry: string
  metrics: Record<string, number | string>
  periodLabel: string
  clientGoal?: string | null
}

export async function generateReportNarrative(params: ClientReportNarrativeParams): Promise<string> {
  const metricsText = Object.entries(params.metrics).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ")
  const goalLine = params.clientGoal
    ? `\nClient's primary goal: ${params.clientGoal.replace(/_/g, " ")} — frame the results as progress toward this goal.`
    : ""
  const prompt = `Write a short, client-friendly performance summary (2-3 paragraphs) for a marketing/sales report.

Campaign: ${params.campaignName} (${params.industry})
Reporting period: ${params.periodLabel}
Metrics: ${metricsText}${goalLine}

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

/**
 * Resolves an agency's own AI config (core services, pricing, availability,
 * additional rules, active playbook's objection handlers) plus the training
 * directive block (platform-wide + this agency's own taught lessons) for a
 * given surface. Shared by every generation/refinement path so a company's
 * settings and trained lessons apply everywhere it writes on their behalf,
 * not just the original drafting call.
 */
export async function getAgencyGuidelinesBlock(
  userId: string | null | undefined,
  surface: "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR"
): Promise<string> {
  let block = ""
  try {
    let playbookType = "sales"
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          playbookType: true,
          agentGoal: {
            select: { personaConfig: true }
          }
        }
      })
      if (user) {
        if (user.playbookType) playbookType = user.playbookType
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
          block = `\n\n[AGENCY OBJECTIVES & SYSTEMS (AI CONFIG & PLAYBOOK)]\n`
          if (coreServices) block += `- Core Services: ${coreServices}\n`
          if (pricing) block += `- Pricing Details: ${pricing}\n`
          if (availability) block += `- Meeting Availability: ${availability}\n`
          if (additionalRules) block += `- Additional Guidelines: ${additionalRules}\n`
          if (objectionContext) {
            block += `- Active Playbook & Objection Handling Guidelines:\n${objectionContext}\n`
          }
          block += `\n(You MUST adapt your output — structure, service focus, value pitch, objection handling, and booking CTAs — to strictly align with these custom agency systems above.)`
        }
      }
    }

    // Always fetch training directives (platform-wide + agency-owned if user present)
    const trainingBlock = await getTrainingBlock(surface, playbookType, userId)
    if (trainingBlock) block += `\n${trainingBlock}`
  } catch (err) {
    console.error("Failed to fetch agency guidelines block:", err)
  }

  return block
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

  const agencyGuidelines = await getAgencyGuidelinesBlock(params.userId, "EMAIL")

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
    const parsed = parseEmailResponse(text, stepNumber)

    if (!parsed.body || !parsed.body.trim()) {
      const fallback = buildFallback(params, stepNumber)
      return { ...fallback, prompt }
    }

    return { ...parsed, prompt }
  } catch (err) {
    console.error("OpenAI error, using fallback:", err)
    const fallback = buildFallback(params, stepNumber)
    return { ...fallback, prompt }
  }
}

export async function generateAutoSearchQuery(params: {
  companyDesc: string
  personaConfig: any
  targetRegions?: string
  userId?: string
  trainingDirectives?: string | null
}): Promise<{ query: string; location: string } | null> {
  const trainingDirectives = params.trainingDirectives ?? (params.userId ? await getTrainingBlock("EMAIL", null, params.userId) : null)
  const prompt = buildAutoSearchQueryPrompt({ ...params, trainingDirectives })

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

export async function generateSmartOutboundHook(params: {
  companyName: string
  industry: string
  location: string
  rating?: number
  reviewCount?: number
  painPoints?: string[]
  decisionMakerName?: string | null
  decisionMakerTitle?: string | null
  userId?: string
  trainingDirectives?: string | null
}): Promise<string> {
  const trainingDirectives = params.trainingDirectives ?? (params.userId ? await getTrainingBlock("EMAIL", null, params.userId) : null)
  const prompt = buildSmartOutboundHookPrompt({ ...params, trainingDirectives })

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 100,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })
    const raw = res.choices[0]?.message?.content?.trim() || ""
    const clean = raw.replace(/^["'\s]+|["'\s]+$/g, "")
    if (clean && clean.length > 10 && clean.length < 250) {
      return clean
    }
  } catch (err) {
    console.error("Failed to generate smart hook with AI, using contextual fallback:", err)
  }

  // High-quality contextual fallback matrix (never repetitive)
  const loc = params.location ? ` in ${params.location}` : ""
  const { painPoints, rating, reviewCount, companyName } = params

  if (rating && rating >= 4.6 && (reviewCount || 0) > 20) {
    return `Saw ${companyName}'s standout ${rating}★ reputation across ${reviewCount} reviews${loc} — wanted to ask how your team is managing digital bookings.`
  }
  if (painPoints && painPoints.length > 0) {
    const p = painPoints[0].toLowerCase()
    if (p.includes("speed")) {
      return `Ran a quick performance check on ${companyName}'s mobile site${loc}; noticed some load lag on 4G that might be hurting local conversions.`
    }
    if (p.includes("ssl")) {
      return `Noticed an SSL security notice when visiting ${companyName}'s domain, which might be warning away local high-intent visitors.`
    }
    if (p.includes("pixel")) {
      return `Checked ${companyName}'s digital setup${loc}; noticed you're not retargeting warm visitors who leave without inquiring.`
    }
  }
  return `Reaching out regarding client acquisition and intake infrastructure for ${companyName}${loc}.`
}

/**
 * Drafts a LinkedIn connection note or message for a LINKEDIN_TASK pending
 * action. The user copies it into LinkedIn manually — there is no API send.
 */
export async function generateLinkedInMessage(params: {
  stepType: "LINKEDIN_CONNECT" | "LINKEDIN_MESSAGE"
  guideline: string
  senderName: string
  senderCompany: string
  senderCompanyDesc: string
  prospectFirstName: string
  prospectCompany: string
  industry: string
  companyResearch?: string | null
  userId?: string
  trainingDirectives?: string | null
}): Promise<string> {
  const trainingDirectives = params.trainingDirectives ?? (params.userId ? await getTrainingBlock("EMAIL", null, params.userId) : null)
  const prompt = buildLinkedInMessagePrompt({ ...params, trainingDirectives })
  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const text = res.choices[0]?.message?.content?.trim()
    if (text) {
      const maxLen = params.stepType === "LINKEDIN_CONNECT" ? 280 : 500
      return text.length > maxLen ? text.slice(0, maxLen - 1).trimEnd() + "…" : text
    }
  } catch (err) {
    console.error("Failed to generate LinkedIn message:", err)
  }
  // Fallback
  return params.stepType === "LINKEDIN_CONNECT"
    ? `Hi ${params.prospectFirstName} — came across ${params.prospectCompany} and liked what you're doing in ${params.industry}. I work with similar businesses at ${params.senderCompany}. Thought it'd be good to connect.`
    : `Hi ${params.prospectFirstName}, thanks for connecting. I help ${params.industry} businesses like ${params.prospectCompany} at ${params.senderCompany} — ${params.senderCompanyDesc}. Open to a quick chat sometime this week?`
}

/** Short internal pitch for a cross-sell opportunity card ("Galien Recommends"). */
export async function generateCrossSellPitch(params: {
  clientCompany: string
  industry: string
  currentServices: string[]
  suggestedService: string
  agencyName: string
}): Promise<string> {
  const prompt = buildCrossSellPitchPrompt(params)
  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 200,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })
    const text = res.choices[0]?.message?.content?.trim()
    if (text) return text
  } catch (err) {
    console.error("Failed to generate cross-sell pitch:", err)
  }
  return `${params.clientCompany} already trusts you with ${params.currentServices.join(" and ") || "their current work"} — that makes ${params.suggestedService} an easy next conversation. Raise it in your next check-in by tying it to a result they've already seen.`
}

export interface GeneratedSequenceStep {
  stepNumber: number
  delayDays: number
  label: string
  bodyTemplate: string
  stepType: "EMAIL" | "LINKEDIN_CONNECT" | "LINKEDIN_MESSAGE" | "WAIT"
}

export async function generateSequenceFromPreset(params: {
  companyName: string
  companyDesc: string
  playbookType: string
  tone: string
  presetName: string
  presetDescription: string
  stepsCount: number
}): Promise<GeneratedSequenceStep[]> {
  const prompt = buildSequencePresetPrompt(params)

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6000,
      // @ts-expect-error — AI thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })
    const text = response.choices[0]?.message?.content || "[]"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    return Array.isArray(parsed) ? (parsed as GeneratedSequenceStep[]) : []
  } catch (err) {
    console.error("AI sequence preset generation failed:", err)
    return []
  }
}

export interface GeneratedOperationalPreset {
  name: string
  steps: number
  description: string
  operationalSummary: string
  stepBreakdown: Array<{
    stepNumber: number
    dayDelay: number
    title: string
    directive: string
  }>
}

export async function generateOperationalPreset(params: {
  agencyName: string
  agencyDesc: string
  playbookType: string
  operationsOverview: string
  targetAudience?: string
  primaryHook?: string
  preferredSteps?: number
  tone?: string
}): Promise<GeneratedOperationalPreset | null> {
  const prompt = buildOperationalPresetPrompt({
    agencyName: params.agencyName,
    agencyDesc: params.agencyDesc,
    playbookType: params.playbookType,
    operationsOverview: params.operationsOverview,
    targetAudience: params.targetAudience,
    primaryHook: params.primaryHook,
    preferredSteps: params.preferredSteps || 3,
    tone: params.tone || "Direct & Consultative",
  })

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })
    const text = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    if (parsed.name && parsed.description) {
      return parsed as GeneratedOperationalPreset
    }
    return null
  } catch (err) {
    console.error("AI operational preset generation failed:", err)
    return null
  }
}

export async function suggestTargeting(params: {
  companyName: string
  companyDesc: string
  playbookType: string
}): Promise<{ verticals: string[]; platformOptions: string[] }> {
  const prompt = buildSuggestTargetingPrompt(params)

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 350,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })
    const text = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    return {
      verticals: Array.isArray(parsed.verticals) ? parsed.verticals.map((v: string) => v.toLowerCase()) : [],
      platformOptions: Array.isArray(parsed.platformOptions) ? parsed.platformOptions : [],
    }
  } catch (err) {
    console.error("Failed to suggest targeting via AI:", err)
    return { verticals: [], platformOptions: [] }
  }
}

export interface SocialPitchResult {
  dmMessage: string
  publicComment: string
  extractedNeed: string
  estimatedFit: "EXCELLENT" | "GOOD" | "MODERATE"
}

export async function generateSocialOutreachPitch(params: {
  postTitle: string
  postBody: string
  author: string
  platform: string
  subreddit?: string
  agencyName: string
  companyDesc: string
  flagshipOffer?: any
  calendarOrQuoteLink?: string | null
}): Promise<SocialPitchResult> {
  const prompt = buildSocialOutreachPrompt(params)
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 450,
      // @ts-expect-error
      thinking: { type: "disabled" },
    })
    const text = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
    return {
      dmMessage: parsed.dmMessage || `Hey! Saw your post looking for transport—we'd love to help out. Feel free to reach out for a quick quote!`,
      publicComment: parsed.publicComment || `Hey! We offer local private transport services with flat rates. Feel free to DM if you still need a driver!`,
      extractedNeed: parsed.extractedNeed || "Looking for reliable transportation / shuttle service.",
      estimatedFit: parsed.estimatedFit || "EXCELLENT",
    }
  } catch (err) {
    console.error("Failed to generate social outreach pitch:", err)
    return {
      dmMessage: `Hey ${params.author}! Saw your post about transportation. I manage ${params.agencyName}—we offer guaranteed on-time private rides with flat rates and no surge pricing. Feel free to shoot me a DM or check our instant quote link!`,
      publicComment: `Hey! If you're still looking for transportation, ${params.agencyName} provides private car & shuttle options with flat rates. Feel free to reach out!`,
      extractedNeed: "Transportation / vehicle service request",
      estimatedFit: "GOOD",
    }
  }
}


