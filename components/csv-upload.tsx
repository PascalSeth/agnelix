"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react"
import { parseCSV, type ParsedLead } from "@/lib/csv-parser"
import { cn } from "@/lib/utils"

interface CSVUploadProps {
  onParsed: (leads: ParsedLead[]) => void
}

export function CSVUpload({ onParsed }: CSVUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [parsed, setParsed] = useState<{ leads: ParsedLead[]; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a .csv file")
        return
      }
      setLoading(true)
      setError(null)
      setParsed(null)
      const result = await parseCSV(file)
      setLoading(false)
      if (result.errors.length && !result.leads.length) {
        setError(result.errors[0])
        return
      }
      if (!result.leads.length) {
        setError("No valid leads found. Ensure the CSV has an email column.")
        return
      }
      setParsed({ leads: result.leads, skipped: result.skipped })
      onParsed(result.leads)
    },
    [onParsed]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        {loading ? (
          <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        ) : (
          <Upload className="size-8 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {loading ? "Parsing…" : "Drop your CSV here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Columns: email, first_name, last_name, company, title, website
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {parsed && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            <strong>{parsed.leads.length}</strong> leads ready
            {parsed.skipped > 0 && (
              <span className="text-green-600/70"> · {parsed.skipped} skipped (invalid/duplicate)</span>
            )}
          </span>
        </div>
      )}

      {parsed && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <FileText className="size-3.5" />
            Preview (first 5)
          </div>
          <div className="divide-y divide-border">
            {parsed.leads.slice(0, 5).map((lead, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium">
                  {lead.firstName} {lead.lastName}
                </span>
                <span className="text-muted-foreground">{lead.email}</span>
                {lead.company && (
                  <span className="ml-auto text-xs text-muted-foreground">{lead.company}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
