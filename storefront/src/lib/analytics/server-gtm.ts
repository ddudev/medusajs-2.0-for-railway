/**
 * Server-side Google Analytics 4 (GA4) event tracking
 * Uses GA4 Measurement Protocol for server-side events
 * Reference: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

"use server"

const GA4_MEASUREMENT_ID = process.env.GOOGLE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
const GA4_API_SECRET = process.env.GA4_API_SECRET
const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect'

/**
 * GA4 Item structure for server-side events
 */
interface GA4Item {
  item_id: string
  item_name: string
  item_brand?: string
  item_category?: string
  item_category2?: string
  item_category3?: string
  item_variant?: string
  price: number
  quantity: number
}

/**
 * Send event to GA4 Measurement Protocol
 */
async function sendGA4Event(params: {
  client_id: string
  events: Array<{
    name: string
    params: Record<string, any>
  }>
  user_properties?: Record<string, any>
  user_id?: string
}) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    console.warn('GA4 Measurement ID or API Secret not configured, skipping server-side event')
    return
  }

  try {
    const payload = {
      client_id: params.client_id,
      user_id: params.user_id,
      events: params.events,
      user_properties: params.user_properties,
    }

    const response = await fetch(
      `${GA4_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      console.error('Failed to send GA4 event:', response.statusText)
    }
  } catch (error) {
    console.error('Error sending GA4 event:', error)
  }
}

/**
 * Track purchase (server-side)
 */
export async function trackGA4Purchase(params: {
  client_id: string
  transaction_id: string
  value: number
  currency: string
  tax?: number
  shipping?: number
  coupon?: string
  items: GA4Item[]
  // Enhanced conversion data
  email?: string
  phone_number?: string
  address?: {
    first_name?: string
    last_name?: string
    street?: string
    city?: string
    region?: string
    postal_code?: string
    country?: string
  }
  user_id?: string
}) {
  await sendGA4Event({
    client_id: params.client_id,
    user_id: params.user_id,
    events: [{
      name: 'purchase',
      params: {
        transaction_id: params.transaction_id,
        value: params.value,
        currency: params.currency,
        tax: params.tax,
        shipping: params.shipping,
        coupon: params.coupon,
        items: params.items,
        // Enhanced conversion data (unhashed for server-side)
        user_data: {
          email_address: params.email,
          phone_number: params.phone_number,
          address: params.address,
        },
      },
    }],
  })
}

/**
 * Track refund (server-side)
 */
export async function trackGA4Refund(params: {
  client_id: string
  transaction_id: string
  value: number
  currency: string
  items?: GA4Item[]
  user_id?: string
}) {
  await sendGA4Event({
    client_id: params.client_id,
    user_id: params.user_id,
    events: [{
      name: 'refund',
      params: {
        transaction_id: params.transaction_id,
        value: params.value,
        currency: params.currency,
        items: params.items,
      },
    }],
  })
}

/**
 * Track custom server-side event
 */
export async function trackGA4CustomEvent(params: {
  client_id: string
  event_name: string
  event_params: Record<string, any>
  user_id?: string
}) {
  await sendGA4Event({
    client_id: params.client_id,
    user_id: params.user_id,
    events: [{
      name: params.event_name,
      params: params.event_params,
    }],
  })
}

/**
 * Generate or retrieve client ID
 * Uses a consistent format for tracking
 */
export function generateClientId(): string {
  // In a real implementation, you'd want to:
  // 1. Check for existing GA4 client ID in cookies
  // 2. Generate a new one if not found
  // 3. Store it for future requests
  
  // Format: timestamp.random
  const timestamp = Math.floor(Date.now() / 1000)
  const random = Math.floor(Math.random() * 1000000000)
  return `${timestamp}.${random}`
}
