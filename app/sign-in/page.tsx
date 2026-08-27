"use client"

import { Suspense, useState } from "react"
import { signIn, signOut } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "That account couldn't be linked automatically. Please sign out of any other Google account in your browser and try again.",
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}

function SignInForm() {
  const [tab, setTab] = useState<"signin" | "signup">("signin")
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const errorCode = searchParams.get("error")
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong while signing you in. Please try again.") : null

  async function handleGoogle() {
    setLoading(true)
    // Clear any stale session before starting a fresh OAuth flow, so signing in
    // with a different Google account doesn't collide with the old session.
    await signOut({ redirect: false })
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
    await signIn("google", { callbackUrl })
  }

  const isSignIn = tab === "signin"

  return (
    <div className="relative min-h-screen bg-[#050508] flex items-center justify-center px-4 overflow-hidden">

      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-violet-700/10 blur-[120px]" />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-indigo-700/8 blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Image src="/logo-hq.png" alt="Galien" width={130} height={52} style={{ width: "auto", height: "auto" }} className="object-contain" loading="eager" priority />
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 shadow-[0_8px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">

          {/* Tab toggle */}
          <div className="mb-8 flex rounded-xl bg-white/[0.04] p-1">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 rounded-[10px] py-2 text-sm font-semibold transition-all duration-200",
                  tab === t
                    ? "bg-white text-[#050508] shadow-md"
                    : "text-white/35 hover:text-white/60"
                )}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
            <h1 className="text-[22px] font-bold tracking-tight text-white">
              {isSignIn ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-white/35">
              {isSignIn
                ? "Sign in to continue to Galien"
                : "Start sending AI-powered emails in minutes"}
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition-all hover:border-white/[0.18] hover:bg-white/[0.09] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
            {loading ? "Redirecting…" : `${isSignIn ? "Sign in" : "Sign up"} with Google`}
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[11px] font-medium text-white/25 uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {/* Email/password fields — coming soon */}
          <div className="space-y-2.5">
            {!isSignIn && (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="text-[13px] text-white/20">Full name</p>
              </div>
            )}
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-[13px] text-white/20">Email address</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-[13px] text-white/20">Password</p>
            </div>
            <button
              disabled
              className="w-full cursor-not-allowed rounded-xl bg-white/[0.04] py-3 text-[13px] font-medium text-white/20"
            >
              {isSignIn ? "Sign In" : "Create Account"}
              <span className="ml-2 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/30">
                coming soon
              </span>
            </button>
          </div>

          {/* Switch tab */}
          <p className="mt-6 text-center text-xs text-white/25">
            {isSignIn ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setTab(isSignIn ? "signup" : "signin")}
              className="text-white/50 transition-colors hover:text-white hover:underline underline-offset-2"
            >
              {isSignIn ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Fine print */}
        <p className="mt-5 text-center text-[11px] text-white/20">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-white/35 transition-colors hover:text-white/60">Terms</Link>
          {" & "}
          <Link href="/privacy" className="text-white/35 transition-colors hover:text-white/60">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
