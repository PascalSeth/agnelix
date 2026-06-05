import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const EMAIL_RE      = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
// Catches: name [at] domain [dot] com  /  name(at)domain.com  /  name&#64;domain
const OBFUSCATED_RE = /([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\)|&#64;|＠)\s*([a-zA-Z0-9.-]+(?:\s*(?:\[dot\]|\(dot\))\s*[a-zA-Z]{2,})+)/gi

const GARBAGE_DOMAINS = new Set(["example.com", "sentry.io", "w3.org", "schema.org", "placeholder.com", "yourdomain.com"])
const GARBAGE_EXTS    = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js"])
const GENERIC_LOCALS  = new Set(["noreply", "no-reply", "donotreply", "postmaster", "mailer-daemon", "bounce", "unsubscribe"])

const SOCIAL_PATTERNS = ["facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "youtube.com", "tiktok.com"]

function extractEmails(html: string, $: cheerio.CheerioAPI): string[] {
  const found = new Set<string>()

  // 1. Raw regex over HTML
  for (const e of html.match(EMAIL_RE) ?? []) found.add(e.toLowerCase())

  // 2. mailto: links (catches encoded emails sites try to hide)
  $('a[href^="mailto:"]').each((_, el) => {
    const raw = $(el).attr("href")?.replace("mailto:", "").split("?")[0] ?? ""
    if (raw) found.add(decodeURIComponent(raw).toLowerCase())
  })

  // 3. data-email attributes (common obfuscation)
  $("[data-email]").each((_, el) => {
    const val = $(el).attr("data-email") ?? ""
    if (val.includes("@")) found.add(val.toLowerCase())
  })

  // 4. <address> tags
  $("address").each((_, el) => {
    const text = $(el).text()
    for (const e of text.match(EMAIL_RE) ?? []) found.add(e.toLowerCase())
  })

  // 5. Obfuscated: name [at] domain [dot] com
  let match: RegExpExecArray | null
  const re = new RegExp(OBFUSCATED_RE.source, "gi")
  while ((match = re.exec(html)) !== null) {
    // Normalise: replace [dot]/(dot) with . and [at]/(at) with @
    const raw = match[0]
      .replace(/\s*(?:\[dot\]|\(dot\))\s*/gi, ".")
      .replace(/\s*(?:\[at\]|\(at\)|&#64;|＠)\s*/gi, "@")
      .toLowerCase()
      .trim()
    if (raw.includes("@")) found.add(raw)
  }

  return Array.from(found)
}

function filterEmails(emails: string[]): string[] {
  return emails.filter(email => {
    if (!email.includes("@") || !email.includes(".")) return false
    const [local, domain] = email.split("@")
    if (!local || !domain) return false
    if (GARBAGE_DOMAINS.has(domain)) return false
    if (GENERIC_LOCALS.has(local.toLowerCase())) return false
    if (GARBAGE_EXTS.has("." + domain.split(".").pop())) return false
    // Filter obvious image/asset false positives
    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|json|xml)$/i.test(email)) return false
    // Must have valid TLD
    if (!/\.[a-z]{2,}$/i.test(domain)) return false
    return true
  })
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-GB,en;q=0.9" },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    })
    return res.ok ? await res.text() : ""
  } catch {
    return ""
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 })

  try {
    const baseUrl = new URL(url.startsWith("http") ? url : `https://${url}`)

    // 1. Fetch homepage
    const homeHtml = await fetchPage(baseUrl.href)
    const $ = cheerio.load(homeHtml)

    const allEmails = new Set<string>()
    const socials   = new Set<string>()

    // Collect emails from homepage
    for (const e of filterEmails(extractEmails(homeHtml, $))) allEmails.add(e)

    // Collect social links
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.toLowerCase() ?? ""
      if (SOCIAL_PATTERNS.some(p => href.includes(p))) socials.add(href)
    })

    // 2. Find all contact/about/team links on homepage and fetch in parallel
    const secondaryLinks = new Set<string>()
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? ""
      const lower = href.toLowerCase()
      if (/contact|about|team|people|staff|founders?|leadership/.test(lower)) {
        try { secondaryLinks.add(new URL(href, baseUrl).href) } catch {}
      }
    })

    // Fetch up to 4 secondary pages in parallel
    const secondaryPages = await Promise.all(
      Array.from(secondaryLinks).slice(0, 4).map(fetchPage)
    )

    for (const pageHtml of secondaryPages) {
      if (!pageHtml) continue
      const $p = cheerio.load(pageHtml)
      for (const e of filterEmails(extractEmails(pageHtml, $p))) allEmails.add(e)
      // Pick up any extra socials too
      $p("a[href]").each((_, el) => {
        const href = $p(el).attr("href")?.toLowerCase() ?? ""
        if (SOCIAL_PATTERNS.some(p => href.includes(p))) socials.add(href)
      })
    }

    // 3. Rank: personal emails before generic, cap at 10
    const domain    = baseUrl.hostname.replace(/^www\./, "")
    const GENERIC   = new Set(["info", "contact", "hello", "hi", "support", "help", "admin", "office", "mail", "enquiries", "sales", "reception", "general", "team"])
    const sorted    = Array.from(allEmails)
      .sort((a, b) => {
        const aGeneric = GENERIC.has(a.split("@")[0].split(/[._-]/)[0])
        const bGeneric = GENERIC.has(b.split("@")[0].split(/[._-]/)[0])
        if (aGeneric !== bGeneric) return aGeneric ? 1 : -1
        // Domain match first
        const aDomain = a.endsWith(`@${domain}`)
        const bDomain = b.endsWith(`@${domain}`)
        if (aDomain !== bDomain) return aDomain ? -1 : 1
        return 0
      })
      .slice(0, 10)

    return NextResponse.json({
      emails: sorted,
      socials: Array.from(socials).slice(0, 6),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown"
    console.error("Enrichment error:", msg)
    return NextResponse.json({ error: "Failed to scan website", emails: [], socials: [] })
  }
}
