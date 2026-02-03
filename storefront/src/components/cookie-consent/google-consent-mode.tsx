"use client"

import { useEffect } from "react"

/**
 * Sets default Google Consent Mode v2 state to denied before any gtag/GTM runs.
 * Must run early so that when GTM loads it sees the default consent.
 */
export function GoogleConsentMode() {
  useEffect(() => {
    if (typeof window === "undefined") return

    window.dataLayer = window.dataLayer || []

    const setDefaultConsent = () => {
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void })
        .gtag
      if (gtag) {
        gtag("consent", "default", {
          ad_storage: "denied",
          analytics_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          functionality_storage: "denied",
          personalization_storage: "denied",
          security_storage: "granted",
        })
      } else {
        window.dataLayer.push([
          "consent",
          "default",
          {
            ad_storage: "denied",
            analytics_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
            functionality_storage: "denied",
            personalization_storage: "denied",
            security_storage: "granted",
          },
        ])
      }
    }

    setDefaultConsent()
  }, [])

  return null
}
