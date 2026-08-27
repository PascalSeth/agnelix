import OpenAI from "openai"
import { getTrainingBlock, type TrainingSurface } from "./ai-training"
import { workspacePersonaPrompt } from "./workspaces"
import { HUMAN_WRITING_RULES } from "./prompts"
import { getMatchingExemplars, buildExemplarPromptBlock } from "./ai-exemplars"

// Interactive teaching engine for the superadmin Training Studio.
// simulateResponse runs the SAME stack as production (persona + human rules +
// learned lessons), so when a correction is distilled into a lesson and the
// scenario is retried, the improvement is real, not staged.

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

const SURFACE_TASK: Record<TrainingSurface, string> = {
  REPLY: "The scenario below is a message a prospect sent in reply to your outreach. Write the reply you would send in production. Format: first line 'Subject: …', then the body.",
  EMAIL: "The scenario below describes a prospect. Write the step-1 cold outreach email you would send in production. Format: first line 'Subject: …', then the body.",
  PROPOSAL: "The scenario below describes a client and what they need. Write the executive summary and 'Proposed Solution' section of the proposal you would generate in production.",
  ADVISOR: "The scenario below is a question the agency owner asked you in chat. Answer exactly as you would in the advisor chat.",
}

export interface AgencyProfile {
  senderName?: string | null
  senderTitle?: string | null
  senderCompany?: string | null
  senderService?: string | null
  tone?: string | null
  personaConfig?: { proposalPriceRange?: string; meetingAvailability?: string; coreServices?: string; additionalRules?: string } | null
  objectionHandlers?: unknown
}

/** Same "YOUR PROFILE" block production reply/email drafting builds — keeps the
 *  simulation grounded in this specific agency instead of inventing a business. */
function agencyProfileBlock(profile?: AgencyProfile | null): string {
  if (!profile) return ""

  let block = `\nYOUR AGENCY PROFILE — base every fact strictly on this, never invent a different business:
- Name: ${profile.senderName || "Alex"}${profile.senderTitle ? `, ${profile.senderTitle}` : ""}
- Company: ${profile.senderCompany || "your agency"}
- Business Bio / Description of Services: ${profile.senderService || "not provided"}
- Preferred Tone: ${profile.tone || "Professional"}
`

  const p = profile.personaConfig
  if (p && (p.proposalPriceRange || p.meetingAvailability || p.coreServices || p.additionalRules)) {
    block += "\n[AGENCY AI PERSONA RULES — follow strictly, above all other style guidelines]:\n"
    if (p.proposalPriceRange) block += `- Proposal Price Range: ${p.proposalPriceRange}\n`
    if (p.meetingAvailability) block += `- Meeting Availability: ${p.meetingAvailability}\n`
    if (p.coreServices) block += `- Core Services: ${p.coreServices}\n`
    if (p.additionalRules) block += `- Additional Rules: ${p.additionalRules}\n`
  }

  if (profile.objectionHandlers) {
    try {
      const handlers = (typeof profile.objectionHandlers === "string" ? JSON.parse(profile.objectionHandlers) : profile.objectionHandlers) as Array<{ objection: string; response: string }>
      if (Array.isArray(handlers) && handlers.length > 0) {
        block += `\n[PLAYBOOK OBJECTION HANDLING]:\n${handlers.map(h => `- Objection: "${h.objection}"\n  Response outline: "${h.response}"`).join("\n")}\n`
      }
    } catch {
      // malformed handlers — skip silently, never break the simulation
    }
  }

  return block
}

