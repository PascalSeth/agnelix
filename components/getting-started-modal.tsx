/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, ArrowUpRight, GitBranch, Search, Megaphone } from "lucide-react"
import Link from "next/link"

const ICON_MAP: Record<string, any> = {
  GitBranch,
  Search,
  Megaphone,
}

type Step = {
  key: string
  label: string
  desc: string
  href: string
  cta: string
  icon: string
  done: boolean
}

interface GettingStartedModalProps {
  steps: Step[]
}

export function GettingStartedModal({ steps }: GettingStartedModalProps) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length

  useEffect(() => {
    // Check if dismissed in local storage
    const isDismissed = localStorage.getItem("getting-started-dismissed") === "true"
    setDismissed(isDismissed)

    // Automatically open if there are pending steps and not previously dismissed
    if (!allDone && !isDismissed) {
      setOpen(true)
    }
  }, [allDone])

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) {
      // Mark as dismissed when closed
      localStorage.setItem("getting-started-dismissed", "true")
      setDismissed(true)
    }
  }

  return (
    <>
      {/* Manual trigger if dismissed but not all done */}
      {!allDone && dismissed && (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold text-white/70 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/[0.08]"
          style={{ background: "rgba(167,139,250,.1)" }}
        >
          <span className="flex size-5 items-center justify-center rounded-md bg-violet-500/20 text-violet-400">
            {steps.length - doneCount}
          </span>
          Setup pending
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[700px] bg-[#1a1c24] border-white/[0.08] p-0 overflow-hidden">
          <div
            className="p-6 md:p-8"
            style={{
              background: "linear-gradient(145deg,rgba(167,139,250,.05) 0%,rgba(255,255,255,.01) 100%)",
            }}
          >
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-black text-white/90 flex items-center justify-between">
                Getting started
                <span className="text-[12px] font-bold text-white/40 font-normal mt-0.5">
                  {doneCount} of {steps.length} steps complete
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {steps.map((step, idx) => {
                const Icon = ICON_MAP[step.icon] || Check
                return (
                  <Link
                    key={step.key}
                    href={step.href}
                    onClick={() => handleOpenChange(false)}
                    className="group relative flex flex-col gap-3 rounded-xl p-5 transition-all hover:-translate-y-1"
                    style={{
                      background: step.done ? "rgba(52,211,153,.04)" : "rgba(255,255,255,.025)",
                      border: step.done ? "1px solid rgba(52,211,153,.18)" : "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex size-10 items-center justify-center rounded-xl"
                        style={{
                          background: step.done ? "rgba(52,211,153,.12)" : "rgba(167,139,250,.1)",
                          border: step.done ? "1px solid rgba(52,211,153,.25)" : "1px solid rgba(167,139,250,.18)",
                        }}
                      >
                        {step.done ? <Check className="size-5 text-emerald-400" /> : <Icon className="size-5 text-violet-300" />}
                      </div>
                      <span className="text-[11px] font-black text-white/15">{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white/80">{step.label}</p>
                      <p className="text-[12px] text-white/30 mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                    <div
                      className="mt-auto flex items-center gap-1.5 text-[12px] font-bold transition-colors pt-2"
                      style={{ color: step.done ? "rgba(52,211,153,.7)" : "rgba(167,139,250,.7)" }}
                    >
                      {step.done ? "Done — view" : step.cta}
                      <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
