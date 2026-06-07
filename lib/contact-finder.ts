import * as cheerio from "cheerio"
import OpenAI from "openai"
import dns from "dns/promises"
import crypto from "crypto"
import { prisma } from "@/lib/db"
import { generateEmailPermutations, testEmailsSmtp } from "@/lib/email-verifier"

const openai = new OpenAI({
  apiKey: process.env.NEXT_DEEPSEEKER_API_KEY,
  baseURL: "https://api.deepseek.com",
})

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const EMAIL_RE      = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const OBFUSCATED_RE = /([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\)|&#64;|＠)\s*([a-zA-Z0-9.-]+(?:\s*(?:\[dot\]|\(dot\))\s*[a-zA-Z]{2,})+)/gi

const PROBE_PATHS = [
  "", "/about", "/about-us", "/our-team", "/team",
  "/contact", "/contact-us", "/people", "/leadership",
  "/founders", "/staff", "/meet-the-team",
]

const GENERIC_PREFIXES = new Set([
  "info", "contact", "hello", "hi", "hey", "support", "help", "admin",
  "office", "mail", "enquiries", "enquiry", "sales", "marketing",
  "reception", "general", "team", "noreply", "no-reply", "donotreply",
  "postmaster", "bounce", "unsubscribe", "newsletter", "billing",
])

// ─── Source taxonomy & base scores ──────────────────────────────────────────
// Each source type maps to a base confidence score reflecting how reliably
// that discovery method identifies a real, deliverable email address.
//
// Methodology:
//   mailto-link   – explicitly published as a clickable link; highest intent
//   address-tag   – HTML5 semantic contact element; deliberate placement
//   data-attr     – hidden in data-email attr; modern dev obfuscation, still theirs
//   obfuscated    – [at]/[dot] pattern; they tried to hide it but it's theirs
//   text-scraped  – raw regex match in page text; could be old/incorrect
//   ai-verbatim   – AI read it verbatim from page copy; same source as text but parsed
//   format-matched – generated address whose format was confirmed by another email on-site
//   format-common  – generated: first.last (~45% of real business emails)
//   format-mid     – generated: first (~20%) or flast (~12%)
//   format-low     – generated: other patterns (~6-8% each)
//   format-rare    – generated: uncommon patterns (<5% combined)

type EmailSource =
  | "mailto-link"
  | "address-tag"
  | "data-attr"
  | "obfuscated"
  | "text-scraped"
  | "ai-verbatim"
  | "format-matched"
  | "format-common"
  | "format-mid"
  | "format-low"
  | "format-rare"
  | "smtp-verified"

const SOURCE_SCORE: Record<EmailSource, number> = {
  "mailto-link":    90,
  "address-tag":    87,
  "data-attr":      85,
  "obfuscated":     82,
  "text-scraped":   74,
  "ai-verbatim":    72,
  "format-matched": 66,
  "format-common":  46,  // first.last
  "format-mid":     36,  // first / flast
  "format-low":     26,  // f.last / firstlast
  "format-rare":    16,  // last, last.first, etc.
  "smtp-verified":  92,
}

// Human-readable label for the UI
const SOURCE_LABEL: Record<EmailSource, string> = {
  "mailto-link":    "Site",
  "address-tag":    "Site",
  "data-attr":      "Site",
  "obfuscated":     "Site",
  "text-scraped":   "Site",
  "ai-verbatim":    "AI",
  "format-matched": "Format",
  "format-common":  "Gen",
  "format-mid":     "Gen",
  "format-low":     "Gen",
  "format-rare":    "Gen",
  "smtp-verified":  "SMTP",
}

// Format pattern → source tier (based on real-world email format frequency studies)
const FORMAT_ID_SOURCE: Record<string, EmailSource> = {
  "first.last": "format-common",  // ~45%
  "first":      "format-mid",     // ~20%
  "flast":      "format-mid",     // ~12%
  "f.last":     "format-low",     // ~8%
  "firstlast":  "format-low",     // ~6%
  "last.first": "format-rare",    // ~3%
  "last":       "format-rare",    // ~2%
  "lastf":      "format-rare",    // ~2%
  "first_last": "format-rare",    // ~2%
}

const FORMAT_GENERATORS: Array<{
  id: string
  fn: (f: string, l: string) => string
}> = [
  { id: "first.last",  fn: (f, l) => `${f}.${l}`   },
  { id: "first",       fn: (f)    => f              },
  { id: "flast",       fn: (f, l) => `${f[0]}${l}` },
  { id: "f.last",      fn: (f, l) => `${f[0]}.${l}`},
  { id: "firstlast",   fn: (f, l) => `${f}${l}`    },
  { id: "last.first",  fn: (f, l) => `${l}.${f}`   },
  { id: "last",        fn: (_, l) => l              },
  { id: "lastf",       fn: (f, l) => `${l}${f[0]}` },
  { id: "first_last",  fn: (f, l) => `${f}_${l}`   },
]

export interface ContactResult {
  email: string
  name: string | null
  firstName: string | null
  lastName: string | null
  title: string | null
  confidence: number
  sources: string[]
  gravatar: boolean
  isDecisionMaker: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "")
  } catch {
    return url.replace(/^www\./, "").split("/")[0]
  }
}

