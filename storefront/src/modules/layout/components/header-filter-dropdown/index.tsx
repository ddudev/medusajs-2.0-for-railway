'use client'

import { HttpTypes } from "@medusajs/types"
import { Brand } from "@lib/data/brands"
import MobileFilterBar from "@modules/layout/components/mobile-filter-bar"

type HeaderFilterDropdownProps = {
  collections: HttpTypes.StoreCollection[]
  categories: HttpTypes.StoreProductCategory[]
  brands?: Brand[]
  maxPrice?: number
}

/**
 * Mobile filter bar that appears in the header on mobile PLP pages (store/category pages)
 * Contains sticky bar with Sort and Filter buttons
 * Only visible on mobile and only on product listing pages
 */
const HeaderFilterDropdown = ({
  collections,
  categories,
  brands,
  maxPrice,
}: HeaderFilterDropdownProps) => {
  return (
    <MobileFilterBar
      collections={collections}
      categories={categories}
      brands={brands}
      maxPrice={maxPrice}
    />
  )
}

export default HeaderFilterDropdown
