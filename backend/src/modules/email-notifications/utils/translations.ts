import enTranslations from '../translations/en.json'
import bgTranslations from '../translations/bg.json'

type Locale = 'en' | 'bg'

const translationsMap: Record<Locale, typeof enTranslations> = {
  en: enTranslations,
  bg: bgTranslations,
}

/**
 * Get locale from country code
 * Maps country codes to email locales
 */
const countryToLocaleMap: Record<string, Locale> = {
  bg: 'bg', // Bulgarian
  us: 'en', // English (US)
  gb: 'en', // English (UK)
  ca: 'en', // English (Canada)
  au: 'en', // English (Australia)
  // Add more mappings as needed
}

/**
 * Get locale from country code
 * @param countryCode - ISO 2-letter country code (e.g., 'bg', 'us')
 * @returns locale code (defaults to 'bg' for Bulgarian store)
 */
export function getLocaleFromCountryCode(countryCode?: string | null): Locale {
  if (!countryCode || typeof countryCode !== 'string') {
    return 'bg' // Default to Bulgarian for this store
  }
  return countryToLocaleMap[countryCode.toLowerCase()] || 'bg'
}

/**
 * Get locale from customer's shipping address country code
 * @param countryCode - Country code from customer/order
 * @returns locale code
 */
export function getEmailLocale(countryCode?: string | null): Locale {
  return getLocaleFromCountryCode(countryCode)
}

/**
 * Translate a key with optional interpolation
 * @param locale - Locale code ('en' or 'bg')
 * @param key - Translation key (e.g., 'welcome.title')
 * @param options - Optional values for interpolation (e.g., {customerName: 'John'})
 * @returns Translated string
 */
export function t(locale: Locale, key: string, options?: Record<string, string | number>): string {
  const translations = translationsMap[locale] || translationsMap.bg
  
  const keys = key.split('.')
  let value: any = translations
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Fallback to English if translation not found
      if (locale !== 'en') {
        return t('en', key, options)
      }
      return key // Return key if translation not found
    }
  }
  
  if (typeof value !== 'string') {
    return key
  }
  
  // Handle interpolation: replace {key} with values from options
  if (options) {
    let interpolated = value
    for (const [optionKey, optionValue] of Object.entries(options)) {
      interpolated = interpolated.replace(
        new RegExp(`\\{${optionKey}\\}`, 'g'),
        String(optionValue)
      )
    }
    return interpolated
  }
  
  return value
}

/**
 * Get all translations for a locale
 * @param locale - Locale code
 * @returns Translation object
 */
export function getTranslations(locale: Locale) {
  return translationsMap[locale] || translationsMap.bg
}
