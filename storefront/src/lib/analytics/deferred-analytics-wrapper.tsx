"use client"

import { useEffect, useState } from "react"

/**
 * Renders children immediately; loads analytics providers (GTM, Meta Pixel, PostHog)
 * after hydration so their code is in a separate chunk (Vercel best practice: bundle-defer-third-party).
 * usePostHog() and other analytics hooks will be null until the chunk has loaded.
 */
export function DeferredAnalyticsWrapper({ children }: { children: React.ReactNode }) {
  const [Providers, setProviders] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null)

  useEffect(() => {
    const load = () => {
      import("./analytics-providers").then((m) => setProviders(() => m.AnalyticsProviders))
    }
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(load, { timeout: 2000 })
    } else {
      window.setTimeout(load, 1)
    }
  }, [])

  if (!Providers) return <>{children}</>
  return <Providers>{children}</Providers>
}
