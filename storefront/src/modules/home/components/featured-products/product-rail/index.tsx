import { HttpTypes } from "@medusajs/types"
import { getTranslations, getTranslation } from "@lib/i18n/server"
import { getProductsById } from "@lib/data/products"

import InteractiveLink from "@modules/common/components/interactive-link"
import ProductTile from "@modules/products/components/product-tile"

import { ArrowUpRightMini } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface ProductRailProps {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
  title?: string
  showViewAll?: boolean
  countryCode?: string
  /** When true, only the first image gets priority (LCP); otherwise first 4 get priority */
  isFirstRail?: boolean
}

export default async function ProductRail({
  collection,
  region,
  title,
  showViewAll = true,
  countryCode = "us",
  isFirstRail = false,
}: ProductRailProps) {
  const { products } = collection

  if (!products || products.length === 0) {
    return null
  }

  // Get translations
  const translations = await getTranslations(countryCode)
  const displayTitle = title || collection.title
  const viewAllText = getTranslation(translations, "homepage.viewAll")

  // Batch fetch priced products for all products (performance optimization)
  const productIds = products.map((p) => p.id!).filter(Boolean)
  const pricedProducts = await getProductsById({
    ids: productIds,
    regionId: region.id,
  })

  // Create a map for quick lookup
  const pricedProductsMap = new Map(
    pricedProducts.map((p) => [p.id, p])
  )

  return (
    <div className="content-container py-8 md:py-12">
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-text-primary">
          {displayTitle}
        </h2>
        {showViewAll && (
          <LocalizedClientLink
            href={`/collections/${collection.handle}`}
            className=" hidden md:inline-flex items-center gap-x-2 rounded-md border border-border-base bg-zinc-800 px-4 py-2 text-sm md:text-base font-medium text-white hover:bg-primary-hover transition-colors"
          >
            <span>{viewAllText}</span>
            <ArrowUpRightMini className="transition-transform duration-150 group-hover:rotate-45" />
          </LocalizedClientLink>
        )}
      </div>
      {/* Horizontal Scrollable Product Carousel */}
      <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
        <ul className="flex gap-4 md:gap-6 min-w-max py-2">
          {products.map((product, index) => {
            const pricedProduct = pricedProductsMap.get(product.id!)
            // Only render if we have priced product data
            if (!pricedProduct) {
              return null
            }
            return (
              <li key={product.id} className="flex-shrink-0 w-[260px] md:w-[280px]">
                <ProductTile 
                  product={product} 
                  region={region}
                  countryCode={countryCode}
                  priority={isFirstRail ? index === 0 : index < 4} // LCP: single image on first rail; else first 4
                  pricedProduct={pricedProduct}
                />
              </li>
            )
          })}
        </ul>
      </div>
      {showViewAll && (
          <LocalizedClientLink
            href={`/collections/${collection.handle}`}
            className="inline-flex md:hidden items-center mt-5 gap-x-2 rounded-md border border-border-base bg-zinc-800 px-4 py-2 text-sm md:text-base font-medium text-white hover:bg-primary-hover transition-colors"
          >
            <span>{viewAllText}</span>
            <ArrowUpRightMini className="transition-transform duration-150 group-hover:rotate-45" />
          </LocalizedClientLink>
        )}
    </div>
  )
}
