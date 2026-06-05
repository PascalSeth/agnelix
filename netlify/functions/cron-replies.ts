import { schedule } from "@netlify/functions"

const cronHandler = async () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-site.netlify.app"
  const cronSecret = process.env.CRON_SECRET || ""

  try {
    const res = await fetch(`${appUrl}/api/cron/replies`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    })
    console.log(`Cron replies response: ${res.status}`)
    return { statusCode: res.status }
  } catch (err) {
    console.error("Cron replies error:", err)
    return { statusCode: 500 }
  }
}

export const handler = schedule("0 * * * *", cronHandler)
