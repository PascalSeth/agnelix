/**
 * Shared humanization layer injected into every conversational prompt
 * (outreach steps, reply drafts, advisor). One source of truth for what
 * "doesn't sound like an AI" means in Galien.
 */
export const HUMAN_WRITING_RULES = `
SOUND HUMAN & HIGH-CONVERTING — CORE PRINCIPLES (DIRECT-RESPONSE & CONVERSION PSYCHOLOGY):
1. BREVITY & PACING: Hard word limits. If a prospect wrote 1-2 lines, reply in 25-50 words maximum. Never send three dense corporate paragraphs to a brief email.
2. LEAD WITH DREAM OUTCOME & ACUTE PAIN:
   - Open with an acute, currently-felt bottleneck or financial/operational leak, not your product features or company bio.
   - Sell the transformation and economic outcome ($ saved/earned, CAC reduction, pipeline predictability), never the process or effort.
3. PAIN, PROOF, PLAN:
   - Open with the problem the buyer already feels, back it with a credible proof point or metric, and offer a concrete 1-sentence micro-step.
4. TACTICAL EMPATHY & CALM CONSULTING AUTHORITY:
   - In the first 6-10 words of replies, validate and label their exact constraint ("Makes total sense you're handling this in-house right now", "Fair enough — if you're happy with your current agency, stick with them").
   - Never fight the objection. Label it, remove pressure, and offer a frictionless micro-step (DIY teardown, 2-sentence case study, or quick insight).
5. CLARITY BEATS CLEVERNESS:
   - Use plain, unambiguous language. Speak as an insider peer who has sat in their seat, not an external marketer with a script.
   - Speak to ONE person only, addressing their specific role and operational reality.
6. BANNED OPENERS: "I hope this finds you well", "I hope you're doing well", "I wanted to reach out", "I wanted to follow up", "Just checking in", "Just circling back", "Touching base", "Thanks for your prompt response", "I trust this email", "Thank you for getting back to me".
7. BANNED BUZZWORDS & CHEESY SALES CLICHÉS: "delve", "streamline", "leverage", "synergy", "elevate", "unlock", "game-changer", "seamless", "robust", "cutting-edge", "at your earliest convenience", "please don't hesitate", "I'd be more than happy", "as per my previous email", "I understand your concern", "It sounds like you're saying", "In today's fast-paced digital world", "supercharge", "holistic", "or should I leave you in peace", "let me know if you can spare 15 minutes", "top-of-funnel infrastructure".
8. CONVERSATION HYGIENE:
   - Never sound like a scripted template. Speak as a calm, intelligent peer consultant.
   - Never restate or paraphrase their message back at them.
   - Punctuation: no exclamation marks, no bullet points in casual replies, no bold markdown, no emoji.
   - Maximum ONE question or call-to-action in the entire message.
   - Varied sign-offs: "Best", "Thanks", "Cheers", or just your first name. Never "Warm regards" or "Kind regards".
   - Small, dry acknowledgements are good ("Fair enough.", "Makes sense."). Fake corporate enthusiasm is forbidden.
9. NO INVENTED FACTS: Never invent random case studies or pricing. Anchor strictly to the agency profile and active user training directives.
10. LOCATION ACCURACY & REGIONAL INTEGRITY (CRITICAL):
   - NEVER assume or claim that the prospect, their platform, or their shoppers/customers are based in the UK, US, or any specific country/region unless explicitly stated in the prospect's company research, address, or country data.
   - If the prospect is in Ghana, Nigeria, Africa, Europe, US, or elsewhere, strictly respect their actual region and geography.
   - If their geographic location is unknown or not explicitly provided, use geography-neutral phrasing such as "online shoppers", "prospective buyers", "potential customers", or "businesses in your market" rather than inventing a country.
11. RECIPIENT GREETING INTEGRITY (CRITICAL):
   - NEVER write "Hi contact,", "Hi info,", "Hi admin,", "Hi team,", "Dear Sir/Madam,", or use generic email prefix words as a person's name.
   - If the prospect's actual human first name is unknown or missing, open naturally with "Hi there," or "Hello," or start directly with the first observation without a greeting line.
`


export interface FlagshipOffer {
  name: string
  transformation: string
  deliverable: string
}

