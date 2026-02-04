"use server"

import { addToCart as addToCartLib } from "@lib/data/cart"

/**
 * Server action wrapper for adding product to cart
 * Can be called from Client Components
 */
export async function addToCartAction({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  const result = await addToCartLib({
    variantId,
    quantity,
    countryCode,
  })
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return { success: true }
}

