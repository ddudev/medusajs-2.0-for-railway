'use client'

import { usePathname } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { Brand } from "@lib/data/brands"
import MobileFilterDropdown from "@modules/store/components/mobile-filter-dropdown"

type HeaderFilterDropdownProps = {
  collections: HttpTypes.StoreCollection[]
  categories: HttpTypes.StoreProductCategory[]
  brands?: Brand[]
  maxPrice?: number
}

/**
 * Filter dropdown button that appears in the header on mobile PLP pages (store/category pages)
 * Only visible on mobile and only on product listing pages
 * Only the filter button is shown here - sorting stays in the content area
 */
const HeaderFilterDropdown = ({
  collections,
  categories,
  brands,
  maxPrice,
}: HeaderFilterDropdownProps) => {
  const pathname = usePathname()
  
  // Only show on store or category pages (PLP pages)
  const isPLPPage = pathname?.includes('/store') || pathname?.includes('/categories')
  
  if (!isPLPPage) {
    return null
  }

  return (
    <div className="md:hidden w-full bg-white border-t border-gray-200">
      <div className="content-container">
        <div className="px-3">
          <MobileFilterDropdown
            collections={collections}
            categories={categories}
            brands={brands}
            maxPrice={maxPrice}
          />
        </div>
      </div>
    </div>
  )
}

export default HeaderFilterDropdown
