'use client'

import dynamic from 'next/dynamic'
import { HttpTypes } from '@medusajs/types'
import { ProductTileSkeleton } from './index'

// Dynamically import with no SSR to prevent QueryClient errors
const ProductTileContent = dynamic(() => import('./product-tile-content'), {
  ssr: false,
  loading: () => <ProductTileSkeleton />
})

type ProductTileWrapperProps = {
  product: HttpTypes.StoreProduct
  pricedProduct: HttpTypes.StoreProduct
  countryCode: string
  priority?: boolean
  assumeAvailableWhenZeroInventory?: boolean
}

/**
 * Client Component wrapper for ProductTileContent
 * This allows us to use dynamic imports with ssr: false
 */
export default function ProductTileWrapper({
  product,
  pricedProduct,
  countryCode,
  priority = false,
  assumeAvailableWhenZeroInventory = false,
}: ProductTileWrapperProps) {
  return (
    <ProductTileContent
      product={product}
      pricedProduct={pricedProduct}
      countryCode={countryCode}
      priority={priority}
      assumeAvailableWhenZeroInventory={assumeAvailableWhenZeroInventory}
    />
  )
}
