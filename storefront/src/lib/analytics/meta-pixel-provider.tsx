"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useConsentValue } from '@/components/cookie-consent'

// Meta Pixel ID from environment
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || null
const META_DEBUG = process.env.NEXT_PUBLIC_META_PIXEL_DEBUG === 'true'
/** When set, browser events show in Events Manager > Test Events (copy code from Test Events page) */
const META_TEST_EVENT_CODE = process.env.NEXT_PUBLIC_META_PIXEL_TEST_EVENT_CODE || null

// Declare fbq types
declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: (...args: any[]) => void
  }
}

type MetaPixelProviderProps = {
  children: React.ReactNode
}

export function MetaPixelProvider({ children }: MetaPixelProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const marketingConsent = useConsentValue('marketing')
  
  // Handle pathname for static generation
  let pathname: string | null = null
  try {
    pathname = usePathname()
  } catch (e) {
    // During static generation, this hook might not be available
  }

  useEffect(() => {
    // Only initialize when marketing consent is granted
    if (!META_PIXEL_ID || !marketingConsent || isInitialized) return

    // Initialize Meta Pixel
    ;(function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = !0
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e)
      t.async = !0
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(
      window,
      document,
      'script',
      'https://connect.facebook.net/en_US/fbevents.js'
    )

    // Initialize the pixel (with test_event_code when testing so events show in Test Events)
    const initOptions = META_TEST_EVENT_CODE ? { test_event_code: META_TEST_EVENT_CODE } : undefined
    window.fbq!('init', META_PIXEL_ID, initOptions)

    // PageView is fired only from the pathname effect below (one per page load/navigation)
    setIsInitialized(true)

    if (META_DEBUG) {
      console.log('Meta Pixel initialized with ID:', META_PIXEL_ID)
    }
  }, [isInitialized, marketingConsent])

  // Track page views on route change with server-side dedup
  useEffect(() => {
    if (!isInitialized || !META_PIXEL_ID || !window.fbq || !pathname) return

    const eventId = getEventId()
    window.fbq('track', 'PageView', {}, { eventID: eventId })
    sendMetaEventToServer('PageView', eventId, {})

    if (META_DEBUG) console.log('Meta Pixel PageView:', pathname, { eventID: eventId })
  }, [pathname, isInitialized])

  return <>{children}</>
}

/** Generate event_id for Pixel + CAPI deduplication */
function getEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/** Send event to our API so server can forward to Meta CAPI (same event_id = dedup) */
function sendMetaEventToServer(
  eventName: string,
  eventId: string,
  customData?: Record<string, unknown>
) {
  const url = typeof window !== "undefined" ? window.location.href : ""
  fetch("/api/analytics/meta-server", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: eventName,
      event_id: eventId,
      event_source_url: url,
      custom_data: customData ?? undefined,
    }),
  }).catch((err) => {
    if (META_DEBUG) console.warn("Meta server event request failed:", err)
  })
}

/**
 * Track Meta Pixel standard event with server-side deduplication.
 * Generates event_id, sends to Pixel and to CAPI so Meta can dedupe.
 */
export function trackMetaEvent(
  eventName: string,
  parameters?: Record<string, any>,
  options?: { eventID?: string }
) {
  if (!META_PIXEL_ID || !window.fbq) {
    if (META_DEBUG) console.warn("Meta Pixel not configured, skipping event:", eventName)
    return
  }

  const eventId = options?.eventID ?? getEventId()
  window.fbq("track", eventName, parameters, { eventID: eventId })
  sendMetaEventToServer(eventName, eventId, parameters)

  if (META_DEBUG) console.log("Meta Pixel event:", eventName, parameters, { eventID: eventId })
}

/**
 * Track Meta Pixel custom event with server-side deduplication.
 */
export function trackMetaCustomEvent(
  eventName: string,
  parameters?: Record<string, any>,
  options?: { eventID?: string }
) {
  if (!META_PIXEL_ID || !window.fbq) {
    if (META_DEBUG) console.warn("Meta Pixel not configured, skipping custom event:", eventName)
    return
  }

  const eventId = options?.eventID ?? getEventId()
  window.fbq("trackCustom", eventName, parameters, { eventID: eventId })
  sendMetaEventToServer(eventName, eventId, parameters)

  if (META_DEBUG) console.log("Meta Pixel custom event:", eventName, parameters, { eventID: eventId })
}

/**
 * Update Meta Pixel advanced matching parameters
 * Note: This reinitializes the pixel with user data for advanced matching
 */
export function updateMetaAdvancedMatching(userData: {
  em?: string // email (hashed)
  ph?: string // phone (hashed)
  fn?: string // first name
  ln?: string // last name
  ct?: string // city
  st?: string // state
  zp?: string // zip code
  country?: string
}) {
  if (!META_PIXEL_ID || !window.fbq) return

  // Don't reinit if no user data
  if (Object.keys(userData).length === 0) return

  // Update advanced matching by reinitializing with user data
  window.fbq('init', META_PIXEL_ID, userData)

  if (META_DEBUG) {
    console.log('Meta Pixel advanced matching updated:', userData)
  }
}

/**
 * Re-export prepareAdvancedMatchingData from privacy module
 * For convenience when using Meta Pixel
 */
export { prepareAdvancedMatchingData } from './privacy'

/**
 * Check if Meta Pixel is enabled
 */
export function isMetaPixelEnabled(): boolean {
  return !!META_PIXEL_ID
}
