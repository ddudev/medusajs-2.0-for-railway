"use client"

import { HttpTypes } from "@medusajs/types"
import React, { createContext, useContext, useState, useCallback, useMemo } from "react"

type CheckoutCartContextType = {
  cart: HttpTypes.StoreCart | null
  updateCartData: (updates: Partial<HttpTypes.StoreCart>) => void
  refreshCart: () => void
}

/** Slice for shipping section – only updates when shipping-related cart fields change */
export type CheckoutShippingSliceType = {
  cartId: string | undefined
  shippingMethods: HttpTypes.StoreCartShippingMethod[] | undefined
  regionId: string | undefined
  items: HttpTypes.StoreCartLineItem[] | undefined
  currencyCode: string | undefined
  total: number | null | undefined
  metadata: Record<string, unknown> | undefined
  updateCartData: (updates: Partial<HttpTypes.StoreCart>) => void
}

/** Slice for payment section – only updates when payment-related cart fields change */
export type CheckoutPaymentSliceType = {
  cartId: string | undefined
  paymentCollection: HttpTypes.StoreCartPaymentCollection | undefined
  hasShipping: boolean
  items: HttpTypes.StoreCartLineItem[] | undefined
  currencyCode: string | undefined
  total: number | null | undefined
  giftCards: HttpTypes.StoreCartGiftCard[] | undefined
  updateCartData: (updates: Partial<HttpTypes.StoreCart>) => void
}

/** Slice for contact section – only updates when contact/address fields change */
export type CheckoutContactSliceType = {
  cartId: string | undefined
  email: string | null | undefined
  shippingAddress: HttpTypes.StoreCartAddress | undefined
  updateCartData: (updates: Partial<HttpTypes.StoreCart>) => void
}

/** Slice for payment wrapper – only re-render when payment session / currency changes */
export type CheckoutPaymentSessionSliceType = {
  paymentSession: HttpTypes.StoreCartPaymentSession | undefined
  currencyCode: string | undefined
}

type CheckoutActionsType = {
  updateCartData: (updates: Partial<HttpTypes.StoreCart>) => void
  refreshCart: () => void
}

const CheckoutCartContext = createContext<CheckoutCartContextType | null>(null)
const CheckoutActionsContext = createContext<CheckoutActionsType | null>(null)
const CheckoutShippingSliceContext = createContext<CheckoutShippingSliceType | null>(null)
const CheckoutPaymentSliceContext = createContext<CheckoutPaymentSliceType | null>(null)
const CheckoutContactSliceContext = createContext<CheckoutContactSliceType | null>(null)
const CheckoutPaymentSessionSliceContext = createContext<CheckoutPaymentSessionSliceType | null>(null)

