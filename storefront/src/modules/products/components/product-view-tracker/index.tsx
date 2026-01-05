"use client"

import { useEffect } from "react"
import { setLastViewedProduct } from "@lib/util/client-cookies"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { HttpTypes } from "@medusajs/types"

type ProductViewTrackerProps = {
  productId: string
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}

/**
 * Invisible client component that tracks product views
 * Sets the product ID in a cookie and tracks with PostHog
 */
export default function ProductViewTracker({
  productId,
  product,
  region,
}: ProductViewTrackerProps) {
  const { trackProductViewed } = useAnalytics()

  useEffect(() => {
    if (productId) {
      setLastViewedProduct(productId)
    }
  }, [productId])

  useEffect(() => {
    if (product && productId) {
      // Get product price
      const variant = product.variants?.[0]
      const price = variant?.calculated_price?.calculated_amount
        ? Number(variant.calculated_price.calculated_amount) / 100
        : undefined
      const currency = variant?.calculated_price?.currency_code || region.currency_code || 'EUR'

      // Track product view in PostHog
      trackProductViewed({
        product_id: productId,
        product_name: product.title,
        product_price: price,
        product_category: product.categories?.[0]?.name,
        currency: currency,
        variant_id: variant?.id,
        variant_name: variant?.title,
      })
    }
  }, [product, productId, region, trackProductViewed])

  // This component doesn't render anything
  return null
}
