"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShieldCheck, ArrowRight, UserPlus, CheckCircle2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/utils"

type InviteWithRelations = {
  id: string
  ownerId: string
  email: string
  token: string
  status: string
  expiresAt: Date
  owner: {
    name: string | null
    email: string | null
    agencyName: string | null
    agencyLogo: string | null
  }
}

export function InviteAcceptForm({ invite, session }: { invite: InviteWithRelations; session: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExpired = new Date(invite.expiresAt) < new Date()
  const isAccepted = invite.status === "ACCEPTED" || session.user.teamOwnerId === invite.ownerId
  const canAccept = invite.status === "PENDING" && !isExpired && session.user.teamOwnerId !== invite.ownerId

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/team/invite/${invite.token}/accept`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invitation")
      }
      toast.success("Invitation accepted!")
      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = {
    background: "linear-gradient(135deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.015) 100%)",
    border: "1px solid rgba(255,255,255,.06)",
    boxShadow: "0 15px 45px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,.03)",
    backdropFilter: "blur(24px)",
  }

  return (
    <div className="rounded-3xl p-8 space-y-6 text-center relative overflow-hidden" style={cardStyle}>
      {/* Glow effects */}
      <div className="absolute -right-20 -bottom-20 size-40 rounded-full bg-indigo-500/5 blur-[60px] pointer-events-none" />
      <div className="absolute -left-20 -top-20 size-40 rounded-full bg-violet-500/5 blur-[60px] pointer-events-none" />

      {/* Header */}
      <div className="space-y-2">
        <div className="flex justify-center mb-4">
          <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <UserPlus className="size-6 text-indigo-400" />
          </div>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white/90">Team Invitation</h2>
        <p className="text-sm text-white/40">Join your agency team on LeadGenZ</p>
      </div>

      {/* Invite Info Card */}
      <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-4">
        <div className="flex justify-center">
          <Avatar className="size-16 rounded-2xl" style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.06)" }}>
            <AvatarImage src={invite.owner.agencyLogo ?? undefined} className="object-cover rounded-2xl" />
            <AvatarFallback className="rounded-2xl text-xl font-black text-white/50" style={{ background: "rgba(255,255,255,.05)" }}>
              {initials(invite.owner.agencyName ?? invite.owner.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-white/85">{invite.owner.agencyName || "Joint Agency"}</h3>
          <p className="text-xs text-white/30 mt-1">
            Invited by <span className="text-white/60 font-semibold">{invite.owner.name || invite.owner.email}</span>
          </p>
        </div>
      </div>

      {/* Action Area */}
      <div className="space-y-4 pt-2">
        {error && (
          <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 py-2 px-3 rounded-xl">
            {error}
          </p>
        )}

        {isAccepted ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-400">
              <CheckCircle2 className="size-4" /> You are a member of this team
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3 text-sm font-bold transition-all cursor-pointer"
            >
              Go to Dashboard <ArrowRight className="size-4" />
            </button>
          </div>
        ) : isExpired ? (
          <p className="text-sm text-white/30">
            This invitation expired on {new Date(invite.expiresAt).toLocaleDateString()}.
          </p>
        ) : session.user.email?.toLowerCase() !== invite.email.toLowerCase() ? (
          <div className="space-y-3">
            <p className="text-sm text-white/40 leading-relaxed">
              This invitation was sent to <span className="text-white/70 font-semibold">{invite.email}</span>.<br />
              You are currently logged in as <span className="text-white/70 font-semibold">{session.user.email}</span>.
            </p>
            <p className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 py-2 px-3 rounded-xl">
              Sign in with that account to accept this invitation.
            </p>
          </div>
        ) : !canAccept ? (
          <p className="text-sm text-white/30">
            You can&apos;t accept this invitation right now.
          </p>
        ) : (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl text-black py-3 text-sm font-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-50 cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)",
              boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)",
            }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Join Team
          </button>
        )}
      </div>
    </div>
  )
}
