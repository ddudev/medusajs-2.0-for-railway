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

  // Track cart viewed when page loads
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0)
      
      trackCartViewed({
        cart_value: cart.total ? Number(cart.total) : 0,
        item_count: totalItems,
        currency: cart.currency_code || 'EUR',
        cart_id: cart.id,
      })
    }
  }, [cart, trackCartViewed])

  return null
}
