import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { cache } from "react"
import { getRegion } from "./regions"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { sortProducts } from "@lib/util/sort-products"
import { getProductPrice } from "@lib/util/get-product-price"
import { StoreProductReview } from "@types/global"

// Product prices are region-specific and should NOT be cached - always dynamic
// DO NOT add "use cache" - prices must be fresh per request/region
export async function getProductsById({
  ids,
  regionId,
}: {
  ids: string[]
  regionId: string
}) {
  // No caching - prices are region-specific and must be fresh
  return sdk.store.product
    .list(
      {
        id: ids,
        region_id: regionId,
        fields: "*variants.calculated_price,+variants.inventory_quantity",
      },
      { next: { tags: ["products"] } }
    )
    .then(({ products }) => products)
}

// Product prices are region-specific and should NOT be cached - always dynamic
// DO NOT add "use cache" - prices must be fresh per request/region
export async function getProductByHandle(
  handle: string,
  regionId: string
) {
  // No caching - prices are region-specific and must be fresh
  return sdk.store.product
    .list(
      {
        handle,
        region_id: regionId,
        fields: "*variants.calculated_price,+variants.inventory_quantity,+metadata",
      },
      {
        next: {
          tags: ["products", `product-${handle}`],
          // No revalidate - always fetch fresh prices
        } as { tags: string[] },
      }
    )
    .then(({ products }) => products[0])
}

