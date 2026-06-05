import type { NextAuthConfig } from "next-auth"

const PROTECTED = [
  "/dashboard",
  "/campaigns",
  "/leads",
  "/settings",
  "/onboarding",
  "/sequences",
  "/pipeline",
  "/inbox",
]

export const authConfig = {
  providers: [],
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = PROTECTED.some((p) => nextUrl.pathname.startsWith(p))
      if (isProtected && !isLoggedIn) return false
      return true
    },
  },
} satisfies NextAuthConfig
