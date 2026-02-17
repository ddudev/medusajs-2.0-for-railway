"use client"

import { useEffect, useState } from "react"
import { CookieTrigger, type CookieTriggerProps } from "./cookie-trigger"

/**
 * Renders CookieTrigger only after client mount so useCookieConsent is never
 * called during SSR (avoids "useCookieConsent must be used within a CookieConsentProvider"
 * when Footer is a Server Component).
 */
export function CookieTriggerSafe(props: CookieTriggerProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <CookieTrigger {...props} />
}
