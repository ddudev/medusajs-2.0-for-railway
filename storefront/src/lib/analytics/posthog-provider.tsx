"use client"

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'

export function PostHogProviderWrapper({ children }: { children: React.ReactNode }) {
  const [posthogClient, setPosthogClient] = useState<typeof posthog | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
      
      if (posthogKey) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          loaded: (posthog) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('PostHog loaded')
            }
            // Set the client only after initialization
            setPosthogClient(posthog)
          },
          // Enable autocapture (tracks clicks, form submissions automatically)
          autocapture: true,
          // Capture pageviews automatically
          capture_pageview: true,
          // Capture pageleaves (for accurate bounce rate and session duration)
          capture_pageleave: true,
          // Enable scroll depth tracking
          capture_performance: true,
          // Respect Do Not Track headers
          respect_dnt: true,
          // Session replay configuration
          session_recording: {
            maskAllInputs: true, // Mask all input fields by default
            maskTextSelector: '[data-ph-mask]', // Custom mask selector
            recordCrossOriginIframes: false,
          },
          // Feature flags
          advanced_disable_decide: false, // Enable feature flags
          // Privacy settings
          disable_session_recording: false,
          // Persistence
          persistence: 'localStorage+cookie',
          // Cross-domain tracking (if needed)
          cross_subdomain_cookie: false,
          // Secure cookie in production
          secure_cookie: process.env.NODE_ENV === 'production',
          // Disable in development if needed (set via env var)
          disable_persistence: process.env.NEXT_PUBLIC_POSTHOG_DISABLED === 'true',
        })
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('PostHog key not found. Analytics will not be tracked.')
      }
    }
  }, [])

  // On server or if no key, just return children (no PostHog wrapper)
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!posthogKey || typeof window === 'undefined') {
    return <>{children}</>
  }

  // Only render PostHogProvider after client is initialized
  // This prevents hydration mismatches
  if (!posthogClient) {
    return <>{children}</>
  }

  return (
    <PostHogProvider client={posthogClient}>
      {children}
    </PostHogProvider>
  )
}
