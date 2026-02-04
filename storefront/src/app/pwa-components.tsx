'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker after hydration, deferred with requestIdleCallback
 * so it doesn't compete with LCP/main thread. Notification and install banners
 * are rendered in BottomBannersStack (single column, no overlap).
 */
export function PWAComponents() {
  useEffect(() => {
    const run = () => {
      import('@lib/pwa/service-worker-registration').then(({ registerServiceWorker }) => {
        registerServiceWorker({
          onUpdate: () => {
            console.log('[PWA] Service worker update available')
          },
          onSuccess: () => {
            console.log('[PWA] Service worker registered successfully')
          },
          onError: (error) => {
            console.error('[PWA] Service worker registration error:', error)
          },
        })
      })
    }
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 3000 })
    } else {
      window.setTimeout(run, 1)
    }
  }, [])

  return null
}

