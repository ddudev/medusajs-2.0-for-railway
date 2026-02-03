'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'
import { useTranslation } from '@lib/i18n/hooks/use-translation'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'pwa-install-prompt-dismissed'

export function PWAInstallPrompt() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
        setShowPrompt(false)
        localStorage.removeItem(STORAGE_KEY)
      } else {
        handleDismiss()
      }
    } catch (error) {
      console.error('[PWA] Failed to show install prompt:', error)
    } finally {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
  }

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 w-[90%] max-w-[500px] -translate-x-1/2 rounded-lg border border-border bg-white p-4 shadow-lg sm:bottom-6 dark:bg-gray-900"
    >
      <div className="flex items-start gap-3">
        <Download className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground mb-0.5">
            {t('pwa.install.title')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('pwa.install.description')}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              onClick={handleInstall}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              {t('pwa.install.installButton')}
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