export async function simulateResponse(params: {
  surface: TrainingSurface
  scope: string // "global" or a playbook type
  scenario: string
  userId?: string | null // set = this agency's own trained lessons apply too
  agencyProfile?: AgencyProfile | null // set = ground the simulation in this specific agency's identity
}): Promise<string> {
  const playbookType = params.scope === "global" ? null : params.scope
  const trainingBlock = await getTrainingBlock(params.surface, playbookType, params.userId)
  const profileBlock = agencyProfileBlock(params.agencyProfile)
  const matchingExemplars = getMatchingExemplars({
    surface: params.surface,
    playbookType,
    queryText: params.scenario,
    limit: 2,
  })
  const exemplarBlock = buildExemplarPromptBlock(matchingExemplars, params.scenario, playbookType || undefined)

  const prompt = `${workspacePersonaPrompt(playbookType)}
${profileBlock}
You are in a TRAINING SIMULATION run by your trainer. Respond exactly as you would for a real ${params.surface.toLowerCase()} in production — same voice, same rules${profileBlock ? ", strictly grounded in the agency profile above" : ""}. Do not mention the simulation.

${SURFACE_TASK[params.surface]}
${params.surface === "REPLY" || params.surface === "EMAIL" ? HUMAN_WRITING_RULES : ""}${exemplarBlock}${trainingBlock}
SCENARIO:
${params.scenario.slice(0, 4000)}`

  const response = await openai.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 8000,
    // @ts-expect-error — DeepSeek thinking mode
    thinking: { type: "enabled" },
    reasoning_effort: "medium",
  })
  const content = response.choices[0]?.message?.content?.trim()
  if (content) return content

  const fallback = await openai.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    // @ts-expect-error — DeepSeek thinking mode
    thinking: { type: "disabled" },
  })
  return fallback.choices[0]?.message?.content?.trim() || "(no response generated)"
}

// ── Sparring simulator: the AI texts and replies to itself ────────────────────
// The agency side runs the REAL production stack (persona + human rules +
// learned lessons + playbook objection handlers). The prospect side is a
// separate role-played character, so weaknesses in the trained skill surface
// as real conversation failures the admin can teach from.

export interface SparMessage {
  role: "agency" | "prospect"
  text: string
}

function transcript(conversation: SparMessage[]): string {
  return conversation
    .map(m => `${m.role === "agency" ? "YOU (agency)" : "PROSPECT"}:\n${m.text}`)
    .join("\n---\n")
}

