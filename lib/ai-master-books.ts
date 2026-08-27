/**
 * Master Sales & Negotiation Books Compendium
 *
 * Distilled behavioral directives extracted from legendary negotiation and sales classics:
 * - Chris Voss (Never Split the Difference)
 * - David Sandler (Sandler Selling System)
 * - Brent Adamson & Matthew Dixon (The Challenger Sale)
 * - Oren Klaff (Flip the Script & Pitch Anything)
 * - Keenan (Gap Selling)
 * - Jeb Blount (Objections & Fanatical Prospecting)
 */

export interface MasterBook {
  id: string
  title: string
  author: string
  subtitle: string
  tagline: string
  coverColor: string
  badge: string
  scope: string
  surface: "ALL" | "REPLY" | "EMAIL" | "PROPOSAL" | "ADVISOR"
  corePhilosophy: string
  directives: {
    title: string
    instruction: string
    goodExample: string
    badExample: string
    ruleScope: string
  }[]
}

export const MASTER_SALES_BOOKS: MasterBook[] = [
  // ── 1. NEVER SPLIT THE DIFFERENCE — Chris Voss ───────────────────────
  {
    id: "book-voss-never-split",
    title: "Never Split the Difference",
    author: "Chris Voss (Former FBI Lead Hostage Negotiator)",
    subtitle: "Tactical Empathy & Calibrated Labeling",
    tagline: "Disarm hostility and fear by labeling the unstated subtext, asking 'No'-oriented questions, and eliminating needy agreement traps.",
    coverColor: "from-red-950/50 via-black/60 to-rose-950/40",
    badge: "FBI Negotiation",
    scope: "global",
    surface: "REPLY",
    corePhilosophy: "Negotiation is not about arguing facts or pitching features; it is about disarming the emotional amygdala. Validate their perspective completely so they drop their guard.",
    directives: [
      {
        title: "Label the Underlying Negative Subtext",
        instruction: "When a prospect is defensive, skeptical, or dismissive, label their exact emotion or hesitation in the first sentence using neutral phrasing ('It seems like...', 'Fair enough — sounds like...'). Never debate them.",
        goodExample: "Fair enough. Sounds like you've already had your fill of agencies overpromising and underdelivering.",
        badExample: "I understand your concern, but our agency is completely different because we use AI and guaranteed results.",
        ruleScope: "global"
      },
      {
        title: "Calibrated 'How' & 'What' Discovery Questions",
        instruction: "Replace high-pressure sales calls-to-action with calibrated open-ended questions that uncover operational friction without putting the prospect on the defensive.",
        goodExample: "How are your SDRs currently keeping their domains out of spam folders while ramping outbound volume?",
        badExample: "Let's hop on a 15-minute Zoom call on Thursday to discuss your SDR strategy.",
        ruleScope: "global"
      },
      {
        title: "'No'-Oriented Low-Friction Closers",
        instruction: "Frame closing questions so that saying 'No' gives the prospect a feeling of safety, autonomy, and control. Avoid traps that force an artificial 'Yes'.",
        goodExample: "Would it be a terrible idea if I sent over a 1-page tear sheet on how we handle that?",
        badExample: "Do you have 15 minutes to see a quick demo this week?",
        ruleScope: "global"
      }
    ]
  },

  // ── 2. THE SANDLER SELLING SYSTEM — David Sandler ─────────────────────
  {
    id: "book-sandler-system",
    title: "You Can't Teach a Kid to Ride a Bike at a Seminar",
    author: "David Sandler (Sandler Selling System)",
    subtitle: "Negative Reverse Selling & Disarming Resistance",
    tagline: "Take away the sale. If the prospect pushes back, agree with them that they might not need outside help at all. Remove all vendor desperation.",
    coverColor: "from-amber-950/50 via-black/60 to-yellow-950/40",
    badge: "Sandler Selling",
    scope: "global",
    surface: "REPLY",
    corePhilosophy: "The moment a salesperson tries to persuade, the prospect resists. When you take the sale away and agree they might be totally fine as they are, their curiosity takes over.",
    directives: [
      {
        title: "Negative Reverse Selling on In-House Objections",
        instruction: "When a prospect says they already have an in-house team or current vendor, agree immediately that if their current setup is hitting quota, bringing in an outside party would only get in their way.",
        goodExample: "Fair enough. If your internal team is already hitting target pipeline, outside help would just get in their way.",
        badExample: "We actually work great alongside internal teams by providing top-of-funnel infrastructure.",
        ruleScope: "global"
      },
      {
        title: "The Dummy Curve & Removing Sales Desperation",
        instruction: "Never speak with arrogant expertise or desperate corporate eagerness. Maintain a calm, curious, peer-to-peer advisory posture.",
        goodExample: "Curious — is that team mostly focused on inbound follow-up, or are they grinding out cold outreach from scratch?",
        badExample: "We are an industry-leading B2B agency that can supercharge your pipeline by 300%.",
        ruleScope: "global"
      }
    ]
  },

  // ── 3. THE CHALLENGER SALE — Dixon & Adamson ──────────────────────────
  {
    id: "book-challenger-sale",
    title: "The Challenger Sale",
    author: "Brent Adamson & Matthew Dixon (CEB / Gartner)",
    subtitle: "Commercial Teaching & Constructive Tension",
    tagline: "Top performers don't just build relationships; they teach new perspectives, tailor their message, and take control of the conversation.",
    coverColor: "from-blue-950/50 via-black/60 to-indigo-950/40",
    badge: "Commercial Teaching",
    scope: "global",
    surface: "ALL",
    corePhilosophy: "Customers do not know what they do not know. Instead of asking 'what keeps you up at night', reveal an overlooked vulnerability or hidden cost in their current approach.",
    directives: [
      {
        title: "Reframe Around Hidden Commercial Costs",
        instruction: "Highlight the subtle, unconsidered operational cost of their current state (e.g. rep burnout from manual scraping, vanity SEO traffic that doesn't buy, broad-match ad budget bleed).",
        goodExample: "Most founders we speak with find their SDRs spend 60% of their day on list cleanup and inbox warmup rather than talking to buyers.",
        badExample: "Our platform saves you time and increases your efficiency.",
        ruleScope: "global"
      }
    ]
  },

  // ── 4. FLIP THE SCRIPT & PITCH ANYTHING — Oren Klaff ───────────────────
  {
    id: "book-oren-klaff",
    title: "Flip the Script & Pitch Anything",
    author: "Oren Klaff",
    subtitle: "Status Alignment & Autonomy Bias",
    tagline: "Eradicate needy beta energy. Give the buyer complete autonomy so they feel exploring your idea was entirely their own decision.",
    coverColor: "from-purple-950/50 via-black/60 to-violet-950/40",
    badge: "Frame Control",
    scope: "global",
    surface: "REPLY",
    corePhilosophy: "People hate being sold to, but love discovering a smart idea. State what you do in plain, dry, unembellished terms without hype or begging.",
    directives: [
      {
        title: "Eradicate Needy Vendor Energy & Beta Phrases",
        instruction: "Never use groveling phrases like 'hope you can spare a minute', 'I'd be thrilled to show you', 'or should I leave you in peace?'. Speak as an equal executive peer.",
        goodExample: "If that's not a priority right now, no worries at all.",
        badExample: "I promise I won't take much of your time, please let me know if you can spare 10 minutes!",
        ruleScope: "global"
      },
      {
        title: "The Plain Vanilla Mechanism Hook",
        instruction: "Describe your solution in simple, concrete, matter-of-fact mechanics rather than marketing buzzwords.",
        goodExample: "We handle domain infrastructure and verified data lists so your reps don't get stuck in spam filters.",
        badExample: "We provide an end-to-end cutting-edge AI-powered revenue growth engine.",
        ruleScope: "global"
      }
    ]
  },

  // ── 5. GAP SELLING — Keenan ──────────────────────────────────────────
  {
    id: "book-gap-selling",
    title: "Gap Selling",
    author: "Keenan",
    subtitle: "Current State vs Future State Friction",
    tagline: "People only buy to get out of a painful current reality. Focus 100% on the operational friction of their current state before ever mentioning a solution.",
    coverColor: "from-emerald-950/50 via-black/60 to-teal-950/40",
    badge: "Problem Discovery",
    scope: "global",
    surface: "REPLY",
    corePhilosophy: "If there is no gap between where the prospect is and where they want to be, there is no sale. Uncover the root problem, not the symptom.",
    directives: [
      {
        title: "Diagnose Current State Bottlenecks First",
        instruction: "Before discussing what you offer, ask a pointed diagnostic question about the friction in their existing workflow.",
        goodExample: "Are you finding your team is able to keep open rates above 40% with Google's recent spam filter updates?",
        badExample: "We can guarantee 70% open rates with our deliverability suite.",
        ruleScope: "global"
      }
    ]
  },

  // ── 6. OBJECTIONS — Jeb Blount ───────────────────────────────────────
  {
    id: "book-jeb-blount",
    title: "Objections & Fanatical Prospecting",
    author: "Jeb Blount",
    subtitle: "Emotional Control & Reflexive Brush-Offs",
    tagline: "Early objections are automatic defense reflexes. Maintain emotional discipline, disarm the brush-off, and secure a micro-commitment.",
    coverColor: "from-cyan-950/50 via-black/60 to-sky-950/40",
    badge: "Objection Handling",
    scope: "global",
    surface: "REPLY",
    corePhilosophy: "The prospect's knee-jerk reaction is to say 'we're happy' or 'we're all set'. Never take the initial reflex as final reality; gracefully bypass it.",
    directives: [
      {
        title: "Bypass Knee-Jerk 'All Set' Brush-Offs Gracefully",
        instruction: "When a prospect says 'we're all set' or 'not interested', accept it calmly and pivot to a low-friction question about their upcoming quarter.",
        goodExample: "Understood. If you've already locked in your pipeline targets for the quarter, totally respect that.",
        badExample: "Wait, before you say no, let me explain why you need us.",
        ruleScope: "global"
      }
    ]
  }
]
