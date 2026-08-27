import "dotenv/config"
import { prisma } from "../lib/db"

async function main() {
  const count = await prisma.aiTrainingRule.count()
  console.log("Total AiTrainingRules in DB:", count)
  const rules = await prisma.aiTrainingRule.findMany({ take: 5 })
  console.log("Sample Rules:", JSON.stringify(rules.map(r => ({ id: r.id, title: r.title, scope: r.scope, surface: r.surface })), null, 2))
  process.exit(0)
}

main().catch(err => {
  console.error("DB error:", err)
  process.exit(1)
})
