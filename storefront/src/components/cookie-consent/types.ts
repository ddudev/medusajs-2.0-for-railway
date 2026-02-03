// Cookie consent types following shadcn patterns

export type ConsentCategory =
  | "necessary"
  | "analytics"
  | "marketing"
  | "preferences"

export type ConsentAction =
  | "accept_all"
  | "reject_all"
  | "custom"
  | "update"

export type ConsentScope = "device" | "global"

export type BannerPosition =
  | "bottom"
  | "top"
  | "bottom-left"
  | "bottom-right"

export interface ConsentCategories {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  preferences: boolean
}

export interface ConsentRecord {
  visitorId: string
  consentId: string
  consentVersion: string
  userId?: string
  scope: ConsentScope
  categories: ConsentCategories
  action: ConsentAction
  timestamp: string
  expiresAt: string
  url: string
  userAgent: string
  language: string
  linkedFromDevice?: string
}

export interface TraceabilityConfig {
  enabled: boolean
  endpoint: string
  method?: "POST" | "PUT"
  headers?: Record<string, string>
  getVisitorId?: () => string | Promise<string>
  includeUserAgent?: boolean
  includeUrl?: boolean
  retryOnFailure?: boolean
  maxRetries?: number
  onSuccess?: (record: ConsentRecord) => void
  onError?: (error: Error, record: ConsentRecord) => void
}

export interface ConsentScopeConfig {
  mode: "device" | "global" | "hybrid"
  syncEndpoint?: string
  getUserId?: () => string | null | Promise<string | null>
  conflictStrategy?: "server-wins" | "device-wins" | "most-recent"
  syncOnAuth?: boolean
  linkDeviceToUser?: boolean
}

export interface CategoryConfig {
  key: ConsentCategory
  title: string
  description: string
  required?: boolean
}

export interface ScriptConfig {
  id: string
  src?: string
  content?: string
  category: ConsentCategory
  strategy?: "afterInteractive" | "lazyOnload" | "beforeInteractive"
  attributes?: Record<string, string>
  onLoad?: () => void
  onError?: (error: Error) => void
  onRevoke?: () => void
}

export interface ConsentChangeEvent {
  previousCategories: ConsentCategories
  currentCategories: ConsentCategories
  action: ConsentAction
  revokedCategories: ConsentCategory[]
  grantedCategories: ConsentCategory[]
}

export interface GoogleConsentModeConfig {
  enabled: boolean
  mapping?: {
    analytics_storage?: ConsentCategory
    ad_storage?: ConsentCategory
    ad_user_data?: ConsentCategory
    ad_personalization?: ConsentCategory
    functionality_storage?: ConsentCategory
    personalization_storage?: ConsentCategory
    security_storage?: ConsentCategory
  }
  regions?: string[]
}

export interface CookieConsentConfig {
  consentVersion: string
  expirationDays?: number
  privacyPolicyUrl?: string
  position?: BannerPosition
  categories?: CategoryConfig[]
  traceability?: TraceabilityConfig
  consentScope?: ConsentScopeConfig
  googleConsentMode?: GoogleConsentModeConfig
  onConsentChange?: (event: ConsentChangeEvent) => void
}

export interface ConsentState {
  hasConsented: boolean
  categories: ConsentCategories
  lastUpdated: string | null
  consentVersion: string
  visitorId: string
}

export interface CookieConsentContextValue {
  state: ConsentState
  isBannerVisible: boolean
  isSettingsOpen: boolean
  acceptAll: () => Promise<void>
  rejectAll: () => Promise<void>
  updateConsent: (categories: Partial<ConsentCategories>) => Promise<void>
  openSettings: () => void
  closeSettings: () => void
  hideBanner: () => void
  resetConsent: () => void
  hasConsent: (category: ConsentCategory) => boolean
  config: CookieConsentConfig
  registerScript: (script: ScriptConfig) => void
  unregisterScript: (id: string) => void
  getLoadedScripts: () => string[]
}
