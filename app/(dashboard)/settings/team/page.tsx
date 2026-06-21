"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Loader2, UserPlus, Mail, CheckCircle2, XCircle, Trash2,
  AlertCircle, Copy, Check, Users, Shield, ShieldAlert
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { cn, initials } from "@/lib/utils"

type TeamMember = {
  id: string
  name: string | null
  email: string
  image: string | null
  createdAt: string
  role?: "USER" | "MANAGER"
}

type Invite = {
  id: string
  email: string
  token: string
  status: string
  createdAt: string
  expiresAt: string
}

const cardStyle = {
  background: "linear-gradient(135deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.015) 100%)",
  border:     "1px solid rgba(255,255,255,.06)",
  boxShadow:  "0 15px 45px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,.03)",
  backdropFilter: "blur(24px)",
}

const inputClass = "w-full rounded-xl px-4 py-2.5 text-[13px] text-white/75 outline-none placeholder:text-white/20 border border-white/[0.08] bg-white/[0.02] focus:border-indigo-500/50 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.15)] transition-all"

export default function TeamSettingsPage() {
  const { data: session, status } = useSession()
  const [owner, setOwner] = useState<TeamMember | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  
  const [loading, setLoading] = useState(true)
  const [emailInput, setEmailInput] = useState("")
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    fetchData()
  }, [status])

  async function fetchData() {
    try {
      const res = await fetch("/api/team/invite")
      if (!res.ok) throw new Error("Failed to load team data")
      const data = await res.json()
      setOwner(data.owner)
      setMembers(data.members)
      setInvites(data.invites)
    } catch {
      toast.error("Failed to load team details")
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!emailInput.trim()) return

    setInviting(true)
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send invitation")

      toast.success("Invitation generated successfully!")
      setEmailInput("")
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleRevokeInvite(id: string) {
    if (!confirm("Are you sure you want to revoke this invitation?")) return

    try {
      const res = await fetch(`/api/team/invite/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to revoke invitation")
      toast.success("Invitation revoked")
      fetchData()
    } catch {
      toast.error("Failed to revoke invitation")
    }
  }

  async function handleRemoveMember(id: string) {
    if (!confirm("Are you sure you want to remove this member from the team?")) return

    try {
      const res = await fetch(`/api/team/members/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to remove member")
      toast.success("Member removed from team")
      fetchData()
    } catch {
      toast.error("Failed to remove member")
    }
  }

  async function handleSetRole(id: string, role: "USER" | "MANAGER") {
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error("Failed to update role")
      toast.success(role === "MANAGER" ? "Promoted to Manager" : "Set back to Member")
      fetchData()
    } catch {
      toast.error("Failed to update role")
    }
  }

  function handleCopyLink(token: string) {
    const inviteUrl = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
    toast.success("Invite link copied to clipboard")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-white/20" />
      </div>
    )
  }

  const isOwner = !session?.user?.teamOwnerId
  const canManage = isOwner || session?.user?.role === "MANAGER"

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="size-1.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 6px rgba(251,191,36,.9)" }} />
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Settings Team</span>
        </div>
        <h1 className="text-[28px] font-black tracking-tight leading-none text-white/90">Team Seats</h1>
        <p className="mt-2 text-[13px] text-white/25">
          Invite teammates to share leads, campaign playbooks, and unified agency branding
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Invite form (Owner or Manager) */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-3xl p-6 relative overflow-hidden" style={cardStyle}>
            {canManage ? (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04]">
                  <UserPlus className="size-4 text-indigo-400" />
                  <h3 className="text-[13px] font-bold text-white/85">Invite Teammate</h3>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="teammate@agency.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviting || !emailInput}
                  className="w-full flex items-center justify-center gap-2 rounded-xl text-black py-2.5 text-[12px] font-black transition-all hover:brightness-110 active:scale-[.99] disabled:opacity-50 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg,#e2e5ed,#c8cdd8)",
                    boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.5)",
                  }}
                >
                  {inviting ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                  Create Invitation
                </button>
              </form>
            ) : (
              <div className="space-y-3 text-center py-4">
                <div className="flex justify-center">
                  <ShieldAlert className="size-8 text-white/20" />
                </div>
                <h3 className="text-xs font-bold text-white/60">Invite Disabled</h3>
                <p className="text-[11px] text-white/35 leading-relaxed">
                  Only the team owner or a manager can invite new members to the agency workspace.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Members List and Invites */}
        <div className="md:col-span-2 space-y-6">
          {/* Members Card */}
          <div className="rounded-3xl p-6 md:p-8 space-y-6" style={cardStyle}>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <Users className="size-4 text-indigo-400" />
                <h3 className="text-[13px] font-bold text-white/85">Active Members</h3>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/45">
                {1 + members.length} Active
              </span>
            </div>

            <div className="space-y-4">
              {/* Owner Item */}
              {owner && (
                <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-9 rounded-xl shrink-0" style={{ boxShadow: "0 0 0 1.5px rgba(255,255,255,.05)" }}>
                      <AvatarImage src={owner.image ?? undefined} className="object-cover" />
                      <AvatarFallback className="text-xs font-bold text-white/40" style={{ background: "rgba(255,255,255,.05)" }}>
                        {initials(owner.name ?? owner.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-white/80 truncate">
                        {owner.name || "Agency Admin"}
                      </p>
                      <p className="text-[10.5px] text-white/30 truncate">{owner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0">
                    <Shield className="size-2.5" /> Team Owner
                  </div>
                </div>
              )}

              {/* Members Iteration */}
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/[0.01] border border-white/[0.04] transition-all hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-9 rounded-xl shrink-0" style={{ boxShadow: "0 0 0 1.5px rgba(255,255,255,.05)" }}>
                      <AvatarImage src={member.image ?? undefined} className="object-cover" />
                      <AvatarFallback className="text-xs font-bold text-white/40" style={{ background: "rgba(255,255,255,.05)" }}>
                        {initials(member.name ?? member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-white/80 truncate">
                        {member.name || "Team Member"}
                      </p>
                      <p className="text-[10.5px] text-white/30 truncate">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner ? (
                      <button
                        onClick={() => handleSetRole(member.id, member.role === "MANAGER" ? "USER" : "MANAGER")}
                        className={cn(
                          "text-[9px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider border transition-all cursor-pointer",
                          member.role === "MANAGER"
                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                        )}
                        title={member.role === "MANAGER" ? "Click to demote to Member" : "Click to promote to Manager"}
                      >
                        {member.role === "MANAGER" ? "Manager" : "Member"}
                      </button>
                    ) : (
                      <span className={cn(
                        "text-[9px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider border",
                        member.role === "MANAGER"
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : "bg-white/5 border-white/10 text-white/40"
                      )}>
                        {member.role === "MANAGER" ? "Manager" : "Member"}
                      </span>
                    )}
                    {canManage && !(member.role === "MANAGER" && !isOwner) && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invites Card (Only visible if owner or there are invites) */}
          {(canManage || invites.length > 0) && (
            <div className="rounded-3xl p-6 md:p-8 space-y-6" style={cardStyle}>
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.04]">
                <Mail className="size-4 text-indigo-400" />
                <h3 className="text-[13px] font-bold text-white/85">Pending Invitations</h3>
              </div>

              {invites.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-white/20">No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invites.map(invite => {
                    const isExpired = new Date(invite.expiresAt) < new Date()
                    const isPending = invite.status === "PENDING" && !isExpired
                    
                    return (
                      <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[12.5px] font-bold text-white/80 truncate">{invite.email}</p>
                          <p className="text-[9.5px] text-white/25">
                            Created: {new Date(invite.createdAt).toLocaleDateString()} &middot; {isExpired ? "Expired" : "Expires: " + new Date(invite.expiresAt).toLocaleDateString()}
                          </p>
                          {isPending && (
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <span className="text-[9px] font-mono text-white/30 bg-black/30 rounded px-1.5 py-0.5 truncate max-w-xs">
                                token: {invite.token.slice(0, 8)}...
                              </span>
                              <button
                                onClick={() => handleCopyLink(invite.token)}
                                className="flex items-center gap-1 text-[9px] font-extrabold text-sky-400 hover:text-sky-300 transition-colors"
                              >
                                {copiedToken === invite.token ? <Check className="size-2.5 text-emerald-400" /> : <Copy className="size-2.5" />}
                                Copy Link
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isExpired ? (
                            <span className="flex items-center gap-1 text-[9.5px] font-bold text-red-400/60 uppercase">
                              <AlertCircle className="size-3" /> Expired
                            </span>
                          ) : invite.status === "ACCEPTED" ? (
                            <span className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-400 uppercase">
                              <CheckCircle2 className="size-3" /> Accepted
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9.5px] font-bold text-amber-400 uppercase">
                              Pending
                            </span>
                          )}

                          {canManage && invite.status === "PENDING" && (
                            <button
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer ml-2"
                              title="Revoke invite"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