export interface EmailPromptParams {
  userId?: string
  senderName: string
  senderTitle: string
  senderCompany: string
  senderCompanyDesc: string
  prospectFirstName: string
  prospectLastName: string
  prospectTitle: string
  prospectCompany: string
  prospectCompanyDesc: string
  industry: string
  recentNews: string
  painPoint: string
  tone: string
  approach?: string
  rating?: number | null
  reviewCount?: number | null
  auditData?: {
    ssl: boolean
    speed: number
    pixel: boolean
    mobile: boolean
    googleAnalytics: boolean
    googleTagManager: boolean
    noMetaDesc: boolean
  } | null
  companyResearch?: string
  subjectTemplate?: string | null
  bodyTemplate?: string | null
  previousEmailBody?: string | null
  previousEmailSubject?: string | null
  calendarLink?: string | null
  // SMM playbook additions — all optional so existing callers keep working
  flagshipOffer?: FlagshipOffer | null
  clientGoal?: string | null
  socialAuditSummary?: string | null
}

function flagshipOfferBlock(p: EmailPromptParams): string {
  if (!p.flagshipOffer?.name) return ""
  return `
FLAGSHIP OFFER (the agency's signature offer — lead with this):
- Name: ${p.flagshipOffer.name}
- Transformation it promises: ${p.flagshipOffer.transformation}
- What the prospect gets: ${p.flagshipOffer.deliverable}
Instruction: Frame the value proposition and CTA around this flagship offer. Present it as something concrete and exciting the prospect can say yes to — not a generic "services" pitch. Anchor it to the specific research findings about their business.
`
}

function clientGoalLine(p: EmailPromptParams): string {
  if (!p.clientGoal) return ""
  const goal = p.clientGoal.replace(/_/g, " ")
  return `\n- Prospect's primary goal for this engagement: ${goal} — angle the pitch and outcome language around achieving this.`
}

function socialAuditLine(p: EmailPromptParams): string {
  if (!p.socialAuditSummary) return ""
  return `\n- Social media presence findings: ${p.socialAuditSummary}`
}

function formatProspectIdentity(p: EmailPromptParams): string {
  const firstName = p.prospectFirstName?.trim()
  const lastName = p.prospectLastName?.trim()
  const hasValidName = firstName && !["contact", "info", "admin", "support", "hello", "team", "sales", "enquiries", "office", "undefined", "null", "none", "unknown", "lead", "prospect"].includes(firstName.toLowerCase())
  
  if (hasValidName) {
    return `- Name: ${firstName} ${lastName || ""}`.trim()
  }
  return `- Name: Unknown / Not provided. GREETING RULE: DO NOT write "Hi contact,", "Hi info,", "Hi admin,", or any placeholder word. Open with "Hi there," or "Hello," or open directly with the first sentence observation.`
}

