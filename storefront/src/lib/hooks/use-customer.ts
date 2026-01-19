'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomer, updateCustomer as updateCustomerAPI } from '@lib/data/customer'
import type { HttpTypes } from '@medusajs/types'

// Query keys for cache management
export const customerKeys = {
  all: ['customer'] as const,
  detail: () => [...customerKeys.all, 'detail'] as const,
}

/**
 * Get customer data with automatic caching
 */
export function useCustomer() {
  return useQuery({
    queryKey: customerKeys.detail(),
    queryFn: getCustomer,
    staleTime: 5 * 60 * 1000, // 5 minutes - customer data changes infrequently
    retry: 1,
  })
}

/**
 * Update customer information
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: HttpTypes.StoreUpdateCustomer) => updateCustomerAPI(data),

    // Optimistic update
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.detail() })

      const previousCustomer = queryClient.getQueryData<HttpTypes.StoreCustomer>(
        customerKeys.detail()
      )

      // Optimistically update customer
      if (previousCustomer) {
        queryClient.setQueryData<HttpTypes.StoreCustomer>(customerKeys.detail(), {
          ...previousCustomer,
          ...newData,
        })
      }

      return { previousCustomer }
    },

    onError: (err, variables, context) => {
      if (context?.previousCustomer) {
        queryClient.setQueryData(customerKeys.detail(), context.previousCustomer)
      }
      console.error('Failed to update customer:', err)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail() })
    },
  })
}

/**
 * Helper hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { data: customer, isLoading } = useCustomer()
  return {
    isAuthenticated: !!customer,
    isLoading,
  }
}
