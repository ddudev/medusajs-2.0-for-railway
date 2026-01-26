'use client'

// CartButton - Client Component that uses TanStack Query for cart data
// No longer needs cart prop - fetches from cache automatically

import { useIsClient } from '@lib/hooks/use-is-client'
import { lazy, Suspense } from 'react'

// Lazy load cart components - only on client side
const CartButtonClient = lazy(() => import("./cart-button-client"))
const SlideInCartWrapper = lazy(() => import("./slide-in-cart-wrapper"))

// Loading placeholder
const CartButtonPlaceholder = () => (
  <button
    className="border-2 border-primary rounded-xl p-2 md:px-4 md:py-3 transition-colors flex items-center gap-4 bg-transparent"
    aria-label="Cart"
    disabled
  >
    <div className="relative flex-shrink-0">
      <svg
        className="w-8 h-8 md:w-8 md:h-8 text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    </div>
  </button>
)

// CartButton no longer needs props - uses query hooks internally
export default function CartButton() {
  const isClient = useIsClient()

  // Don't render anything until we're on the client
  if (!isClient) {
    return <CartButtonPlaceholder />
  }

  return (
    <>
      <Suspense fallback={<CartButtonPlaceholder />}>
        <CartButtonClient />
      </Suspense>
      <Suspense fallback={null}>
        <SlideInCartWrapper />
      </Suspense>
    </>
  )
}
