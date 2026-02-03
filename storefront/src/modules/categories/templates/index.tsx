import { notFound } from "next/navigation"
import { Suspense } from "react"

import InteractiveLink from "@modules/common/components/interactive-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import SortDropdown, { SortOptions } from "@modules/store/components/sort-dropdown"
import ActiveFilters from "@modules/store/components/active-filters"
import ProductCount from "@modules/store/components/product-count"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import StoreTemplateClient from "@modules/store/templates/store-template-client"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { getActiveBrands } from "@lib/data/brands"
import { getMaxProductPrice } from "@lib/data/products"

// Wrapper to handle PaginatedProducts result object - matches store page design
async function PaginatedProductsWrapper({
  sortBy,
  page,
  categoryIds,
  countryCode,
  collections,
  categories,
  brands,
}: {
  sortBy: SortOptions
  page: number
  categoryIds: string[]
  countryCode: string
  collections: HttpTypes.StoreCollection[]
  categories: HttpTypes.StoreProductCategory[]
  brands: any[]
}) {
  const result = await PaginatedProducts({
    sortBy,
    page,
    countryCode,
    categoryIds,
  })

  return (
    <>
      {/* Results Count with Pagination and Sort - matches design */}
      <div className="mb-6 flex items-center justify-between">
        <ProductCount
          currentPage={page}
          pageSize={result.pageSize}
          totalCount={result.totalCount}
          totalPages={result.totalPages}
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
          selectedCollectionIds={[]}
          selectedCategoryIds={categoryIds}
          selectedBrandIds={[]}
          selectedPriceRange={undefined}
        />
      </div>
      
      {/* Product Grid */}
      {result.products}
    </>
  )
}

export default async function CategoryTemplate({
  categories,
  collections,
  sortBy,
  page,
  countryCode,
}: {
  categories: HttpTypes.StoreProductCategory[]
  collections: HttpTypes.StoreCollection[]
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const category = categories[categories.length - 1]
  const parents = categories.slice(0, categories.length - 1)

  if (!category || !countryCode) notFound()

  // Fetch brands and maxPrice for filters (matches store page).
  // getMaxProductPrice can reject during prerender when Next.js aborts fetch; use 500 fallback.
  const DEFAULT_MAX_PRICE = 500
  const [brands, maxPrice] = await Promise.all([
    getActiveBrands(),
    getMaxProductPrice({
      countryCode,
      categoryIds: [category.id],
    }).catch(() => DEFAULT_MAX_PRICE),
  ])

  // Create key for Suspense based on filters (matches store page pattern)
  const filterKey = `${JSON.stringify([category.id])}-${sort}-${pageNumber}`

  return (
    <StoreTemplateClient
      collections={collections || []}
      categories={categories}
      brands={brands}
      maxPrice={maxPrice}
      filterKey={filterKey}
      sort={sort}
      pageNumber={pageNumber}
      countryCode={countryCode}
      collectionIds={[]}
      categoryIds={[category.id]}
      brandIds={[]}
      priceRange={undefined}
      translations={{}}
    >
      <div className="content-container py-6">
        {/* Mobile: Filters in drawer, Products full width */}
        {/* Desktop: Filters sidebar + Products grid */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar - Hidden on mobile, shown on desktop */}
          <aside className="hidden md:block md:w-64 lg:w-80 flex-shrink-0">
            <RefinementList 
              collections={collections || []} 
              categories={categories}
              brands={brands}
              maxPrice={maxPrice}
            />
          </aside>
          
          {/* Products Section */}
          <div className="flex-1 min-w-0">
            {/* Page Title */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4" data-testid="category-page-title">
                {category.name}
              </h1>
            </div>
        
            {/* Products with Results Count, Pagination, and Sort - matches design */}
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
                categoryIds={[category.id]}
                countryCode={countryCode}
                collections={collections || []}
                categories={categories}
                brands={brands}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </StoreTemplateClient>
  )
}
