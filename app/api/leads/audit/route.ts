import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const EMPTY_AUDIT = {
  ssl: false, speed: 0, pixel: false, googleAds: false, mobile: false,
  googleAnalytics: false, googleTagManager: false, wordpress: false,
  shopify: false, hasChat: false, noH1: false, noMetaDesc: false,
  hasStructuredData: false, title: "",
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })

  const targetUrl = url.startsWith("http") ? url : `https://${url}`

  try {
    const start = Date.now()
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: { "User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    })
    const speed = Date.now() - start

    const html = await res.text()
    const $ = cheerio.load(html)
    const lowerHtml = html.toLowerCase()

    // ── Tech stack detection ─────────────────────────────────────
    const pixel      = html.includes("fbevents.js") || html.includes("connect.facebook.net") || html.includes("fb.com/tr")
    const googleAds  = html.includes("googleads.g.doubleclick.net") || html.includes("adsbygoogle") || /gtag\(['"]\s*config['"]\s*,\s*['"]AW-/.test(html)
    const gAnalytics = /gtag\(['"]\s*config['"]\s*,\s*['"]G-/.test(html) || html.includes("google-analytics.com/analytics.js") || html.includes("ga.js")
    const gtm        = html.includes("googletagmanager.com/gtm.js") || html.includes("GTM-")
    const wordpress  = lowerHtml.includes("/wp-content/") || lowerHtml.includes("/wp-includes/")
    const shopify    = lowerHtml.includes("cdn.shopify.com") || lowerHtml.includes("shopify.com/s/files")
    const hasChat    = ["intercom", "drift.com", "tawk.to", "crisp.chat", "zopim", "tidio", "freshchat", "livechatinc"].some(s => lowerHtml.includes(s))
    const mobile     = lowerHtml.includes("viewport") || $("meta[name='viewport']").length > 0

    // ── SEO signals ──────────────────────────────────────────────
    const h1s        = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean)
    const noH1       = h1s.length === 0
    const metaDesc   = $("meta[name='description']").attr("content") ?? ""
    const noMetaDesc = !metaDesc.trim()
    const hasStructuredData = html.includes('"@context"') && html.includes('"@type"')

    return NextResponse.json({
      ssl:              res.url.startsWith("https"),
      speed,
      pixel,
      googleAds,
      googleAnalytics:  gAnalytics,
      googleTagManager: gtm,
      wordpress,
      shopify,
      hasChat,
      mobile,
      noH1,
      noMetaDesc,
      hasStructuredData,
      title:            $("title").text().trim(),
    })
  } catch {
    // If https fails, try http (confirms no SSL redirect)
    try {
      const httpUrl = targetUrl.replace(/^https:\/\//, "http://")
      const r = await fetch(httpUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) })
      if (r.ok) return NextResponse.json({ ...EMPTY_AUDIT })
    } catch {}
    return NextResponse.json({ error: "Could not reach website" }, { status: 500 })
  }
}
