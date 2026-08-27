export interface Competitor {
  name: string
  website?: string | null
  summary?: string | null
  marketPosition?: string | null
  estimatedMonthlyTraffic?: string | null
  reviewProfile?: string | null
  pricingModel?: string | null
  adActivity?: string | null
  techGaps?: string[]
  strengths?: string[]
  shortcomings: string[] // shortcomings/weaknesses
  leverage: string[] // opportunities/talking points/leverage points
  talkingPoints?: string[]
  coldOutreachHook?: string | null
}

/**
 * Robustly parses competitor analysis data from the database.
 * Supports JSON arrays, JSON objects, single competitor JSONs, and legacy plain text markdown formatting.
 */
export function parseCompetitorAnalysis(raw: string | null | undefined): Competitor[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []

  // Case 1: Try JSON Parsing
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      
      // If it's a direct array of competitors
      if (Array.isArray(parsed)) {
        return parsed.map(mapJsonToCompetitor)
      }
      
      // If it's wrapped in an object { competitors: [...] }
      if (parsed.competitors && Array.isArray(parsed.competitors)) {
        return parsed.competitors.map(mapJsonToCompetitor)
      }
      
      // If it's a single competitor JSON object
      if (parsed.name || parsed.competitorName) {
        return [mapJsonToCompetitor(parsed)]
      }
    } catch {
      // If JSON parsing fails, fall through to plain text parsing
    }
  }

  // Case 2: Legacy Plain Text Parser
  const competitors: Competitor[] = []
  
  // Split by "Competitor:" or "Competitor Name:" to capture multiple blocks
  const blocks = trimmed.split(/(?=Competitor:)/gi)
  
  for (const block of blocks) {
    if (!block.trim()) continue
    const lines = block.split("\n")
    
    let name = "Competitor"
    let website: string | null = null
    const summaryLines: string[] = []
    const strengths: string[] = []
    const weaknesses: string[] = []
    const opportunities: string[] = []
    const talkingPoints: string[] = []
    
    let currentSection: "summary" | "strengths" | "weaknesses" | "opportunities" | "talkingPoints" | null = "summary"
    
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue
      
      // Header check
      if (line.toLowerCase().startsWith("competitor:")) {
        // Extract competitor name and website e.g., "Competitor: Acme Corp (https://acme.com)"
        const headerContent = line.substring(11).trim()
        const match = headerContent.match(/^([^(]+)(?:\(([^)]+)\))?/)
        if (match) {
          name = match[1].trim()
          website = match[2] ? match[2].trim() : null
        } else {
          name = headerContent
        }
        currentSection = "summary"
        continue
      }
      
      const lower = line.toLowerCase()
      if (lower.startsWith("strengths:") || lower.startsWith("strengths")) {
        currentSection = "strengths"
        continue
      }
      if (lower.startsWith("weaknesses:") || lower.startsWith("shortcomings:") || lower.startsWith("weaknesses")) {
        currentSection = "weaknesses"
        continue
      }
      if (lower.startsWith("opportunities:") || lower.startsWith("leverage:") || lower.startsWith("opportunities")) {
        currentSection = "opportunities"
        continue
      }
      if (lower.startsWith("talking points:") || lower.startsWith("talkingpoints:")) {
        currentSection = "talkingPoints"
        continue
      }
      
      // Strip bullet points
      const cleanLine = line.replace(/^[-*•\d.]+\s*/, "").trim()
      if (!cleanLine) continue
      
      if (currentSection === "summary") summaryLines.push(cleanLine)
      else if (currentSection === "strengths") strengths.push(cleanLine)
      else if (currentSection === "weaknesses") weaknesses.push(cleanLine)
      else if (currentSection === "opportunities") opportunities.push(cleanLine)
      else if (currentSection === "talkingPoints") talkingPoints.push(cleanLine)
    }
    
    competitors.push({
      name: name || "Competitor",
      website: website || null,
      summary: summaryLines.join(" ").trim() || null,
      marketPosition: "Market Competitor",
      strengths: strengths.filter(Boolean),
      shortcomings: weaknesses.filter(Boolean),
      leverage: opportunities.filter(Boolean),
      talkingPoints: talkingPoints.filter(Boolean),
      coldOutreachHook: opportunities[0] ? `Noticed ${name} has some visible gaps in their funnel that your business can easily capitalize on.` : null
    })
  }
  
  return competitors
}

/**
 * Maps a single JSON competitor block to the standardized Competitor interface.
 */
function mapJsonToCompetitor(obj: any): Competitor {
  const name = obj.name || obj.competitorName || "Competitor"
  const shortcomings = Array.isArray(obj.shortcomings) ? obj.shortcomings : (Array.isArray(obj.weaknesses) ? obj.weaknesses : [])
  const leverage = Array.isArray(obj.leverage) ? obj.leverage : (Array.isArray(obj.opportunities) ? obj.opportunities : [])

  return {
    name,
    website: obj.website || obj.competitorWebsite || null,
    summary: obj.summary || null,
    marketPosition: obj.marketPosition || obj.positioning || "Active Player",
    estimatedMonthlyTraffic: obj.estimatedMonthlyTraffic || obj.traffic || null,
    reviewProfile: obj.reviewProfile || obj.reviews || null,
    pricingModel: obj.pricingModel || obj.pricing || null,
    adActivity: obj.adActivity || obj.ads || null,
    techGaps: Array.isArray(obj.techGaps) ? obj.techGaps : [],
    strengths: Array.isArray(obj.strengths) ? obj.strengths : [],
    shortcomings,
    leverage,
    talkingPoints: Array.isArray(obj.talkingPoints) ? obj.talkingPoints : [],
    coldOutreachHook: obj.coldOutreachHook || (leverage[0] ? `Noticed ${name} is capturing keyword volume while leaving clear gaps in mobile conversion that you can easily win.` : null),
  }
}

/**
 * Formats a list of competitors back to a clean plain text representation.
 * Useful for syncing back to any legacy markdown text viewers or logs.
 */
export function formatCompetitorText(competitors: Competitor[]): string {
  return competitors.map(c => {
    const parts = [
      `Competitor: ${c.name}${c.website ? ` (${c.website})` : ""}`,
      "",
      c.summary || "",
      ""
    ]
    
    if (c.strengths && c.strengths.length > 0) {
      parts.push("Strengths:")
      parts.push(...c.strengths.map(s => `- ${s}`))
      parts.push("")
    }
    
    if (c.shortcomings && c.shortcomings.length > 0) {
      parts.push("Weaknesses:")
      parts.push(...c.shortcomings.map(w => `- ${w}`))
      parts.push("")
    }
    
    if (c.leverage && c.leverage.length > 0) {
      parts.push("Opportunities for us:")
      parts.push(...c.leverage.map(l => `- ${l}`))
      parts.push("")
    }
    
    if (c.talkingPoints && c.talkingPoints.length > 0) {
      parts.push("Talking points:")
      parts.push(...c.talkingPoints.map(t => `- ${t}`))
      parts.push("")
    }
    
    return parts.join("\n").trim()
  }).join("\n\n---\n\n")
}