export function buildStep1Prompt(p: EmailPromptParams): string {
  let approachInstructions = ""

  if (p.approach === "website" && p.auditData) {
    const audit = p.auditData
    let issue = "", consequence = ""
    if (!audit.ssl) {
      issue = "the site is showing as 'Not Secure' in Chrome"
      consequence = "for a service where someone needs to trust you quickly, that warning is a credibility problem before they've read a word"
    } else if (audit.speed > 4000) {
      issue = `the site takes ${(audit.speed / 1000).toFixed(1)} seconds to load`
      consequence = "on mobile — which is where most local searches happen — that's past the point where most people leave"
    } else if (audit.speed > 2500) {
      issue = `load time is around ${(audit.speed / 1000).toFixed(1)} seconds`
      consequence = "it's in the range where Google starts penalising rankings and visitors start leaving before the page finishes"
    } else if (!audit.mobile) {
      issue = "the site doesn't render properly on mobile"
      consequence = "given that the majority of local searches come from phones, that's a meaningful number of potential customers hitting a broken page"
    } else if (!audit.googleAnalytics && !audit.googleTagManager) {
      issue = "there's no analytics set up on the site"
      consequence = "which means there's no visibility on how many people are finding the site, where they're coming from, or whether they're converting"
    } else if (!audit.pixel) {
      issue = "there's no retargeting pixel"
      consequence = "so any ad spend they run is reaching people once and then losing them — no way to follow up with visitors who didn't convert"
    } else if (audit.noMetaDesc) {
      issue = "the site has no meta description"
      consequence = "Google writes it for them based on whatever text it finds, which often looks poor in search results and hurts click-through"
    } else {
      issue = "the site is technically sound"
      consequence = "the opportunity is more about converting the traffic they're already getting"
    }

    approachInstructions = `
LEAD TECHNICAL OBSERVATION (Website Audit):
- Finding: ${issue} — ${consequence}
- Guidance: Use this concrete technical finding as supporting proof or a relevant personalization hook in the email.
`
  } else if (p.approach === "local-rank" && (p.rating !== undefined || p.reviewCount !== undefined)) {
    const rating = p.rating
    const reviewCount = p.reviewCount
    let obs = ""
    if (rating && rating < 3.8) {
      obs = `the ${rating}-star rating sits below the 4.0 mark — in local search, that's often the threshold where potential customers stop and second-guess themselves before clicking`
    } else if (reviewCount && reviewCount < 15) {
      obs = `with ${reviewCount} Google reviews, the profile is thin — new customers looking for social proof don't have much to go on`
    } else if (rating && reviewCount) {
      obs = `${rating} stars across ${reviewCount} reviews — solid, but in competitive local search that positioning leaves some room to move up the pack`
    } else {
      obs = `the Google presence is limited for the area — there's clear room to improve visibility`
    }

    approachInstructions = `
APPROACH STYLE: Local Rank / Google Reviews
Observation: ${obs}
Instruction: You MUST reference their Google Maps rating/reviews profile in the opening. Frame it as a business observation (not criticism) and connect it to what they do.
`
  } else if (p.approach === "competitor") {
    approachInstructions = `
APPROACH STYLE: Competitor Market Gap
Instruction: You MUST frame the hook around differentiation and competitor market gaps:
- Focus on how competing businesses in their niche are capturing high-value clients and how to position their agency/practice as the premier choice.
`
  } else if (p.approach === "question") {
    approachInstructions = `
APPROACH STYLE: Diagnostic Problem Question
Instruction: You MUST open with a single, highly specific consultative question about their customer acquisition or operational workflow:
- No fluff. Ask directly how they are currently handling customer acquisition in their territory.
`
  } else if (p.approach === "industry") {
    approachInstructions = `
APPROACH STYLE: Industry Regulatory or Technological Shift
Instruction: You MUST frame the hook around modernizing their practice/business to meet evolving client expectations and industry standards in their region.
`
  } else if (p.approach === "local-neighbor") {
    approachInstructions = `
APPROACH STYLE: Local Proximity Marketing / Neighbor Outreach
Instruction: You MUST frame the email as a warm, friendly invitation from a neighboring local business (such as a restaurant, cafe, bar, or salon).
- Mention you are just a short walk or drive away (e.g. "we are just down the street" or "just a couple of blocks from your office at ${p.prospectCompany}").
- Offer a local neighbor special (e.g., a 15% discount for local employees, a free catering sampler, or a lunch deal).
- Keep it highly conversational, inviting, and community-focused (B2C / B2B2C). Do NOT use stiff B2B sales jargon or pitch marketing/software services.
`
  }

  let templateInstructions = ""
  if (p.subjectTemplate || p.bodyTemplate) {
    templateInstructions = `
PRIMARY SEQUENCE DIRECTIVE (FROM OUTREACH PRESET / TEMPLATE):
The user has configured this specific strategic directive for Step 1:
${p.subjectTemplate ? `- Recommended Subject Line: ${p.subjectTemplate}` : ""}
${p.bodyTemplate ? `- Step 1 Strategic Directive: ${p.bodyTemplate}` : ""}

SYNTHESIS RULE:
Treat the above sequence directive as the PRIMARY angle and narrative driver of this email. Seamlessly weave in the prospect's company research, technical audit findings, and local context to execute this directive naturally.
`
  }

  return `You are an expert B2B cold email copywriter. Write a personalized email that gets a reply.
${templateInstructions}${flagshipOfferBlock(p)}
SENDER:
- Name: ${p.senderName}
- Title: ${p.senderTitle}
- Company: ${p.senderCompany}
- Company does: ${p.senderCompanyDesc}

PROSPECT:
${formatProspectIdentity(p)}
- Title: ${p.prospectTitle}
- Company: ${p.prospectCompany}
- Company does: ${p.prospectCompanyDesc}
- Industry: ${p.industry}
${p.companyResearch ? `\nIN-DEPTH COMPANY RESEARCH:\n${p.companyResearch}\n` : ""}
PERSONALIZATION RESEARCH:
- Recent company activity: ${p.recentNews || "Not available"}
- Likely pain point: ${p.painPoint || "Not available"}
- Google Maps Rating: ${p.rating || "unknown"}
- Google Review Count: ${p.reviewCount || "unknown"}
- Website speed/technical standings: ${p.auditData ? `SSL: ${p.auditData.ssl ? "Secure" : "Not Secure"}, Mobile speed: ${p.auditData.speed}ms, Mobile optimized: ${p.auditData.mobile ? "Yes" : "No"}, GA/GTM tags: ${p.auditData.googleAnalytics || p.auditData.googleTagManager ? "Present" : "Missing"}` : "Not checked"}${socialAuditLine(p)}${clientGoalLine(p)}${approachInstructions}

RULES:
1. Subject: 4-7 words, curiosity-driven. ${p.approach === "local-neighbor" ? "Frame it as a friendly neighbor introduction or invitation (e.g., 'Hello from your neighbor [Sender Company]' or 'Lunch for the [Prospect Company] team')." : "NO: 'Free', 'Guarantee', 'Act Now', 'Limited Time'"}
2. Opening: ONE sentence only. Mention something specific about THEIR company or role using the research findings.
3. Body: 2-3 short sentences. ${p.approach === "local-neighbor" ? "Introduce your local business and the special offer you're extending." : "Identify their pain point. Hint at your solution. Don't sell hard."}
4. CTA: Soft ask. ${p.approach === "local-neighbor" ? "Use an invitation-focused ask (e.g., 'Hope to see you soon!' / 'Would you like me to drop off a menu?' / 'Feel free to drop by this week!')" : "Use ONE of these: 'Worth a brief chat?' / 'Open to exploring this?' / 'Mind if I send over a quick example?'"}
5. Tone: ${p.tone}
6. Total length: Under 120 words.
7. NO exclamation marks, all caps, multiple questions, or attachments.
8. Write like a human, not a marketer. No buzzwords: "synergy", "leverage", "optimize", "solution"
9. Use the IN-DEPTH COMPANY RESEARCH if provided to personalize the hook and value proposition to their business model and actual geographic region.
10. Variations: Do not use a static template structure. Vary the wording, opening transitions, and phrasing dynamically so that no two emails look identical. Make each output unique and authentic to the specific prospect's business context.
11. Booking/Calendar link: If the template (custom or follow-up) requires a calendar booking link, or if you decide it fits, use "${p.calendarLink || "our scheduling page"}" as the booking URL. Do not write placeholder links.
${HUMAN_WRITING_RULES}
FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Subject: [subject line]

[email body]

Best,
${p.senderName}`
}

