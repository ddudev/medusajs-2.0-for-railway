/**
 * Server-side Meta Conversions API event tracking
 * Reference: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

"use server"

import { hashEmail, hashPhone, normalizeFirstName, normalizeLastName, normalizeCity, normalizeState, normalizeCountry, normalizePostalCode } from './privacy'

const META_PIXEL_ID = process.env.META_CONVERSIONS_API_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID
const META_ACCESS_TOKEN = process.env.META_CONVERSIONS_API_ACCESS_TOKEN
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
 * Meta Conversions API User Data (hashed)
 */
interface MetaConversionsUserData {
  em?: string // email (hashed)
  ph?: string // phone (hashed)
  fn?: string // first name (lowercase)
  ln?: string // last name (lowercase)
  ct?: string // city (lowercase)
  st?: string // state (lowercase)
  zp?: string // zip code
  country?: string // country code (lowercase)
  client_ip_address?: string
  client_user_agent?: string
  fbc?: string // Facebook click ID cookie
  fbp?: string // Facebook browser ID cookie
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
    const payload = {
      data: [{
        event_name: params.event_name,
        event_time: params.event_time,
        event_source_url: params.event_source_url,
        event_id: params.event_id, // For deduplication with client-side events
        action_source: params.action_source || 'website',
        user_data: params.user_data,
        custom_data: params.custom_data,
      }],
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
    userData.fn = normalizeFirstName(params.firstName)
  }

  if (params.lastName) {
    userData.ln = normalizeLastName(params.lastName)
  }

  if (params.city) {
    userData.ct = normalizeCity(params.city)
  }

  if (params.state) {
    userData.st = normalizeState(params.state)
  }

  if (params.postalCode) {
    userData.zp = normalizePostalCode(params.postalCode)
  }

  if (params.country) {
    userData.country = normalizeCountry(params.country)
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
 * Extract Facebook cookies from request headers
 */
export function extractFacebookCookies(cookieHeader?: string): {
  fbc?: string
  fbp?: string
} {
  if (!cookieHeader) return {}

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  return {
    fbc: cookies._fbc,
    fbp: cookies._fbp,
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(headers: Headers): string | undefined {
  // Check various headers for client IP
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    undefined
  )
}
