"use client"

import { useEffect } from "react"
import { useAnalytics } from "@lib/analytics/use-analytics"

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
      trackEvent('search_performed', {
        query,
        results_count: resultsCount,
        search_type: 'product',
      })
    }
  }, [query, resultsCount, trackEvent])

  return null
}