export function buildStep2Prompt(p: EmailPromptParams): string {
  let templateInstructions = ""
  if (p.subjectTemplate || p.bodyTemplate) {
    templateInstructions = `
CUSTOM TEMPLATE / GUIDELINE INSTRUCTION:
The user has configured a custom base template or guideline for this follow-up step:
${p.subjectTemplate ? `- Subject: ${p.subjectTemplate}` : ""}
${p.bodyTemplate ? `- Body directive: ${p.bodyTemplate}` : ""}

Instruction: Adapt and personalize these directives naturally for the prospect, keeping it concise and human.
`
  }

  const previousContext = p.previousEmailBody
    ? `\nPREVIOUS UNREPLIED EMAIL SENT (FOR THREAD CONTEXT — DO NOT REPEAT IT WORD-FOR-WORD):\n${p.previousEmailBody}\n`
    : ""

  return `You are an elite B2B sales copywriter writing a high-converting Step 2 follow-up email to an UNREPLIED prospect.

${templateInstructions}${previousContext}
SENDER:
- Name: ${p.senderName}
- Title: ${p.senderTitle}
- Company: ${p.senderCompany} (${p.senderCompanyDesc})

PROSPECT:
${formatProspectIdentity(p)}
- Title: ${p.prospectTitle}
- Company: ${p.prospectCompany}
- Company does: ${p.prospectCompanyDesc}
- Industry: ${p.industry}
${p.companyResearch ? `\nIN-DEPTH COMPANY RESEARCH:\n${p.companyResearch}\n` : ""}
PERSONALIZATION RESEARCH:
- Recent company activity: ${p.recentNews || "Not available"}
- Pain point: ${p.painPoint || "Not available"}
- Google Maps Rating: ${p.rating || "unknown"}
- Google Review Count: ${p.reviewCount || "unknown"}
- Website speed/technical standings: ${p.auditData ? `SSL: ${p.auditData.ssl ? "Secure" : "Not Secure"}, Mobile speed: ${p.auditData.speed}ms, Mobile optimized: ${p.auditData.mobile ? "Yes" : "No"}` : "Not checked"}${socialAuditLine(p)}${clientGoalLine(p)}

UNREPLIED FOLLOW-UP RULES (CRITICAL):
1. BANNED WEAK CLICHÉS: NEVER start with or use "Just following up", "Wanted to bump this", "Checking in", "Did you see my note?", "Touching base", "Any thoughts?", or "Reaching back out".
2. FRESH ANGLE & VALUE-ADD: Offer a fresh, concrete observation or a frictionless micro-resource (e.g., offering a 2-minute breakdown, a specific quick teardown, or sharing how similar ${p.industry} platforms solved this gap) that builds logically on the first note.
3. CONCISE: 2-3 short sentences maximum (under 60 words total).
4. ZERO-PRESSURE CTA: End with a low-friction question (e.g. "Still a priority for ${p.prospectCompany} this quarter?" or "Worth sending a quick 2-minute breakdown?" or "Open to taking a look?").
5. TONE: Calm, consultative, peer-to-peer.
6. LOCATION ACCURACY: Respect their actual country/geography strictly.
${HUMAN_WRITING_RULES}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Subject: ${p.previousEmailSubject ? (p.previousEmailSubject.toLowerCase().startsWith("re:") ? p.previousEmailSubject : `Re: ${p.previousEmailSubject}`) : "Re: Quick question"}

[email body]

Best,
${p.senderName}`
}