export function CheckoutCartProvider({
  children,
  initialCart,
}: {
  children: React.ReactNode
  initialCart: HttpTypes.StoreCart | null
}) {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(initialCart)

  const updateCartData = useCallback((updates: Partial<HttpTypes.StoreCart>) => {
    setCart((prevCart) => {
      if (!prevCart) return prevCart
      
      // Check if updates actually change anything
      // This prevents unnecessary re-renders when data hasn't changed
      let hasChanges = false
      
      for (const key in updates) {
        if (key === 'shipping_address' || key === 'billing_address') {
          // Skip address checks for now (handled separately)
          continue
        }
        
        if (key === 'payment_collection') {
          // Special handling for payment_collection
          const prevCollection = prevCart.payment_collection
          const newCollection = updates.payment_collection
          
          // Check if payment collection actually changed
          if (prevCollection?.id !== newCollection?.id ||
              prevCollection?.payment_sessions?.length !== newCollection?.payment_sessions?.length) {
            hasChanges = true
            break
          }
          continue
        }
        
        // Simple equality check for primitives and reference check for objects
        if (prevCart[key as keyof HttpTypes.StoreCart] !== updates[key as keyof Partial<HttpTypes.StoreCart>]) {
          hasChanges = true
          break
        }
      }
      
      // If nothing changed, return the same reference to prevent re-renders
      if (!hasChanges && !updates.shipping_address && !updates.billing_address) {
        return prevCart
      }
      
      return {
        ...prevCart,
        ...updates,
        // Handle nested shipping_address updates
        shipping_address: updates.shipping_address 
          ? { ...prevCart.shipping_address, ...updates.shipping_address }
          : prevCart.shipping_address,
        // Handle nested billing_address updates  
        billing_address: updates.billing_address
          ? { ...prevCart.billing_address, ...updates.billing_address }
          : prevCart.billing_address,
      } as HttpTypes.StoreCart
    })
  }, [])

  const refreshCart = useCallback(() => {
    // This can be called to trigger a server refresh if needed
    // For now, it's a placeholder for future implementation
    window.location.reload()
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ cart, updateCartData, refreshCart }),
    [cart, updateCartData, refreshCart]
  )

  const actionsValue = useMemo<CheckoutActionsType>(
    () => ({ updateCartData, refreshCart }),
    [updateCartData, refreshCart]
  )

  // Slice contexts – only update when the relevant cart fields change (by reference).
  // This decouples re-renders: e.g. selecting shipping only updates shipping slice, not payment.
  const shippingSlice = useMemo<CheckoutShippingSliceType | null>(() => {
    if (!cart) return null
    return {
      cartId: cart.id,
      shippingMethods: cart.shipping_methods,
      regionId: cart.region_id,
      items: cart.items,
      currencyCode: cart.currency_code,
      total: cart.total,
      metadata: cart.metadata as Record<string, unknown> | undefined,
      updateCartData,
    }
  }, [
    cart?.id,
    cart?.shipping_methods,
    cart?.region_id,
    cart?.items,
    cart?.currency_code,
    cart?.total,
    cart?.metadata,
    updateCartData,
  ])

  const paymentSlice = useMemo<CheckoutPaymentSliceType | null>(() => {
    if (!cart) return null
    return {
      cartId: cart.id,
      paymentCollection: cart.payment_collection,
      hasShipping: (cart.shipping_methods?.length ?? 0) > 0,
      items: cart.items,
      currencyCode: cart.currency_code,
      total: cart.total,
      giftCards: cart.gift_cards,
      updateCartData,
    }
  }, [
    cart?.id,
    cart?.payment_collection,
    cart?.shipping_methods?.length,
    cart?.items,
    cart?.currency_code,
    cart?.total,
    cart?.gift_cards,
    updateCartData,
  ])

  const contactSlice = useMemo<CheckoutContactSliceType | null>(() => {
    if (!cart) return null
    return {
      cartId: cart.id,
      email: cart.email,
      shippingAddress: cart.shipping_address,
      updateCartData,
    }
  }, [cart?.id, cart?.email, cart?.shipping_address, updateCartData])

  const paymentSessionSlice = useMemo<CheckoutPaymentSessionSliceType | null>(() => {
    if (!cart) return null
    const paymentSession = cart.payment_collection?.payment_sessions?.find(
      (s) => s.status === "pending"
    )
    return {
      paymentSession,
      currencyCode: cart.currency_code,
    }
  }, [cart?.payment_collection?.payment_sessions, cart?.currency_code])

  return (
    <CheckoutCartContext.Provider value={contextValue}>
      <CheckoutActionsContext.Provider value={actionsValue}>
      <CheckoutShippingSliceContext.Provider value={shippingSlice}>
        <CheckoutPaymentSliceContext.Provider value={paymentSlice}>
          <CheckoutContactSliceContext.Provider value={contactSlice}>
            <CheckoutPaymentSessionSliceContext.Provider value={paymentSessionSlice}>
              {children}
            </CheckoutPaymentSessionSliceContext.Provider>
          </CheckoutContactSliceContext.Provider>
        </CheckoutPaymentSliceContext.Provider>
      </CheckoutShippingSliceContext.Provider>
      </CheckoutActionsContext.Provider>
    </CheckoutCartContext.Provider>
  )
}

export function useCheckoutCart() {
  const context = useContext(CheckoutCartContext)
  if (!context) {
    throw new Error("useCheckoutCart must be used within CheckoutCartProvider")
  }
  return context
}

/** Only re-renders when shipping-related cart fields change. */
export function useCheckoutShippingSlice() {
  return useContext(CheckoutShippingSliceContext)
}

/** Only re-renders when payment-related cart fields change. */
export function useCheckoutPaymentSlice() {
  return useContext(CheckoutPaymentSliceContext)
}

/** Only re-renders when contact/address cart fields change. */
export function useCheckoutContactSlice() {
  return useContext(CheckoutContactSliceContext)
}

/** Only re-renders when payment session or currency changes (for Wrapper). */
export function useCheckoutPaymentSessionSlice() {
  return useContext(CheckoutPaymentSessionSliceContext)
}

/** Stable actions – use with slice hooks to avoid subscribing to full cart. */
export function useCheckoutActions() {
  const context = useContext(CheckoutActionsContext)
  if (!context) {
    throw new Error("useCheckoutActions must be used within CheckoutCartProvider")
  }
  return context
}
