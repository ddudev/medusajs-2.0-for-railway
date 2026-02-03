"use client"

import { Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCookieConsent } from "./cookie-provider"
import { cn } from "@/lib/utils"

export interface CookieTriggerProps {
  className?: string
  variant?: "icon" | "text" | "full"
}

/**
 * A trigger button to reopen cookie settings after initial consent
 */
export function CookieTrigger({
  className,
  variant = "text",
}: CookieTriggerProps) {
  const { openSettings, state } = useCookieConsent()

  if (!state.hasConsented) {
    return null
  }

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={openSettings}
        aria-label="Cookie settings"
        className={cn(className)}
      >
        <Cookie className="h-4 w-4" />
      </Button>
    )
  }

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openSettings}
        className={cn(className)}
      >
        <Cookie className="mr-2 h-4 w-4" />
        Cookie Settings
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={openSettings}
      className={cn("text-muted-foreground", className)}
    >
      Cookie Settings
    </Button>
  )
}
