"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface SignInButtonProps {
  size?: "sm" | "default" | "lg"
  className?: string
}

export function SignInButton({ size = "default", className }: SignInButtonProps) {
  const sizes = {
    sm: "px-4 py-2 text-sm",
    default: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  }

  return (
    <Link
      href="/sign-in"
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium border border-white/[0.1] bg-white/[0.06] text-white transition-all hover:bg-white/[0.1] hover:border-white/[0.18]",
        sizes[size],
        className
      )}
    >
      Sign In
    </Link>
  )
}
