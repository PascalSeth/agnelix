import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { DEFAULT_PLAYBOOKS } from "../lib/playbook-defaults"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  for (const pb of DEFAULT_PLAYBOOKS) {
    const data = {
      name: pb.name,
      targetVerticals: pb.targetVerticals,
      discoveryMethod: pb.discoveryMethod,
      platformOptions: pb.platformOptions ?? [],
      sequenceTemplates: pb.sequenceTemplates,
      proposalTemplates: pb.proposalTemplates,
      reportMetrics: pb.reportMetrics,
      reportTemplates: pb.reportTemplates,
      portalTemplates: pb.portalTemplates,
      portalSections: pb.portalSections,
      toneOptions: pb.toneOptions,
      objectionHandlers: pb.objectionHandlers,
    }
    // Only create missing playbooks — never overwrite user/AI-customised rows
    const existing = await prisma.playbook.findUnique({ where: { type: pb.type } })
    if (existing) {
      console.log(`[seed] Playbook "${pb.type}" already exists — skipping`)
      continue
    }
    await prisma.playbook.create({ data: { type: pb.type, ...data } })
    console.log(`[seed] Created playbook "${pb.type}"`)
  }
}

main()
  .then(() => console.log("[seed] Done"))
  .catch((e) => {
    console.error("[seed] Failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
