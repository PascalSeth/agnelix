export interface SocialIntentPost {
  id: string
  title: string
  body: string
  author: string
  platform: "REDDIT" | "X" | "FORUM"
  subreddit?: string
  permalink: string
  createdAt: string
  score: number
  numComments: number
  matchedKeyword: string
  intentCategory: string
  urgency: "HIGH" | "MEDIUM" | "NORMAL"
}

export interface SocialScanParams {
  query: string
  subreddit?: string
  timeframe?: "day" | "week" | "month" | "year" | "all"
  limit?: number
}

export interface VerticalPreset {
  id: string
  label: string
  iconType: "transport" | "home" | "events" | "health" | "professional" | "digital"
  keywords: string[]
  category: string
  suggestedSubreddits: string[]
}

export const MULTI_VERTICAL_PRESETS: VerticalPreset[] = [
  {
    id: "home_services",
    label: "Home Services & Trades",
    iconType: "home",
    category: "HOME_SERVICES",
    keywords: [
      "roofing contractor recommendation",
      "reliable plumber in",
      "HVAC repair recommendation",
      "electrician recommendation",
      "kitchen remodel contractor",
      "house cleaning service",
      "landscaper recommendation",
    ],
    suggestedSubreddits: ["HomeImprovement", "AskNYC", "chicago", "Austin", "bayarea", "Seattle"],
  },
  {
    id: "events_weddings",
    label: "Events & Weddings",
    iconType: "events",
    category: "EVENTS_WEDDINGS",
    keywords: [
      "wedding photographer recommendation",
      "party venue rental",
      "wedding caterer recommendation",
      "DJ for private party",
      "event planner recommendation",
      "photo booth rental",
    ],
    suggestedSubreddits: ["weddingplanning", "events", "AskNYC", "Dallas", "Denver", "losangeles"],
  },
  {
    id: "transport_travel",
    label: "Transportation & Travel",
    iconType: "transport",
    category: "TRANSPORTATION",
    keywords: [
      "airport ride recommendation",
      "car service to airport",
      "private driver",
      "party bus recommendation",
      "sprinter van rental with driver",
      "moving company recommendation",
      "ship my car across country",
    ],
    suggestedSubreddits: ["travel", "AskNYC", "chicago", "Austin", "Miami", "boston"],
  },
  {
    id: "health_wellness",
    label: "Health & Wellness",
    iconType: "health",
    category: "HEALTH_WELLNESS",
    keywords: [
      "dentist recommendation",
      "chiropractor recommendation",
      "personal trainer in",
      "med spa recommendation",
      "physical therapy clinic",
      "nutritionist recommendation",
    ],
    suggestedSubreddits: ["AskNYC", "fitness", "chicago", "sanfrancisco", "Atlanta"],
  },
  {
    id: "professional_legal",
    label: "Professional & Real Estate",
    iconType: "professional",
    category: "PROFESSIONAL_SERVICES",
    keywords: [
      "realtor recommendation in",
      "CPA / tax accountant recommendation",
      "estate planning lawyer",
      "business attorney recommendation",
      "bookkeeper recommendation",
    ],
    suggestedSubreddits: ["RealEstate", "smallbusiness", "AskNYC", "Austin", "Seattle"],
  },
  {
    id: "digital_tech",
    label: "Digital & Marketing",
    iconType: "digital",
    category: "DIGITAL_TECH",
    keywords: [
      "web design agency recommendation",
      "local SEO service",
      "app developer for hire",
      "branding / logo designer",
      "social media manager recommendation",
    ],
    suggestedSubreddits: ["entrepreneur", "smallbusiness", "startups", "webdev"],
  },
]

export function determineCategory(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes("roof") || lower.includes("plumb") || lower.includes("hvac") || lower.includes("electric") || lower.includes("remodel") || lower.includes("clean") || lower.includes("landscap")) {
    return "HOME_SERVICES"
  }
  if (lower.includes("wedding") || lower.includes("cater") || lower.includes("dj ") || lower.includes("photo") || lower.includes("venue") || lower.includes("party")) {
    return "EVENTS_WEDDINGS"
  }
  if (lower.includes("airport") || lower.includes("ride") || lower.includes("driver") || lower.includes("shuttle") || lower.includes("bus") || lower.includes("mov") || lower.includes("ship")) {
    return "TRANSPORTATION"
  }
  if (lower.includes("dentist") || lower.includes("chiro") || lower.includes("trainer") || lower.includes("spa") || lower.includes("physio") || lower.includes("therap")) {
    return "HEALTH_WELLNESS"
  }
  if (lower.includes("realtor") || lower.includes("cpa") || lower.includes("accountant") || lower.includes("lawyer") || lower.includes("attorney") || lower.includes("tax")) {
    return "PROFESSIONAL_SERVICES"
  }
  if (lower.includes("website") || lower.includes("seo") || lower.includes("developer") || lower.includes("marketing") || lower.includes("design")) {
    return "DIGITAL_TECH"
  }
  return "GENERAL_SERVICE"
}

export function determineUrgency(text: string): "HIGH" | "MEDIUM" | "NORMAL" {
  const lower = text.toLowerCase()
  if (lower.includes("urgent") || lower.includes("today") || lower.includes("tomorrow") || lower.includes("asap") || lower.includes("emergency") || lower.includes("immediately")) {
    return "HIGH"
  }
  if (lower.includes("this week") || lower.includes("next week") || lower.includes("saturday") || lower.includes("sunday") || lower.includes("soon")) {
    return "MEDIUM"
  }
  return "NORMAL"
}
