'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@lib/pwa/service-worker-registration'

/**
 * Registers the service worker. Notification and install banners
 * are rendered in BottomBannersStack (single column, no overlap).
 */
export function PWAComponents() {
  useEffect(() => {
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
  }, [])

  return null
}

