"use client"

import { useEffect } from "react"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { useCartAbandonmentTracking } from "@lib/analytics/abandonment-tracker"
import { HttpTypes } from "@medusajs/types"

type CartPageTrackerProps = {
  cart: HttpTypes.StoreCart | null
}

/**
 * Tracks cart page views and abandonment
 */
export default function CartPageTracker({ cart }: CartPageTrackerProps) {
  const { trackCartViewed } = useAnalytics()
  
  // Track cart abandonment
  useCartAbandonmentTracking(cart)

  // Track cart viewed when page loads (Google, Meta, PostHog)
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0)
      const items = cart.items.map((item) => ({
        product_id: item.product_id || '',
        variant_id: item.variant_id || '',
        quantity: item.quantity,
        price: item.unit_price ? Number(item.unit_price) : 0,
      }))

      trackCartViewed({
        cart_value: cart.total ? Number(cart.total) : 0,
        item_count: totalItems,
        currency: cart.currency_code || 'EUR',
        cart_id: cart.id,
        items,
      })
    }
  }, [cart, trackCartViewed])

  return null
}
