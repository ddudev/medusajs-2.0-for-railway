"use client"

import { GTMProvider } from "./gtm-provider"
import { MetaPixelProvider } from "./meta-pixel-provider"
import { PostHogProviderWrapper } from "./posthog-provider"
import { PostHogSurveys } from "./posthog-surveys"
import { WebVitalsTracker } from "./web-vitals-tracker"
import { ScrollDepthTracker } from "./scroll-depth-tracker"

/**
 * Single chunk that wraps all analytics providers and trackers.
 * Loaded after hydration via DeferredAnalyticsWrapper to reduce main bundle (bundle-defer-third-party).
 */
export function AnalyticsProviders({ children }: { children: React.ReactNode }) {
  return (
    <GTMProvider>
      <MetaPixelProvider>
        <PostHogProviderWrapper>
          {children}
          <PostHogSurveys />
          <WebVitalsTracker />
          <ScrollDepthTracker />
        </PostHogProviderWrapper>
      </MetaPixelProvider>
    </GTMProvider>
  )
}
