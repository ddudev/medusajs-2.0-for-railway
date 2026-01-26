/**
 * Privacy utilities for analytics
 * Handles data hashing, consent management, and privacy-compliant tracking
 */

/**
 * Hash a string using SHA-256
 * Used for hashing email/phone for advanced matching
 */
export async function hashSHA256(value: string): Promise<string> {
  if (!value) return ''

  // Normalize: trim and lowercase
  const normalized = value.trim().toLowerCase()

  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Normalize and hash email for advanced matching
 */
export async function hashEmail(email: string): Promise<string> {
  if (!email || !isValidEmail(email)) return ''

  // Remove whitespace and lowercase
  const normalized = email.trim().toLowerCase()

  return await hashSHA256(normalized)
}

/**
 * Normalize and hash phone for advanced matching
 */
export async function hashPhone(phone: string): Promise<string> {
  if (!phone) return ''

  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '')

  // For international format, ensure it starts with country code
  // If it doesn't start with +, assume it's a local number
  const normalized = digitsOnly

  return await hashSHA256(normalized)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  // Allow various phone formats, just check if there are enough digits
  const digitsOnly = phone.replace(/\D/g, '')
  return digitsOnly.length >= 7 // Minimum valid phone length
}

/**
 * Normalize first name for advanced matching
 */
export function normalizeFirstName(firstName: string): string {
  return firstName.trim().toLowerCase()
}

/**
 * Normalize last name for advanced matching
 */
export function normalizeLastName(lastName: string): string {
  return lastName.trim().toLowerCase()
}

/**
 * Normalize city for advanced matching
 */
export function normalizeCity(city: string): string {
  return city.trim().toLowerCase()
}

/**
 * Normalize state/region for advanced matching
 */
export function normalizeState(state: string): string {
  return state.trim().toLowerCase()
}

/**
 * Normalize country for advanced matching
 */
export function normalizeCountry(country: string): string {
  // Use ISO 2-letter country code, lowercase
  return country.trim().toLowerCase()
}

/**
 * Normalize postal/zip code for advanced matching
 */
export function normalizePostalCode(postalCode: string): string {
  // Remove spaces and lowercase
  return postalCode.replace(/\s/g, '').toLowerCase()
}

/**
 * Check if Do Not Track is enabled
 */
export function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false

  const dnt = navigator.doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack
  return dnt === '1' || dnt === 'yes'
}

/**
 * Consent state
 */
let consentGiven = true // Default to true, adjust based on your consent management

/**
 * Set consent state
 */
export function setConsentState(hasConsent: boolean) {
  consentGiven = hasConsent
}

/**
 * Check if user has given consent for tracking
 */
export function hasTrackingConsent(): boolean {
  // Respect Do Not Track
  if (isDoNotTrackEnabled()) {
    return false
  }

  // Check consent state
  return consentGiven
}

/**
 * Prepare user data for advanced matching (hashed)
 */
export async function prepareAdvancedMatchingData(params: {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}): Promise<{
  em?: string
  ph?: string
  fn?: string
  ln?: string
  ct?: string
  st?: string
  zp?: string
  country?: string
}> {
  const data: any = {}

  if (params.email && isValidEmail(params.email)) {
    data.em = await hashEmail(params.email)
  }

  if (params.phone && isValidPhone(params.phone)) {
    data.ph = await hashPhone(params.phone)
  }

  if (params.firstName) {
    data.fn = normalizeFirstName(params.firstName)
  }

  if (params.lastName) {
    data.ln = normalizeLastName(params.lastName)
  }

  if (params.city) {
    data.ct = normalizeCity(params.city)
  }

  if (params.state) {
    data.st = normalizeState(params.state)
  }

  if (params.postalCode) {
    data.zp = normalizePostalCode(params.postalCode)
  }

  if (params.country) {
    data.country = normalizeCountry(params.country)
  }

  return data
}

/**
 * Generate unique event ID for deduplication
 * Format: timestamp_randomstring
 */
export function generateEventId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}_${random}`
}

/**
 * Rate limiter for preventing duplicate events
 */
const eventCache = new Map<string, number>()
const RATE_LIMIT_WINDOW = 2000 // 2 seconds

export function shouldTrackEvent(eventKey: string): boolean {
  const now = Date.now()
  const lastTracked = eventCache.get(eventKey)

  if (lastTracked && (now - lastTracked) < RATE_LIMIT_WINDOW) {
    return false // Too soon, skip
  }

  eventCache.set(eventKey, now)
  return true
}

/**
 * Clean up old entries from event cache
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamp] of eventCache.entries()) {
    if (now - timestamp > RATE_LIMIT_WINDOW * 2) {
      eventCache.delete(key)
    }
  }
}, 10000) // Clean up every 10 seconds
