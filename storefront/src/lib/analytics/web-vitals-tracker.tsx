"use client"

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

/**
 * Tracks Core Web Vitals (LCP, INP, CLS) for PostHog
 * These metrics measure real user experience
 */
export function WebVitalsTracker() {
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog || typeof window === 'undefined') {
      return
    }

    // Track Largest Contentful Paint (LCP)
    const trackLCP = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          
          posthog.capture('$web_vitals', {
            metric_name: 'LCP',
            value: lastEntry.renderTime || lastEntry.loadTime,
            navigation_type: lastEntry.navigationType || 'unknown',
          })
        })
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
        
        // Cleanup after 10 seconds (LCP typically happens early)
        setTimeout(() => {
          observer.disconnect()
        }, 10000)
      } catch (error) {
        // PerformanceObserver not supported
        console.warn('LCP tracking not supported:', error)
      }
    }

    // Track Cumulative Layout Shift (CLS)
    const trackCLS = () => {
      try {
        let clsValue = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
        })
        
        observer.observe({ entryTypes: ['layout-shift'] })
        
        // Report CLS on page unload
        const reportCLS = () => {
          if (clsValue > 0) {
            posthog.capture('$web_vitals', {
              metric_name: 'CLS',
              value: clsValue,
            })
          }
        }
        
        window.addEventListener('beforeunload', reportCLS)
        
        return () => {
          observer.disconnect()
          window.removeEventListener('beforeunload', reportCLS)
        }
      } catch (error) {
        console.warn('CLS tracking not supported:', error)
      }
    }

    // Track Interaction to Next Paint (INP)
    const trackINP = () => {
      try {
        let maxDelay = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            const delay = entry.processingStart - entry.startTime
            if (delay > maxDelay) {
              maxDelay = delay
            }
          }
        })
        
        observer.observe({ entryTypes: ['event'] })
        
        // Report INP on page unload
        const reportINP = () => {
          if (maxDelay > 0) {
            posthog.capture('$web_vitals', {
              metric_name: 'INP',
              value: maxDelay,
            })
          }
        }
        
        window.addEventListener('beforeunload', reportINP)
        
        return () => {
          observer.disconnect()
          window.removeEventListener('beforeunload', reportINP)
        }
      } catch (error) {
        console.warn('INP tracking not supported:', error)
      }
    }

    // Start tracking
    trackLCP()
    const clsCleanup = trackCLS()
    const inpCleanup = trackINP()

    return () => {
      clsCleanup?.()
      inpCleanup?.()
    }
  }, [posthog])

  return null
}
