"use client"

import { useEffect, useRef } from "react"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { useCheckoutAbandonmentTracking } from "@lib/analytics/abandonment-tracker"
import { HttpTypes } from "@medusajs/types"

type CheckoutTrackerProps = {
  cart: HttpTypes.StoreCart | null
}

/**
 * Tracks checkout page views and abandonment
 */
export default function CheckoutTracker({ cart }: CheckoutTrackerProps) {
  const { trackCheckoutStarted } = useAnalytics()
  const hasTrackedRef = useRef(false)

  // Track checkout abandonment
  useCheckoutAbandonmentTracking(
    true, // checkout started
    false, // checkout completed (will be updated when order is placed)
    cart
  )

  // Track checkout started when page loads
  useEffect(() => {
    if (cart && !hasTrackedRef.current) {
      const totalItems = cart.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
      
      trackCheckoutStarted({
        cart_value: cart.total ? Number(cart.total) : 0,
        item_count: totalItems,
        currency: cart.currency_code || 'EUR',
        cart_id: cart.id,
        items: cart.items?.map((item) => ({
          product_id: item.product_id || '',
          variant_id: item.variant_id || '',
          quantity: item.quantity,
          price: item.unit_price ? Number(item.unit_price) : 0,
          product_name: item.product_title || '',
        })),
      })

      hasTrackedRef.current = true
    }
  }, [cart, trackCheckoutStarted])

  return null
}
