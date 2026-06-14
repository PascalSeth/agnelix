/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { runAutoSearchForUser } from "@/lib/auto-search"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function log(msg: string) {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`))
      }

      log("Initializing Autonomous Engine for your agency...")
      log("Validating configurations...")
      
      try {
        await runAutoSearchForUser(session.user!.id, (msg) => {
          log(msg)
        })
      } catch (err) {
        log(`Error: ${err instanceof Error ? err.message : String(err)}`)
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}
