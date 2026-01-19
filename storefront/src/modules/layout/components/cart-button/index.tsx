// CartButton - Client Component that uses TanStack Query for cart data
// No longer needs cart prop - fetches from cache automatically

import CartButtonClient from "./cart-button-client"
import SlideInCartWrapper from "./slide-in-cart-wrapper"

// CartButton no longer needs props - uses query hooks internally
export default function CartButton() {
  return (
    <>
      <CartButtonClient />
      <SlideInCartWrapper />
    </>
  )
}
