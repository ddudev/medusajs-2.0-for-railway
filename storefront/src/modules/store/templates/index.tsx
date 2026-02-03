import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import SortDropdown, { SortOptions } from "@modules/store/components/sort-dropdown"
import ActiveFilters from "@modules/store/components/active-filters"
import ProductCount from "@modules/store/components/product-count"
import MobileFilterDrawer from "@modules/store/components/refinement-list/mobile-filter-drawer"
import { getCollectionsList } from "@lib/data/collections"
import { getCategoriesList } from "@lib/data/categories"
import { getActiveBrands } from "@lib/data/brands"
import { getMaxProductPrice } from "@lib/data/products"
import { getTranslations, getTranslation } from "@lib/i18n/server"

import PaginatedProducts from "./paginated-products"
import StoreTemplateClient from "./store-template-client"

async function PaginatedProductsWrapper({
  sortBy,
  page,
  countryCode,
  collectionIds,
  categoryIds,
  brandIds,
  priceRange,
  collections,
  categories,
  brands,
}: {
  sortBy: SortOptions
  page: number
  countryCode: string
  collectionIds?: string[]
  categoryIds?: string[]
  brandIds?: string[]
  priceRange?: string
  collections: any[]
  categories: any[]
  brands: any[]
}) {
  const result = await PaginatedProducts({
    sortBy,
    page,
    countryCode,
    collectionIds,
    categoryIds,
    brandIds,
    priceRange,
  })

  return (
    <>
      {/* Results Count with Pagination and Sort - matches design */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center items-start gap-2 md:justify-between">
        <ProductCount
          currentPage={page}
          pageSize={result.pageSize}
          totalCount={result.totalCount}
          totalPages={result.totalPages || 1}
        />
        {/* Sort Dropdown - Hidden on mobile (sort is in sticky bar), visible on desktop */}
        <div className="hidden md:block">
          <SortDropdown />
        </div>
      </div>

      {/* Active Filters */}
      <div className="mb-4">
        <ActiveFilters
          collections={collections}
          categories={categories}
          brands={brands}
          selectedCollectionIds={collectionIds}
          selectedCategoryIds={categoryIds}
          selectedBrandIds={brandIds}
          selectedPriceRange={priceRange}
        />
      </div>

      {/* Product Grid */}
      {result.products}
    </>
  )
}

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  collectionIds,
  categoryIds,
  brandIds,
  priceRange,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  collectionIds?: string[]
  categoryIds?: string[]
  brandIds?: string[]
  priceRange?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  // Fetch filter data, max price, and translations server-side (optimized with caching)
  const [{ collections }, { product_categories: categories }, brands, maxPrice, translations] = await Promise.all([
    getCollectionsList(0, 100),
    getCategoriesList(0, 100),
    getActiveBrands(),
    getMaxProductPrice({
      countryCode,
      collectionIds,
      categoryIds,
      brandIds,
    }),
    getTranslations(countryCode),
  ])

  // Create key for Suspense based on filter arrays
  const filterKey = `${JSON.stringify(collectionIds || [])}-${JSON.stringify(categoryIds || [])}-${JSON.stringify(brandIds || [])}-${priceRange}-${sort}-${pageNumber}`

  return (
    <div className="content-container py-8 md:py-12">
      <StoreTemplateClient
        collections={collections}
        categories={categories}
        brands={brands}
        maxPrice={maxPrice}
        filterKey={filterKey}
        sort={sort}
        pageNumber={pageNumber}
        countryCode={countryCode}
        collectionIds={collectionIds}
        categoryIds={categoryIds}
        brandIds={brandIds}
        priceRange={priceRange}
        translations={translations}
      >
        {/* Mobile: Filters in drawer, Products full width */}
        {/* Desktop: Filters sidebar + Products grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Hidden on mobile/tablet, shown on desktop */}
          <aside className="hidden lg:block lg:w-80 flex-shrink-0">
            <RefinementList
              collections={collections}
              categories={categories}
              brands={brands}
              maxPrice={maxPrice}
            />
          </aside>

          {/* Products Section */}
          <div className="flex-1 min-w-0">
            {/* Page Title */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-6" data-testid="store-page-title">
                {getTranslation(translations, "common.allProducts")}
              </h1>
            </div>

            <Suspense
              key={filterKey}
              fallback={
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
                    <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
                  </div>
                  <SkeletonProductGrid />
                </>
              }
            >
              <PaginatedProductsWrapper
                sortBy={sort}
                page={pageNumber}
                countryCode={countryCode}
                collectionIds={collectionIds}
                categoryIds={categoryIds}
                brandIds={brandIds}
                priceRange={priceRange}
                collections={collections}
                categories={categories}
                brands={brands}
              />
            </Suspense>
          </div>
        </div>
      </StoreTemplateClient>
    </div>
  )
}

export default StoreTemplate