function isGeneric(local: string): boolean {
  return GENERIC_PREFIXES.has(local.toLowerCase().split(/[._-]/)[0])
}

function emailLocal(email: string): string {
  return email.split("@")[0].toLowerCase()
}

function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? ""
}

function md5(str: string): string {
  return crypto.createHash("md5").update(str.toLowerCase().trim()).digest("hex")
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) &&
    !email.endsWith(".png") && !email.endsWith(".jpg") && !email.endsWith(".gif") &&
    !["example.com", "sentry.io", "w3.org", "schema.org", "placeholder.com"].includes(emailDomain(email))
}

// ─── Source-tracked email extraction ────────────────────────────────────────

interface TaggedEmail {
  email: string
  source: EmailSource
}

function extractTaggedEmails(html: string, $: cheerio.CheerioAPI): TaggedEmail[] {
  // Map: email → best source (highest score wins)
  const best = new Map<string, EmailSource>()

  function keep(email: string, source: EmailSource) {
    const e = email.toLowerCase().trim()
    if (!isValidEmail(e)) return
    const current = best.get(e)
    if (!current || SOURCE_SCORE[source] > SOURCE_SCORE[current]) {
      best.set(e, source)
    }
  }

  // 1. mailto: links — highest intent
  $('a[href^="mailto:"]').each((_, el) => {
    const raw = $(el).attr("href")?.replace("mailto:", "").split("?")[0] ?? ""
    if (!raw) return
    try { keep(decodeURIComponent(raw), "mailto-link") } catch { keep(raw, "mailto-link") }
  })

  // 2. <address> tags — semantic HTML contact info
  $("address").each((_, el) => {
    for (const e of $(el).text().match(EMAIL_RE) ?? []) keep(e, "address-tag")
    // Also check mailto: inside address
    $(el).find('a[href^="mailto:"]').each((_, a) => {
      const raw = $(a).attr("href")?.replace("mailto:", "").split("?")[0] ?? ""
      if (!raw) return
      try { keep(decodeURIComponent(raw), "address-tag") } catch { keep(raw, "address-tag") }
    })
  })

  // 3. data-email attributes
  $("[data-email]").each((_, el) => {
    const val = $(el).attr("data-email") ?? ""
    if (val.includes("@")) keep(val, "data-attr")
  })

  // 4. Obfuscated: name [at] domain [dot] com
  const re = new RegExp(OBFUSCATED_RE.source, "gi")
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const normalised = m[0]
      .replace(/\s*(?:\[dot\]|\(dot\))\s*/gi, ".")
      .replace(/\s*(?:\[at\]|\(at\)|&#64;|＠)\s*/gi, "@")
      .toLowerCase().trim()
    keep(normalised, "obfuscated")
  }

  // 5. Raw regex — lowest priority for discovered emails
  for (const e of html.match(EMAIL_RE) ?? []) keep(e, "text-scraped")

  return Array.from(best.entries()).map(([email, source]) => ({ email, source }))
}

// ─── LinkedIn hints ──────────────────────────────────────────────────────────

function extractLinkedInUrls($: cheerio.CheerioAPI): string[] {
  const urls: string[] = []
  $('a[href*="linkedin.com/in/"]').each((_, el) => {
    const href = $(el).attr("href") ?? ""
    if (href) urls.push(href)
  })
  return urls.slice(0, 3)
}

// ─── Page scraping ───────────────────────────────────────────────────────────

interface ScrapedPage {
  url: string
  text: string
  taggedEmails: TaggedEmail[]
  linkedInUrls: string[]
}

async function scrapePage(url: string): Promise<ScrapedPage> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-GB,en;q=0.9" },
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
    })
    if (!res.ok) return { url, text: "", taggedEmails: [], linkedInUrls: [] }

    const html = await res.text()
    const $ = cheerio.load(html)
    $("script, style, nav, footer, noscript, svg, iframe").remove()

    return {
      url,
      text: $("body").text().replace(/\s+/g, " ").slice(0, 8000),
      taggedEmails: extractTaggedEmails(html, $),
      linkedInUrls: extractLinkedInUrls($),
    }
  } catch {
    return { url, text: "", taggedEmails: [], linkedInUrls: [] }
  }
}

