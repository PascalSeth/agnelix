import { prisma } from "../lib/db"

async function main() {
  const replies = await prisma.reply.findMany({
    orderBy: { receivedAt: "desc" },
    include: {
      lead: { select: { id: true, email: true, firstName: true, company: true, userId: true, status: true } },
    },
  })
  console.log("=== ALL REPLIES ===")
  for (const r of replies) {
    console.log(`[Reply ID: ${r.id}] Lead: ${r.lead.email} (${r.lead.id}) | From: ${r.fromEmail} | Subj: ${r.subject} | Body: ${r.body} | At: ${r.receivedAt}`)
  }

  const pending = await prisma.pendingAction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lead: { select: { id: true, email: true, firstName: true, status: true, userId: true } },
    },
  })
  console.log("=== ALL PENDING ACTIONS ===")
  for (const p of pending) {
    console.log(`[Pending ID: ${p.id}] Lead: ${p.lead.email} (${p.lead.id}) | Status: ${p.status} | Intent: ${p.intent} | Subj: ${p.draftSubject} | Body: ${p.draftBody}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
