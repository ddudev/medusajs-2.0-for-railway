"use client"

import { useEffect } from "react"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { trackGTMSearch } from "@lib/analytics/gtm-events"
import { trackMetaSearch } from "@lib/analytics/meta-events"

type SearchTrackerProps = {
  query: string
  resultsCount: number
}

/**
 * Tracks search performed events
 */
export default function SearchTracker({ query, resultsCount }: SearchTrackerProps) {
  const { trackEvent } = useAnalytics()

  useEffect(() => {
    if (query) {
      // PostHog
      trackEvent('search_performed', {
        query,
        results_count: resultsCount,
        search_type: 'product',
      })
      
      // GTM - search
      trackGTMSearch({
        search_term: query,
        results_count: resultsCount,
      })
      
      // Meta Pixel - Search
      trackMetaSearch({
        search_string: query,
      })
    }
  }, [query, resultsCount, trackEvent])

  return null
}
