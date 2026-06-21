/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["state"],
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: authConfig.pages,
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.id = user.id
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { teamOwnerId: true, role: true },
          })
          token.teamOwnerId = dbUser?.teamOwnerId ?? null
          token.role = dbUser?.role ?? "USER"
        } catch (error) {
          console.error("Failed to query user teamOwnerId/role in auth jwt callback:", error)
          token.teamOwnerId = null
          token.role = "USER"
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.teamOwnerId = (token.teamOwnerId as string | null) ?? null
        session.user.role = (token.role as "USER" | "MANAGER" | "ADMIN" | "SUPERADMIN" | undefined) ?? "USER"
      }
      return session
    },
  },
})
