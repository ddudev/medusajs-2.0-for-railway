'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, X } from 'lucide-react'
import { useTranslation } from '@lib/i18n/hooks/use-translation'
import {
  subscribeToPushNotifications,
  isSubscribedToPushNotifications,
  requestNotificationPermission,
} from '@lib/pwa/push-subscription'

const STORAGE_KEY = 'pwa-notification-banner-dismissed'

export function NotificationPermissionBanner({ embedded = false, stacked = false }: { embedded?: boolean; stacked?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    // Show banner when not dismissed and (permission not yet asked, or granted but not subscribed)
    if (typeof window === 'undefined' || !('Notification' in window)) return

    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) return

    const permission = Notification.permission
    // Show immediately when we might want notifications (default = not asked yet, or granted)
    if (permission === 'default' || permission === 'granted') {
      setOpen(true)
    }

    // Check subscription after a short delay so the banner can paint first
    const t = setTimeout(() => {
      isSubscribedToPushNotifications()
        .then((subscribed) => {
          setIsSubscribed(subscribed)
          if (subscribed) setOpen(false)
        })
        .catch((error) => {
          console.error('[PWA] Failed to check subscription status:', error)
        })
    }, 300)
    return () => clearTimeout(t)
  }, [])

  const handleEnable = async () => {
    setIsLoading(true)
    try {
      await subscribeToPushNotifications()
      setIsSubscribed(true)
      setOpen(false)
      localStorage.removeItem(STORAGE_KEY) // Reset dismissal
    } catch (error) {
      console.error('[PWA] Failed to enable notifications:', error)
      // Permission might be denied, hide banner
      if (error instanceof Error && error.message.includes('denied')) {
        handleDismiss()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = () => {
    setOpen(false)
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
  }

  // Don't show if already subscribed or if notifications aren't supported
  if (isSubscribed || typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  if (!open) return null

  const inStack = embedded || stacked
  const containerClass = inStack
    ? 'w-full max-w-[500px] rounded-lg border border-border bg-white p-4 shadow-lg dark:bg-gray-900'
    : 'fixed bottom-4 left-1/2 z-[110] w-[90%] max-w-[500px] -translate-x-1/2 rounded-lg border border-border bg-white p-4 shadow-lg sm:bottom-6 dark:bg-gray-900'

  return (
    <div
      role="alert"
      className={containerClass}
    >
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground mb-0.5">
            {t('pwa.notifications.enableTitle')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('pwa.notifications.enableDescription')}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              onClick={handleEnable}
              disabled={isLoading}
            >
              {isLoading ? t('common.loading') : t('common.enable')}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={handleDismiss}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

