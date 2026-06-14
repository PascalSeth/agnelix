import "dotenv/config"
import { prisma } from "../lib/db"

async function main() {
  const leadId = "cmq96lb3q0015r0t2qkezhmcq"

  const replies = await prisma.reply.findMany({
    where: { leadId },
    orderBy: { id: "asc" },
    select: { id: true, emailId: true, fromEmail: true, subject: true, body: true, receivedAt: true },
  })
  console.log("REPLIES:", JSON.stringify(replies, null, 2))

  const emails = await prisma.email.findMany({
    where: { leadId },
    orderBy: { sentAt: "asc" },
    select: { id: true, subject: true, status: true, messageId: true, sentAt: true, repliedAt: true, replySnippet: true, updatedAt: true },
  })
  console.log("EMAILS:", JSON.stringify(emails, null, 2))

  const activities = await prisma.activity.findMany({
    where: { leadId, type: { in: ["REPLY_RECEIVED", "BATTLE_CARD_GENERATED"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true, note: true, createdAt: true, metadata: true },
  })
  console.log("ACTIVITIES:", JSON.stringify(activities, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
