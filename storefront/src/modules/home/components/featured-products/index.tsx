import { HttpTypes } from "@medusajs/types"
import ProductRail from "@modules/home/components/featured-products/product-rail"
import { getTranslations, getTranslation } from "@lib/i18n/server"

interface FeaturedProductsProps {
  collections: HttpTypes.StoreCollection[]
  region: HttpTypes.StoreRegion
  title?: string
  titleKey?: string
  countryCode?: string
  /** When true, only the first product image gets priority (LCP candidate) */
  isFirstRail?: boolean
}

export default async function FeaturedProducts({
  collections,
  region,
  title,
  titleKey,
  countryCode = "us",
  isFirstRail = false,
}: FeaturedProductsProps) {
  if (!collections || collections.length === 0) {
    return null
  }

  // Get translated title if titleKey is provided
  let displayTitle = title
  if (titleKey && !title) {
    const translations = await getTranslations(countryCode)
    displayTitle = getTranslation(translations, titleKey)
  }

  // If title/titleKey is provided, show only first collection with that title
  if (displayTitle && collections.length > 0) {
    return (
      <ProductRail
        collection={collections[0]}
        region={region}
        title={displayTitle}
        countryCode={countryCode}
        isFirstRail={isFirstRail}
      />
    )
  }

  // Otherwise show all collections (only first rail gets isFirstRail for LCP)
  return (
    <>
      {collections.map((collection, i) => (
        <ProductRail
          key={collection.id}
          collection={collection}
          region={region}
          countryCode={countryCode}
          isFirstRail={isFirstRail && i === 0}
        />
      ))}
    </>
  )
}
