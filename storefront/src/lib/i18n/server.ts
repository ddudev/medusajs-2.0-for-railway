/**
 * Server-side translation utilities
 */

import { loadTranslations, type TranslationKeys } from "./config"
import { getLocale } from "./config"

/**
 * Get translations for a country code (server component)
 * Translations are static files - can be cached
 */
export async function getTranslations(
  countryCode: string
): Promise<TranslationKeys> {
  "use cache"
  const locale = getLocale(countryCode)
  return await loadTranslations(locale)
}

/**
 * Get translation value by key path (e.g., "common.cart")
 * Supports interpolation with options object (e.g., {year: "2024"})
 */
export function getTranslation(
  translations: TranslationKeys,
  key: string,
  options?: { [key: string]: string | number }
): string {
  const keys = key.split(".")
  let value: any = translations

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k]
    } else {
      return key // Return key if translation not found
    }
  }

  if (typeof value !== "string") {
    return key
  }

  // Handle interpolation: replace {key} with values from options
  if (options) {
    let interpolated = value
    for (const [optionKey, optionValue] of Object.entries(options)) {
      interpolated = interpolated.replace(
        new RegExp(`\\{${optionKey}\\}`, "g"),
        String(optionValue)
      )
    }
    return interpolated
  }

  return value
}