export async function simulateAgencyTurn(params: {
  scope: string // "global" or playbook type
  prospect: string
  conversation: SparMessage[]
  objectionHandlers?: string | null
}): Promise<string> {
  const playbookType = params.scope === "global" ? null : params.scope
  const isOpening = params.conversation.length === 0
  const trainingBlock = await getTrainingBlock(isOpening ? "EMAIL" : "REPLY", playbookType)

  const latestProspectMsg = params.conversation.filter(m => m.role === "prospect").pop()?.text ?? params.prospect
  const matchingExemplars = getMatchingExemplars({
    surface: isOpening ? "EMAIL" : "REPLY",
    playbookType,
    queryText: latestProspectMsg,
    limit: 2,
  })
  const exemplarBlock = buildExemplarPromptBlock(matchingExemplars, latestProspectMsg, playbookType || undefined)

  const objectionBlock = params.objectionHandlers
    ? `\n[PLAYBOOK OBJECTION HANDLING — if their message matches one of these, respond as outlined]:\n${params.objectionHandlers}\n`
    : ""

  const prompt = `${workspacePersonaPrompt(playbookType)}

You are in a live SPARRING SIMULATION run by the platform admin to test your trained skill. You are "Alex", writing on behalf of the agency. Perform exactly as you would in production — same voice, same rules. Never mention the simulation.

PROSPECT PROFILE:
${params.prospect.slice(0, 1500)}
${objectionBlock}
${isOpening
    ? "Write the step-1 cold outreach email to this prospect. Format: first line 'Subject: …', then the body."
    : `CONVERSATION SO FAR:\n${transcript(params.conversation).slice(-6000)}\n\nWrite your next reply to the prospect's latest message. Body only, no subject line.`}
${HUMAN_WRITING_RULES}${exemplarBlock}${trainingBlock}`

  const response = await openai.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 8000,
    // @ts-expect-error — DeepSeek thinking mode
    thinking: { type: "enabled" },
    reasoning_effort: "medium",
  })
  const content = response.choices[0]?.message?.content?.trim()
  if (content) return content

  const fallback = await openai.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    // @ts-expect-error — DeepSeek thinking mode
    thinking: { type: "disabled" },
  })
  return fallback.choices[0]?.message?.content?.trim() || "(no response)"
}

export type SparOutcome = "continue" | "booked" | "lost"

const PROSPECT_ATTITUDES: Record<string, string> = {
  skeptical: "You're skeptical of agencies — you've been burned before. You raise real objections (price, past bad experiences, 'we do it in-house'), reply briefly, and only warm up if they say something genuinely specific and credible about YOUR business.",
  busy: "You're extremely busy. One-line replies, sometimes curt, occasionally you ignore parts of their message. You only engage properly if they make it effortless and instantly relevant.",
  interested: "You're genuinely interested but cautious — you ask practical questions about pricing, process, and proof before committing to anything.",
  price_sensitive: "Everything comes back to cost for you. You push for discounts, compare them to cheaper freelancers, and resist retainers.",
  hostile: "You're annoyed by cold outreach. Your first reply is dismissive or sharp. You can be won over, but only by exceptional handling — grovelling or pushiness makes you opt out.",
}

export async function simulateProspectTurn(params: {
  prospect: string
  attitude: string
  conversation: SparMessage[]
}): Promise<{ text: string; outcome: SparOutcome }> {
  const attitudeRule = PROSPECT_ATTITUDES[params.attitude] ?? PROSPECT_ATTITUDES.skeptical

  const prompt = `You are role-playing a REAL business owner receiving cold outreach. Stay completely in character. You are NOT an assistant — you're a busy person judging whether this agency is worth your time.

WHO YOU ARE:
${params.prospect.slice(0, 1500)}

YOUR ATTITUDE: ${attitudeRule}

CONVERSATION SO FAR:
${transcript(params.conversation).slice(-6000)}

Write your next reply as this person. Realistic email register: often short, imperfect, no corporate polish. React to what they ACTUALLY said — reward specificity and credibility, punish generic pitching, pushiness, and ignored questions.

Decide where you stand after this exchange and end your message with exactly one tag on its own line:
[CONTINUE] — still talking, undecided
[BOOKED] — you just agreed to a meeting/call in this message
[LOST] — you're done; this message ends the conversation`

  const response = await openai.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
    max_tokens: 500,
    // @ts-expect-error — disable DeepSeek thinking for fast tasks
    thinking: { type: "disabled" },
  })
  const raw = response.choices[0]?.message?.content?.trim() || "(no reply)"
  const outcome: SparOutcome = /\[BOOKED\]/i.test(raw) ? "booked" : /\[LOST\]/i.test(raw) ? "lost" : "continue"
  const text = raw.replace(/\[(CONTINUE|BOOKED|LOST)\]/gi, "").trim()
  return { text, outcome }
}

export interface DistilledLesson {
  title: string
  instruction: string
  goodExample: string | null
  badExample: string | null
}

