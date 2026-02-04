/**
 * Service Worker Registration
 * Handles registration, updates, and activation of the service worker
 */

export interface ServiceWorkerRegistrationOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

export function registerServiceWorker(
  options: ServiceWorkerRegistrationOptions = {}
): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers are not supported in this browser')
    return
  }

  const { onUpdate, onSuccess, onError } = options

  // Enable bfcache (back/forward cache) compatibility
  // Don't use unload event (breaks bfcache), use pagehide instead
  let isPageHiding = false
  window.addEventListener('pagehide', () => {
    isPageHiding = true
  })

  // Handle service worker controller change (page refresh after update)
  // This should only reload when there's an actual update, not on first install
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload if there was already a controller and page is not hiding (bfcache)
    if (!refreshing && !isPageHiding && navigator.serviceWorker.controller) {
      refreshing = true
      console.log('[PWA] Service worker updated, reloading page...')
      window.location.reload()
    }
  })

  const doRegister = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope)

        // Check for updates immediately (but not on first install)
        if (navigator.serviceWorker.controller) {
          registration.update()
        }

        // Check for updates every hour
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing

          if (!newWorker) {
            return
          }

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[PWA] New service worker available')
                onUpdate?.(registration)
              } else {
                // Service worker installed for the first time
                console.log('[PWA] Service worker installed for the first time')
                onSuccess?.(registration)
              }
            }
          })
        })

        // Only call onSuccess if this is the first registration
        if (!navigator.serviceWorker.controller) {
          onSuccess?.(registration)
        }
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error)
        onError?.(error)
      })
  }

  // Run when load is complete (supports being called after load, e.g. from requestIdleCallback)
  if (typeof document !== 'undefined' && document.readyState === 'complete') {
    doRegister()
  } else {
    window.addEventListener('load', doRegister)
  }
}

export function unregisterServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Unregister all service workers and clear caches
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().then((success) => {
        if (success) {
          console.log('[PWA] Service Worker unregistered')
        }
      })
    })
  })

  // Also try the ready promise approach
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister()
      console.log('[PWA] Service Worker unregistered')
    })
    .catch((error) => {
      // Ignore errors if no service worker is registered
      if (error.message && !error.message.includes('no service worker')) {
        console.error('[PWA] Service Worker unregistration error:', error)
      }
    })

  // Clear all caches to remove stale CSS
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName)
      })
      console.log('[PWA] All caches cleared')
    })
  }
}

export function checkServiceWorkerSupport(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
}

