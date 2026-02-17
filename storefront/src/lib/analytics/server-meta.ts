/**
 * Server-side Meta Conversions API event tracking
 * Reference: https://developers.facebook.com/docs/marketing-api/conversions-api
 * User data: fn, ln, ct, st, zp, country must be SHA256 hashed (em, ph already hashed).
 */

"use server"

import { createHash } from "crypto"
import { hashEmail, hashPhone, normalizeFirstName, normalizeLastName, normalizeCity, normalizeState, normalizeCountry, normalizePostalCode } from "./privacy"

/** Hash a string as SHA256 hex for Meta CAPI (required for fn, ln, ct, st, zp, country). */
function hashSHA256Hex(value: string): string {
  if (!value || !value.trim()) return ""
  const normalized = value.trim().toLowerCase()
  return createHash("sha256").update(normalized, "utf8").digest("hex")
}

const META_PIXEL_ID = process.env.META_CONVERSIONS_API_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID
const META_ACCESS_TOKEN = process.env.META_CONVERSIONS_API_ACCESS_TOKEN
/** When set, server-side events are sent as test events and show in Events Manager > Test Events */
const META_TEST_EVENT_CODE = process.env.META_CONVERSIONS_API_TEST_EVENT_CODE || null
const META_CONVERSIONS_ENDPOINT = `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`

/**
 * Meta Conversions API Content structure
 */
interface MetaConversionsContent {
  id: string
  quantity: number
  item_price?: number
}

/**
 * Meta Conversions API User Data
 * em, ph, fn, ln, ct, st, zp, country must be SHA256 hashed; client_user_agent, fbc, fbp stay plain.
 */
interface MetaConversionsUserData {
  em?: string // email (SHA256 hashed)
  ph?: string // phone (SHA256 hashed)
  fn?: string // first name (SHA256 hashed)
  ln?: string // last name (SHA256 hashed)
  ct?: string // city (SHA256 hashed)
  st?: string // state (SHA256 hashed)
  zp?: string // zip (SHA256 hashed)
  country?: string // country code (SHA256 hashed)
  client_ip_address?: string
  client_user_agent?: string
  fbc?: string
  fbp?: string
}

/**
 * Send event to Meta Conversions API
 */
