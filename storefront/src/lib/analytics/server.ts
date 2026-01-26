"use server"

import { PostHog } from 'posthog-node'
import type { PurchaseEventProperties, UserProperties } from './types'
import { HttpTypes } from '@medusajs/types'

// Initialize PostHog server-side client
let posthog: PostHog | null = null

function getPostHogClient(): PostHog | null {
  if (posthog) {
    return posthog
  }

  const apiKey = process.env.POSTHOG_API_KEY
  const host = process.env.POSTHOG_HOST || 'https://app.posthog.com'

  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('PostHog API key not found. Server-side tracking will be disabled.')
    }
    return null
  }

  posthog = new PostHog(apiKey, {
    host,
    flushAt: 20, // Flush after 20 events
    flushInterval: 10000, // Or flush every 10 seconds
  })

  return posthog
}

/**
 * Track a purchase completion (server-side)
 * Call this after order is successfully created
 */
export async function trackPurchase(order: HttpTypes.StoreOrder): Promise<void> {
  const client = getPostHogClient()
  if (!client) {
    return
  }

  try {
    const distinctId = order.customer_id || order.email || `guest_${order.id}`
    const isGuestPurchase = !order.customer_id

    // Identify user if email is available
    if (order.email) {
      client.identify({
        distinctId: order.email,
        properties: {
          email: order.email,
          is_guest: isGuestPurchase,
          first_order_date: order.created_at,
        },
      })
    }

    // Track purchase event
    const properties: PurchaseEventProperties = {
      order_id: order.id,
      order_total: order.total ? Number(order.total) : 0,
      currency: order.currency_code || 'EUR',
      items: (order.items || []).map((item: any) => ({
        product_id: item.product_id || '',
        variant_id: item.variant_id || '',
        quantity: item.quantity || 0,
        price: item.unit_price ? Number(item.unit_price) : 0,
      })),
      shipping_method: order.shipping_methods?.[0]?.name,
      payment_method: order.payment_collections?.[0]?.provider_id,
      customer_id: order.customer_id,
      is_new_customer: isGuestPurchase, // Guest purchase = new customer
      is_guest_purchase: isGuestPurchase,
    }

    client.capture({
      distinctId,
      event: 'purchase_completed',
      properties,
    })

    // Flush to ensure event is sent
    await client.shutdown()
  } catch (error) {
    console.error('Failed to track purchase in PostHog:', error)
  }
}

/**
 * Track a purchase failure
 */
export async function trackPurchaseFailed(
  errorType: string,
  errorMessage: string,
  cartValue: number,
  paymentMethod?: string,
  customerId?: string,
  email?: string
): Promise<void> {
  const client = getPostHogClient()
  if (!client) {
    return
  }

  try {
    const distinctId = customerId || email || 'anonymous'

    client.capture({
      distinctId,
      event: 'purchase_failed',
      properties: {
        error_type: errorType,
        error_message: errorMessage,
        cart_value: cartValue,
        payment_method: paymentMethod,
      },
    })

    await client.shutdown()
  } catch (error) {
    console.error('Failed to track purchase failure in PostHog:', error)
  }
}

/**
 * Track order confirmation page view
 */
export async function trackOrderConfirmed(
  orderId: string,
  orderTotal: number,
  itemsCount: number,
  customerId?: string,
  email?: string
): Promise<void> {
  const client = getPostHogClient()
  if (!client) {
    return
  }

  try {
    const distinctId = customerId || email || `guest_${orderId}`

    client.capture({
      distinctId,
      event: 'order_confirmed',
      properties: {
        order_id: orderId,
        order_total: orderTotal,
        items_count: itemsCount,
      },
    })

    await client.shutdown()
  } catch (error) {
    console.error('Failed to track order confirmation in PostHog:', error)
  }
}

/**
 * Identify a user (server-side)
 * Useful for server actions and API routes
 */
export async function identifyUser(
  userId: string,
  traits: UserProperties
): Promise<void> {
  const client = getPostHogClient()
  if (!client) {
    return
  }

  try {
    client.identify({
      distinctId: userId,
      properties: traits,
    })

    await client.shutdown()
  } catch (error) {
    console.error('Failed to identify user in PostHog:', error)
  }
}

/**
 * Track a custom event (server-side)
 */
export async function trackEvent(
  eventName: string,
  properties: Record<string, any>,
  distinctId?: string
): Promise<void> {
  const client = getPostHogClient()
  if (!client) {
    return
  }

  try {
    client.capture({
      distinctId: distinctId || 'anonymous',
      event: eventName,
      properties,
    })

    await client.shutdown()
  } catch (error) {
    console.error(`Failed to track event ${eventName} in PostHog:`, error)
  }
}