export function buildStep3Prompt(p: EmailPromptParams): string {
  let templateInstructions = ""
  if (p.subjectTemplate || p.bodyTemplate) {
    templateInstructions = `
CUSTOM TEMPLATE / GUIDELINE INSTRUCTION:
The user has configured a custom base template or guideline for this final breakup step:
${p.subjectTemplate ? `- Subject: ${p.subjectTemplate}` : ""}
${p.bodyTemplate ? `- Body directive: ${p.bodyTemplate}` : ""}

Instruction: Adapt and personalize these directives naturally for the prospect.
`
  }

  const previousContext = p.previousEmailBody
    ? `\nPREVIOUS UNREPLIED OUTREACH CONTEXT:\n${p.previousEmailBody}\n`
    : ""

  return `You are an elite B2B sales copywriter writing a final "breakup" email to a prospect who has not replied.

${templateInstructions}${previousContext}
SENDER: ${p.senderName} from ${p.senderCompany} (${p.senderCompanyDesc})
PROSPECT: ${formatProspectIdentity(p)} at ${p.prospectCompany} (${p.industry})
${p.companyResearch ? `\nIN-DEPTH COMPANY RESEARCH:\n${p.companyResearch}\n` : ""}

FINAL BREAKUP RULES:
1. RESPECT SILENCE GRACEFULLY: Acknowledge that they are likely focused on other priorities right now. Zero guilt-tripping, zero passive aggression.
2. CLOSE THE LOOP CLEANLY: Politely state that you will step back so you don't clutter their inbox, while leaving the door open if priorities change in the future.
3. ULTRA-CONCISE: 2 short sentences (under 40 words total).
4. NO HARD PITCH: Do not re-pitch features. Keep it respectful, professional, and memorable.
${HUMAN_WRITING_RULES}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Subject: Should I close the loop?

[email body]

Best,
${p.senderName}`
}

export function buildClassifyReplyPrompt(p: {
  replyBody: string
  originalEmailBody: string
  leadName: string
  company: string
}): string {
  return `Classify the intent of this prospect reply to a cold email.

ORIGINAL EMAIL SENT:
${p.originalEmailBody.slice(0, 500)}

PROSPECT REPLY from ${p.leadName} at ${p.company}:
${p.replyBody.slice(0, 800)}

Classify the reply into exactly one of these intents:
- INTERESTED: Positive, wants to learn more, asking about pricing/next steps, open to a call
- QUESTION: Has a specific question about the service, not clearly positive or negative yet
- OBJECTION: Has a clear objection, soft refusal, or general resistance (e.g. "not interested", "we do this in-house", "we already have a vendor", "too expensive", "no budget"). These are standard sales hurdles that a skilled salesperson can negotiate or handle.
- NOT_NOW: Timing objection or request to delay (e.g. "not interested at this time", "busy right now", "try me next quarter", "contact me in 3 months").
- UNSUBSCRIBE: Explicit request to stop contacting, opt-out requests (e.g. "unsubscribe", "remove me", "do not email me again", "stop", "take me off your list"). Do NOT classify general objections or timing requests here unless they specifically request removal.
- OOO: Out of office auto-reply

Return JSON only:
{"intent":"<INTENT>","confidence":"HIGH|MEDIUM|LOW","summary":"<one sentence describing what they said>","extractedObjection":"<if intent is OBJECTION or NOT_NOW, extract the specific objection they made, otherwise null>"}
`
}