async function sendMetaConversionEvent(params: {
  event_name: string
  event_time: number
  event_source_url: string
  event_id: string
  user_data: MetaConversionsUserData
  custom_data?: Record<string, any>
  action_source?: 'website' | 'email' | 'phone_call' | 'chat'
}) {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    console.warn('Meta Conversions API not configured, skipping server-side event')
    return { success: false }
  }

  try {
    const eventPayload = {
      event_name: params.event_name,
      event_time: params.event_time,
      event_source_url: params.event_source_url,
      event_id: params.event_id,
      action_source: params.action_source || 'website',
      user_data: params.user_data,
      custom_data: params.custom_data,
    }
    const payload: { data: typeof eventPayload[]; test_event_code?: string } = { data: [eventPayload] }
    if (META_TEST_EVENT_CODE) {
      payload.test_event_code = META_TEST_EVENT_CODE
    }

    const response = await fetch(
      `${META_CONVERSIONS_ENDPOINT}?access_token=${META_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const result = await response.json()

    if (!response.ok || result.error) {
      console.error('Failed to send Meta Conversion event:', result)
      return { success: false, error: result.error }
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending Meta Conversion event:', error)
    return { success: false, error }
  }
}

/**
 * Prepare user data for Meta Conversions API (hashed)
 */
async function prepareMetaUserData(params: {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
}): Promise<MetaConversionsUserData> {
  const userData: MetaConversionsUserData = {}

  if (params.email) {
    userData.em = await hashEmail(params.email)
  }

  if (params.phone) {
    userData.ph = await hashPhone(params.phone)
  }

  if (params.firstName) {
    const normalized = normalizeFirstName(params.firstName)
    if (normalized) userData.fn = hashSHA256Hex(normalized)
  }

  if (params.lastName) {
    const normalized = normalizeLastName(params.lastName)
    if (normalized) userData.ln = hashSHA256Hex(normalized)
  }

  if (params.city) {
    const normalized = normalizeCity(params.city)
    if (normalized) userData.ct = hashSHA256Hex(normalized)
  }

  if (params.state) {
    const normalized = normalizeState(params.state)
    if (normalized) userData.st = hashSHA256Hex(normalized)
  }

  if (params.postalCode) {
    const normalized = normalizePostalCode(params.postalCode)
    if (normalized) userData.zp = hashSHA256Hex(normalized)
  }

  if (params.country) {
    const normalized = normalizeCountry(params.country)
    if (normalized) userData.country = hashSHA256Hex(normalized)
  }

  if (params.clientIp) {
    userData.client_ip_address = params.clientIp
  }

  if (params.userAgent) {
    userData.client_user_agent = params.userAgent
  }

  if (params.fbc) {
    userData.fbc = params.fbc
  }

  if (params.fbp) {
    userData.fbp = params.fbp
  }

  return userData
}

/**
 * Track purchase (server-side)
 */
export async function trackMetaPurchaseServer(params: {
  // Order data
  transaction_id: string
  value: number
  currency: string
  contents: MetaConversionsContent[]
  num_items: number
  
  // User data
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  
  // Technical data
  clientIp?: string
  userAgent?: string
  eventSourceUrl: string
  eventId: string
  fbc?: string
  fbp?: string
}) {
  const userData = await prepareMetaUserData({
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    city: params.city,
    state: params.state,
    postalCode: params.postalCode,
    country: params.country,
    clientIp: params.clientIp,
    userAgent: params.userAgent,
    fbc: params.fbc,
    fbp: params.fbp,
  })

  return await sendMetaConversionEvent({
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: params.eventSourceUrl,
    event_id: params.eventId,
    user_data: userData,
    custom_data: {
      value: params.value,
      currency: params.currency,
      contents: params.contents,
      num_items: params.num_items,
      content_type: 'product',
    },
  })
}

/**
 * Track complete registration (server-side)
 */
export async function trackMetaCompleteRegistrationServer(params: {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  eventSourceUrl: string
  eventId: string
  clientIp?: string
  userAgent?: string
}) {
  const userData = await prepareMetaUserData({
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    clientIp: params.clientIp,
    userAgent: params.userAgent,
  })

  return await sendMetaConversionEvent({
    event_name: 'CompleteRegistration',
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: params.eventSourceUrl,
    event_id: params.eventId,
    user_data: userData,
    custom_data: {
      status: 'success',
      content_name: 'account_registration',
    },
  })
}

/**
 * Track lead (server-side)
 */
export async function trackMetaLeadServer(params: {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  leadSource: string
  eventSourceUrl: string
  eventId: string
  clientIp?: string
  userAgent?: string
}) {
  const userData = await prepareMetaUserData({
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    clientIp: params.clientIp,
    userAgent: params.userAgent,
  })

  return await sendMetaConversionEvent({
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: params.eventSourceUrl,
    event_id: params.eventId,
    user_data: userData,
    custom_data: {
      content_name: params.leadSource,
      content_category: 'lead',
    },
  })
}

/**
 * Send any Meta event to CAPI for server-side deduplication with Pixel.
 * Use from API route with event_id matching the client's fbq('track', ..., { eventID }).
 */
export async function sendMetaEventServer(params: {
  event_name: string
  event_id: string
  event_source_url: string
  custom_data?: Record<string, unknown>
  user_data?: {
    fbc?: string
    fbp?: string
    clientIp?: string
    userAgent?: string
  }
}) {
  const userData: MetaConversionsUserData = {}
  const fbc = params.user_data?.fbc?.trim()
  const fbp = params.user_data?.fbp?.trim()
  const clientIp = params.user_data?.clientIp?.trim()
  const userAgent = params.user_data?.userAgent?.trim()
  if (fbc) userData.fbc = fbc
  if (fbp) userData.fbp = fbp
  if (clientIp) userData.client_ip_address = clientIp
  if (userAgent) userData.client_user_agent = userAgent

  return sendMetaConversionEvent({
    event_name: params.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: params.event_source_url,
    event_id: params.event_id,
    user_data: userData,
    custom_data: params.custom_data,
  })
}

/**
 * Extract Facebook cookies from request headers.
 * Meta Pixel sets _fbc (click id) and _fbp (browser id) as first-party cookies.
 */
export async function extractFacebookCookies(cookieHeader?: string): Promise<{
  fbc?: string
  fbp?: string
}> {
  if (!cookieHeader) return {}

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const trimmed = cookie.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) return acc
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  return {
    fbc: cookies._fbc || undefined,
    fbp: cookies._fbp || undefined,
  }
}

/**
 * Get client IP from request (set by reverse proxy / host).
 * Meta uses this for match quality; include whenever available.
 */
export async function getClientIp(headers: Headers): Promise<string | undefined> {
  const raw =
    headers.get('x-forwarded-for') ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    headers.get('x-client-ip') ||
    headers.get('true-client-ip') || // Akamai, Cloudflare
    undefined
  const first = raw?.split(',')[0]?.trim()
  return first && first.length > 0 ? first : undefined
}
