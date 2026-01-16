// This file is kept for backwards compatibility
// Cart fetching is now done in Nav component and passed to TopPromoBar
// This allows proper Server Component data fetching without "Server Functions cannot be called during initial render" errors

import CartButtonClient from "./cart-button-client"
import SlideInCartWrapper from "./slide-in-cart-wrapper"
import { HttpTypes } from "@medusajs/types"

type CartButtonProps = {
  cart: HttpTypes.StoreCart | null
}

// CartButton is now a simple wrapper that receives cart as a prop
// This allows it to be used in both Server and Client Components
export default function CartButton({ cart }: CartButtonProps) {
  return (
    <>
      <CartButtonClient cart={cart} />
      <SlideInCartWrapper cart={cart} />
    </>
  )
}
