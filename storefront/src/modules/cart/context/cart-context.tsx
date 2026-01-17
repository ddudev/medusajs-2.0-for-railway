"use client"

import { createContext, useContext, useState, useMemo, useCallback } from "react"
import type { ReactNode } from "react"

interface CartContextType {
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Add display name for better HMR support
if (typeof CartContext !== 'undefined') {
  CartContext.displayName = "CartContext"
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  // Use useCallback to ensure stable function references for HMR
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), [])

  // Memoize context value to prevent unnecessary re-renders and HMR issues
  const contextValue = useMemo(
    () => ({ isOpen, openCart, closeCart, toggleCart }),
    [isOpen, openCart, closeCart, toggleCart]
  )

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

// Add display name for better HMR support
CartProvider.displayName = "CartProvider"

export function useCartDrawer() {
  const context = useContext(CartContext)
  if (context === undefined) {
    // Return a no-op implementation if outside CartProvider
    // This allows components to be used in different contexts
    console.warn('useCartDrawer is being used outside of CartProvider, returning no-op implementation')
    return {
      isOpen: false,
      openCart: () => console.warn('openCart called outside CartProvider'),
      closeCart: () => console.warn('closeCart called outside CartProvider'),
      toggleCart: () => console.warn('toggleCart called outside CartProvider'),
    }
  }
  return context
}

