"use client"

import { SessionProvider } from "next-auth/react"
import { RobotAnimationProvider } from "@/lib/robot-animation-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RobotAnimationProvider>
        {children}
      </RobotAnimationProvider>
    </SessionProvider>
  )
}
