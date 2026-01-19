"use client"

import { HttpTypes } from "@medusajs/types"
import React, { createContext, useContext, useState, useCallback, useMemo } from "react"

type CheckoutCartContextType = {
  cart: HttpTypes.StoreCart | null
  updateCartData: (updates: Partial<HttpTypes.StoreCart>) => void
  refreshCart: () => void
}

const CheckoutCartContext = createContext<CheckoutCartContextType | null>(null)

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

  return (
    <CheckoutCartContext.Provider value={contextValue}>
      {children}
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
