"use client"

import { HttpTypes } from "@medusajs/types"
import React, { createContext, useContext, useState, useCallback } from "react"

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

  return (
    <CheckoutCartContext.Provider value={{ cart, updateCartData, refreshCart }}>
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
