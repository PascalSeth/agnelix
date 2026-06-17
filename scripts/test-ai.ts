import "dotenv/config"
import { classifyReply, generateBattleCard, generateEmail } from "../lib/ai"

async function main() {
  console.log("=== Testing DeepSeek API ===\n")

  // 1. Fast model — classifyReply (deepseek-v4-flash)
  console.log("1. classifyReply (deepseek-v4-flash)...")
  const classification = await classifyReply({
    replyBody: "Hey, this looks interesting. What does it cost?",
    originalEmailBody: "Hi, I noticed your website has no SSL certificate — we fix that.",
    leadName: "John Smith",
    company: "Acme Plumbing",
  })
  console.log("   Result:", JSON.stringify(classification, null, 2))

  // 2. Fast model — generateEmail (deepseek-v4-flash)
  console.log("\n2. generateEmail step 1 (deepseek-v4-flash)...")
  const email = await generateEmail(
    {
      senderName: "Pascal",
      senderTitle: "Founder",
      senderCompany: "Galien",
      senderCompanyDesc: "AI-powered lead generation",
      prospectFirstName: "John",
      prospectLastName: "Smith",
      prospectTitle: "Owner",
      prospectCompany: "Acme Plumbing",
      prospectCompanyDesc: "Local plumbing company",
      industry: "plumbing",
      recentNews: "",
      painPoint: "No SSL certificate, slow website",
      tone: "Professional",
    },
    1
  )
  console.log("   Subject:", email.subject)
  console.log("   Body preview:", email.body.slice(0, 120) + "...")

  // 3. Thinking model — generateBattleCard (deepseek-v4-pro)
  console.log("\n3. generateBattleCard (deepseek-v4-pro + thinking)...")
  const card = await generateBattleCard({
    leadName: "John Smith",
    company: "Acme Plumbing",
    industry: "plumbing",
    website: "acmeplumbing.com",
    painPoint: "No SSL, slow site",
    recentNews: null,
    originalEmailSubject: "Quick question about your website",
    originalEmailBody: "Hi John, I noticed your site has no SSL and loads in 3s.",
    replyBody: "What does it cost? We've been with our current vendor for 2 years.",
    senderName: "Pascal",
    senderCompany: "Galien",
    senderService: "AI-powered lead generation & web fixes",
  })
  console.log("   Battle Card:", JSON.stringify(card, null, 2))

  console.log("\n=== All tests passed ===")
}

main().catch((err) => {
  console.error("Test failed:", err.message)
  process.exit(1)
})
