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
}

export function buildStep1Prompt(p: EmailPromptParams): string {
  let approachInstructions = ""

  let templateInstructions = ""
  if (p.subjectTemplate || p.bodyTemplate) {
    templateInstructions = `
CUSTOM TEMPLATE INSTRUCTION:
The user has configured a custom base template they wish to use for this step:
${p.subjectTemplate ? `- Subject/Opening Template: ${p.subjectTemplate}` : ""}
${p.bodyTemplate ? `- Body/CTA Template: ${p.bodyTemplate}` : ""}

You MUST adapt, personalize, and fill in the details of this custom template. Preserve its overall message, structure, and intent, but replace placeholders (e.g. {{firstName}} or {{company}}) and rewrite sentences using the prospect information and personalization research to make it sound completely natural and highly researched.
`
  }

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
APPROACH STYLE: Website Audit
Observation: ${issue} — ${consequence}
Instruction: You MUST reference this specific technical issue and its business consequence in the opening sentence of the email. Keep it company-first, referencing their website audit in a direct and helpful way.
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
APPROACH STYLE: Competitor Pattern
Instruction: Reference a pattern you've observed among similar competitors or businesses in their market in the opening to create genuine curiosity (e.g. relying only on referrals while competitors adapting to search are scaling).
`
  } else if (p.approach === "industry") {
    approachInstructions = `
APPROACH STYLE: Industry Shift
Instruction: Reference a genuine, observable shift in how UK ${p.industry} businesses get customers (e.g. online search and review validation overtaking pure word-of-mouth).
`
  } else if (p.approach === "question") {
    approachInstructions = `
APPROACH STYLE: Question Opener
Instruction: Start the email with a sharp, relevant question about how they handle local leads or online visibility, showing you've researched them.
`
  } else if (p.approach === "social-proof") {
    approachInstructions = `
APPROACH STYLE: Social Proof
Instruction: Reference a realistic, brief result from a similar ${p.industry} business (e.g. adding £4,500/mo or moving from page 2 of Maps to the top pack by fixing search visibility) in a passing, matter-of-fact way.
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


  return `You are an expert B2B cold email copywriter. Write a personalized email that gets a reply.
${templateInstructions}
SENDER:
- Name: ${p.senderName}
- Title: ${p.senderTitle}
- Company: ${p.senderCompany}
- Company does: ${p.senderCompanyDesc}

PROSPECT:
- Name: ${p.prospectFirstName} ${p.prospectLastName}
- Title: ${p.prospectTitle}
- Company: ${p.prospectCompany}
- Company does: ${p.prospectCompanyDesc}
- Industry: ${p.industry}
${p.companyResearch ? `\nIN-DEPTH COMPANY RESEARCH:\n${p.companyResearch}\n` : ""}
PERSONALIZATION RESEARCH:
- Recent company activity: ${p.recentNews || "Not available"}
- Likely pain point in this industry: ${p.painPoint || "Not available"}${approachInstructions}

RULES:
1. Subject: 4-7 words, curiosity-driven. ${p.approach === "local-neighbor" ? "Frame it as a friendly neighbor introduction or invitation (e.g., 'Hello from your neighbor [Sender Company]' or 'Lunch for the [Prospect Company] team')." : "NO: 'Free', 'Guarantee', 'Act Now', 'Limited Time'"}
2. Opening: ONE sentence only. Mention something specific about THEIR company or role using the research findings.
3. Body: 2-3 short sentences. ${p.approach === "local-neighbor" ? "Introduce your local business and the special offer you're extending." : "Identify their pain point. Hint at your solution. Don't sell hard."}
4. CTA: Soft ask. ${p.approach === "local-neighbor" ? "Use an invitation-focused ask (e.g., 'Hope to see you soon!' / 'Would you like me to drop off a menu?' / 'Feel free to drop by this week!')" : "Use ONE of these: 'Worth a brief chat?' / 'Open to exploring this?' / 'Mind if I send over a quick example?'"}
5. Tone: ${p.tone}
6. Total length: Under 120 words.
7. NO exclamation marks, all caps, multiple questions, or attachments.
8. Write like a human, not a marketer. No buzzwords: "synergy", "leverage", "optimize", "solution"
9. Use the IN-DEPTH COMPANY RESEARCH if provided to personalize the hook and value proposition to their business model.
10. Variations: Do not use a static template structure. Vary the wording, opening transitions, and phrasing dynamically so that no two emails look identical. Make each output unique and authentic to the specific prospect's business context.
11. Booking/Calendar link: If the template (custom or follow-up) requires a calendar booking link, or if you decide it fits, use "${p.calendarLink || "our scheduling page"}" as the booking URL. Do not write placeholder links.

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
CUSTOM TEMPLATE INSTRUCTION:
The user has configured a custom base template they wish to use for this follow-up step:
${p.subjectTemplate ? `- Subject Template: ${p.subjectTemplate}` : ""}
${p.bodyTemplate ? `- Body Template: ${p.bodyTemplate}` : ""}

You MUST adapt, personalize, and fill in the details of this custom template. Preserve its overall message, structure, and intent, but replace placeholders and rewrite sentences using the prospect information to make it sound completely natural.
`
  }

  const previousContext = p.previousEmailBody
    ? `\nPREVIOUS EMAIL SENT FOR CONTEXT:\n${p.previousEmailBody}\n`
    : ""

  return `You are writing a follow-up cold email. Keep it very short, creative, and human.
${templateInstructions}${previousContext}
SENDER: ${p.senderName} from ${p.senderCompany}
PROSPECT: ${p.prospectFirstName} at ${p.prospectCompany}

Write a 2-3 sentence follow-up that:
1. References the specific point or value pitch from the first email creatively (e.g. referencing the website speed audit, review rating gap, or industry shift mentioned previously). Avoid using generic phrases like "wanted to bump this up" or "just checking in" for every company.
2. Offers a very brief, fresh angle or asks a direct, relevant question.
3. Ends with a soft call-to-action (e.g. "Still open to a brief chat this week?" or "Worth exploring?").

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Subject: ${p.previousEmailSubject ? `Re: ${p.previousEmailSubject.replace(/^Re:\s*/i, "")}` : "Re: Quick question"}

[email body]

Best,
${p.senderName}`
}

