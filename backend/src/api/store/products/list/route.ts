import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules, QueryContext } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../modules/brand"

const MAX_PRODUCTS_FOR_PRICE_FILTER = 2000

/**
 * Returns the set of product IDs that have at least one variant with a calculated price
 * for the given region (used to exclude products without prices from storefront lists).
 */
async function getProductIdsWithPriceForRegion(
  scope: { resolve: (key: string) => unknown },
  regionId: string,
  productIds: string[]
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set()
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: {
      entity: string
      fields: string[]
      filters: Record<string, unknown>
      context?: Record<string, unknown>
    }) => Promise<{ data: any[] }>
  }
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["currency_code"],
    filters: { id: regionId },
  })
  const currencyCode = regions?.[0]?.currency_code
  if (!currencyCode) return new Set()

  const { data: productsWithPrices } = await query.graph({
    entity: "product",
    fields: ["id", "variants.calculated_price.calculated_amount"],
    filters: { id: productIds },
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: regionId,
          currency_code: currencyCode,
        }),
      },
    },
  })

  const idsWithPrice = new Set<string>()
  for (const p of productsWithPrices || []) {
    const amounts = (p.variants || [])
      .map((v: any) => v?.calculated_price?.calculated_amount)
      .filter((n: unknown) => typeof n === "number" && (n as number) > 0)
    if (amounts.length > 0) idsWithPrice.add(p.id)
  }
  return idsWithPrice
}

