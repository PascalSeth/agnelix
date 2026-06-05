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

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const leads: ParsedLead[] = []
        const errors: string[] = []
        let skipped = 0
        const seen = new Set<string>()

        for (const row of results.data as Record<string, string>[]) {
          const email = (
            row.email ||
            row.Email ||
            row.EMAIL ||
            row["e-mail"] ||
            ""
          ).trim().toLowerCase()

          if (!email || !EMAIL_RE.test(email)) {
            skipped++
            continue
          }

          if (seen.has(email)) {
            skipped++
            continue
          }

          seen.add(email)

          leads.push({
            email,
            firstName: row.firstName || row.first_name || row.FirstName || row["First Name"] || "",
            lastName:  row.lastName  || row.last_name  || row.LastName  || row["Last Name"]  || "",
            company:   row.company   || row.Company    || row.COMPANY   || "",
            title:     row.title     || row.Title      || row.TITLE     || row.role || row.Role || "",
            industry:  row.industry  || row.Industry   || "",
            website:   row.website   || row.Website    || row.domain    || "",
            companyDesc: row.companyDesc || row.description || row.Description || "",
          })
        }

        resolve({ leads, errors, skipped })
      },
      error: (err) => {
        resolve({ leads: [], errors: [err.message], skipped: 0 })
      },
    })
  })
}
