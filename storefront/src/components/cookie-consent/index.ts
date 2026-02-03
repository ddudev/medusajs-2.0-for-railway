export { ConsentScript } from "./consent-script"
export { CookieBanner } from "./cookie-banner"
export { CookieBannerBackdrop } from "./cookie-banner-backdrop"
export {
  CookieConsentProvider,
  defaultCategories,
  useCookieConsent,
} from "./cookie-provider"
export { CookieSettings } from "./cookie-settings"
export { CookieTrigger } from "./cookie-trigger"
export { GoogleConsentMode } from "./google-consent-mode"
export { useConsentScript } from "./use-consent-script"
export {
  useConsentGate,
  useConsentValue,
} from "./use-cookie-consent"

export type {
  BannerPosition,
  CategoryConfig,
  ConsentAction,
  ConsentCategories,
  ConsentCategory,
  ConsentChangeEvent,
  ConsentRecord,
  ConsentScope,
  ConsentState,
  CookieConsentConfig,
  CookieConsentContextValue,
  GoogleConsentModeConfig,
  ScriptConfig,
  TraceabilityConfig,
} from "./types"

export {
  getLoadedScripts,
  hasGoogleScripts,
  loadScript,
  registerCleanup,
  registerScript,
  scriptCleanupHelpers,
  unloadScript,
  unregisterScript,
} from "./script-manager"
export { retryFailedRecords, trackConsent } from "./tracker"
export {
  generateUUID,
  getVisitorId,
  isGoogleScript,
} from "./utils"
