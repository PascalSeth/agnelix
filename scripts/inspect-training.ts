import "dotenv/config"
import { prisma } from "../lib/db"

async function main() {
  const rules = await prisma.aiTrainingRule.findMany({
    orderBy: { createdAt: "asc" }
  })
  console.log(`Total rules in DB: ${rules.length}`)
  const bySurface: Record<string, number> = {}
  const byScope: Record<string, number> = {}

  for (const r of rules) {
    bySurface[r.surface] = (bySurface[r.surface] || 0) + 1
    byScope[r.scope] = (byScope[r.scope] || 0) + 1
  }

  console.log("By Surface:", bySurface)
  console.log("By Scope:", byScope)
  console.log("\nSample Titles:")
  for (const r of rules.slice(0, 15)) {
    console.log(`- [${r.surface} / ${r.scope}] "${r.title}" (Enabled: ${r.enabled}, Priority: ${r.priority})`)
  }
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
