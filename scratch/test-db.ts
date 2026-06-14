import { prisma } from "../lib/db"

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fromEmail: true,
      smtpPass: true,
      imapEnabled: true,
      gmailAppPassword: true,
    }
  })
  console.log("Users in DB:")
  console.log(JSON.stringify(users, null, 2))
}

main().catch(console.error)
