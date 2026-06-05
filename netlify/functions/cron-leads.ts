import { schedule } from "@netlify/functions"

const cronHandler = async () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-site.netlify.app"
  const cronSecret = process.env.CRON_SECRET || ""

  try {
    const res = await fetch(`${appUrl}/api/cron/leads`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    })
    console.log(`Cron leads response: ${res.status}`)
    return { statusCode: res.status }
  } catch (err) {
    console.error("Cron leads error:", err)
    return { statusCode: 500 }
  }
}

export const handler = schedule("0 6 * * *", cronHandler)
