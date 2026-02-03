"use client"

import { useContext } from "react"
import { CookieConsentContext } from "./cookie-provider"
import type {
  ConsentCategory,
  CookieConsentContextValue,
} from "./types"

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext)
  if (!context) {
    throw new Error(
      "useCookieConsent must be used within a CookieConsentProvider"
    )
  }
  return context
}

export function useConsentValue(category: ConsentCategory): boolean {
  const { hasConsent } = useCookieConsent()
  return hasConsent(category)
}

export function useConsentGate(category: ConsentCategory): {
  isAllowed: boolean
  isLoading: boolean
} {
  const { state } = useCookieConsent()

  return {
    isAllowed: state.categories[category] ?? false,
    isLoading: !state.hasConsented,
  }
}
