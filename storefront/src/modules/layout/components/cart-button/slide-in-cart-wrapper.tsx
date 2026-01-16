'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useCartDrawer } from '@modules/cart/context/cart-context'
import { HttpTypes } from '@medusajs/types'

// Client Component wrapper for slide-in cart (ssr: false)
const SlideInCart = dynamic(
  () => import('@modules/cart/components/slide-in-cart'),
  {
    ssr: false,
  }
)

interface SlideInCartWrapperProps {
  cart: HttpTypes.StoreCart | null
}

export default function SlideInCartWrapper({ cart: initialCart }: SlideInCartWrapperProps) {
  const { isOpen } = useCartDrawer()
  const [cart, setCart] = useState(initialCart)
  const hasInitialized = useRef(false)

  // Only update cart when initialCart prop changes (from parent re-render)
  // Don't trigger router.refresh() as it causes infinite loops
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      setCart(initialCart)
      return
    }
    
    // Only update if cart actually changed (by comparing IDs or totals)
    if (initialCart?.id !== cart?.id || initialCart?.total !== cart?.total) {
      setCart(initialCart)
    }
  }, [initialCart?.id, initialCart?.total, cart?.id, cart?.total])

  return <SlideInCart cart={cart} />
}

