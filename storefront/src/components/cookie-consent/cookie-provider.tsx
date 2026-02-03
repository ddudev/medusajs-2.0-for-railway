"use client"

import * as React from "react"
import { GoogleConsentMode } from "./google-consent-mode"
import {
  getLoadedScripts,
  hasGoogleScripts as checkHasGoogleScripts,
  loadConsentedScripts,
  registerScript as registerScriptInternal,
  unloadRevokedScripts,
  unregisterScript as unregisterScriptInternal,
} from "./script-manager"
import { retryFailedRecords, trackConsent } from "./tracker"
import type {
  CategoryConfig,
  ConsentCategories,
  ConsentCategory,
  ConsentChangeEvent,
  ConsentState,
  CookieConsentConfig,
  CookieConsentContextValue,
  GoogleConsentModeConfig,
  ScriptConfig,
} from "./types"
import {
  calculateExpirationDate,
  clearConsentState,
  getAllAcceptedCategories,
  getDefaultCategories,
  getVisitorId,
  isGoogleScript,
  loadConsentState,
  saveConsentState,
} from "./utils"

const CookieConsentContext =
  React.createContext<CookieConsentContextValue | null>(null)

export const defaultCategories: CategoryConfig[] = [
  {
    key: "necessary",
    title: "Necessary",
    description:
      "Essential cookies required for the website to function properly. These cannot be disabled.",
    required: true,
  },
  {
    key: "analytics",
    title: "Analytics",
    description:
      "Cookies that help us understand how visitors interact with our website.",
  },
  {
    key: "marketing",
    title: "Marketing",
    description: "Cookies used for advertising and tracking across websites.",
  },
  {
    key: "preferences",
    title: "Preferences",
    description: "Cookies that remember your settings and preferences.",
  },
]

interface CookieConsentProviderProps {
  children: React.ReactNode
  config: CookieConsentConfig
}

