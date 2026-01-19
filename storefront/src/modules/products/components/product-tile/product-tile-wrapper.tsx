import { Suspense } from 'react'
import { HttpTypes } from '@medusajs/types'
import ProductTile, { ProductTileSkeleton } from './index'
import ProductTileClientWrapper from './product-tile-client-wrapper'

type ProductTileWrapperProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  priority?: boolean
  pricedProduct?: HttpTypes.StoreProduct
}

/**
 * Wrapper for ProductTile that works from Client Components
 * If pricedProduct is provided, uses synchronous ProductTileContent
 * Otherwise, uses async ProductTile with Suspense
 */
export default function ProductTileWrapper({
  product,
  region,
  countryCode,
  priority = false,
  pricedProduct,
}: ProductTileWrapperProps) {
  // If pricedProduct is provided, use client wrapper (prevents QueryClient SSR errors)
  if (pricedProduct) {
    return (
      <ProductTileClientWrapper
        product={product}
        pricedProduct={pricedProduct}
        countryCode={countryCode}
        priority={priority}
      />
    )
  }

  // Otherwise, use async ProductTile with Suspense (Server Component only)
  return (
    <Suspense fallback={<ProductTileSkeleton />}>
      <ProductTile
        product={product}
        region={region}
        countryCode={countryCode}
        priority={priority}
      />
    </Suspense>
  )
}