// Product prices are region-specific and should NOT be cached - always dynamic
// DO NOT add "use cache" - prices must be fresh per request/region
export async function getProductsList({
  pageParam = 1,
  queryParams,
  countryCode,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams & { brand_id?: string[] }
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> {
  const limit = queryParams?.limit || 12
  const validPageParam = Math.max(pageParam, 1);
  const offset = (validPageParam - 1) * limit
  const region = await getRegion(countryCode)

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  // If brand_id is provided, use custom endpoint for server-side brand filtering
  if (queryParams?.brand_id && queryParams.brand_id.length > 0) {
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:9000"

    // Build query params for custom endpoint
    const searchParams = new URLSearchParams()
    searchParams.set("limit", limit.toString())
    searchParams.set("offset", offset.toString())
    searchParams.set("region_id", region.id)
    searchParams.set("fields", "*variants.calculated_price,+variants.inventory_quantity")

    queryParams.brand_id.forEach((id) => {
      searchParams.append("brand_id", id)
    })

    if (queryParams.collection_id) {
      const collectionIds = Array.isArray(queryParams.collection_id)
        ? queryParams.collection_id
        : [queryParams.collection_id]
      collectionIds.forEach((id) => {
        searchParams.append("collection_id", id)
      })
    }

    if (queryParams.category_id) {
      const categoryIds = Array.isArray(queryParams.category_id)
        ? queryParams.category_id
        : [queryParams.category_id]
      categoryIds.forEach((id) => {
        searchParams.append("category_id", id)
      })
    }

    if (queryParams.id) {
      const ids = Array.isArray(queryParams.id)
        ? queryParams.id
        : [queryParams.id]
      ids.forEach((id) => {
        searchParams.append("id", id)
      })
    }

    if (queryParams.order) {
      searchParams.set("order", queryParams.order)
    }

    const headers: HeadersInit = {}
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    if (publishableKey) {
      headers["x-publishable-api-key"] = publishableKey
    }

    // No caching - product prices are region-specific and must be fresh
    const response = await fetch(`${BACKEND_URL}/store/products/list?${searchParams.toString()}`, {
      headers,
      next: {
        tags: ["products"],
        // No revalidate - always fetch fresh prices
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`)
    }

    const data = await response.json()
    const products = data.products || []
    const count = data.count || 0

    const nextPage = count > offset + limit ? pageParam + 1 : null

    return {
      response: {
        products: products as HttpTypes.StoreProduct[],
        count,
      },
      nextPage: nextPage,
      queryParams,
    }
  }

  // Standard MedusaJS SDK call (no brand filtering)
  // No caching - product prices are region-specific and must be fresh
  const { products, count } = await sdk.store.product.list(
    {
      ...queryParams,
      region_id: region.id,
      limit,
      offset,
      fields: "*variants.calculated_price,+variants.inventory_quantity",
    },
    {
      next: {
        tags: ["products"],
        // No revalidate - always fetch fresh prices
      },
    }
  )

  const nextPage = count > offset + limit ? pageParam + 1 : null

  return {
    response: {
      products,
      count,
    },
    nextPage,
    queryParams,
  }
}

// Product prices are region-specific and should NOT be cached - always dynamic
// DO NOT add "use cache" - prices must be fresh per request/region
export async function getProductsListWithSort({
  pageParam = 1,
  queryParams,
  countryCode,
  sortBy,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams & { brand_id?: string[] }
  countryCode: string
  sortBy?: SortOptions
}) {
  // No caching - prices are region-specific and must be fresh
  const result = await getProductsList({
    pageParam,
    queryParams,
    countryCode,
  })

  if (sortBy && result.response.products.length > 0) {
    result.response.products = sortProducts(result.response.products, sortBy)
  }

  return result
}

/**
 * Calculate the maximum price from products
 * Fetches products matching current filters (excluding price filter) and calculates max price
 * Product prices are region-specific and should NOT be cached - always dynamic
 */
export async function getMaxProductPrice({
  countryCode,
  collectionIds,
  categoryIds,
  brandIds,
}: {
  countryCode: string
  collectionIds?: string[]
  categoryIds?: string[]
  brandIds?: string[]
}): Promise<number> {
  const region = await getRegion(countryCode)
  if (!region) {
    return 500 // Default fallback
  }

  try {
    // Fetch a larger sample of products to get accurate max price
    // We'll fetch up to 100 products to calculate max price
    const queryParams: HttpTypes.FindParams & HttpTypes.StoreProductParams & { brand_id?: string[] } = {
      limit: 100, // Fetch more products to get accurate max
      collection_id: collectionIds,
      category_id: categoryIds,
      brand_id: brandIds,
    }

    const result = await getProductsList({
      pageParam: 1,
      queryParams,
      countryCode,
    })

    const products = result.response.products || []
    
    if (products.length === 0) {
      return 500 // Default fallback if no products
    }

    // Calculate max price from all products
    let maxPrice = 0
    for (const product of products) {
      const { cheapestPrice } = getProductPrice({ product })
      if (cheapestPrice && cheapestPrice.calculated_price_number > maxPrice) {
        maxPrice = cheapestPrice.calculated_price_number
      }
    }

    // Round up to nearest 10 for better UX
    const roundedMax = Math.ceil(maxPrice / 10) * 10
    
    // Ensure minimum of 100 and add some padding (20% or minimum 50)
    const paddedMax = Math.max(100, roundedMax + Math.max(50, Math.ceil(roundedMax * 0.2)))
    
    return paddedMax
  } catch (error) {
    console.error("Error calculating max product price:", error)
    return 500 // Default fallback on error
  }
}

/**
 * Get product reviews with pagination (Server Component)
 * Reviews can be cached (unlike prices) - use cache tags for revalidation
 */
export const getProductReviews = cache(async ({
  productId,
  limit = 10,
  offset = 0,
}: {
  productId: string
  limit?: number
  offset?: number 
}) => {
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:9000"

  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  const requestHeaders: HeadersInit = {}
  if (publishableKey) {
    requestHeaders["x-publishable-api-key"] = publishableKey
  }

  const searchParams = new URLSearchParams()
  searchParams.set("limit", limit.toString())
  searchParams.set("offset", offset.toString())
  searchParams.set("order", "-created_at")

  return sdk.client.fetch<{
    reviews: StoreProductReview[]
    average_rating: number
    limit: number
    offset: number
    count: number
  }>(`/store/products/${productId}/reviews?${searchParams.toString()}`, {
    headers: requestHeaders,
    next: {
      tags: ["reviews", `product-reviews-${productId}`],
      revalidate: 3600, // Revalidate every hour
    },
    cache: "force-cache",
  })
})

/**
 * Client-side function to fetch product reviews
 * Use this in Client Components (useEffect, event handlers, etc.)
 */
export async function fetchProductReviewsClient({
  productId,
  limit = 10,
  offset = 0,
}: {
  productId: string
  limit?: number
  offset?: number 
}): Promise<{
  reviews: StoreProductReview[]
  average_rating: number
  limit: number
  offset: number
  count: number
}> {
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:9000"

  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (publishableKey) {
    requestHeaders["x-publishable-api-key"] = publishableKey
  }

  const searchParams = new URLSearchParams()
  searchParams.set("limit", limit.toString())
  searchParams.set("offset", offset.toString())
  searchParams.set("order", "-created_at")

  const response = await fetch(
    `${BACKEND_URL}/store/products/${productId}/reviews?${searchParams.toString()}`,
    {
      headers: requestHeaders,
      cache: "no-store", // Client-side fetch should not be cached
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch reviews: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Submit a new product review (Client-side function)
 * Requires authentication - customer must be logged in
 * Use this in Client Components - calls our Next.js API route which handles authentication server-side
 * 
 * This is the most reliable method because:
 * 1. The API route runs server-side and can access httpOnly cookies
 * 2. It uses the same authentication pattern as other authenticated routes
 * 3. No need to worry about CORS or cookie handling
 */
export async function addProductReview(input: {
  title?: string
  content: string
  first_name: string
  last_name: string
  rating: number,
  product_id: string
}): Promise<any> {
  try {
    // Call our Next.js API route which wraps the backend API call with authentication
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      credentials: "include", // Include cookies for session
      cache: "no-store",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.error || error.message || `Failed to submit review: ${response.statusText}`)
    }

    return response.json()
  } catch (error: any) {
    // Re-throw with a more user-friendly message if it's an authentication error
    if (error.message?.includes("Unauthorized") || error.message?.includes("401")) {
      throw new Error("Моля, влезте в профила си, за да добавите ревю.")
    }
    throw error
  }
}
