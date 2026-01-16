import { Suspense } from "react"
import { getRegion } from "@lib/data/regions"
import { getProductsById } from "@lib/data/products"
import { cache } from "react"

// Cache getRegion to prevent duplicate calls
const cachedGetRegion = cache(getRegion)
import { getLastViewedProductIds } from "@lib/data/cookies"
import { HttpTypes } from "@medusajs/types"
import ProductTile, { ProductTileSkeleton } from "../product-tile"
import { getTranslations, getTranslation } from "@lib/i18n/server"

type LastViewedProductsProps = {
  currentProductId: string
  countryCode: string
}

export default async function LastViewedProducts({
  currentProductId,
  countryCode,
}: LastViewedProductsProps) {
  const region = await cachedGetRegion(countryCode)

  if (!region) {
    return null
  }

  // Get last viewed product IDs from cookie
  const productIds = await getLastViewedProductIds()

  // Filter out current product and ensure we have valid IDs
  const filteredProductIds = productIds
    .filter((id) => id && id !== currentProductId)
    .slice(0, 6) // Ensure max 6 products

  if (!filteredProductIds.length) {
    return null
  }

  // Fetch products with pricing
  const products = await getProductsById({
    ids: filteredProductIds,
    regionId: region.id,
  })

  // Filter out any products that couldn't be fetched or are invalid
  const validProducts = products.filter(
    (product) => product && product.id && product.id !== currentProductId
  )

  if (!validProducts.length) {
    return null
  }

  // Get translations
  const translations = await getTranslations(countryCode)

  return (
    <div className="product-page-constraint">
      <div className="flex flex-col items-center text-center mb-16">
        <span className="text-base-regular text-gray-600 mb-6">
          {getTranslation(translations, "product.lastViewed.title")}
        </span>
        <p className="text-2xl-regular text-ui-fg-base max-w-lg">
          {getTranslation(translations, "product.lastViewed.heading")}
        </p>
      </div>

      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
        {validProducts.map((product, index) => {
          return (
            <li key={product.id}>
              <Suspense fallback={<ProductTileSkeleton />}>
                <ProductTile
                  product={product}
                  region={region}
                  countryCode={countryCode}
                  priority={index < 4} // Prioritize first 4 images for LCP
                  pricedProduct={product}
                />
              </Suspense>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