// Models sometimes wrap JSON in prose or code fences, or truncate — extract the
// outermost JSON value instead of trusting the raw response.
function extractJson<T>(text: string, kind: "array" | "object"): T {
  const open = kind === "array" ? "[" : "{"
  const close = kind === "array" ? "]" : "}"
  const start = text.indexOf(open)
  const end = text.lastIndexOf(close)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON ${kind} found in model response`)
  }
  return JSON.parse(text.slice(start, end + 1)) as T
}

export function sanitizeForPostgres(text: string): string {
  if (!text) return ""
  return text
    .replace(/\0/g, "")
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .trim()
}

/** Collapse PDF-extraction whitespace and strip null bytes so database and token budget are clean. */
export function normalizeDocText(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Turn an admin correction into a generalizable lesson the AI keeps forever. */
export async function distillLesson(params: {
  surface: TrainingSurface
  scenario: string
  aiResponse: string
  correction?: string | null
  feedback?: string | null
}): Promise<DistilledLesson> {
  const prompt = `You are a Principal AI Sales Alignment Engineer distilling a human trainer's correction into ONE permanent, high-impact lesson for a sales AI.

WHAT THE AI WAS ASKED (scenario, surface: ${params.surface}):
${params.scenario.slice(0, 2000)}

WHAT THE AI PRODUCED:
${params.aiResponse.slice(0, 2000)}
${params.correction ? `\nTHE TRAINER'S CORRECTED VERSION:\n${params.correction.slice(0, 2000)}\n` : ""}${params.feedback ? `\nTHE TRAINER'S FEEDBACK:\n${params.feedback.slice(0, 1000)}\n` : ""}

CORE DIRECT-RESPONSE & SALES PSYCHOLOGY TENETS:
- **Calm Consulting Authority**: Extract principles that maintain high status (no pleading, no groveling, no generic corporate fluff).
- **Pain, Proof, Plan**: Anchor the lesson in concrete customer pain, hard proof, and clear next steps.
- **Sell the Outcome, Not the Effort**: Focus on tangible results ($ gained, CAC reduced) over mechanical process.
- **Clarity Over Cleverness**: The instruction and example must be crisp, simple, and direct.

Extract the underlying principle the trainer is teaching — not just the surface edit. The lesson must generalize to future scenarios. Be specific and behavioral ("do X when Y").

Return ONLY valid JSON:
{
  "title": "<3-7 word punchy name for the lesson>",
  "instruction": "<one imperative sentence the AI must follow from now on>",
  "goodExample": "<short snippet showing it done right, adapted from the correction/feedback — or null>",
  "badExample": "<short snippet showing the mistake, taken from the AI's output — or null>"
}`

  const response = await openai.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    // @ts-expect-error — DeepSeek thinking mode
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  })
  const text = response.choices[0]?.message?.content || "{}"
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
  if (!parsed.instruction) throw new Error("Distillation produced no instruction")
  return {
    title: String(parsed.title || "Learned lesson").slice(0, 120),
    instruction: String(parsed.instruction),
    goodExample: parsed.goodExample ? String(parsed.goodExample) : null,
    badExample: parsed.badExample ? String(parsed.badExample) : null,
  }
}

function prepareBookContext(rawText: string, maxChars = 36000): string {
  const text = normalizeDocText(rawText)
  if (text.length <= maxChars) return text

  // Sample across 4 balanced quadrants of the book/document
  const segmentLen = Math.floor(maxChars / 4)
  const quarter = Math.floor(text.length / 4)

  const s1 = text.slice(0, segmentLen)
  const s2 = text.slice(quarter, quarter + segmentLen)
  const s3 = text.slice(quarter * 2, quarter * 2 + segmentLen)
  const s4 = text.slice(quarter * 3, quarter * 3 + segmentLen)

  return `--- SECTION 1 (FOUNDATIONS & OPENING) ---\n${s1}\n\n--- SECTION 2 (CORE FRAMEWORKS & MECHANICS) ---\n${s2}\n\n--- SECTION 3 (EXECUTION & STRATEGIES) ---\n${s3}\n\n--- SECTION 4 (ADVANCED TACTICS & CLOSING) ---\n${s4}`
}

/** Read a document (textbook chapter, sales guide, brand doc) and extract lessons. */
export async function distillDocument(params: {
  title: string
  text: string
}): Promise<DistilledLesson[]> {
  const bookContent = prepareBookContext(params.text, 36000)
  const prompt = `You are a master training engineer. Read the source material below and extract the core behavioral rules as permanent directives for a B2B sales/marketing AI that writes outreach emails, replies, and proposals for agencies.

SOURCE MATERIAL: "${params.title}"
${bookContent}

Extract 4 to 10 high-impact lessons. Each lesson must be:
- Actionable in writing sales communication (skip abstract theory)
- Generalizable to future conversations
- Specific and behavioral ("do X when Y")
- Include realistic good and bad examples

Return ONLY a valid JSON array matching this format:
[
  {
    "title": "<3-7 word name>",
    "instruction": "<one clear imperative sentence the AI must follow>",
    "goodExample": "<short realistic snippet showing it done right>",
    "badExample": "<short counter-example showing what to avoid>"
  }
]`

  let text = ""
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      // @ts-expect-error — DeepSeek thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })
    text = response.choices[0]?.message?.content?.trim() || ""
  } catch (err) {
    console.warn("[distillDocument] Primary DeepSeek call failed, attempting fallback:", err)
    text = ""
  }

  if (!text) {
    try {
      const fallback = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3500,
      })
      text = fallback.choices[0]?.message?.content?.trim() || "[]"
    } catch (err) {
      console.error("[distillDocument] Fallback DeepSeek call failed:", err)
      return []
    }
  }

  try {
    let parsed: any[] = []
    try {
      parsed = extractJson<any[]>(text, "array")
    } catch {
      const cleanJson = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
      parsed = JSON.parse(cleanJson)
    }

    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((l: { instruction?: unknown }) => typeof l.instruction === "string" && l.instruction)
      .slice(0, 10)
      .map((l: { title?: unknown; instruction: string; goodExample?: unknown; badExample?: unknown }) => ({
        title: String(l.title || "Lesson").slice(0, 120),
        instruction: String(l.instruction),
        goodExample: l.goodExample ? String(l.goodExample) : null,
        badExample: l.badExample ? String(l.badExample) : null,
      }))
  } catch (err) {
    console.error("[distillDocument] JSON parse error:", err, "Raw text:", text)
    return []
  }
}

export interface ReadingStep {
  stepIndex: number
  totalSteps: number
  startPage: number
  endPage: number
  totalPages: number
  title: string
  excerpt: string
  content: string
}

/**
 * Universal Page-by-Page Reading Engine for ANY book, playbook, or document.
 * Breaks down any document into structured reading steps of 4-7 pages each,
 * extracting live text excerpts, page numbers, and chapter names.
 */
export function groupPagesIntoReadingSteps(
  pages: Array<{ pageNum: number; text: string }>,
  targetPagesPerStep = 6
): ReadingStep[] {
  if (!pages || pages.length === 0) return []

  const totalPages = pages[pages.length - 1]?.pageNum || pages.length
  const steps: ReadingStep[] = []
  let currentPages: Array<{ pageNum: number; text: string }> = []
  let currentLen = 0

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    currentPages.push(page)
    currentLen += page.text.length

    // Complete a step if we hit target page count, accumulated ~6,000 characters, or reached end
    if (currentPages.length >= targetPagesPerStep || currentLen >= 5500 || i === pages.length - 1) {
      const startPage = currentPages[0].pageNum
      const endPage = currentPages[currentPages.length - 1].pageNum
      const combinedText = currentPages.map(p => p.text).join("\n\n")

      // Extract a descriptive title from headings or lines
      const lines = combinedText.split("\n").map(l => l.trim()).filter(l => l.length > 5)
      let chapterTitle = ""
      const headingCandidate = lines.find(l =>
        /(?:chapter|section|part|secret|rule|principle|module|step|phase|#)/i.test(l) && l.length < 85
      )
      if (headingCandidate) {
        chapterTitle = headingCandidate.replace(/^[#\s\r\n]+|[#\s\r\n]+$/g, "")
      } else if (lines[0] && lines[0].length < 70) {
        chapterTitle = lines[0]
      } else {
        chapterTitle = `Pages ${startPage}–${endPage}`
      }

      // Generate a clean live excerpt for the UI (180-260 chars)
      const cleanExcerpt = combinedText
        .replace(/\s+/g, " ")
        .slice(0, 240)
        .trim()

      steps.push({
        stepIndex: steps.length + 1,
        totalSteps: 0,
        startPage,
        endPage,
        totalPages,
        title: chapterTitle,
        excerpt: cleanExcerpt ? `“${cleanExcerpt}…”` : "",
        content: combinedText,
      })

      currentPages = []
      currentLen = 0
    }
  }

  const finalSteps = steps.map(s => ({ ...s, totalSteps: steps.length }))
  return finalSteps.length > 0 ? finalSteps : [{
    stepIndex: 1,
    totalSteps: 1,
    startPage: 1,
    endPage: totalPages,
    totalPages,
    title: `Pages 1–${totalPages}`,
    excerpt: "",
    content: pages.map(p => p.text).join("\n\n"),
  }]
}

export interface BookSection {
  index: number
  title: string
  content: string
}

/** Split a book or document into distinct, structured sections/chapters for incremental learning. */
export function splitBookIntoSections(rawText: string, targetSectionChars = 6000): BookSection[] {
  const text = normalizeDocText(rawText)
  if (text.length <= 1500) {
    return [{ index: 1, title: "Full Document", content: text }]
  }

  // 1. Enhanced Heading & Chapter regex (captures SECRET #1, SECTION ONE, CHAPTER 1, etc.)
  const headingRegex = /(?:(?:\r?\n|^)\s*(?:SECTION|SECRET|CHAPTER|PART|MODULE|STEP|PHASE|LESSON|BONUS|PRINCIPLE|RULE)\s+(?:#\s*|NO\.?\s*)?[0-9IVXLCDM]+[^\r\n]*|(?:\r?\n|^)#{1,3}\s+[^\r\n]+)/gi
  const matches = [...text.matchAll(headingRegex)]

  if (matches.length >= 2) {
    const rawSections: Array<{ title: string; content: string }> = []
    if (matches[0].index && matches[0].index > 400) {
      rawSections.push({
        title: "Introduction & Foundations",
        content: text.slice(0, matches[0].index).trim(),
      })
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const nextMatch = matches[i + 1]
      const start = match.index!
      const end = nextMatch ? nextMatch.index! : text.length
      const heading = match[0].replace(/^[#\s\r\n]+|[#\s\r\n]+$/g, "").slice(0, 80)
      const content = text.slice(start, end).trim()
      if (content.length > 150) {
        rawSections.push({ title: heading, content })
      }
    }

    // If any section is excessively long (> 10,000 chars), subdivide it into digestible chapters
    const finalSections: BookSection[] = []
    for (const sec of rawSections) {
      if (sec.content.length > 10000) {
        const subChunks = chunkTextByLength(sec.content, 6000)
        subChunks.forEach((sub, subIdx) => {
          finalSections.push({
            index: finalSections.length + 1,
            title: `${sec.title} (Part ${subIdx + 1})`,
            content: sub,
          })
        })
      } else {
        finalSections.push({
          index: finalSections.length + 1,
          title: sec.title,
          content: sec.content,
        })
      }
    }

    if (finalSections.length >= 2) return finalSections
  }

  // 2. Length-based chunking fallback (every ~5,000 - 6,000 chars along lines/paragraphs)
  const chunks = chunkTextByLength(text, targetSectionChars)
  return chunks.map((c, i) => {
    const firstLine = c.split("\n")[0].replace(/[^\w\s:—–-]/g, "").trim().slice(0, 50)
    return {
      index: i + 1,
      title: firstLine ? `Chapter ${i + 1}: ${firstLine}…` : `Chapter ${i + 1}`,
      content: c,
    }
  })
}

function chunkTextByLength(text: string, targetChars = 6000): string[] {
  const lines = text.split(/\n/)
  const chunks: string[] = []
  let current: string[] = []
  let currentLen = 0

  for (const line of lines) {
    current.push(line)
    currentLen += line.length + 1
    if (currentLen >= targetChars) {
      chunks.push(current.join("\n").trim())
      current = []
      currentLen = 0
    }
  }
  if (current.length > 0) {
    const remaining = current.join("\n").trim()
    if (remaining.length > 100) chunks.push(remaining)
  }
  return chunks.length > 0 ? chunks : [text]
}

/** Distill 1 to 4 specific behavioral rules from a single section/chapter. */
export async function distillSection(params: {
  bookTitle: string
  sectionTitle: string
  text: string
}): Promise<DistilledLesson[]> {
  const prompt = `You are a master training engineer. Read this specific chapter/section from "${params.bookTitle}" and extract 2 to 4 permanent, high-impact behavioral directives for a B2B sales/marketing AI.

BOOK: "${params.bookTitle}"
CHAPTER / SECTION: "${params.sectionTitle}"
${params.text.slice(0, 14000)}

Extract 2 to 4 practical, actionable lessons. Each lesson must be:
- Actionable in writing sales communication (skip general background theory)
- Specific and behavioral ("do X when Y")
- Include realistic good and bad examples

Return ONLY a valid JSON array matching this format:
[
  {
    "title": "<3-7 word name>",
    "instruction": "<one clear imperative sentence the AI must follow>",
    "goodExample": "<short realistic snippet showing it done right>",
    "badExample": "<short counter-example showing what to avoid>"
  }
]`

  let text = ""
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2500,
      // @ts-expect-error — DeepSeek thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })
    text = response.choices[0]?.message?.content?.trim() || ""
  } catch (err) {
    console.warn("[distillSection] Primary DeepSeek call failed, attempting fallback:", err)
    text = ""
  }

  if (!text) {
    try {
      const fallback = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
      })
      text = fallback.choices[0]?.message?.content?.trim() || "[]"
    } catch (err) {
      console.error("[distillSection] Fallback call failed:", err)
      return []
    }
  }

  try {
    let parsed: any[] = []
    try {
      parsed = extractJson<any[]>(text, "array")
    } catch {
      const cleanJson = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
      parsed = JSON.parse(cleanJson)
    }

    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((l: { instruction?: unknown }) => typeof l.instruction === "string" && l.instruction)
      .slice(0, 4)
      .map((l: { title?: unknown; instruction: string; goodExample?: unknown; badExample?: unknown }) => ({
        title: String(l.title || "Lesson").slice(0, 120),
        instruction: String(l.instruction),
        goodExample: l.goodExample ? String(l.goodExample) : null,
        badExample: l.badExample ? String(l.badExample) : null,
      }))
  } catch (err) {
    console.error("[distillSection] JSON parse error:", err, "Raw text:", text)
    return []
  }
}

export interface MasterDirective {
  title: string
  instruction: string
  goodExample: string | null
  badExample: string | null
  surface: "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR" | "ALL"
  sourceRef: string
}

/**
 * Pass 3 Synthesis: Consolidates and deduplicates raw lessons from all chapters
 * into 12 to 25 pristine, highly-concentrated master behavioral directives.
 * Automatically classifies each rule to its optimal surface (EMAIL, REPLY, PROPOSAL, ADVISOR, ALL).
 */
export async function synthesizeMasterDirectives(params: {
  bookTitle: string
  rawLessons: Array<{
    title: string
    instruction: string
    goodExample?: string | null
    badExample?: string | null
    sourceRef?: string
  }>
  defaultSurface?: string
}): Promise<MasterDirective[]> {
  if (!params.rawLessons || params.rawLessons.length === 0) return []

  if (params.rawLessons.length <= 6) {
    return params.rawLessons.map(l => ({
      title: l.title,
      instruction: l.instruction,
      goodExample: l.goodExample || null,
      badExample: l.badExample || null,
      surface: (params.defaultSurface as never) || "ALL",
      sourceRef: l.sourceRef || params.bookTitle,
    }))
  }

  const prompt = `You are a Principal AI Sales Alignment Engineer.
We have read through the entire book "${params.bookTitle}" and extracted raw lessons across all chapters.

RAW LESSONS EXTRACTED FROM BOOK (${params.rawLessons.length} total):
${JSON.stringify(params.rawLessons.map((l, idx) => ({ id: idx + 1, title: l.title, rule: l.instruction, source: l.sourceRef })), null, 2)}

YOUR TASK (PASS 3 MASTER SYNTHESIS):
1. Deduplicate, sharpen, and consolidate these raw lessons into 12 to 24 HIGH-IMPACT MASTER DIRECTIVES.
2. Filter out fluffy or vague advice ("be nice", "follow up often"). Keep only sharp, non-obvious psychological tactics, scripts, objection reframes, and offer structures.
3. Automatically categorize each directive into its most effective generation surface:
   - "EMAIL" — Cold outreach hooks, lead magnet framing, pattern interrupts, curiosity subject lines.
   - "REPLY" — Prospect objection handling, price pushback, tactical empathy, scheduling friction removal.
   - "PROPOSAL" — Offer structure, value ladders, bonus stacking, risk reversal, tiering.
   - "ADVISOR" — Agency mindset, positioning, high-level client strategy.
   - "ALL" — Universal tone and communication rules.

Return ONLY a valid JSON array matching this exact format:
[
  {
    "title": "<3-7 word punchy title>",
    "instruction": "<one imperative behavioral sentence the AI must execute>",
    "goodExample": "<realistic concrete email/reply/proposal snippet showing it done right>",
    "badExample": "<realistic counter-example showing the common rookie agency mistake>",
    "surface": "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR" | "ALL",
    "sourceRef": "<chapter or page citation from the raw lessons>"
  }
]`

  let text = ""
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 5000,
      // @ts-expect-error — DeepSeek thinking mode
      thinking: { type: "enabled" },
      reasoning_effort: "high",
    })
    text = response.choices[0]?.message?.content?.trim() || ""
  } catch (err) {
    console.warn("[synthesizeMasterDirectives] Primary model failed, trying fallback:", err)
    text = ""
  }

  if (!text) {
    try {
      const fallback = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      })
      text = fallback.choices[0]?.message?.content?.trim() || "[]"
    } catch {
      return params.rawLessons.slice(0, 20).map(l => ({
        title: l.title,
        instruction: l.instruction,
        goodExample: l.goodExample || null,
        badExample: l.badExample || null,
        surface: "ALL",
        sourceRef: l.sourceRef || params.bookTitle,
      }))
    }
  }

  try {
    let parsed: any[] = []
    try {
      parsed = extractJson<any[]>(text, "array")
    } catch {
      const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()
      parsed = JSON.parse(clean)
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return params.rawLessons.slice(0, 20).map(l => ({
        title: l.title,
        instruction: l.instruction,
        goodExample: l.goodExample || null,
        badExample: l.badExample || null,
        surface: "ALL",
        sourceRef: l.sourceRef || params.bookTitle,
      }))
    }

    const VALID_SURFACES = ["EMAIL", "REPLY", "PROPOSAL", "ADVISOR", "ALL"]

    return parsed
      .filter((l: { instruction?: unknown }) => typeof l.instruction === "string" && l.instruction)
      .slice(0, 28)
      .map((l: any) => {
        const rawSurf = typeof l.surface === "string" ? l.surface.toUpperCase().trim() : "ALL"
        const surface = VALID_SURFACES.includes(rawSurf) ? (rawSurf as any) : "ALL"
        return {
          title: String(l.title || "Master Directive").slice(0, 120),
          instruction: String(l.instruction),
          goodExample: l.goodExample ? String(l.goodExample) : null,
          badExample: l.badExample ? String(l.badExample) : null,
          surface,
          sourceRef: String(l.sourceRef || params.bookTitle).slice(0, 200),
        }
      })
  } catch (err) {
    console.error("[synthesizeMasterDirectives] JSON parse error:", err)
    return params.rawLessons.slice(0, 20).map(l => ({
      title: l.title,
      instruction: l.instruction,
      goodExample: l.goodExample || null,
      badExample: l.badExample || null,
      surface: "ALL",
      sourceRef: l.sourceRef || params.bookTitle,
    }))
  }
}

