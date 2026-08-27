import { prisma } from "../lib/db"

async function main() {
  const userId = "cmqdtnszg0000qwt2f7iizxgk" // scopeId of the user

  // 1. Fetch replies
  const replies = await prisma.reply.findMany({
    where: { lead: { userId } },
    include: {
      lead: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          company: true, industry: true, status: true, battleCard: true,
          user: { select: { name: true, agencyName: true, companyName: true, companyDesc: true, tone: true } },
        },
      },
      email: {
        select: { id: true, subject: true, body: true, sentAt: true, stepNumber: true },
      },
    },
    orderBy: { receivedAt: "desc" },
    take: 200,
  })

  console.log("REPLIES COUNT:", replies.length)
  for (const r of replies) {
    console.log("REPLY:", r.id, r.lead.email, r.subject, r.body)
  }

  // 2. Fetch pending
  const pending = await prisma.pendingAction.findMany({
    where: { userId, status: "PENDING" },
  })
  console.log("PENDING COUNT (status=PENDING):", pending.length)

  // 3. Fetch all pending regardless of status
  const allPending = await prisma.pendingAction.findMany({
    where: { userId },
  })
  console.log("ALL PENDING COUNT:", allPending.length)
  for (const p of allPending) {
    console.log("PENDING ACTION:", p.id, p.status, p.intent, p.replyId)
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
