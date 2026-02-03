"use client"

import { CookieBanner } from "@/components/cookie-consent"
import { NotificationPermissionBanner } from "@modules/common/components/notification-permission-banner"
import { PWAInstallPrompt } from "@modules/common/components/pwa-install-prompt"

/**
 * Single column at bottom: notification banner (top), PWA install (middle), cookie consent (bottom).
 * No overlap – all stacked vertically in DOM order.
 */
export function BottomBannersStack() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-3 p-4 pb-4 items-center">
      <NotificationPermissionBanner stacked />
      <PWAInstallPrompt stacked />
      <CookieBanner stacked />
    </div>
  )
}
