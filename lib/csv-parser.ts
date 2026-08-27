"use client"

import Papa from "papaparse"

export interface ParsedLead {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  title?: string
  industry?: string
  website?: string
  companyDesc?: string
}

export interface ParseResult {
  leads: ParsedLead[]
  errors: string[]
  skipped: number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanStr(val: unknown): string {
  if (val === null || val === undefined) return ""
  let s = String(val).replace(/^\uFEFF/, "").trim()
  while (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function normalizeKey(key: string): string {
  return cleanStr(key)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

const FIELD_ALIASES = {
  email: [
    "email",
    "emailaddress",
    "contactemail",
    "workemail",
    "primaryemail",
    "mail",
    "courriel",
    "correo",
    "elektronikpost",
    "e-mail",
  ],
  firstName: [
    "firstname",
    "first",
    "givenname",
    "fname",
    "forename",
    "prenom",
    "nombre",
  ],
  lastName: [
    "lastname",
    "last",
    "surname",
    "familyname",
    "lname",
    "nom",
    "apellido",
  ],
  fullName: [
    "name",
    "fullname",
    "contactname",
    "leadname",
    "personname",
    "person",
    "contact",
    "lead",
  ],
  company: [
    "company",
    "companyname",
    "organization",
    "organisation",
    "account",
    "business",
    "employer",
    "org",
    "corp",
    "enterprise",
    "firm",
  ],
  title: [
    "title",
    "jobtitle",
    "role",
    "position",
    "occupation",
    "designation",
    "headline",
    "job",
    "profession",
  ],
  industry: [
    "industry",
    "sector",
    "vertical",
    "category",
    "market",
    "businesstype",
    "field",
  ],
  website: [
    "website",
    "domain",
    "url",
    "web",
    "site",
    "companywebsite",
    "companyurl",
    "link",
    "homepage",
    "webpage",
  ],
  companyDesc: [
    "companydesc",
    "companydescription",
    "description",
    "about",
    "aboutus",
    "summary",
    "overview",
    "bio",
    "notes",
  ],
}

function extractLeadFromRow(row: Record<string, unknown>): ParsedLead | null {
  const normMap = new Map<string, string>()

  for (const [rawKey, rawVal] of Object.entries(row)) {
    const normK = normalizeKey(rawKey)
    const cleanedV = cleanStr(rawVal)
    if (normK && cleanedV) {
      normMap.set(normK, cleanedV)
    }
  }

  const getByAliases = (aliases: string[]): string => {
    for (const alias of aliases) {
      const normAlias = normalizeKey(alias)
      const val = normMap.get(normAlias)
      if (val) return val
    }
    return ""
  }

  let email = getByAliases(FIELD_ALIASES.email)

  // Fallback: If no recognized email column by header, check every value in row
  if (!email || !EMAIL_RE.test(email)) {
    for (const val of Object.values(row)) {
      const candidate = cleanStr(val)
      if (candidate && EMAIL_RE.test(candidate)) {
        email = candidate
        break
      }
    }
  }

  if (!email || !EMAIL_RE.test(email)) {
    return null
  }

  let firstName = getByAliases(FIELD_ALIASES.firstName)
  let lastName = getByAliases(FIELD_ALIASES.lastName)

  if (!firstName && !lastName) {
    const fullName = getByAliases(FIELD_ALIASES.fullName)
    if (fullName) {
      const parts = fullName.split(/\s+/)
      firstName = parts[0] || ""
      lastName = parts.slice(1).join(" ") || ""
    }
  }

  const company = getByAliases(FIELD_ALIASES.company)
  const title = getByAliases(FIELD_ALIASES.title)
  const industry = getByAliases(FIELD_ALIASES.industry)
  const website = getByAliases(FIELD_ALIASES.website)
  const companyDesc = getByAliases(FIELD_ALIASES.companyDesc)

  return {
    email: email.toLowerCase(),
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    company: company || undefined,
    title: title || undefined,
    industry: industry || undefined,
    website: website || undefined,
    companyDesc: companyDesc || undefined,
  }
}

function processRows(
  data: Record<string, unknown>[],
  fields?: string[]
): { leads: ParsedLead[]; skipped: number } {
  const leads: ParsedLead[] = []
  const seen = new Set<string>()
  let skipped = 0

  // Check if header row itself was a lead (CSV with no headers where line 1 had an email)
  if (fields && fields.length > 0) {
    const headerContainsEmail = fields.some((f) => EMAIL_RE.test(cleanStr(f)))
    if (headerContainsEmail) {
      const headerRow: Record<string, string> = {}
      fields.forEach((f, idx) => {
        headerRow[`col_${idx}`] = f
      })
      const headerLead = extractLeadFromRow(headerRow)
      if (headerLead && !seen.has(headerLead.email)) {
        seen.add(headerLead.email)
        leads.push(headerLead)
      }
    }
  }

  for (const row of data || []) {
    if (!row || typeof row !== "object") {
      skipped++
      continue
    }

    const lead = extractLeadFromRow(row)

    if (!lead) {
      skipped++
      continue
    }

    if (seen.has(lead.email)) {
      skipped++
      continue
    }

    seen.add(lead.email)
    leads.push(lead)
  }

  return { leads, skipped }
}

export async function parseCSV(file: File): Promise<ParseResult> {
  try {
    const rawText = await file.text()
    const text = rawText.replace(/^\uFEFF/, "").trim()

    if (!text) {
      return { leads: [], errors: ["The uploaded file is empty."], skipped: 0 }
    }

    // Strategy 1: Standard PapaParse with trimmed headers
    const parseResult = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => cleanStr(h),
    })

    let { leads, skipped } = processRows(
      parseResult.data || [],
      parseResult.meta?.fields
    )

    // Strategy 2: If standard parse failed to extract leads or hit quote syntax errors, try relaxed quote parsing
    if (
      leads.length === 0 ||
      (parseResult.errors && parseResult.errors.length > 0 && leads.length === 0)
    ) {
      const fallbackResult = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: "greedy",
        quoteChar: "", // Disable quote handling to avoid malformed quote crashes
        transformHeader: (h) => cleanStr(h),
      })

      const fallback = processRows(
        fallbackResult.data || [],
        fallbackResult.meta?.fields
      )

      if (fallback.leads.length > leads.length) {
        leads = fallback.leads
        skipped = fallback.skipped
      }
    }

    // Strategy 3: Manual line-by-line fallback
    if (leads.length === 0) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length > 0) {
        const firstLine = lines[0]
        const delimiters = [",", ";", "\t", "|"]
        let bestDelim = ","
        let maxCount = 0
        for (const d of delimiters) {
          const count = (firstLine.match(new RegExp("\\" + d, "g")) || []).length
          if (count > maxCount) {
            maxCount = count
            bestDelim = d
          }
        }

        const rows = lines.map((line) => {
          const parts = line.split(bestDelim).map((p) => cleanStr(p))
          const obj: Record<string, string> = {}
          parts.forEach((p, idx) => {
            obj[`col_${idx}`] = p
          })
          return obj
        })

        const lineFallback = processRows(rows)
        if (lineFallback.leads.length > 0) {
          leads = lineFallback.leads
          skipped = lineFallback.skipped
        }
      }
    }

    if (leads.length > 0) {
      return { leads, errors: [], skipped }
    }

    const errors =
      parseResult.errors && parseResult.errors.length > 0
        ? parseResult.errors.map((e) => e.message)
        : []

    return { leads: [], errors, skipped }
  } catch (err) {
    return {
      leads: [],
      errors: [err instanceof Error ? err.message : "Failed to parse CSV file"],
      skipped: 0,
    }
  }
}