export function CookieConsentProvider({
  children,
  config,
}: CookieConsentProviderProps) {
  const [state, setState] = React.useState<ConsentState>(() => ({
    hasConsented: false,
    categories: getDefaultCategories(),
    lastUpdated: null,
    consentVersion: config.consentVersion,
    visitorId: "",
  }))
  const [isBannerVisible, setIsBannerVisible] = React.useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [hasGoogleScripts, setHasGoogleScripts] = React.useState(false)

  const previousCategoriesRef = React.useRef(getDefaultCategories())

  const effectiveGoogleConsentMode = React.useMemo(():
    | GoogleConsentModeConfig
    | undefined => {
    if (config.googleConsentMode) {
      return config.googleConsentMode
    }
    if (hasGoogleScripts) {
      return {
        enabled: true,
        mapping: {
          analytics_storage: "analytics",
          ad_storage: "marketing",
          ad_user_data: "marketing",
          ad_personalization: "marketing",
          functionality_storage: "preferences",
          personalization_storage: "preferences",
          security_storage: "necessary",
        },
      }
    }
    return undefined
  }, [config.googleConsentMode, hasGoogleScripts])

  const updateGoogleConsentMode = React.useCallback(
    (categories: ConsentCategories) => {
      if (!effectiveGoogleConsentMode?.enabled) return
      if (typeof window === "undefined" || !(window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) return
      if (!(window as unknown as { dataLayer?: unknown[] }).dataLayer) return

      const mapping = effectiveGoogleConsentMode.mapping ?? {
        analytics_storage: "analytics",
        ad_storage: "marketing",
        ad_user_data: "marketing",
        ad_personalization: "marketing",
        functionality_storage: "preferences",
        personalization_storage: "preferences",
        security_storage: "necessary",
      }

      const consentUpdate: Record<string, string> = {}

      Object.entries(mapping).forEach(([googleType, category]) => {
        if (category && categories[category]) {
          consentUpdate[googleType] = "granted"
        } else {
          consentUpdate[googleType] = "denied"
        }
      })

      ;(window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        "consent",
        "update",
        consentUpdate
      )
    },
    [effectiveGoogleConsentMode]
  )

  React.useEffect(() => {
    const visitorId = getVisitorId()
    const stored = loadConsentState()

    if (stored && stored.consentVersion === config.consentVersion) {
      setState({ ...stored, visitorId })
      setIsBannerVisible(false)
      previousCategoriesRef.current = stored.categories

      loadConsentedScripts(stored.categories)
    } else {
      setState((prev) => ({ ...prev, visitorId }))
      setIsBannerVisible(true)
    }

    setIsInitialized(true)

    if (config.traceability?.enabled) {
      retryFailedRecords(config.traceability)
    }
  }, [config.consentVersion, config.traceability])

  React.useEffect(() => {
    if (checkHasGoogleScripts()) {
      setHasGoogleScripts(true)
    }
  }, [])

  const saveAndTrack = React.useCallback(
    async (
      categories: ConsentCategories,
      action: "accept_all" | "reject_all" | "custom" | "update"
    ) => {
      const expirationDays = config.expirationDays ?? 365
      const expiresAt = calculateExpirationDate(expirationDays)
      const visitorId = getVisitorId()

      const previousCategories = previousCategoriesRef.current

      const newState: ConsentState = {
        hasConsented: true,
        categories,
        lastUpdated: new Date().toISOString(),
        consentVersion: config.consentVersion,
        visitorId,
      }

      setState(newState)
      saveConsentState(newState)
      setIsBannerVisible(false)

      unloadRevokedScripts(previousCategories, categories)
      loadConsentedScripts(categories)

      updateGoogleConsentMode(categories)

      const grantedCategories: ConsentCategory[] = []
      ;(Object.keys(categories) as ConsentCategory[]).forEach((category) => {
        if (!previousCategories[category] && categories[category]) {
          grantedCategories.push(category)
        }
      })

      if (config.onConsentChange) {
        const event: ConsentChangeEvent = {
          previousCategories,
          currentCategories: categories,
          action,
          revokedCategories: (
            Object.keys(previousCategories) as ConsentCategory[]
          ).filter((k) => previousCategories[k as ConsentCategory] && !categories[k as ConsentCategory]),
          grantedCategories,
        }
        config.onConsentChange(event)
      }

      previousCategoriesRef.current = categories

      if (config.traceability?.enabled) {
        const userId = await config.consentScope?.getUserId?.()
        await trackConsent({
          categories,
          action,
          consentVersion: config.consentVersion,
          expiresAt,
          config: config.traceability,
          userId: userId ?? undefined,
          scope:
            config.consentScope?.mode === "global" ? "global" : "device",
        })
      }
    },
    [config, updateGoogleConsentMode]
  )

  const acceptAll = React.useCallback(async () => {
    await saveAndTrack(getAllAcceptedCategories(), "accept_all")
  }, [saveAndTrack])

  const rejectAll = React.useCallback(async () => {
    await saveAndTrack(getDefaultCategories(), "reject_all")
  }, [saveAndTrack])

  const updateConsent = React.useCallback(
    async (categories: Partial<ConsentCategories>) => {
      const newCategories: ConsentCategories = {
        ...state.categories,
        ...categories,
        necessary: true,
      }
      const action = state.hasConsented ? "update" : "custom"
      await saveAndTrack(newCategories, action)
    },
    [state.categories, state.hasConsented, saveAndTrack]
  )

  const openSettings = React.useCallback(() => {
    setIsSettingsOpen(true)
  }, [])

  const closeSettings = React.useCallback(() => {
    setIsSettingsOpen(false)
  }, [])

  const hideBanner = React.useCallback(() => {
    setIsBannerVisible(false)
  }, [])

  const resetConsent = React.useCallback(() => {
    const defaultCats = getDefaultCategories()
    unloadRevokedScripts(state.categories, defaultCats)

    clearConsentState()
    setState({
      hasConsented: false,
      categories: defaultCats,
      lastUpdated: null,
      consentVersion: config.consentVersion,
      visitorId: getVisitorId(),
    })
    previousCategoriesRef.current = defaultCats
    setIsBannerVisible(true)
  }, [config.consentVersion, state.categories])

  const hasConsent = React.useCallback(
    (category: ConsentCategory) => {
      return state.categories[category] ?? false
    },
    [state.categories]
  )

  const registerScript = React.useCallback((script: ScriptConfig) => {
    registerScriptInternal(script)
    if (isGoogleScript(script)) {
      setHasGoogleScripts(true)
    }
  }, [])

  const unregisterScript = React.useCallback((id: string) => {
    unregisterScriptInternal(id)
  }, [])

  const value: CookieConsentContextValue = React.useMemo(
    () => ({
      state,
      isBannerVisible: isInitialized && isBannerVisible,
      isSettingsOpen,
      acceptAll,
      rejectAll,
      updateConsent,
      openSettings,
      closeSettings,
      hideBanner,
      resetConsent,
      hasConsent,
      config,
      registerScript,
      unregisterScript,
      getLoadedScripts,
    }),
    [
      state,
      isInitialized,
      isBannerVisible,
      isSettingsOpen,
      acceptAll,
      rejectAll,
      updateConsent,
      openSettings,
      closeSettings,
      hideBanner,
      resetConsent,
      hasConsent,
      config,
      registerScript,
      unregisterScript,
    ]
  )

  return (
    <CookieConsentContext.Provider value={value}>
      {effectiveGoogleConsentMode?.enabled && <GoogleConsentMode />}
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = React.useContext(CookieConsentContext)
  if (!context) {
    throw new Error(
      "useCookieConsent must be used within a CookieConsentProvider"
    )
  }
  return context
}

export { CookieConsentContext }