export function buildStep3Prompt(p: EmailPromptParams): string {
  let templateInstructions = ""
  if (p.subjectTemplate || p.bodyTemplate) {
    templateInstructions = `
CUSTOM TEMPLATE INSTRUCTION:
The user has configured a custom base template they wish to use for this final breakup step:
${p.subjectTemplate ? `- Subject Template: ${p.subjectTemplate}` : ""}
${p.bodyTemplate ? `- Body Template: ${p.bodyTemplate}` : ""}

You MUST adapt, personalize, and fill in the details of this custom template. Preserve its overall message, structure, and intent, but replace placeholders (e.g. {{firstName}}) and rewrite sentences to make it sound completely natural and respectful.
`
  }

  const previousContext = p.previousEmailBody
    ? `\nPREVIOUS EMAIL SENT FOR CONTEXT:\n${p.previousEmailBody}\n`
    : ""

  return `You are writing a final "breakup" cold email. Keep it polite, brief, and professional.
${templateInstructions}${previousContext}
SENDER: ${p.senderName} from ${p.senderCompany}
PROSPECT: ${p.prospectFirstName} at ${p.prospectCompany}

Write a 2-3 sentence breakup email that:
1. Acknowledges they may be busy or that the timing is not right.
2. Politely closes the loop on our outreach, leaving the door open for the future.
3. Does not sound passive-aggressive or salesy. Keep it genuine and human.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Subject: Should I close the loop?

[email body]

Best,
${p.senderName}`
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
