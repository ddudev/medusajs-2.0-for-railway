import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"

import BrandModuleService from "../../../../modules/brand/service"

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let cache: { data: { brands: any[] }; expiresAt: number } | null = null

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) {
    res.json(cache.data)
    return
  }

  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  try {
    // Get all brands
    const allBrands = await brandService.listBrands({})

    // Count products per brand using raw SQL (more reliable than link.list)
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL not found in environment")
    }

    const { Pool } = await import("pg")
    const pool = new Pool({ connectionString: databaseUrl })
    const linkTableName = "product_product_brand_brand"

    try {
      // Count products per brand using raw SQL
      const brandsWithCounts = await Promise.all(
        allBrands.map(async (brand: any) => {
          try {
            const result = await pool.query(
              `SELECT COUNT(*) as count FROM ${linkTableName} WHERE brand_id = $1`,
              [brand.id]
            )
            const productCount = parseInt(result.rows[0]?.count || "0", 10)
            return {
              ...brand,
              product_count: productCount,
            }
          } catch (error) {
            console.error(`Error counting products for brand ${brand.id}:`, error)
            return {
              ...brand,
              product_count: 0,
            }
          }
        })
      )

      // Filter to only brands with products (active brands)
      const activeBrands = brandsWithCounts.filter(
        (brand: any) => brand.product_count > 0
      )

      const data = { brands: activeBrands }
      cache = { data, expiresAt: now + CACHE_TTL_MS }
      res.json(data)
    } finally {
      await pool.end().catch((err: any) => {
        console.error("Error closing database pool:", err)
      })
    }
  } catch (error) {
    console.error("Error in /store/brands/active:", error)
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to list active brands",
    })
  }
}