export function buildLinkedInMessagePrompt(p: {
  stepType: "LINKEDIN_CONNECT" | "LINKEDIN_MESSAGE"
  guideline: string
  senderName: string
  senderCompany: string
  senderCompanyDesc: string
  prospectFirstName: string
  prospectCompany: string
  industry: string
  companyResearch?: string | null
  trainingDirectives?: string | null
}): string {
  const isConnect = p.stepType === "LINKEDIN_CONNECT"
  const directivesBlock = p.trainingDirectives
    ? `\n[TRAINED AGENCY DIRECTIVES & ANGLE PLAYBOOK RULES]:\n${p.trainingDirectives}\n`
    : ""

  return `You are an expert at writing LinkedIn outreach that gets accepted and answered.
${directivesBlock}
TASK: Write a LinkedIn ${isConnect ? "connection request note (STRICT MAX 280 characters)" : "direct message (max 500 characters)"} the sender will copy-paste manually.

STEP GUIDELINE FROM THE SEQUENCE:
${p.guideline || "Introduce yourself briefly and reference something specific about their business."}

SENDER: ${p.senderName} from ${p.senderCompany} (${p.senderCompanyDesc})
PROSPECT: ${p.prospectFirstName} at ${p.prospectCompany} (${p.industry})
${p.companyResearch ? `\nCOMPANY RESEARCH:\n${p.companyResearch.slice(0, 600)}\n` : ""}
RULES:
1. Sound human and casual — LinkedIn is not email. No formal greetings or sign-offs.
2. Reference something specific about their company in the first sentence.
3. DIRECTIVE ADHERENCE: Strictly match the tone, positioning, and angle rules defined in the agency directives above.
4. ${isConnect ? "No pitch — the goal is only to get the connection accepted." : "One soft call-to-action at most."}
5. No emojis, no buzzwords, no exclamation marks.

Return ONLY the message text, nothing else.`
}

export function buildAutoSearchQueryPrompt(p: {
  companyDesc: string
  personaConfig: unknown
  targetRegions?: string
  trainingDirectives?: string | null
}): string {
  const directivesBlock = p.trainingDirectives
    ? `\n[TRAINED AGENCY DIRECTIVES & TARGETING RULES]:\n${p.trainingDirectives}\n`
    : ""

  return `You are an expert commercial B2B lead generation AI strategist.
Based on the agency positioning, target profile, and trained directives below, generate a Google Maps search query to find high-value, private commercial B2B businesses to pitch.
${directivesBlock}
Agency Description: ${p.companyDesc}
Target Guardrails / Persona: ${JSON.stringify(p.personaConfig || {})}
Target Regions / Cities: ${p.targetRegions || "US or UK major metro area"}

CRITICAL RULES:
1. COMMERCIAL PRIVATE BUSINESSES ONLY: Target high-ticket private commercial entities (e.g., "private cosmetic dentistry", "roofing contractors", "private medical aesthetics clinics", "commercial HVAC contractors", "boutique corporate law firms", "private physical therapy centers", "commercial solar installers").
2. NEVER PUBLIC SECTOR: NEVER generate search queries for public emergency hospitals, NHS institutions, public schools, government departments, police, or municipal services.
3. SPECIFIC & RELEVANT: The query must be clean for Google Places API (e.g. "Private Dental Clinics", "Commercial Roofing Contractors", "Med Spas").
4. DIRECTIVE ADHERENCE: Strictly match the ideal client profile specified in the agency directives.

Return JSON ONLY:
{
  "query": "the commercial business type to search",
  "location": "the specific city and state/country"
}`
}

export function buildSmartOutboundHookPrompt(p: {
  companyName: string
  industry: string
  location: string
  rating?: number
  reviewCount?: number
  painPoints?: string[]
  decisionMakerName?: string | null
  decisionMakerTitle?: string | null
  trainingDirectives?: string | null
}): string {
  const directivesBlock = p.trainingDirectives
    ? `\n[TRAINED AGENCY DIRECTIVES & ANGLE PLAYBOOK RULES]:\n${p.trainingDirectives}\n`
    : ""

  return `You are an elite B2B sales copywriter crafting a hyper-personalized, 1-sentence opening observation (icebreaker / outbound hook) for cold outreach.
${directivesBlock}
PROSPECT DATA:
- Company Name: ${p.companyName}
- Industry: ${p.industry}
- Location: ${p.location}
- Google Rating: ${p.rating ? `${p.rating}★ (${p.reviewCount || 0} reviews)` : "Not listed"}
- Contact: ${p.decisionMakerName ? `${p.decisionMakerName} (${p.decisionMakerTitle || "Executive"})` : "Team Lead"}
- Observed Technical/Growth Gaps: ${p.painPoints && p.painPoints.length > 0 ? p.painPoints.join("; ") : "Strong local presence"}

RULES:
1. Length: Exactly 1 natural, conversational sentence (under 25 words).
2. DIRECTIVE COMPLIANCE: If trained agency directives are provided above, your hook MUST strictly follow the prescribed angle, voice, and positioning rules.
3. NO canned templates or repetitive buzzwords (do NOT say "which could be bottlenecking new bookings", "I hope this email finds you well", "impressive work").
4. Make it hyper-specific to their exact business type, local area, reputation, or genuine observation.
5. Output format: Return ONLY the hook sentence in plain text, with no quotes, no preamble, and no markdown.`
}

