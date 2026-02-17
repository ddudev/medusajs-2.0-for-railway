import type { ConsentCategories, ConsentState } from "./types"

const STORAGE_KEY = "cookie-consent"
const DEFAULT_GTM_MAPPING: Record<string, keyof ConsentCategories> = {
  analytics_storage: "analytics",
  ad_storage: "marketing",
  ad_user_data: "marketing",
  ad_personalization: "marketing",
  functionality_storage: "preferences",
  personalization_storage: "preferences",
  security_storage: "necessary",
}
const VISITOR_ID_KEY = "cookie-consent-visitor-id"

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getVisitorId(): string {
  if (typeof window === "undefined") {
    return generateUUID()
  }

  let visitorId = localStorage.getItem(VISITOR_ID_KEY)
  if (!visitorId) {
    visitorId = generateUUID()
    localStorage.setItem(VISITOR_ID_KEY, visitorId)
  }
  return visitorId
}

export function getDefaultCategories(): ConsentCategories {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  }
}

export function getAllAcceptedCategories(): ConsentCategories {
  return {
    necessary: true,
    analytics: true,
    marketing: true,
    preferences: true,
  }
}

export function saveConsentState(state: ConsentState): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadConsentState(): ConsentState | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as ConsentState
  } catch {
    return null
  }
}

/**
 * Build the object for gtag('consent', 'update', ...) from our categories.
 * Used at GTM init (from storage) and when user accepts (from cookie-provider).
 */
export function buildGTMConsentUpdate(
  categories: ConsentCategories,
  mapping: Record<string, keyof ConsentCategories> = DEFAULT_GTM_MAPPING
): Record<string, string> {
  const update: Record<string, string> = {}
  for (const [googleType, category] of Object.entries(mapping)) {
    update[googleType] = category && categories[category] ? "granted" : "denied"
  }
  return update
}

/**
 * Read stored consent and return gtag consent update if user has already consented.
 * Call this at GTM container init (before config/events) so first paint has correct consent.
 */
export function getStoredConsentUpdateForGTM(
  consentVersion: string
): Record<string, string> | null {
  if (typeof window === "undefined") return null
  const stored = loadConsentState()
  if (!stored || stored.consentVersion !== consentVersion || !stored.hasConsented)
    return null
  return buildGTMConsentUpdate(stored.categories)
}

export function clearConsentState(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

export function calculateExpirationDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export function isConsentExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

export function isGoogleScript(script: {
  src?: string
  content?: string
}): boolean {
  if (script.src) {
    const srcLower = script.src.toLowerCase()
    const googleDomains = [
      "googletagmanager.com",
      "google-analytics.com",
      "googleadservices.com",
      "google.com/analytics",
      "google.com/ads",
      "doubleclick.net",
      "googleapis.com/gtag",
    ]

    const isGoogleDomain = googleDomains.some((domain) => {
      const domainLower = domain.toLowerCase()
      if (domainLower.includes("/")) {
        return srcLower.includes(domainLower)
      }
      const domainPattern = new RegExp(
        `(^|//|\\.)${domainLower.replace(/\./g, "\\.")}(/|:|$|\\?)`,
        "i"
      )
      return domainPattern.test(srcLower)
    })

    if (isGoogleDomain) return true
  }

  if (script.content) {
    const contentLower = script.content.toLowerCase()
    const googlePatterns = [
      "googletagmanager.com",
      "google-analytics.com",
      "gtag(",
      "datalayer",
      "ga(",
      "google-analytics",
    ]
    return googlePatterns.some((p) =>
      contentLower.includes(p.toLowerCase())
    )
  }

  return false
}