/**
 * GET /store/products/list
 * Get products with server-side filtering including brand filtering
 * Supports: brand_id, collection_id, category_id, limit, offset, order, region_id, id, fields, price_min, price_max
 * Returns: { products: StoreProduct[], count: number }
 * 
 * When price_min, price_max, or order=price_asc|price_desc are used with region_id, products are
 * filtered/sorted by calculated price (min variant price) and paginated server-side.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const {
      brand_id,
      collection_id,
      category_id,
      limit,
      offset,
      order,
      region_id,
      id,
      fields,
      price_min: priceMinParam,
      price_max: priceMaxParam,
    } = req.query

    // Normalize brand_id to array
    const brandIds = Array.isArray(brand_id)
      ? brand_id.filter(Boolean)
      : brand_id
      ? [brand_id]
      : []

    // If brand filtering is active, get product IDs for those brands using raw SQL
    let brandFilteredProductIds: string[] = []
    if (brandIds.length > 0) {
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error("DATABASE_URL not found in environment")
      }

      const { Pool } = await import("pg")
      const pool = new Pool({ connectionString: databaseUrl })
      const linkTableName = "product_product_brand_brand"

      try {
        const productIdsSet = new Set<string>()

        for (const brandId of brandIds) {
          try {
            // Query the link table directly using raw SQL
            const result = await pool.query(
              `SELECT product_id FROM ${linkTableName} WHERE brand_id = $1`,
              [brandId]
            )

            if (result.rows && Array.isArray(result.rows)) {
              result.rows.forEach((row: any) => {
                if (row.product_id) {
                  productIdsSet.add(row.product_id)
                }
              })
            }
          } catch (error) {
            // Log error but continue with other brands
            console.error(`Error querying links for brand ${brandId}:`, error)
          }
        }

        brandFilteredProductIds = Array.from(productIdsSet)

        // If no products found for brands, return empty result
        if (brandFilteredProductIds.length === 0) {
          await pool.end()
          res.json({ products: [], count: 0 })
          return
        }

        await pool.end()
      } catch (error) {
        console.error("Error querying brand links:", error)
        // Try to close pool if it exists
        try {
          await pool.end()
        } catch {}
        throw error
      }
    }

    // Build query params for MedusaJS store product API
    const queryParams: any = {}

    // Combine brand-filtered IDs with explicitly provided product IDs
    let finalProductIds: string[] = []
    if (brandFilteredProductIds.length > 0) {
      // Normalize existing id param
      const existingIds: string[] = Array.isArray(id)
        ? id.map((id) => String(id)).filter(Boolean)
        : id
        ? [String(id)]
        : []

      if (existingIds.length > 0) {
        // Intersection: only products that match both brand filter and explicit IDs
        finalProductIds = existingIds.filter((id) =>
          brandFilteredProductIds.includes(id)
        )
      } else {
        // Use brand-filtered IDs
        finalProductIds = brandFilteredProductIds
      }
    } else {
      // No brand filter, use existing id param if provided
      if (id) {
        finalProductIds = Array.isArray(id)
          ? id.map((id) => String(id)).filter(Boolean) as string[]
          : [String(id)]
      }
    }

    if (finalProductIds.length > 0) {
      queryParams.id = finalProductIds
    }

    // Add other filters
    if (collection_id) {
      queryParams.collection_id = Array.isArray(collection_id)
        ? collection_id.map((id) => String(id))
        : [String(collection_id)]
    }
    if (category_id) {
      queryParams.category_id = Array.isArray(category_id)
        ? category_id.map((id) => String(id))
        : [String(category_id)]
    }
    if (region_id) {
      queryParams.region_id = region_id
    }
    if (limit) {
      queryParams.limit = limit
    }
    if (offset) {
      queryParams.offset = offset
    }
    if (order) {
      queryParams.order = order
    }
    if (fields) {
      queryParams.fields = fields
    }

    // Use the product module service to query products
    // Note: Products returned may not have calculated prices
    // The storefront will fetch priced products separately using getProductsById
    const productService = req.scope.resolve(Modules.PRODUCT)
    
    // Build filters for product service
    const productFilters: any = {}
    if (finalProductIds.length > 0) {
      productFilters.id = finalProductIds
    }
    if (collection_id) {
      const collectionIds = Array.isArray(collection_id)
        ? collection_id.filter(Boolean)
        : [collection_id]
      productFilters.collection_id = collectionIds
    }
    // Product entity has many-to-many "categories", not category_id. Use categories.id filter.
    if (category_id) {
      const categoryIds = Array.isArray(category_id)
        ? category_id.filter(Boolean)
        : [category_id]
      productFilters.categories = { id: categoryIds }
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 12
    const offsetNum = offset ? parseInt(offset as string, 10) : 0

    const priceMin =
      priceMinParam != null && priceMinParam !== ""
        ? parseFloat(priceMinParam as string)
        : null
    const priceMax =
      priceMaxParam != null && priceMaxParam !== ""
        ? parseFloat(priceMaxParam as string)
        : null
    const isPriceOrder = order === "price_asc" || order === "price_desc"
    const validPriceMin = priceMin == null || !Number.isNaN(priceMin)
    const validPriceMax = priceMax == null || !Number.isNaN(priceMax)
    const usePricePath =
      !!region_id &&
      (priceMin != null || priceMax != null || isPriceOrder) &&
      validPriceMin &&
      validPriceMax

    const queryOptions: any = {
      take: limitNum,
      skip: offsetNum,
    }

    if (order && !usePricePath) {
      queryOptions.order = order
    }

    // Query products using product service
    // Note: Products returned here may not have calculated prices
    // The storefront will fetch priced products separately using getProductsById
    
    let products: any[] = []
    let count = 0

    try {
      // Price filter/sort path: get product IDs, fetch calculated prices via Query, filter/sort, paginate
      if (usePricePath) {
        const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
          graph: (opts: {
            entity: string
            fields: string[]
            filters: Record<string, unknown>
            context?: Record<string, unknown>
          }) => Promise<{ data: any[] }>
        }

        // Get region currency for calculated price context
        const { data: regions } = await query.graph({
          entity: "region",
          fields: ["currency_code"],
          filters: { id: region_id as string },
        })
        const currencyCode = regions?.[0]?.currency_code
        if (!currencyCode) {
          res.json({ products: [], count: 0 })
          return
        }

        // Get up to MAX_PRODUCTS_FOR_PRICE_FILTER product IDs matching current filters
        const listOptions: { take: number; skip: number; order?: Record<string, string> } = {
          take: MAX_PRODUCTS_FOR_PRICE_FILTER,
          skip: 0,
        }
        if (order === "created_at") {
          listOptions.order = { created_at: "DESC" }
        }
        const [candidateProducts] = await productService.listAndCountProducts(
          Object.keys(productFilters).length > 0 ? productFilters : undefined,
          listOptions
        )
        const candidateIds = candidateProducts.map((p: any) => p.id).filter(Boolean)
        if (candidateIds.length === 0) {
          res.json({ products: [], count: 0 })
          return
        }

        // Fetch products with calculated prices for region/currency
        const { data: productsWithPrices } = await query.graph({
          entity: "product",
          fields: ["id", "variants.id", "variants.calculated_price.calculated_amount"],
          filters: { id: candidateIds },
          context: {
            variants: {
              calculated_price: QueryContext({
                region_id: region_id as string,
                currency_code: currencyCode,
              }),
            },
          },
        })

        // Per-product price = min variant calculated_amount; exclude products with no price
        const productPrices = new Map<string, number>()
        for (const p of productsWithPrices || []) {
          const amounts = (p.variants || [])
            .map((v: any) => v?.calculated_price?.calculated_amount)
            .filter((n: unknown) => typeof n === "number" && (n as number) > 0)
          if (amounts.length > 0) productPrices.set(p.id, Math.min(...amounts))
        }

        let priceFilteredIds = candidateIds.filter((pid) => productPrices.has(pid))
        if (priceMin != null) {
          priceFilteredIds = priceFilteredIds.filter((pid) => (productPrices.get(pid) ?? 0) >= priceMin)
        }
        if (priceMax != null) {
          priceFilteredIds = priceFilteredIds.filter((pid) => (productPrices.get(pid) ?? 0) <= priceMax)
        }

        if (isPriceOrder) {
          priceFilteredIds.sort((a, b) => {
            const pa = productPrices.get(a) ?? 0
            const pb = productPrices.get(b) ?? 0
            return order === "price_asc" ? pa - pb : pb - pa
          })
        }

        count = priceFilteredIds.length
        const pageIds = priceFilteredIds.slice(offsetNum, offsetNum + limitNum)

        const fetchedProducts = await Promise.all(
          pageIds.map((productId) =>
            productService.retrieveProduct(productId).catch(() => null)
          )
        )
        products = fetchedProducts.filter(Boolean) as any[]

        const formattedProducts = products.map((product: any) => ({
          id: product.id,
          ...product,
        }))
        res.json({ products: formattedProducts, count })
        return
      }

      // If we have product IDs to filter by, fetch them individually
      // The product service might not support id array filtering
      if (finalProductIds.length > 0) {
        console.log(`[GET /store/products/list] Fetching ${finalProductIds.length} products by ID`)
        
        // Fetch products individually (product service doesn't reliably support id array)
        const fetchedProducts = await Promise.all(
          finalProductIds.map((productId) =>
            productService.retrieveProduct(productId).catch((err) => {
              console.error(`Error fetching product ${productId}:`, err)
              return null
            })
          )
        )
        
        // Filter out nulls (products that failed to fetch)
        let filteredProducts = fetchedProducts.filter(Boolean) as any[]
        
        // Apply collection filter if needed
        if (collection_id) {
          const collectionIds = Array.isArray(collection_id)
            ? collection_id.map((id) => String(id))
            : [String(collection_id)]
          filteredProducts = filteredProducts.filter((product: any) =>
            product.collection_id && collectionIds.includes(product.collection_id)
          )
        }
        
        // Apply category filter if needed
        if (category_id) {
          const categoryIds = Array.isArray(category_id)
            ? category_id.map((id) => String(id))
            : [String(category_id)]
          filteredProducts = filteredProducts.filter((product: any) => {
            if (!product.categories || !Array.isArray(product.categories)) {
              return false
            }
            return product.categories.some((cat: any) =>
              categoryIds.includes(cat.id)
            )
          })
        }
        
        // Apply sorting if needed
        if (order === "created_at") {
          filteredProducts.sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime()
            const dateB = new Date(b.created_at || 0).getTime()
            return dateB - dateA // Newest first
          })
        }

        // When region_id present, exclude products without a price for this region
        if (region_id && filteredProducts.length > 0) {
          const idsWithPrice = await getProductIdsWithPriceForRegion(
            req.scope,
            region_id as string,
            filteredProducts.map((p: any) => p.id)
          )
          filteredProducts = filteredProducts.filter((p: any) => idsWithPrice.has(p.id))
        }

        // Apply pagination
        count = filteredProducts.length
        const startIndex = offsetNum
        const endIndex = startIndex + limitNum
        products = filteredProducts.slice(startIndex, endIndex)

        console.log(`[GET /store/products/list] Returning ${products.length} products (${startIndex}-${endIndex} of ${count})`)
      } else {
        // No ID filtering, use standard query
        console.log(`[GET /store/products/list] Fetching products with filters:`, productFilters)

        if (region_id) {
          // When region_id present: get candidates, keep only products with price, then paginate
          const listOptions: { take: number; skip: number; order?: Record<string, string> } = {
            take: MAX_PRODUCTS_FOR_PRICE_FILTER,
            skip: 0,
          }
          if (order === "created_at") {
            listOptions.order = { created_at: "DESC" }
          }
          const [candidateProducts] = await productService.listAndCountProducts(
            Object.keys(productFilters).length > 0 ? productFilters : undefined,
            listOptions
          )
          const candidateIds = candidateProducts.map((p: any) => p.id).filter(Boolean)
          const idsWithPrice = await getProductIdsWithPriceForRegion(
            req.scope,
            region_id as string,
            candidateIds
          )
          const filteredIds = candidateIds.filter((id: string) => idsWithPrice.has(id))
          count = filteredIds.length
          const pageIds = filteredIds.slice(offsetNum, offsetNum + limitNum)
          const fetchedProducts = await Promise.all(
            pageIds.map((productId: string) =>
              productService.retrieveProduct(productId).catch(() => null)
            )
          )
          products = fetchedProducts.filter(Boolean) as any[]
        } else {
          const [fetchedProducts, fetchedCount] = await productService.listAndCountProducts(
            Object.keys(productFilters).length > 0 ? productFilters : undefined,
            queryOptions
          )
          products = fetchedProducts
          count = fetchedCount
        }
      }

      // Ensure products have required fields for storefront
      // The storefront extracts product IDs and fetches priced versions separately
      const formattedProducts = products.map((product: any) => {
        // Return product with at least id field (required for getProductsById)
        return {
          id: product.id,
          ...product,
        }
      })

      res.json({
        products: formattedProducts,
        count,
      })
    } catch (serviceError) {
      console.error("Error querying product service:", serviceError)
      const errorDetails = serviceError instanceof Error 
        ? { message: serviceError.message, stack: serviceError.stack }
        : { error: String(serviceError) }
      console.error("Service error details:", errorDetails)
      throw serviceError
    }
  } catch (error) {
    console.error("Error in /store/products/list:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to list products"
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      query: req.query,
    })
    
    res.status(500).json({
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
    })
  }
}
