/**
 * Sanitizes and validates prospect first names for cold outreach.
 * Prevents robotic errors like "Hi contact,", "Hi info,", "Hi admin,".
 */

const GENERIC_PREFIXES = new Set([
  "contact", "info", "admin", "administrator", "support", "hello", "team",
  "help", "sales", "enquiries", "inquiries", "office", "reception", "mail",
  "inbox", "general", "frontdesk", "front-desk", "appointments", "booking",
  "bookings", "service", "services", "billing", "careers", "jobs", "media",
  "press", "marketing", "operations", "ops", "hr", "customercare", "care",
  "feedback", "queries", "query", "hospital", "clinic", "doctor", "dentist",
  "user", "lead", "prospect", "client", "customer", "member", "staff", "undefined", "null", "none", "na", "n/a", "unknown"
])

/**
 * Returns a valid person's first name, or null if it's missing/generic/role-based.
 */
export function getValidProspectFirstName(
  firstName: string | null | undefined,
  email?: string | null
): string | null {
  if (firstName && typeof firstName === "string") {
    const cleaned = firstName.trim().replace(/^["']|["']$/g, "")
    const lower = cleaned.toLowerCase()
    
    // Check if it's not a generic role or placeholder
    if (cleaned.length >= 2 && !GENERIC_PREFIXES.has(lower) && !/^\d+$/.test(cleaned)) {
      // Capitalize first letter properly
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
  }

  // If firstName is invalid/empty, attempt extracting from personal email (e.g. john.doe@ -> John)
  if (email && typeof email === "string" && email.includes("@")) {
    const localPart = email.split("@")[0].toLowerCase()
    // If local part has dots/underscores like "sarah.mensah" or "david_smith"
    const parts = localPart.split(/[._-]/)
    const candidate = parts[0]
    if (
      candidate &&
      candidate.length >= 2 &&
      !GENERIC_PREFIXES.has(candidate) &&
      !/^\d+$/.test(candidate) &&
      /^[a-z]+$/i.test(candidate)
    ) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1)
    }
  }

  return null
}
