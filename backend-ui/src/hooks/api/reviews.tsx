import { FetchError } from "@medusajs/js-sdk"
import { HttpTypes, PaginatedResponse } from "@medusajs/types"
import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"

const REVIEWS_QUERY_KEY = "reviews" as const
export const reviewsQueryKeys = queryKeysFactory(REVIEWS_QUERY_KEY)

export type Review = {
  id: string
  title: string
  content: string
  rating: number
  first_name: string
  last_name: string
  status: "pending" | "approved" | "rejected"
  product_id: string
  customer_id?: string
  created_at: string
  updated_at: string
}

export const useReviews = (
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      { reviews: Review[]; count: number },
      FetchError,
      { reviews: Review[]; count: number },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => {
      try {
        const response = await sdk.client.fetch<{
          reviews: Review[]
          count: number
          limit: number
          offset: number
        }>("/admin/reviews", {
          method: "GET",
          query,
        })
        return {
          reviews: response.reviews || [],
          count: response.count || 0,
        }
      } catch (error) {
        console.error("Error fetching reviews:", error)
        throw error
      }
    },
    queryKey: reviewsQueryKeys.list(query),
    ...options,
  })

  return { 
    reviews: data?.reviews || [],
    count: data?.count || 0,
    ...rest 
  }
}

export const useUpdateReviewsStatus = (
  options?: UseMutationOptions<
    any,
    FetchError,
    { ids: string[]; status: "pending" | "approved" | "rejected" }
  >
) => {
  return useMutation({
    mutationFn: async (payload) => {
      return await sdk.client.fetch("/admin/reviews/status", {
        method: "POST",
        body: payload,
      })
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteReview = (
  options?: UseMutationOptions<any, FetchError, string>
) => {
  return useMutation({
    mutationFn: async (id: string) => {
      return await sdk.client.fetch(`/admin/reviews/${id}`, {
        method: "DELETE",
      })
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
