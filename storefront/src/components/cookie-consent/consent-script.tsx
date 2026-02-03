"use client"

import * as React from "react"
import { useCookieConsent } from "./cookie-provider"
import type { ConsentCategory, ScriptConfig } from "./types"
import {
  loadScript,
  registerCleanup,
  registerScript,
  unregisterScript,
} from "./script-manager"

export interface ConsentScriptProps {
  id: string
  src?: string
  children?: string
  category: ConsentCategory
  strategy?: "afterInteractive" | "lazyOnload" | "beforeInteractive"
  attributes?: Record<string, string>
  onLoad?: () => void
  onError?: (error: Error) => void
  onRevoke?: () => void
}

export function ConsentScript({
  id,
  src,
  children,
  category,
  strategy = "afterInteractive",
  attributes,
  onLoad,
  onError,
  onRevoke,
}: ConsentScriptProps) {
  const { hasConsent, registerScript: ctxRegister } = useCookieConsent()
  const hasConsentForCategory = hasConsent(category)
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const config: ScriptConfig = {
      id,
      src,
      content: children,
      category,
      strategy,
      attributes,
      onLoad: () => {
        setIsLoaded(true)
        onLoad?.()
      },
      onError: (err) => {
        setError(err)
        onError?.(err)
      },
      onRevoke: () => {
        setIsLoaded(false)
        onRevoke?.()
      },
    }

    registerScript(config)
    ctxRegister(config)

    return () => {
      unregisterScript(id)
    }
  }, [id, src, children, category, strategy, attributes, onLoad, onError, onRevoke, ctxRegister])

  React.useEffect(() => {
    if (hasConsentForCategory && !isLoaded && !error) {
      loadScript(id).catch((err) => {
        setError(err)
        onError?.(err)
      })
    }
  }, [hasConsentForCategory, isLoaded, error, id, onError])

  React.useEffect(() => {
    if (onRevoke) {
      registerCleanup(id, onRevoke)
    }
  }, [id, onRevoke])

  return null
}

ConsentScript.displayName = "ConsentScript"
