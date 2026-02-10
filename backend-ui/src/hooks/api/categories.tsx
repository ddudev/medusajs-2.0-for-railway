import { FetchError } from "@medusajs/js-sdk"
import { HttpTypes } from "@medusajs/types"
import {
  InfiniteData,
  QueryKey,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import { backendUrl, sdk } from "../../lib/client"
import { queryClient } from "../../lib/query-client"

export interface CategoryExtensionPayload {
  original_name?: string
  external_id?: string | null
  description?: string | null
  seo_title?: string | null
  seo_meta_description?: string | null
}
import { queryKeysFactory } from "../../lib/query-key-factory"
import { productsQueryKeys } from "./products"
import { useInfiniteList } from "../use-infinite-list"

const CATEGORIES_QUERY_KEY = "categories" as const
export const categoriesQueryKeys = queryKeysFactory(CATEGORIES_QUERY_KEY)

export const useProductCategory = (
  id: string,
  query?: HttpTypes.AdminProductCategoryParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminProductCategoryResponse,
      FetchError,
      HttpTypes.AdminProductCategoryResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: categoriesQueryKeys.detail(id, query),
    queryFn: () => sdk.admin.productCategory.retrieve(id, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useProductCategories = (
  query?: HttpTypes.AdminProductCategoryListParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminProductCategoryListResponse,
      FetchError,
      HttpTypes.AdminProductCategoryListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: categoriesQueryKeys.list(query),
    queryFn: () => sdk.admin.productCategory.list(query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useInfiniteCategories = (
  query?: Omit<HttpTypes.AdminProductCategoryListParams, "offset" | "limit"> & {
    limit?: number
  },
  options?: Omit<
    UseInfiniteQueryOptions<
      HttpTypes.AdminProductCategoryListResponse,
      FetchError,
      InfiniteData<HttpTypes.AdminProductCategoryListResponse, number>,
      HttpTypes.AdminProductCategoryListResponse,
      QueryKey,
      number
    >,
    "queryFn" | "queryKey" | "initialPageParam" | "getNextPageParam"
  >
) => {
  return useInfiniteList<
    HttpTypes.AdminProductCategoryListResponse,
    HttpTypes.AdminProductCategoryListParams,
    FetchError,
    QueryKey
  >({
    queryKey: (params) => categoriesQueryKeys.list(params),
    queryFn: (params) => sdk.admin.productCategory.list(params),
    query,
    options,
  })
}

export const useCreateProductCategory = (
  options?: UseMutationOptions<
    HttpTypes.AdminProductCategoryResponse,
    FetchError,
    HttpTypes.AdminCreateProductCategory
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.productCategory.create(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.lists() })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateProductCategory = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminProductCategoryResponse,
    FetchError,
    HttpTypes.AdminUpdateProductCategory
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.productCategory.update(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: categoriesQueryKeys.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Update only the category extension (custom endpoint; avoids strict body validation on main update).
 */
export const useUpdateProductCategoryExtension = (
  id: string,
  options?: UseMutationOptions<{ success: boolean }, Error, CategoryExtensionPayload>
) => {
  return useMutation({
    mutationFn: async (payload: CategoryExtensionPayload) => {
      const url = `${backendUrl.replace(/\/$/, "")}/admin/product-categories/${id}/extension`
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err?.message ?? "Failed to update category extension")
      }
      return res.json()
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.detail(id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteProductCategory = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminProductCategoryDeleteResponse,
    FetchError,
    void
  >
) => {
  return useMutation({
    mutationFn: () => sdk.admin.productCategory.delete(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: categoriesQueryKeys.detail(id),
      })
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.lists() })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateProductCategoryProducts = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminProductCategoryResponse,
    FetchError,
    HttpTypes.AdminUpdateProductCategoryProducts
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.productCategory.updateProducts(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: categoriesQueryKeys.details(),
      })
      /**
       * Invalidate products list query to ensure that the products collections are updated.
       */
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.lists(),
      })

      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.details(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
