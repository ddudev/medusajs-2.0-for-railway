'use client'

import dynamic from 'next/dynamic'
import { useCart } from '@lib/hooks/use-cart'

// Client Component wrapper for slide-in cart (ssr: false)
const SlideInCart = dynamic(
  () => import('@modules/cart/components/slide-in-cart'),
  {
    ssr: false,
    loading: () => null, // Don't show loading state for cart drawer
  }
)

export default function SlideInCartWrapper() {
  // Use TanStack Query to fetch cart data - automatically cached and updated
  const { data: cart } = useCart()

  return <SlideInCart cart={cart} />
}

