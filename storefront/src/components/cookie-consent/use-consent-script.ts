"use client"

import * as React from "react"
import { useCookieConsent } from "./cookie-provider"
import {
  loadScript,
  registerCleanup,
  registerScript,
  unloadScript,
  unregisterScript,
} from "./script-manager"
import type { ConsentCategory } from "./types"

interface UseConsentScriptOptions {
  src?: string
  content?: string
  attributes?: Record<string, string>
  strategy?: "afterInteractive" | "lazyOnload" | "beforeInteractive"
  onRevoke?: () => void
}

interface UseConsentScriptReturn {
  isLoaded: boolean
  isLoading: boolean
  hasConsent: boolean
  error: Error | null
  load: () => Promise<void>
  unload: () => void
}

export function useConsentScript(
  category: ConsentCategory,
  id: string,
  options: UseConsentScriptOptions = {}
): UseConsentScriptReturn {
  const { hasConsent: checkConsent, registerScript: ctxRegister } =
    useCookieConsent()
  const consentGranted = checkConsent(category)

  const [isLoaded, setIsLoaded] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const isRegisteredRef = React.useRef(false)
  const onRevokeRef = React.useRef(options.onRevoke)

  React.useLayoutEffect(() => {
    onRevokeRef.current = options.onRevoke
  }, [options.onRevoke])

  React.useEffect(() => {
    if (isRegisteredRef.current) return
    isRegisteredRef.current = true

    registerScript({
      id,
      src: options.src,
      content: options.content,
      category,
      strategy: options.strategy,
      attributes: options.attributes,
      onLoad: () => setIsLoaded(true),
      onError: setError,
      onRevoke: () => {
        setIsLoaded(false)
        onRevokeRef.current?.()
      },
    })

    ctxRegister({
      id,
      src: options.src,
      content: options.content,
      category,
      strategy: options.strategy,
      attributes: options.attributes,
    })

    if (onRevokeRef.current) {
      registerCleanup(id, () => onRevokeRef.current?.())
    }

    return () => {
      isRegisteredRef.current = false
      unregisterScript(id)
    }
  }, [id])

  React.useEffect(() => {
    if (consentGranted && !isLoaded && !isLoading && !error) {
      setIsLoading(true)
      loadScript(id)
        .then(() => {
          setIsLoaded(true)
          setIsLoading(false)
        })
        .catch((err) => {
          setError(err)
          setIsLoading(false)
        })
    }
  }, [consentGranted, isLoaded, isLoading, error, id])

  const load = React.useCallback(async () => {
    if (!consentGranted) {
      throw new Error(
        `Cannot load script "${id}": consent not granted for category "${category}"`
      )
    }
    if (isLoaded) return

    setIsLoading(true)
    try {
      await loadScript(id)
      setIsLoaded(true)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [consentGranted, isLoaded, id, category])

  const unload = React.useCallback(() => {
    unloadScript(id)
    setIsLoaded(false)
  }, [id])

  return {
    isLoaded,
    isLoading,
    hasConsent: consentGranted,
    error,
    load,
    unload,
  }
}
