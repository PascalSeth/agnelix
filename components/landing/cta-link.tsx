"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

interface CtaLinkProps {
  href?: string
  authedHref?: string
  children: React.ReactNode
  authedChildren?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * CTA link that points to /sign-in for guests and /dashboard for signed-in users,
 * swapping its label accordingly.
 */
export function CtaLink({
  href = "/sign-in",
  authedHref = "/dashboard",
  children,
  authedChildren,
  className,
  style,
}: CtaLinkProps) {
  const { status } = useSession()
  const authed = status === "authenticated"

  return (
    <Link href={authed ? authedHref : href} className={cn(className)} style={style}>
      {authed ? (authedChildren ?? "Go to Dashboard") : children}
    </Link>
  )
}
