import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isSuperadmin } from "@/lib/auth-helpers"
import { openai } from "@/lib/ai"
import { getTrainingBlock } from "@/lib/ai-training"
import { getMatchingExemplars, buildExemplarPromptBlock } from "@/lib/ai-exemplars"
import { HUMAN_WRITING_RULES } from "@/lib/prompts"

export const maxDuration = 45

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !isSuperadmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { surface = "REPLY", scope = "global", scenario = "" } = await req.json().catch(() => ({}))
    if (!scenario.trim()) {
      return NextResponse.json({ error: "Scenario is required" }, { status: 400 })
    }

    // ── Generation A: Raw Baseline LLM (Standard Prompting) ──
    const promptRaw = `You are a sales rep responding to an email from a prospect.
Prospect message: "${scenario}"
Write a professional reply to the prospect.`

    const startA = Date.now()
    const generateRaw = async () => {
      try {
        const res = await openai.chat.completions.create({
          model: "deepseek-v4-pro",
          messages: [{ role: "user", content: promptRaw }],
          max_tokens: 2000,
          // @ts-expect-error
          thinking: { type: "disabled" },
        })
        return res.choices[0]?.message?.content?.trim() || ""
      } catch {
        const fb = await openai.chat.completions.create({
          model: "deepseek-v4-flash",
          messages: [{ role: "user", content: promptRaw }],
          max_tokens: 1000,
          // @ts-expect-error
          thinking: { type: "disabled" },
        })
        return fb.choices[0]?.message?.content?.trim() || ""
      }
    }

    // ── Generation B: Galien Synapse (Few-Shot Exemplar + Guardrails + Rules) ──
    const trainingBlock = await getTrainingBlock(surface as "REPLY" | "EMAIL" | "PROPOSAL" | "ADVISOR", scope, null)
    const matchingExemplars = getMatchingExemplars({
      surface: surface as "REPLY" | "EMAIL" | "PROPOSAL" | "ADVISOR",
      playbookType: scope,
      queryText: scenario,
      limit: 2,
    })
    const exemplarBlock = buildExemplarPromptBlock(matchingExemplars)

    const promptSynapse = `You are an elite B2B sales closer writing a reply to a prospect.
PROSPECT MESSAGE / SCENARIO:
"${scenario}"

${exemplarBlock}${trainingBlock}${HUMAN_WRITING_RULES}

Write the reply now. Hard cap 100 words.`

    const startB = Date.now()
    const generateSynapse = async () => {
      try {
        const res = await openai.chat.completions.create({
          model: "deepseek-v4-pro",
          messages: [{ role: "user", content: promptSynapse }],
          max_tokens: 2000,
          // @ts-expect-error
          thinking: { type: "disabled" },
        })
        return res.choices[0]?.message?.content?.trim() || ""
      } catch {
        const fb = await openai.chat.completions.create({
          model: "deepseek-v4-flash",
          messages: [{ role: "user", content: promptSynapse }],
          max_tokens: 1000,
          // @ts-expect-error
          thinking: { type: "disabled" },
        })
        return fb.choices[0]?.message?.content?.trim() || ""
      }
    }

    const [textA, textB] = await Promise.all([generateRaw(), generateSynapse()])
    const latencyA = Date.now() - startA
    const latencyB = Date.now() - startB

    const wordsA = textA.split(/\s+/).filter(Boolean).length
    const wordsB = textB.split(/\s+/).filter(Boolean).length

    // Analyze AI Buzzwords in both
    const banned = ["delve", "streamline", "synergy", "game-changer", "unleash", "elevate", "revolutionary", "hope this finds you well"]
    const buzzwordsA = banned.filter(b => textA.toLowerCase().includes(b))
    const buzzwordsB = banned.filter(b => textB.toLowerCase().includes(b))

    return NextResponse.json({
      scenario,
      scope,
      surface,
      raw: {
        model: "deepseek-v4-pro (Raw Base)",
        text: textA,
        wordCount: wordsA,
        latencyMs: latencyA,
        buzzwordsDetected: buzzwordsA,
        brevityScore: wordsA <= 100 ? 100 : Math.max(40, 100 - (wordsA - 100) * 2),
      },
      synapse: {
        model: "deepseek-v4-pro + Synapse Vault",
        text: textB,
        wordCount: wordsB,
        latencyMs: latencyB,
        buzzwordsDetected: buzzwordsB,
        exemplarsUsed: matchingExemplars.map(e => e.title),
        brevityScore: wordsB <= 100 ? 100 : Math.max(40, 100 - (wordsB - 100) * 2),
      },
    })
  } catch (error) {
    console.error("[Battle API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "A/B battle failed" },
      { status: 500 }
    )
  }
}
