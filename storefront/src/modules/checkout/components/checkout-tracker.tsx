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
        cart_value: cart.total ? Number(cart.total) / 100 : 0,
        item_count: totalItems,
        currency: cart.currency_code || 'EUR',
        cart_id: cart.id,
      })

      hasTrackedRef.current = true
    }
  }, [cart, trackCheckoutStarted])

  return null
}
