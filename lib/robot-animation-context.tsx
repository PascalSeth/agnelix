"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

export type RobotAnimationName = "mixamo.com" | "idle" | "waving" | string

interface RobotAnimationContextType {
  currentAnimation: RobotAnimationName
  playAnimation: (name: RobotAnimationName, duration?: number) => void
  fadeDuration: number
}

const RobotAnimationContext = createContext<RobotAnimationContextType | null>(null)

export function RobotAnimationProvider({ children }: { children: React.ReactNode }) {
  // Default to mixamo.com animation (the main animation clip name)
  const [currentAnimation, setCurrentAnimation] = useState<RobotAnimationName>("mixamo.com")
  const [fadeDuration, setFadeDuration] = useState<number>(0.5)

  const playAnimation = useCallback((name: RobotAnimationName, duration = 0.5) => {
    setFadeDuration(duration)
    setCurrentAnimation(name)
  }, [])

  return (
    <RobotAnimationContext.Provider value={{ currentAnimation, playAnimation, fadeDuration }}>
      {children}
    </RobotAnimationContext.Provider>
  )
}

export function useRobotAnimation() {
  const context = useContext(RobotAnimationContext)
  if (!context) {
    throw new Error("useRobotAnimation must be used within a RobotAnimationProvider")
  }
  return context
}
