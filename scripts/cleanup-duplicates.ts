import { prisma } from "../lib/db"

async function main() {
  console.log("=== CLEANING DUPLICATES & EMPTY MESSAGES ===")

  // 1. Delete empty body emails
  const emptyEmails = await prisma.email.deleteMany({
    where: {
      body: "",
      subject: "Re: Following up",
    },
  })
  console.log(`Deleted ${emptyEmails.count} empty ghost emails.`)

  // 2. Find and deduplicate replies
  const replies = await prisma.reply.findMany({
    orderBy: { receivedAt: "asc" },
  })

  const seen = new Set<string>()
  const duplicateIds: string[] = []

  for (const r of replies) {
    const key = `${r.leadId}:${r.fromEmail}:${r.body.trim()}`
    if (seen.has(key)) {
      duplicateIds.push(r.id)
    } else {
      seen.add(key)
    }
  }

  if (duplicateIds.length > 0) {
    // Delete associated pending actions first
    await prisma.pendingAction.deleteMany({
      where: { replyId: { in: duplicateIds } },
    })

    const deletedReplies = await prisma.reply.deleteMany({
      where: { id: { in: duplicateIds } },
    })
    console.log(`Deleted ${deletedReplies.count} duplicate reply records.`)
  } else {
    console.log("No duplicate replies found.")
  }

  // 3. Delete empty pending actions
  const emptyPending = await prisma.pendingAction.deleteMany({
    where: {
      draftBody: "",
    },
  })
  console.log(`Deleted ${emptyPending.count} empty pending actions.`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
