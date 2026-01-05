"use client"

import { useEffect } from "react"
import { setLastViewedProduct } from "@lib/util/client-cookies"

type ProductViewTrackerProps = {
  productId: string
}

/**
 * Invisible client component that tracks product views
 * Sets the product ID in a cookie when the component mounts
 */
export default function ProductViewTracker({
  productId,
}: ProductViewTrackerProps) {
  useEffect(() => {
    if (productId) {
      setLastViewedProduct(productId)
    }
  }, [productId])

  // This component doesn't render anything
  return null
}
