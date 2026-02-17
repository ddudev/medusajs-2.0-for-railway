"use client"

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getStoredConsentUpdateForGTM } from '@/components/cookie-consent'

// GTM Container ID from environment
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || null
const GTM_DEBUG = process.env.NEXT_PUBLIC_GTM_DEBUG === 'true'
const CONSENT_VERSION = process.env.NEXT_PUBLIC_CONSENT_VERSION || '1.0.0'

// Declare gtag types
declare global {
  interface Window {
    dataLayer: any[]
    gtag?: (...args: any[]) => void
  }
}

type GTMProviderProps = {
  children: React.ReactNode
}

export function GTMProvider({ children }: GTMProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  
  // These hooks need to be inside try-catch for static generation
  let pathname: string | null = null
  let searchParams: URLSearchParams | null = null
  
  try {
    pathname = usePathname()
    searchParams = useSearchParams()
  } catch (e) {
    // During static generation, these hooks might not be available
    // This is fine - GTM will initialize on the client
  }

  useEffect(() => {
    // Skip if no GTM ID or already initialized
    if (!GTM_ID || isInitialized) return

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || []
    
    // GTM initialization function
    function gtag(...args: any[]) {
      window.dataLayer.push(arguments)
    }

    // Set up gtag function
    window.gtag = gtag

    // Google Consent Mode v2: set default to denied before any tags run
    gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted',
    })

    // If user has already consented (stored), apply it now before any events
    const storedConsent = getStoredConsentUpdateForGTM(CONSENT_VERSION)
    if (storedConsent) {
      gtag('consent', 'update', storedConsent)
    }

    // Initialize with timestamp
    gtag('js', new Date())

    // Configure GTM
    gtag('config', GTM_ID, {
      debug_mode: GTM_DEBUG,
      send_page_view: false, // We'll handle page views manually
    })

    // Load GTM script
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
    script.async = true
    document.head.appendChild(script)

    // Add noscript fallback
    const noscript = document.createElement('noscript')
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`
    iframe.height = '0'
    iframe.width = '0'
    iframe.style.display = 'none'
    iframe.style.visibility = 'hidden'
    noscript.appendChild(iframe)
    document.body.insertBefore(noscript, document.body.firstChild)

    setIsInitialized(true)

    if (GTM_DEBUG) {
      console.log('GTM initialized with ID:', GTM_ID)
    }
  }, [isInitialized])

  // Track page views on route change
  useEffect(() => {
    if (!isInitialized || !GTM_ID || !pathname) return

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

    // Push page view to dataLayer
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'page_view',
      page_path: pathname,
      page_url: url,
      page_title: document.title,
      timestamp: new Date().toISOString(),
    })

    if (GTM_DEBUG) {
      console.log('GTM page_view:', { pathname, url })
    }
  }, [pathname, searchParams, isInitialized])

  return <>{children}</>
}

/**
 * Push event to GTM dataLayer
 */
export function pushToDataLayer(event: string, data?: Record<string, any>) {
  if (!GTM_ID) {
    if (GTM_DEBUG) {
      console.warn('GTM not configured, skipping event:', event)
    }
    return
  }

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event,
    ...data,
    timestamp: new Date().toISOString(),
  })

  if (GTM_DEBUG) {
    console.log('GTM event pushed:', event, data)
  }
}

/**
 * Check if GTM is enabled
 */
export function isGTMEnabled(): boolean {
  return !!GTM_ID
}
