import { prisma } from "./db"

const GMAIL_DAILY_LIMIT = 100

export async function checkEmailQuota(userId: string): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sentToday = await prisma.email.count({
    where: {
      lead: { userId },
      status: "SENT",
      sentAt: { gte: today },
    },
  })

  return sentToday < GMAIL_DAILY_LIMIT
}

export async function getDailyEmailCount(userId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return prisma.email.count({
    where: {
      lead: { userId },
      status: "SENT",
      sentAt: { gte: today },
    },
  })
}
