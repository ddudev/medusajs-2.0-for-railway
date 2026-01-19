'use client'

import { useQuery } from '@tanstack/react-query'
import { getFreeShippingEligibility } from '@lib/data/free-shipping'
import type { FreeShippingEligibility } from '@lib/data/free-shipping'
import { useCart } from './use-cart'

// Query keys for cache management
export const promotionKeys = {
  all: ['promotions'] as const,
  freeShipping: () => [...promotionKeys.all, 'free-shipping'] as const,
}

/**
 * Get free shipping eligibility - auto-updates when cart changes
 */
export function useFreeShipping() {
  const { data: cart } = useCart()

  return useQuery({
    queryKey: promotionKeys.freeShipping(),
    queryFn: getFreeShippingEligibility,
    enabled: !!cart, // Only fetch if cart exists
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  })
}

/**
 * Helper hook to check if user is eligible for free shipping
 */
export function useIsFreeShippingEligible() {
  const { data: eligibility } = useFreeShipping()
  return eligibility?.eligible || false
}

/**
 * Helper hook to get free shipping progress percentage
 */
export function useFreeShippingProgress() {
  const { data: eligibility } = useFreeShipping()

  if (!eligibility) {
    return {
      percentage: 0,
      amountRemaining: null,
      minimumTotal: null,
      eligible: false,
    }
  }

  return {
    percentage: eligibility.percentage,
    amountRemaining: eligibility.amountRemaining,
    minimumTotal: eligibility.minimumTotal,
    eligible: eligibility.eligible,
    currencyCode: eligibility.currencyCode,
  }
}