export function buildSequencePresetPrompt(p: {
  companyName: string
  companyDesc: string
  playbookType: string
  tone: string
  presetName: string
  presetDescription: string
  stepsCount: number
}): string {
  return `You are a world-class outbound sales copywriter and AI email strategist.
Generate a structured, high-conversion outbound sequence based on this playbook outreach preset:

PRESET NAME: ${p.presetName}
PRESET STRATEGY: ${p.presetDescription}
STEPS COUNT: ${p.stepsCount}

AGENCY NAME: ${p.companyName}
AGENCY VALUE PROP: ${p.companyDesc}
AGENCY NICHE: ${p.playbookType}
TONE: ${p.tone}

Instructions:
Generate exactly ${p.stepsCount} steps matching this sequence strategy.
Each step should connect logically to the next, building momentum.
- Step 1 delay must be 0.
- For each step, define:
  - "stepNumber": integer starting from 1
  - "delayDays": integer delay since the previous step (typically 3-4 days for follow-ups, wait steps, or LinkedIn connection steps)
  - "label": a short title describing the step's angle (e.g. "Mockup Audit Hook", "Case Study Proof", "LinkedIn Connection Request")
  - "stepType": one of "EMAIL", "LINKEDIN_CONNECT", "LINKEDIN_MESSAGE", "WAIT"
  - "bodyTemplate": an AI generation guide and strategic directive for this step. DO NOT write a static email template or a rigid message with placeholders. Instead, write clear instructions and guidelines for the AI to dynamically draft a unique message for each lead (e.g., "Draft a short, direct cold outreach email. Start by mentioning a specific content gap on their Instagram reels or feed. Transition to how our agency can fix it, citing a case study of a similar brand. Close with a call to action offering a free content calendar."). The guide should define the specific angle, proof points, value proposition, and call-to-action for this step.

Return ONLY a valid JSON array matching this structure:
[
  {
    "stepNumber": 1,
    "delayDays": 0,
    "label": "Spotted a content gap",
    "stepType": "EMAIL",
    "bodyTemplate": "Draft a short cold outreach email. Start by identifying a specific, visible content gap on their Instagram profile. Transition to a reels strategy, citing results from a similar brand. Offer a free 2-week content calendar."
  },
  ...
]
No other text, explanations, or markdown formatting.`
}

export function buildOperationalPresetPrompt(p: {
  agencyName: string
  agencyDesc: string
  playbookType: string
  operationsOverview: string
  targetAudience?: string
  primaryHook?: string
  preferredSteps: number
  tone: string
}): string {
  return `You are a master B2B outbound sales strategist who specializes in converting an agency's real operational workflow and fulfillment method into high-converting cold outreach sequence presets.

AGENCY INFORMATION:
- Agency Name: ${p.agencyName || "Our Agency"}
- Agency Description / Services: ${p.agencyDesc || "B2B growth agency"}
- Primary Domain / Niche: ${p.playbookType}
- Target Audience: ${p.targetAudience || "Local business owners, founders, and decision-makers"}
- Tone: ${p.tone || "Direct & Consultative"}
- Preferred Step Count: ${p.preferredSteps || 3}

AGENCY'S OPERATIONAL WORKFLOW & HOW THEY WORK:
"""
${p.operationsOverview}
"""
${p.primaryHook ? `PRIMARY VALUE HOOK TO LEVERAGE: ${p.primaryHook}` : ""}

YOUR TASK:
Analyze the agency's operational workflow above and design an exact, custom Outreach Sequence Preset that aligns with how they actually deliver value and talk to clients.

Generate a JSON object matching this exact schema:
{
  "name": "Catchy, professional, high-converting preset name (e.g. '3-Point Video Audit & Teardown Cadence')",
  "steps": ${p.preferredSteps || 3},
  "description": "Comprehensive strategy instruction detailing how Step 1, Step 2, Step 3 (and subsequent steps) work together, referencing the agency's real operational assets, audit steps, and CTA.",
  "operationalSummary": "1-sentence summary of how this sequence reflects their operational flow",
  "stepBreakdown": [
    {
      "stepNumber": 1,
      "dayDelay": 0,
      "title": "Short title (e.g. 'Initial Audit Teardown')",
      "directive": "Specific guidance for Step 1 matching the operational hook"
    },
    {
      "stepNumber": 2,
      "dayDelay": 3,
      "title": "Short title (e.g. 'Case Study & Proof Follow-Up')",
      "directive": "Specific guidance for Step 2 follow-up"
    },
    {
      "stepNumber": 3,
      "dayDelay": 4,
      "title": "Short title (e.g. 'Permission-Based Final Question')",
      "directive": "Specific guidance for Step 3 breakup or soft close"
    }
  ]
}

Return valid JSON ONLY, no other markdown text.`
}

