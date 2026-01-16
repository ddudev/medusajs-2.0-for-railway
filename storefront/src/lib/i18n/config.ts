/**
 * i18n configuration
 */

import { getLocaleFromCountryCode } from "./utils/get-locale"

export type Locale = "en" | "bg"

export interface TranslationKeys {
  common: Record<string, any>
  cart: Record<string, any>
  product: Record<string, any>
  filters: Record<string, any>
  homepage: Record<string, any>
  checkout: Record<string, any>
  gallery: Record<string, any>
  search: Record<string, any>
  cartButton: Record<string, any>
  metadata?: Record<string, any>
  pwa?: Record<string, any>
  faq?: Record<string, any>
  contact?: Record<string, any>
  about?: Record<string, any>
  footer?: Record<string, any>
  login?: Record<string, any>
}

/**
 * Load translations for a locale
 */
export async function loadTranslations(locale: Locale): Promise<TranslationKeys> {
  try {
    const translations = await import(`./locales/${locale}.json`)
    return translations.default
  } catch (error) {
    // Fallback to English if locale not found
    if (locale !== "en") {
      const translations = await import(`./locales/en.json`)
      return translations.default
    }
    throw error
  }
}

/**
 * Get locale from country code (server-side)
 */
export function getLocale(countryCode: string): Locale {
  const locale = getLocaleFromCountryCode(countryCode)
  return locale as Locale
}
