'use client'

import { useState, useEffect } from 'react'
import { HttpTypes } from '@medusajs/types'
import ProductTileContent from './product-tile-content'
import { ProductTileSkeleton } from './index'

type ProductTileClientWrapperProps = {
  product: HttpTypes.StoreProduct
  pricedProduct: HttpTypes.StoreProduct
  countryCode: string
  priority?: boolean
}

/**
 * Client-only wrapper that ensures ProductTileContent only renders after hydration
 * This prevents QueryClient context errors during SSR
 */
export default function ProductTileClientWrapper({
  product,
  pricedProduct,
  countryCode,
  priority = false,
}: ProductTileClientWrapperProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Show skeleton during SSR and initial client render
  if (!isMounted) {
    return <ProductTileSkeleton />
  }

  // Only render the actual component after client-side hydration
  return (
    <ProductTileContent
      product={product}
      pricedProduct={pricedProduct}
      countryCode={countryCode}
      priority={priority}
    />
  )
}