export function buildSuggestTargetingPrompt(p: {
  companyName: string
  companyDesc: string
  playbookType: string
}): string {
  return `You are an expert lead generation strategist.
Based on the agency details below, suggest:
1. 4-6 ideal target customer niches/verticals (e.g. ["spas", "dental clinics", "real estate agents"]).
2. 3-4 best discovery platforms/channels/mediums to search for these leads (e.g. ["Yelp", "Google Maps", "Instagram", "LinkedIn"]).

AGENCY NAME: ${p.companyName}
AGENCY DESCRIPTION: ${p.companyDesc}
AGENCY NICHE/PLAYBOOK: ${p.playbookType}

Return ONLY a valid JSON object matching this structure:
{
  "verticals": ["niche1", "niche2", ...],
  "platformOptions": ["platform1", "platform2", ...]
}
No other text, explanations, or markdown formatting.`
}

export function buildCrossSellPitchPrompt(p: {
  clientCompany: string
  industry: string
  currentServices: string[]
  suggestedService: string
  agencyName: string
}): string {
  return `You are a growth strategist for a digital agency.

A client was just won (or is active) with these services: ${p.currentServices.join(", ") || "none recorded"}.
CLIENT: ${p.clientCompany} (${p.industry})
AGENCY: ${p.agencyName}
SUGGESTED UPSELL: ${p.suggestedService}

Write a short internal pitch card (2-3 sentences) for the agency owner explaining:
1. Why ${p.suggestedService} is the natural next service for this client right now.
2. One concrete angle to raise it in the next conversation.

Plain text only, no headings, no bullets, under 70 words.`
}

export function buildSocialOutreachPrompt(p: {
  postTitle: string
  postBody: string
  author: string
  platform: string
  subreddit?: string
  agencyName: string
  companyDesc: string
  flagshipOffer?: FlagshipOffer | null
  calendarOrQuoteLink?: string | null
}): string {
  return `You are writing a direct, high-converting social outreach message from "${p.agencyName}" to a prospective customer who posted a public request looking for a service, professional, contractor, or solution.

${HUMAN_WRITING_RULES}

PROSPECT POST DETAILS:
- Author / Handle: ${p.author}
- Platform / Community: ${p.platform} ${p.subreddit ? `(${p.subreddit})` : ""}
- Post Title: "${p.postTitle}"
- Post Body: "${p.postBody}"

SERVICE PROVIDER / AGENCY INFO:
- Provider Name: ${p.agencyName}
- Services & Capabilities: ${p.companyDesc}
${p.flagshipOffer?.name ? `- Key Offer / Deliverable: ${p.flagshipOffer.name} (${p.flagshipOffer.deliverable})` : ""}
${p.calendarOrQuoteLink ? `- Direct Link / Booking: ${p.calendarOrQuoteLink}` : ""}

TASK:
1. "dmMessage": A 1-to-1 direct message (under 60 words). Friendly, conversational, directly addressing their exact request or pain point. State relevant capability or availability without puffery, and offer a quick next step or link.
2. "publicComment": A polite, helpful public thread comment (under 50 words) suitable to post openly under their thread without looking like an annoying bot.
3. "extractedNeed": A concise 1-sentence summary of the prospect's exact requirement, project scope, or problem.
4. "estimatedFit": "EXCELLENT" | "GOOD" | "MODERATE"

Return ONLY a valid JSON object matching this structure:
{
  "dmMessage": "string",
  "publicComment": "string",
  "extractedNeed": "string",
  "estimatedFit": "EXCELLENT" | "GOOD" | "MODERATE"
}
No other text or markdown formatting outside the JSON.`
}

export const FALLBACK_EMAIL = {
  subject: "Quick question about {{company}}",
  body: `Hi {{firstName}},

I noticed {{company}} is growing in the {{industry}} space. Most companies at your stage struggle with consistent lead flow while scaling.

We've helped similar companies book qualified meetings without expanding their sales team.

Worth a brief chat to see if it fits what {{company}} is building?

Best,
{{senderName}}`,
}

