import "dotenv/config"
import { findContacts } from "../lib/contact-finder"

async function main() {
  const tests = [
    { url: "https://www.bromleyplumbing.co.uk", name: "Bromley Plumbing" },
  ]

  for (const t of tests) {
    console.log(`\n=== ${t.name} ===`)
    try {
      const results = await findContacts(t.url, t.name)
      if (results.length === 0) {
        console.log("No contacts found")
      } else {
        for (const r of results) {
          const dm = r.isDecisionMaker ? " [DM]" : ""
          const grav = r.gravatar ? " ✓Gravatar" : ""
          console.log(`  ${r.confidence}% | ${r.email}${dm}${grav}`)
          if (r.name) console.log(`       Name: ${r.name} (${r.title ?? "no title"})`)
          console.log(`       Source: ${r.sources.join(", ")}`)
        }
      }
    } catch (err) {
      console.error("CRASH:", err)
    }
  }
}

main()
