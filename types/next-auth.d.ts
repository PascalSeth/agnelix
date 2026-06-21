import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      teamOwnerId: string | null
      role: "USER" | "MANAGER" | "ADMIN" | "SUPERADMIN"
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    teamOwnerId?: string | null
    role?: "USER" | "MANAGER" | "ADMIN" | "SUPERADMIN"
  }
}
