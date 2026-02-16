import { getProductsList, getProductsById } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/sort-dropdown"
import ProductTile from "@modules/products/components/product-tile"

const PRODUCT_LIMIT = 12

/**
 * Parse price range string into price_min and optional price_max.
 * Format: "min-max" (e.g. "25-100") or "min-+" (e.g. "200-+") for no max.
 */
function parsePriceRange(priceRange?: string): { price_min?: number; price_max?: number } | null {
  if (!priceRange) return null
  const parts = priceRange.split("-")
  if (parts.length !== 2) return null
  const minPrice = parseInt(parts[0], 10)
  if (Number.isNaN(minPrice)) return null
  if (parts[1] === "+") return { price_min: minPrice }
  const maxPrice = parseInt(parts[1], 10)
  if (Number.isNaN(maxPrice)) return null
  return { price_min: minPrice, price_max: maxPrice }
}

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  brand_id?: string[]
  id?: string[]
  order?: string
  price_min?: number
  price_max?: number
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionIds,
  categoryIds,
  brandIds,
  priceRange,
  productsIds,
  countryCode,
}: {
  sortBy?: SortOptions
  page: number
  collectionIds?: string[]
  categoryIds?: string[]
  brandIds?: string[]
  priceRange?: string
  productsIds?: string[]
  countryCode: string
}) {
  const region = await getRegion(countryCode)

  if (!region) {
    return {
      products: <></>,
      totalCount: 0,
      totalPages: 0,
      pageSize: PRODUCT_LIMIT,
    }
  }

  // All filtering (category, collection, brand) and sorting (except price) are done by the backend.
  // One request per page – backend returns the filtered, paginated list and total count.
  const queryParams: PaginatedProductsParams = {
    limit: PRODUCT_LIMIT,
  }

  if (collectionIds && collectionIds.length > 0) {
    queryParams["collection_id"] = collectionIds
  }

  if (categoryIds && categoryIds.length > 0) {
    queryParams["category_id"] = categoryIds
  }

  if (brandIds && brandIds.length > 0) {
    queryParams["brand_id"] = brandIds
  }

  if (productsIds && productsIds.length > 0) {
    queryParams["id"] = productsIds
  }

  if (sortBy) {
    queryParams["order"] = sortBy
  }

  const priceParsed = parsePriceRange(priceRange)
  if (priceParsed?.price_min != null) queryParams.price_min = priceParsed.price_min
  if (priceParsed?.price_max != null) queryParams.price_max = priceParsed.price_max

  // One request per page – backend handles category, collection, brand, price filter/sort, and pagination
  const result = await getProductsList({
    pageParam: page,
    queryParams,
    countryCode,
  })
  const products = result.response.products
  const count = result.response.count

  // Batch fetch priced products for display (backend list returns minimal product data)
  const productIds = products.map((p) => p.id!).filter(Boolean)
  const pricedProducts = await getProductsById({
    ids: productIds,
    regionId: region.id,
  })

  const pricedProductsMap = new Map(
    pricedProducts.map((p) => [p.id, p])
  )

  const paginatedProducts = products
    .map((p) => pricedProductsMap.get(p.id!))
    .filter(Boolean) as any[]

  const totalCount = count
  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  const productsList = (
    <>
      <ul
        className="grid grid-cols-1 w-full sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-6 md:gap-y-10"
        data-testid="products-list"
      >
        {paginatedProducts.map((pricedProduct, index) => {
          if (!pricedProduct) {
            return null
          }
          return (
            <li key={pricedProduct.id}>
              <ProductTile
                product={pricedProduct}
                region={region}
                countryCode={countryCode}
                priority={index < 4} // Prioritize first 4 images for LCP
                pricedProduct={pricedProduct}
              />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )

  return {
    products: productsList,
    totalCount,
    totalPages,
    pageSize: PRODUCT_LIMIT,
  }
}
