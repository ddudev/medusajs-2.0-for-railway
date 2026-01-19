import { Suspense } from "react"

import TopHeader from "@modules/layout/components/top-promo-bar"
import MainHeader from "@modules/layout/components/main-header"
import HeaderFilterDropdown from "@modules/layout/components/header-filter-dropdown"
import { getCategoriesList } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import { getActiveBrands } from "@lib/data/brands"
import { getMaxProductPrice } from "@lib/data/products"

// Nav component - No longer needs to fetch cart (handled by TanStack Query client-side)
export default async function Nav({ countryCode }: { countryCode: string }) {
  const { product_categories } = await getCategoriesList(0, 100)
  
  // Fetch filter data for header filter dropdown (only used on PLP pages)
  const [{ collections }, brands, maxPrice] = await Promise.all([
    getCollectionsList(0, 100),
    getActiveBrands(),
    getMaxProductPrice({ countryCode }),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      {/* Top Promotional Bar - Black bar with logo, search, login, cart */}
      <TopHeader categories={product_categories} />

      {/* Main Header - Black bar with orange All Products button and category links */}
      <MainHeader countryCode={countryCode} categories={product_categories} />
      
      {/* Mobile Filter Dropdown - Attached to header, only shows on PLP pages */}
      <HeaderFilterDropdown
        collections={collections}
        categories={product_categories}
        brands={brands}
        maxPrice={maxPrice}
      />
    </div>
  )
}
