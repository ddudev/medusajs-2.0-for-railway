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

function canShowInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return false
  const dismissed = localStorage.getItem(STORAGE_KEY)
  if (dismissed) {
    const dismissedTime = parseInt(dismissed, 10)
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissed < 7) return false
  }
  return true
}

/**
 * In-app install UI per MDN: listen for beforeinstallprompt, store the event,
 * then show a button that calls event.prompt() to trigger the native install dialog.
 * @see https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
 */
export function PWAInstallPrompt({ stacked = false }: { stacked?: boolean } = {}) {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    if (!canShowInstallPrompt()) return

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    const handleAppInstalled = () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

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
    setDeferredPrompt(null)
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
  }

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  const baseCardStyles =
    'rounded-xl border border-border bg-background-elevated shadow-lg dark:border-neutral-2 dark:bg-gray-900'

  const containerClass = stacked
    ? `w-full max-w-[500px] p-4 ${baseCardStyles}`
    : `fixed bottom-4 left-1/2 z-[105] w-[90%] max-w-[500px] -translate-x-1/2 p-4 sm:bottom-6 ${baseCardStyles}`

  return (
    <div
      role="alert"
      className={containerClass}
      aria-label={t('pwa.install.title')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <Download className="h-5 w-5" strokeWidth={2} />
          </div>
          <p className="min-w-0 break-words text-sm font-medium leading-snug text-foreground">
            {t('pwa.install.title')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleInstall}
            className="h-9 gap-2 rounded-lg px-4 font-medium shadow-sm transition-colors hover:opacity-90"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            {t('pwa.install.installButton')}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </div>
  )
}
