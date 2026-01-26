"use client"

import { useEffect, useRef } from 'react'
import { useAnalytics } from './use-analytics'
import type { CartEventProperties, CheckoutEventProperties } from './types'

/**
 * Track cart abandonment
 * Tracks when user leaves page with items in cart
 */
export function useCartAbandonmentTracking(cart: { items?: any[]; total?: number; currency_code?: string } | null) {
  const { trackEvent } = useAnalytics()
  const cartAbandonedRef = useRef(false)
  const cartValueRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!cart || !cart.items || cart.items.length === 0) {
      return
    }

    // Update cart value
    cartValueRef.current = cart.total ? Number(cart.total) : 0

    // Reset abandonment flag when cart changes
    cartAbandonedRef.current = false

    // Track cart viewed
    trackEvent('cart_viewed', {
      cart_value: cartValueRef.current,
      item_count: cart.items.length,
      currency: cart.currency_code || 'EUR',
    })

    // Track abandonment on page unload
    const handleBeforeUnload = () => {
      if (!cartAbandonedRef.current && cart.items && cart.items.length > 0) {
        const timeInCart = Date.now() - startTimeRef.current

        trackEvent('cart_abandoned', {
          cart_value: cartValueRef.current,
          item_count: cart.items.length,
          currency: cart.currency_code || 'EUR',
          time_in_cart: Math.round(timeInCart / 1000), // seconds
          items: cart.items.map((item: any) => ({
            product_id: item.product_id || item.variant?.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            price: item.unit_price ? Number(item.unit_price) : 0,
          })),
        })

        cartAbandonedRef.current = true
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [cart, trackEvent])
}

/**
 * Track checkout abandonment
 * Tracks when user leaves checkout page without completing
 */
export function useCheckoutAbandonmentTracking(
  checkoutStarted: boolean,
  checkoutCompleted: boolean,
  cart: { total?: number; items?: any[]; currency_code?: string; id?: string } | null
) {
  const { trackEvent } = useAnalytics()
  const checkoutAbandonedRef = useRef(false)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (checkoutStarted && !startTimeRef.current) {
      startTimeRef.current = Date.now()
    }
  }, [checkoutStarted])

  useEffect(() => {
    if (!checkoutStarted || checkoutCompleted) {
      return
    }

    if (!cart) {
      return
    }

    // Track abandonment on page unload
    const handleBeforeUnload = () => {
      if (!checkoutAbandonedRef.current && startTimeRef.current) {
        const timeInCheckout = Date.now() - startTimeRef.current

        trackEvent('checkout_abandoned', {
          cart_value: cart.total ? Number(cart.total) : 0,
          item_count: cart.items?.length || 0,
          currency: cart.currency_code || 'EUR',
          cart_id: cart.id,
          time_in_checkout: Math.round(timeInCheckout / 1000), // seconds
        })

        checkoutAbandonedRef.current = true
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [checkoutStarted, checkoutCompleted, cart, trackEvent])
}
