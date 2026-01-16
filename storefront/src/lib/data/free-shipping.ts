"use server"

import { sdk } from "@lib/config"
import { getCartId } from "./cookies"

export interface FreeShippingEligibility {
  eligible: boolean
  minimumTotal: number | null
  currentTotal: number
  amountRemaining: number | null
  percentage: number
  promotion: {
    code: string
    is_automatic: boolean
  } | null
  currencyCode: string
}

/**
 * Get free shipping eligibility information for the current cart
 * Returns information needed to display progress bar
 */
export async function getFreeShippingEligibility(): Promise<FreeShippingEligibility | null> {
  const cartId = await getCartId()

  if (!cartId) {
    return null
  }

  try {
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:9000"

    const headers: HeadersInit = {}
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    if (publishableKey) {
      headers["x-publishable-api-key"] = publishableKey
    }

    const response = await fetch(
      `${BACKEND_URL}/store/free-shipping-eligibility?cart_id=${cartId}`,
      {
        headers,
        next: {
          tags: ["cart", "promotions"],
          // Don't cache - this is user-specific and dynamic
        },
      }
    )

    if (!response.ok) {
      // If endpoint doesn't exist or returns error, return null (graceful degradation)
      return null
    }

    const data = await response.json()
    console.log("data", data)
    return data as FreeShippingEligibility
  } catch (error) {
    // Graceful degradation - if we can't fetch eligibility, just return null
    // The UI should handle this gracefully
    return null
  }
}



