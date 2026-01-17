"use client"

import { PostHogProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'

// In Next.js, NEXT_PUBLIC_* variables are replaced at build time as string literals
// We access them directly - Next.js will replace these with actual values during build
// This avoids requiring the process polyfill
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || null
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
const POSTHOG_DISABLED = process.env.NEXT_PUBLIC_POSTHOG_DISABLED === 'true'

export function PostHogProviderWrapper({ children }: { children: React.ReactNode }) {
  const [posthogClient, setPosthogClient] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsInitialized(true)
      return
    }

    let mounted = true

    async function initializePostHog() {
      try {
        // Dynamically import posthog to avoid SSR and polyfill issues
        const posthog = (await import('posthog-js')).default

        if (!mounted) return

        // If disabled or no key, skip initialization
        if (POSTHOG_DISABLED || !POSTHOG_KEY) {
          if (mounted) {
            setIsInitialized(true)
          }
          return
        }

        posthog.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          loaded: (posthogInstance) => {
            if (mounted) {
              setPosthogClient(posthogInstance)
              setIsInitialized(true)
            }
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
          secure_cookie: true,
          // Disable persistence if disabled
          disable_persistence: POSTHOG_DISABLED,
        })
      } catch (error) {
        console.error('Failed to initialize PostHog:', error)
        if (mounted) {
          setIsInitialized(true)
        }
      }
    }

    initializePostHog()

    return () => {
      mounted = false
    }
  }, [])

  // On server, just return children
  if (typeof window === 'undefined') {
    return <>{children}</>
  }

  // Wait for initialization to complete
  if (!isInitialized) {
    return <>{children}</>
  }

  // If no client was initialized (no key or disabled), just return children
  if (!posthogClient) {
    return <>{children}</>
  }

  return (
    <PostHogProvider client={posthogClient}>
      {children}
    </PostHogProvider>
  )
}
