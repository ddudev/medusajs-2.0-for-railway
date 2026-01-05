"use client"

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

/**
 * Tracks scroll depth to see how far users read content before leaving
 * Reports at 25%, 50%, 75%, and 100% scroll depth
 */
export function ScrollDepthTracker() {
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog || typeof window === 'undefined') {
      return
    }

    const scrollDepths = [25, 50, 75, 100]
    const trackedDepths = new Set<number>()

    const trackScrollDepth = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      
      const scrollPercentage = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      )

      // Track each depth milestone once
      for (const depth of scrollDepths) {
        if (scrollPercentage >= depth && !trackedDepths.has(depth)) {
          trackedDepths.add(depth)
          
          posthog.capture('$scroll_depth', {
            depth_percentage: depth,
            scroll_percentage: scrollPercentage,
            page_path: window.location.pathname,
          })
        }
      }
    }

    // Throttle scroll events for performance
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          trackScrollDepth()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Track initial scroll depth (in case page is already scrolled)
    trackScrollDepth()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [posthog])

  return null
}
