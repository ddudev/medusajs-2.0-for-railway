import { Suspense } from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { HttpTypes } from '@medusajs/types'
import { getProductsById } from '@lib/data/products'
import ProductTileWrapper from './product-tile-wrapper'

type ProductTileProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  priority?: boolean // For above-the-fold images
  pricedProduct?: HttpTypes.StoreProduct // Optional pre-fetched priced product
}

/**
 * Optimized Product Tile Component
 * - Server Component for SSR (can be used in Client Components with pre-fetched data)
 * - Lazy image loading with Next.js Image
 * - Loading skeleton state
 * - Smooth animations
 * - Stock status checking
 * - Price display with sale indicators
 */
export default async function ProductTile({
  product,
  region,
  countryCode,
  priority = false,
  pricedProduct: preFetchedPricedProduct,
}: ProductTileProps) {
  // Use pre-fetched priced product if provided, otherwise fetch it
  let pricedProduct = preFetchedPricedProduct

  if (!pricedProduct) {
    const [fetchedPricedProduct] = await getProductsById({
      ids: [product.id!],
      regionId: region.id,
    })
    pricedProduct = fetchedPricedProduct
  }

  if (!pricedProduct) {
    return null
  }

  return (
    <ProductTileWrapper
      product={product}
      pricedProduct={pricedProduct}
      countryCode={countryCode}
      priority={priority}
    />
  )
}


/**
 * Loading Skeleton for Product Tile
 * Used in Suspense boundaries
 * Matches the exact structure of ProductTileClient
 */
export function ProductTileSkeleton() {
  return (
    <Card className="h-full flex flex-col bg-background-elevated hover:shadow-lg transition-all duration-300">
      {/* Image Skeleton */}
      <div className="relative h-48 bg-gray-100 overflow-hidden aspect-[4/3]">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      </div>

      <CardContent className="flex-grow flex flex-col">
        <Skeleton className="mb-2 h-8 w-3/4" />
        <Skeleton className="mb-1 h-5 w-full" />
        <Skeleton className="mb-2 h-5 w-4/5" />
        <Skeleton className="mb-2 h-7 w-2/5" />
        <div className="flex gap-2 mt-auto flex-wrap">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  )
}

/**
 * Product Tile with Suspense Wrapper
 * Use this when you want automatic loading states
 */
export function ProductTileWithSuspense(props: ProductTileProps) {
  return (
    <Suspense fallback={<ProductTileSkeleton />}>
      <ProductTile {...props} />
    </Suspense>
  )
}

