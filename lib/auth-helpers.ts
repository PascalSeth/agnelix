import type { Session } from "next-auth"

export function getScopeId(session: Session): string {
  return session.user.teamOwnerId ?? session.user.id
}

export function isTeamOwner(session: Session): boolean {
  return !session.user.teamOwnerId
}

export function isManager(session: Session): boolean {
  return session.user.role === "MANAGER"
}

export function canManageTeam(session: Session): boolean {
  return isTeamOwner(session) || isManager(session)
}

export function isSuperadmin(session: Session): boolean {
  return session.user.role === "SUPERADMIN"
}
