"use client"

import { useEffect, useRef } from "react"
import { trackGTMPurchase } from "./gtm-events"
import { trackMetaPurchase } from "./meta-events"
import { useAnalytics } from "./use-analytics"

/** Serializable order summary for client-side purchase tracking (GTM + Meta + PostHog). */
export interface OrderConfirmedPayload {
  transaction_id: string
  value: number
  currency: string
  tax?: number
  shipping?: number
  items: Array<{
    item_id: string
    item_name: string
    item_variant?: string
    price: number
    quantity: number
    product_id?: string
    variant_id?: string
  }>
  /** When set, order was attached to an existing customer (e.g. guest checked out with matching email). */
  customer_id?: string
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  city?: string
  region?: string
  postal_code?: string
  country?: string
  /** For Meta/GA4 deduplication; also sent to conversions API for server-side events. */
  event_id?: string
  /** Canonical URL of order confirmed page; sent to conversions API. */
  event_source_url?: string
}

/**
 * Fires purchase / checkout-completed events to Google (GTM), Meta (Pixel), and PostHog
 * when the order confirmed page loads. When the order has customer_id or email (e.g. guest
 * checked out with an email that matches an existing customer), calls identify so the guest
 * session is merged with the known customer in PostHog/analytics.
 */
export function OrderConfirmedTracker({ order }: { order: OrderConfirmedPayload }) {
  const { trackEvent, identifyUser } = useAnalytics()
  const hasFired = useRef(false)

  useEffect(() => {
    if (!order?.transaction_id || hasFired.current) return
    hasFired.current = true

    // Stitch guest to known customer: identify by customer_id or email so PostHog merges
    // the guest_cart_xxx profile with the existing customer profile
    const identityId = order.customer_id ?? order.email
    if (identityId) {
      identifyUser(identityId, {
        email: order.email,
        name: [order.first_name, order.last_name].filter(Boolean).join(" ").trim() || undefined,
      })
    }

    const gtmItems = order.items.map((item, index) => ({
      item_id: item.product_id || item.item_id,
      item_name: item.item_name,
      item_variant: item.item_variant || item.variant_id,
      price: item.price,
      quantity: item.quantity,
      index,
    }))

    // Google (GTM) - purchase
    trackGTMPurchase({
      transaction_id: order.transaction_id,
      value: order.value,
      currency: order.currency,
      tax: order.tax,
      shipping: order.shipping,
      items: gtmItems,
      email: order.email,
      phone: order.phone,
      first_name: order.first_name,
      last_name: order.last_name,
      city: order.city,
      region: order.region,
      postal_code: order.postal_code,
      country: order.country,
    })

    // Meta (Pixel) - Purchase
    trackMetaPurchase({
      content_ids: order.items.map((i) => i.variant_id || i.product_id || i.item_id),
      content_type: "product",
      currency: order.currency,
      value: order.value,
      num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
      contents: order.items.map((i) => ({
        id: i.variant_id || i.product_id || i.item_id,
        quantity: i.quantity,
        item_price: i.price,
      })),
      order_id: order.transaction_id,
      event_id: order.event_id,
    })

    // PostHog - purchase_completed (client-side for thank-you page view)
    trackEvent("purchase_completed", {
      order_id: order.transaction_id,
      value: order.value,
      currency: order.currency,
      item_count: order.items.reduce((sum, i) => sum + i.quantity, 0),
    })

    // Server-side conversions (Meta CAPI + GA4) via API route so Events Manager shows server events
    const eventSourceUrl = order.event_source_url || (typeof window !== "undefined" ? window.location.href : "")
    const eventId = order.event_id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "")
    if (eventId && eventSourceUrl && order.transaction_id) {
      fetch("/api/analytics/conversions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: order.transaction_id,
          value: order.value,
          currency: order.currency,
          tax: order.tax,
          shipping: order.shipping,
          items: order.items.map((item) => ({
            product_id: item.product_id || item.item_id,
            product_name: item.item_name,
            variant_id: item.variant_id || item.item_variant,
            price: item.price,
            quantity: item.quantity,
          })),
          num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
          email: order.email,
          phone: order.phone,
          first_name: order.first_name,
          last_name: order.last_name,
          city: order.city,
          state: order.region,
          postal_code: order.postal_code,
          country: order.country,
          event_id: eventId,
          event_source_url: eventSourceUrl,
          customer_id: order.customer_id,
        }),
      }).catch((err) => console.warn("Conversions API request failed:", err))
    }
  }, [order, trackEvent, identifyUser])

  return null
}
