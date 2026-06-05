"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye } from "lucide-react"
import { formatDate } from "@/lib/utils"

export interface EmailPreviewData {
  id: string
  subject: string
  body: string
  stepNumber: number
  status: string
  sentAt: Date | null
  openedAt: Date | null
  clickedAt: Date | null
  openCount: number
  clickCount: number
}

interface EmailPreviewProps {
  emails: EmailPreviewData[]
  leadName: string
}

const stepLabel = (n: number) =>
  n === 1 ? "Day 1 — Cold Intro" : n === 2 ? "Day 3 — Follow-up" : "Day 7 — Breakup"

export function EmailPreview({ emails, leadName }: EmailPreviewProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-1.5"}>
        <Eye className="size-3.5" />
        View Emails
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email Sequence — {leadName}</DialogTitle>
        </DialogHeader>

        {emails.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No emails generated yet</p>
        ) : (
          <Tabs defaultValue={String(emails[0]?.id)}>
            <TabsList className="w-full">
              {emails.map((e) => (
                <TabsTrigger key={e.id} value={String(e.id)} className="flex-1 text-xs">
                  {stepLabel(e.stepNumber)}
                </TabsTrigger>
              ))}
            </TabsList>

            {emails.map((e) => (
              <TabsContent key={e.id} value={String(e.id)} className="space-y-4 mt-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">{e.status}</Badge>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {e.sentAt && <span>Sent {formatDate(e.sentAt)}</span>}
                    {e.openCount > 0 && <span>{e.openCount} opens</span>}
                    {e.clickCount > 0 && <span>{e.clickCount} clicks</span>}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</p>
                    <p className="text-sm font-semibold">{e.subject}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Body</p>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{e.body}</pre>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