// ─── Network checks ──────────────────────────────────────────────────────────

// Returns true = has MX, false = confirmed no MX, null = check failed (don't penalise)
async function checkMX(domain: string): Promise<boolean | null> {
  try {
    return (await dns.resolveMx(domain)).length > 0
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code ?? ""
    // ENODATA / ENOTFOUND = domain exists but genuinely has no MX records
    if (code === "ENODATA" || code === "ENOTFOUND") return false
    // ECONNREFUSED / ETIMEDOUT / etc = DNS unreachable, result unknown
    return null
  }
}

async function checkGravatar(email: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.gravatar.com/avatar/${md5(email)}?d=404`, {
      method: "HEAD", signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch { return false }
}

// ─── Format detection ────────────────────────────────────────────────────────

function detectFormatId(
  domainEmails: string[],
  firstName: string,
  lastName: string,
): string | null {
  const f = firstName.toLowerCase()
  const l = lastName.toLowerCase()
  for (const email of domainEmails.filter(e => !isGeneric(emailLocal(e)))) {
    const local = emailLocal(email)
    for (const gen of FORMAT_GENERATORS) {
      if (gen.fn(f, l) === local) return gen.id
    }
  }
  return null
}

function generateCandidates(
  firstName: string,
  lastName: string,
  domain: string,
  detectedFormatId: string | null,
): Array<{ email: string; formatId: string; source: EmailSource }> {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "")
  const l = lastName.toLowerCase().replace(/[^a-z]/g, "")
  if (!f || !l) return []

  const seen = new Set<string>()
  return FORMAT_GENERATORS
    .map(gen => {
      const email = `${gen.fn(f, l)}@${domain}`
      if (seen.has(email)) return null
      seen.add(email)
      const source: EmailSource = gen.id === detectedFormatId
        ? "format-matched"
        : FORMAT_ID_SOURCE[gen.id] ?? "format-rare"
      return { email, formatId: gen.id, source }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}

// ─── AI extraction ───────────────────────────────────────────────────────────

interface ExtractedPerson {
  name: string | null
  firstName: string | null
  lastName: string | null
  title: string | null
  email: string | null
}

async function extractDecisionMakers(
  pages: ScrapedPage[],
  companyName: string,
  localNeighbors?: boolean,
): Promise<ExtractedPerson[]> {
  const combined = pages
    .filter(p => p.text)
    .map(p => `[${p.url}]\n${p.text}`)
    .join("\n\n---\n\n")
    .slice(0, 9000)

  if (!combined.trim()) return []

  const linkedInHint = pages.flatMap(p => p.linkedInUrls).slice(0, 3).join(", ")

  const prompt = localNeighbors
    ? `Extract team members, staff, or employees from this company website. Company: "${companyName}".
${linkedInHint ? `LinkedIn profiles found: ${linkedInHint}` : ""}

Website text:
${combined}

Return a JSON array of up to 4 people.
Each object: { "name": string|null, "firstName": string|null, "lastName": string|null, "title": string|null, "email": string|null }
Rules:
- Extract any people working at this business (we do not care about seniority or roles, just people)
- Set email ONLY if it appears verbatim in the text above
- Return [] if nobody identifiable
- Strict JSON array only — no markdown`
    : `Extract decision makers from this company website. Company: "${companyName}".
${linkedInHint ? `LinkedIn profiles found: ${linkedInHint}` : ""}

Website text:
${combined}

Return a JSON array of up to 2 people, ranked by seniority (owner > founder > director > CEO > manager).
Each object: { "name": string|null, "firstName": string|null, "lastName": string|null, "title": string|null, "email": string|null }
Rules:
- Only people who clearly run or own this business
- Set email ONLY if it appears verbatim in the text above
- Return [] if nobody identifiable
- Strict JSON array only — no markdown`

  try {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [{
        role: "user",
        content: prompt,
      }],
      temperature: 0.1,
      max_tokens: 400,
      // @ts-expect-error — disable DeepSeek thinking for fast tasks
      thinking: { type: "disabled" },
    })

    const raw = res.choices[0]?.message?.content ?? "[]"
    const parsed = JSON.parse(raw.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim())
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p: ExtractedPerson) => p.firstName || p.name)
  } catch {
    return []
  }
}

// ─── Confidence calculation ──────────────────────────────────────────────────

function calcConfidence(params: {
  source: EmailSource
  email: string
  businessDomain: string
  mxOk: boolean | null  // null = check failed, don't penalise
  gravatar: boolean
  corroborated: boolean
  isDecisionMaker: boolean
}): number {
  const { source, email, businessDomain, mxOk, gravatar, corroborated, isDecisionMaker } = params

  // Confirmed no MX records = domain can't receive email
  if (mxOk === false) return 8

  let score = SOURCE_SCORE[source]

  // Cross-domain penalty — email not on the business's own domain
  if (!email.endsWith(`@${businessDomain}`)) {
    score = Math.min(score, 32)
  }

  // Corroboration: same email independently found from 2+ sources
  if (corroborated) score = Math.min(score + 9, 95)

  // Gravatar: someone registered this email with Gravatar — confirms it's real
  if (gravatar) score = Math.min(score + 14, 95)

  // Decision maker confirmed by AI — minor boost (we know WHO it is)
  if (isDecisionMaker && source.startsWith("format")) score = Math.min(score + 5, 95)

  // Generic inboxes cap — info@, contact@ etc rarely reach a decision maker
  if (isGeneric(emailLocal(email))) score = Math.min(score, 36)

  // Hard cap
  return Math.min(Math.round(score), 95)
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function findContacts(
  websiteUrl: string,
  companyName: string,
  localNeighbors?: boolean,
  bypassCache?: boolean,
): Promise<ContactResult[]> {
  const domain  = cleanDomain(websiteUrl)
  
  if (!bypassCache) {
    try {
      const cached = await prisma.domainContactCache.findUnique({
        where: { domain }
      })
      if (cached?.contactsJson) {
        const ageInMs = Date.now() - cached.updatedAt.getTime()
        if (ageInMs < 14 * 24 * 60 * 60 * 1000) {
          return JSON.parse(cached.contactsJson) as ContactResult[]
        }
      }
    } catch (err) {
      console.error("Cache read error:", err)
    }
  }

  const baseUrl = `https://${domain}`

  // MX check runs in parallel with first page batch
  const [mxOk, ...firstBatch] = await Promise.all([
    checkMX(domain),
    ...PROBE_PATHS.slice(0, 5).map(p => scrapePage(`${baseUrl}${p}`)),
  ])

  // Only fetch remaining pages if we haven't found domain emails yet
  const domainEmailsInFirst = firstBatch
    .flatMap(p => p.taggedEmails)
    .filter(t => t.email.endsWith(`@${domain}`))

  const allPages: ScrapedPage[] = domainEmailsInFirst.length > 0
    ? firstBatch
    : [...firstBatch, ...await Promise.all(PROBE_PATHS.slice(5).map(p => scrapePage(`${baseUrl}${p}`)))]

  // Merge all tagged emails — keep best source per email,
  // and track which emails appear from multiple sources (corroboration)
  const sourceMap   = new Map<string, EmailSource>()   // email → best source
  const sourceCount = new Map<string, number>()         // email → count of distinct sources

  for (const page of allPages) {
    for (const { email, source } of page.taggedEmails) {
      const current = sourceMap.get(email)
      if (!current || SOURCE_SCORE[source] > SOURCE_SCORE[current]) {
        sourceMap.set(email, source)
      }
      sourceCount.set(email, (sourceCount.get(email) ?? 0) + 1)
    }
  }

  const domainEmails = Array.from(sourceMap.keys()).filter(e => e.endsWith(`@${domain}`))

  // AI: extract decision makers / team members
  const people = await extractDecisionMakers(allPages, companyName, localNeighbors)

  // ── Build candidate pool ──────────────────────────────────────
  type Candidate = {
    email: string
    source: EmailSource
    isDecisionMaker: boolean
    name: string | null; firstName: string | null
    lastName: string | null; title: string | null
  }

  const candidates = new Map<string, Candidate>()

  // A. All scraped emails
  for (const [email, source] of sourceMap.entries()) {
    candidates.set(email, {
      email, source,
      isDecisionMaker: false,
      name: null, firstName: null, lastName: null, title: null,
    })
  }

  // B. AI-confirmed person emails + generated candidates
  for (const person of people) {
    // Direct email stated verbatim on site
    if (person.email) {
      const ex = candidates.get(person.email)
      const betterSource: EmailSource = "ai-verbatim"
      if (ex) {
        // Upgrade source only if ai-verbatim is better
        if (SOURCE_SCORE[betterSource] > SOURCE_SCORE[ex.source]) ex.source = betterSource
        ex.isDecisionMaker = true
        ex.name = person.name; ex.firstName = person.firstName
        ex.lastName = person.lastName; ex.title = person.title
      } else {
        candidates.set(person.email, {
          email: person.email, source: betterSource, isDecisionMaker: true,
          name: person.name, firstName: person.firstName,
          lastName: person.lastName, title: person.title,
        })
      }
    }

    // Generated candidates from name
    if (person.firstName && person.lastName) {
      const formatId = detectFormatId(domainEmails, person.firstName, person.lastName)
      for (const cand of generateCandidates(person.firstName, person.lastName, domain, formatId)) {
        const ex = candidates.get(cand.email)
        if (ex) {
          // Found on site AND matches name pattern — massive boost
          if (ex.source === "text-scraped" || ex.source === "mailto-link") {
            ex.source = ex.source  // keep higher source; corroboration handles the boost
          }
          ex.isDecisionMaker = true
          ex.name = person.name; ex.firstName = person.firstName
          ex.lastName = person.lastName; ex.title = person.title
          // Bump source count to flag corroboration
          sourceCount.set(cand.email, (sourceCount.get(cand.email) ?? 0) + 1)
        } else {
          candidates.set(cand.email, {
            email: cand.email, source: cand.source, isDecisionMaker: true,
            name: person.name, firstName: person.firstName,
            lastName: person.lastName, title: person.title,
          })
        }
      }
    }
  }

  // C. SMTP Validation on Name Permutations
  const permutationsToTest: string[] = []
  const permToPersonMap = new Map<string, ExtractedPerson>()

  for (const person of people) {
    if (person.firstName && person.lastName) {
      const perms = generateEmailPermutations(person.firstName, person.lastName, domain)
      for (const email of perms) {
        if (!candidates.has(email)) {
          permutationsToTest.push(email)
          permToPersonMap.set(email, person)
        }
      }
    }
  }

  if (permutationsToTest.length > 0) {
    try {
      const smtpRes = await testEmailsSmtp(domain, permutationsToTest.slice(0, 16))
      if (!smtpRes.isCatchAll) {
        for (const [email, status] of Object.entries(smtpRes.results)) {
          if (status === "valid") {
            const person = permToPersonMap.get(email)
            if (person) {
              candidates.set(email, {
                email,
                source: "smtp-verified",
                isDecisionMaker: true,
                name: person.name,
                firstName: person.firstName,
                lastName: person.lastName,
                title: person.title,
              })
              sourceCount.set(email, (sourceCount.get(email) ?? 0) + 1)
            }
          }
        }
      }
    } catch (err) {
      console.error("SMTP verify error during contact crawl:", err)
    }
  }

  // ── Score, verify Gravatar, build results ─────────────────────
  const ranked = Array.from(candidates.values())
    .map(c => ({
      ...c,
      // Pre-score to decide who gets Gravatar checked
      preScore: calcConfidence({
        source: c.source, email: c.email,
        businessDomain: domain, mxOk,
        gravatar: false,
        corroborated: (sourceCount.get(c.email) ?? 0) > 1,
        isDecisionMaker: c.isDecisionMaker,
      }),
    }))
    .sort((a, b) => b.preScore - a.preScore)
    .slice(0, 8)

  const results: ContactResult[] = await Promise.all(
    ranked.map(async cand => {
      // Only Gravatar-check candidates worth verifying (saves ~3s per low-value check)
      const gravatar = cand.preScore >= 40 ? await checkGravatar(cand.email) : false

      const confidence = calcConfidence({
        source: cand.source,
        email: cand.email,
        businessDomain: domain,
        mxOk,
        gravatar,
        corroborated: (sourceCount.get(cand.email) ?? 0) > 1,
        isDecisionMaker: cand.isDecisionMaker,
      })

      return {
        email: cand.email,
        name: cand.name,
        firstName: cand.firstName,
        lastName: cand.lastName,
        title: cand.title,
        confidence,
        sources: [SOURCE_LABEL[cand.source]],
        gravatar,
        isDecisionMaker: cand.isDecisionMaker,
      }
    })
  )

  const finalResults = results
    .filter(r => r.confidence > 0)
    .sort((a, b) => {
      if (localNeighbors) {
        return b.confidence - a.confidence
      }
      if (a.isDecisionMaker !== b.isDecisionMaker) return a.isDecisionMaker ? -1 : 1
      return b.confidence - a.confidence
    })

  // Save to database cache
  try {
    await prisma.domainContactCache.upsert({
      where: { domain },
      update: { contactsJson: JSON.stringify(finalResults) },
      create: { domain, contactsJson: JSON.stringify(finalResults) },
    })
  } catch (err) {
    console.error("Cache write error:", err)
  }

  return finalResults
}
