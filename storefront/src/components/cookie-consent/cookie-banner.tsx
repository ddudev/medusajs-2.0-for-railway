"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { Cookie, Settings } from "lucide-react"
import { useCookieConsent } from "./cookie-provider"

export interface CookieBannerProps {
  className?: string
  /** When true, banner is in-flow inside a bottom stack (no fixed positioning) */
  stacked?: boolean
}

export function CookieBanner({ className, stacked = false }: CookieBannerProps) {
  const { isBannerVisible, acceptAll, rejectAll, openSettings, config } =
    useCookieConsent()

  const positionClasses = {
    bottom: "inset-x-0 bottom-0",
    top: "inset-x-0 top-0",
    "bottom-left": "bottom-4 left-4 max-w-md",
    "bottom-right": "bottom-4 right-4 max-w-md",
  }

  const position = config.position ?? "bottom"

  const baseStyles =
    "flex flex-col gap-4 rounded-lg border border-border p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between opacity-100"
  const solidBg = "bg-white dark:bg-gray-900"
  const layoutStyles = stacked
    ? "w-full"
    : cn("fixed z-40", positionClasses[position])

  return (
    <AnimatePresence>
      {isBannerVisible && (
        <motion.div
          initial={{ y: position === "bottom" ? 100 : -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: position === "bottom" ? 100 : -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(baseStyles, solidBg, layoutStyles, className)}
        >
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Cookie Preferences</p>
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your experience. By continuing to
                visit this site you agree to our use of cookies.{" "}
                {config.privacyPolicyUrl && (
                  <a
                    href={config.privacyPolicyUrl}
                    className="underline hover:no-underline"
                  >
                    Learn more
                  </a>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openSettings}
            >
              <Settings className="mr-1 h-4 w-4" />
              Customize
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={rejectAll}
            >
              Reject All
            </Button>
            <Button type="button" size="sm" onClick={acceptAll}>
              Accept All
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
