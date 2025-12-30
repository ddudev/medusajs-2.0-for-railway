import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import SortDropdown, { SortOptions } from "@modules/store/components/sort-dropdown"
import ActiveFilters from "@modules/store/components/active-filters"
import ProductCount from "@modules/store/components/product-count"
import FilterButton from "@modules/store/components/filter-button"
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
      <div className="mb-4 flex flex-col gap-3">
        <ProductCount
          currentPage={page}
          pageSize={result.pageSize}
          totalCount={result.totalCount}
        />
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
      <RefinementList
        collections={collections}
        categories={categories}
        brands={brands}
        maxPrice={maxPrice}
      />
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl-semi mb-4 md:mb-0" data-testid="store-page-title">
            {getTranslation(translations, "common.allProducts")}
          </h1>
          <div className="flex items-center gap-4 md:hidden">
            <FilterButton />
            <SortDropdown />
          </div>
          <div className="hidden md:flex items-center justify-end">
            <SortDropdown />
          </div>
        </div>
        <Suspense 
          key={filterKey}
          fallback={
            <>
              <div className="mb-4">
                <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
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
    </StoreTemplateClient>
  )
}

export default StoreTemplate
