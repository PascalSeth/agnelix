/* eslint-disable @next/next/no-img-element */
import React from "react"
import { cn } from "@/lib/utils"

export interface ChatBubbleIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string
  alt?: string
  size?: number | string
  strokeWidth?: number | string
  color?: string
}

/**
 * Replaces Sparkles icon with the brand chatbubble.png asset across the platform.
 */
export function ChatBubbleIcon({ className, alt = "Galien AI", ...props }: ChatBubbleIconProps) {
  return (
    <img
      src="/chatbubble.png"
      alt={alt}
      className={cn("inline-block object-contain shrink-0 select-none", className)}
      {...props}
    />
  )
}

export const Sparkles = ChatBubbleIcon
export default ChatBubbleIcon
