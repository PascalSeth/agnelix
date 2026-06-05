"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, Save, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface LeadData {
  id: string
  firstName: string | null
  lastName: string | null
  title: string | null
  company: string | null
  notes: string | null
  status: string
}

const fieldStyle = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
}

export function LeadEditPanel({ lead }: { lead: LeadData }) {
  const router = useRouter()
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    firstName: lead.firstName ?? "",
    lastName:  lead.lastName  ?? "",
    title:     lead.title     ?? "",
    company:   lead.company   ?? "",
    notes:     lead.notes     ?? "",
  })

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function reset() {
    setForm({
      firstName: lead.firstName ?? "",
      lastName:  lead.lastName  ?? "",
      title:     lead.title     ?? "",
      company:   lead.company   ?? "",
      notes:     lead.notes     ?? "",
    })
    setEditing(false)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName || null,
          lastName:  form.lastName  || null,
          notes:     form.notes     || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Lead updated")
      setEditing(false)
      router.refresh()
    } catch {
      toast.error("Update failed")
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!confirm("Delete this lead? This cannot be undone.")) return
    setDeleting(true)
    try {
      await fetch(`/api/leads/${lead.id}`, { method: "DELETE" })
      toast.success("Lead deleted")
      router.push("/leads")
    } catch {
      toast.error("Delete failed")
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditing((e) => !e)}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white/45 transition-all hover:text-white/70"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <Pencil className="size-3" />
          {editing ? "Cancel Edit" : "Edit Lead"}
        </button>

        <button
          onClick={del}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-red-400/50 transition-all hover:text-red-400 disabled:opacity-40"
          style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.12)" }}
        >
          {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          Delete Lead
        </button>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div
          className="relative overflow-hidden rounded-2xl p-6 space-y-4"
          style={{
            background: "linear-gradient(145deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.02) 100%)",
            border: "1px solid rgba(255,255,255,.1)",
            boxShadow: "0 1px 0 rgba(255,255,255,.04) inset",
          }}
        >
          <div className="absolute top-0 inset-x-6 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)" }} />

          <p className="text-[11px] font-bold text-white/40 uppercase tracking-[.12em]">Edit Lead</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wide mb-1.5">
                First Name
              </label>
              <input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="John"
                className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wide mb-1.5">
                Last Name
              </label>
              <input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Smith"
                className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
                style={fieldStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wide mb-1.5">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="CEO"
              className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20"
              style={fieldStyle}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Any notes about this lead…"
              className="w-full rounded-xl px-3 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20 resize-none"
              style={fieldStyle}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold text-white/35 transition-all hover:text-white/60"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
            >
              <X className="size-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
