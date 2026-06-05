import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatRelative(date: Date | string | null) {
  if (!date) return "—"
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function pct(num: number, den: number) {
  if (!den) return "0%"
  return `${Math.round((num / den) * 100)}%`
}

export function initials(name?: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function emailFromPlace(p: { websiteUri?: string; displayName?: { text: string } }): string {
  if (p.websiteUri) {
    try {
      const domain = new URL(p.websiteUri).hostname.replace(/^www\./, "")
      return `contact@${domain}`
    } catch {}
  }
  const slug = p.displayName?.text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "business"
  return `info@${slug}.com`
}

export function extractCityFromAddress(formattedAddress?: string | null): string {
  if (!formattedAddress) return ""
  const parts = formattedAddress.split(",").map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return ""

  const countries = new Set([
    "USA", "US", "UNITED STATES", "UNITED STATES OF AMERICA",
    "CANADA", "CA", "UK", "UNITED KINGDOM", "GB", "GREAT BRITAIN",
    "FRANCE", "GERMANY", "AUSTRALIA", "AU", "NEW ZEALAND", "NZ",
    "NETHERLANDS", "NL", "SPAIN", "ITALY", "SWITZERLAND", "CH",
    "BELGIUM", "BE", "SWEDEN", "SE", "NORWAY", "NO", "DENMARK", "DK",
    "FINLAND", "FI", "IRELAND", "IE", "SINGAPORE", "SG", "JAPAN", "JP",
    "SOUTH AFRICA", "ZA", "BRAZIL", "BR", "MEXICO", "MX", "INDIA", "IN",
  ])

  const statesAndProvinces = new Set([
    // US
    "ALABAMA", "ALASKA", "ARIZONA", "ARKANSAS", "CALIFORNIA", "COLORADO", "CONNECTICUT", "DELAWARE", "FLORIDA", "GEORGIA",
    "HAWAII", "IDAHO", "ILLINOIS", "INDIANA", "IOWA", "KANSAS", "KENTUCKY", "LOUISIANA", "MAINE", "MARYLAND",
    "MASSACHUSETTS", "MICHIGAN", "MINNESOTA", "MISSISSIPPI", "MISSOURI", "MONTANA", "NEBRASKA", "NEVADA", "NEW HAMPSHIRE", "NEW JERSEY",
    "NEW MEXICO", "NEW YORK", "NORTH CAROLINA", "NORTH DAKOTA", "OHIO", "OKLAHOMA", "OREGON", "PENNSYLVANIA", "RHODE ISLAND", "SOUTH CAROLINA",
    "SOUTH DAKOTA", "TENNESSEE", "TEXAS", "UTAH", "VERMONT", "VIRGINIA", "WASHINGTON", "WEST VIRGINIA", "WISCONSIN", "WYOMING",
    // Canada
    "ALBERTA", "BRITISH COLUMBIA", "MANITOBA", "NEW BRUNSWICK", "NEWFOUNDLAND AND LABRADOR", "NOVA SCOTIA", "ONTARIO", "PRINCE EDWARD ISLAND", "QUEBEC", "SASKATCHEWAN", "NORTHWEST TERRITORIES", "NUNAVUT", "YUKON"
  ])

  // Check if last part is country
  if (parts.length > 1) {
    const last = parts[parts.length - 1].toUpperCase()
    if (countries.has(last)) {
      parts.pop()
    }
  }

  // Inspect right-to-left
  while (parts.length > 0) {
    const candidate = parts[parts.length - 1]
    const upperCandidate = candidate.toUpperCase()

    // 1. Check if it contains digits (postal code / address lines like "Suite 300")
    const hasDigits = /\d/.test(candidate)
    // 2. Check if it's a 2-letter uppercase state code (like CA, QC, NY, ON)
    const isStateCode = candidate.length === 2 && /^[A-Z]{2}$/i.test(candidate)
    // 3. Check if it's a full state/province name
    const isFullState = statesAndProvinces.has(upperCandidate)
    // 4. Check if it's in country list
    const isCountry = countries.has(upperCandidate)

    if (hasDigits || isStateCode || isFullState || isCountry) {
      parts.pop()
    } else {
      return candidate
    }
  }

  // If we stripped everything, it means we didn't find a clean city.
  // Return empty string to prevent querying with state codes or zip codes.
  return ""
}

