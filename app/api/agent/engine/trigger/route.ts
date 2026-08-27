/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { runAutoSearchForUser, type AutoSearchEvent } from "@/lib/auto-search"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(eventOrMsg: AutoSearchEvent | string) {
        const payload = typeof eventOrMsg === "string"
          ? JSON.stringify({ type: "log", message: eventOrMsg })
          : JSON.stringify(eventOrMsg)
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
      }

      send({ type: "log", message: "Initializing Autonomous Engine for your agency..." })
      send({ type: "log", message: "Validating ICP guardrails and quality filters..." })

      try {
        await runAutoSearchForUser(session.user!.id, (event) => {
          send(event)
        })
      } catch (err) {
        send({ type: "log", message: `Error: ${err instanceof Error ? err.message : String(err)}` })
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  })
}
