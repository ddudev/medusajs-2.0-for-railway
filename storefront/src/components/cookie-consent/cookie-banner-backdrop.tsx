"use client"

import { useCookieConsent } from "./cookie-provider"
import { cn } from "@/lib/utils"

export interface CookieBannerBackdropProps {
  className?: string
}

/**
 * Optional backdrop behind the cookie banner for focus/contrast.
 */
export function CookieBannerBackdrop({ className }: CookieBannerBackdropProps) {
  const { isBannerVisible } = useCookieConsent()

  if (!isBannerVisible) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[99] bg-black/20 backdrop-blur-[2px]",
        className
      )}
      aria-hidden
    />
  )
}
