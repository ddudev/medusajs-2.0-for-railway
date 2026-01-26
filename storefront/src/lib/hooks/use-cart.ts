'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  retrieveCart,
  addToCart as addToCartAPI,
  updateLineItem as updateLineItemAPI,
  deleteLineItem as deleteLineItemAPI,
} from '@lib/data/cart'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { HttpTypes } from '@medusajs/types'
import { useAnalytics } from '@lib/analytics/use-analytics'

// Query keys for cache management
export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'detail'] as const,
}

/**
 * Get cart data with automatic caching and background updates
 */
export function useCart() {
  return useQuery({
    queryKey: cartKeys.detail(),
    queryFn: retrieveCart,
    staleTime: 30 * 1000, // 30 seconds - data stays fresh
    retry: 1, // Retry once if fetch fails
  })
}

/**
 * Add to cart with optimistic updates and automatic rollback on error
 */
export function useAddToCart() {
  const queryClient = useQueryClient()
  const params = useParams()
  const countryCode = params?.countryCode as string
  const { trackProductAddedToCart } = useAnalytics()

  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      addToCartAPI({ variantId, quantity, countryCode }),

    // Optimistic update - runs immediately before server call
    onMutate: async ({ variantId, quantity }) => {
      // Cancel any outgoing cart queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: cartKeys.detail() })

      // Snapshot the previous cart state for rollback
      const previousCart = queryClient.getQueryData<HttpTypes.StoreCart>(cartKeys.detail())

      // Optimistically update cart in cache
      // Note: This is simplified - real implementation would need product details
      if (previousCart) {
        queryClient.setQueryData<HttpTypes.StoreCart>(cartKeys.detail(), (old) => {
          if (!old) return old

          // Create temporary line item (will be replaced with real data from server)
          const tempItem = {
            id: `temp-${Date.now()}`,
            variant_id: variantId,
            quantity,
            cart_id: old.id,
            title: 'Loading...',
            // ... other required fields
          } as any

          return {
            ...old,
            items: [...(old.items || []), tempItem],
          }
        })
      }

      // Return context for rollback
      return { previousCart }
    },

    // On error - rollback to previous state
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKeys.detail(), context.previousCart)
      }
      console.error('Failed to add to cart:', err)
    },

    // On success - track analytics
    onSuccess: (data, variables) => {
      // Note: Analytics tracking will be handled by analytics plugin
      // For now, track directly
      trackProductAddedToCart({
        product_id: variables.variantId,
        quantity: variables.quantity,
        // Additional properties would be extracted from product data
      })
    },

    // Always refetch after mutation completes (success or error)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail() })
    },
  })
}

/**
 * Update line item quantity with optimistic updates
 */
export function useUpdateLineItem() {
  const queryClient = useQueryClient()
  const { trackCartUpdated } = useAnalytics()

  return useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateLineItemAPI({ lineId, quantity }),

    onMutate: async ({ lineId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.detail() })

      const previousCart = queryClient.getQueryData<HttpTypes.StoreCart>(cartKeys.detail())

      // Optimistically update quantity
      queryClient.setQueryData<HttpTypes.StoreCart>(cartKeys.detail(), (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items?.map((item) =>
            item.id === lineId ? { ...item, quantity } : item
          ),
        }
      })

      return { previousCart }
    },

    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKeys.detail(), context.previousCart)
      }
      console.error('Failed to update line item:', err)
    },

    onSuccess: (data, variables) => {
      trackCartUpdated({
        line_item_id: variables.lineId,
        new_quantity: variables.quantity,
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail() })
    },
  })
}

/**
 * Remove line item with optimistic updates
 */
export function useRemoveLineItem() {
  const queryClient = useQueryClient()
  const { trackProductRemovedFromCart } = useAnalytics()

  return useMutation({
    mutationFn: (lineId: string) => deleteLineItemAPI(lineId),

    onMutate: async (lineId) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.detail() })

      const previousCart = queryClient.getQueryData<HttpTypes.StoreCart>(cartKeys.detail())

      // Find the item being removed for analytics
      const removedItem = previousCart?.items?.find((item) => item.id === lineId)

      // Optimistically remove item from cart
      queryClient.setQueryData<HttpTypes.StoreCart>(cartKeys.detail(), (old) => {
        if (!old) return old
        
        const updatedItems = old.items?.filter((item) => item.id !== lineId)
        
        // If cart becomes empty, clear shipping methods too
        const shouldClearShipping = !updatedItems || updatedItems.length === 0
        
        return {
          ...old,
          items: updatedItems,
          // Clear shipping methods if cart is empty
          shipping_methods: shouldClearShipping ? [] : old.shipping_methods,
          // Reset shipping total if cart is empty
          shipping_total: shouldClearShipping ? 0 : old.shipping_total,
        }
      })

      return { previousCart, removedItem }
    },

    onError: (err, lineId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKeys.detail(), context.previousCart)
      }
      console.error('Failed to remove line item:', err)
    },

    onSuccess: (data, lineId, context) => {
      if (context?.removedItem) {
        trackProductRemovedFromCart({
          product_id: context.removedItem.product_id || '',
          variant_id: context.removedItem.variant_id || '',
          quantity: context.removedItem.quantity,
        })
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail() })
    },
  })
}

/**
 * Helper hook to get cart item count
 */
export function useCartItemCount() {
  const { data: cart } = useCart()
  return cart?.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0
}

/**
 * Helper hook to check if cart is empty
 */
export function useIsCartEmpty() {
  const { data: cart } = useCart()
  return !cart?.items || cart.items.length === 0
}
