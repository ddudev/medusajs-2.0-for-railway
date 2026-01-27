/**
 * Type definitions for InnPro XML Importer module
 */

export type ImportSessionStatus = 'parsing' | 'ready' | 'selecting' | 'importing' | 'completed' | 'failed'

export interface InnProImportSession {
  id: string
  xml_url: string
  xml_file_path?: string // Path to saved XML file on disk
  parsed_data?: {
    products?: any[] // Optional - will be empty for streaming approach
    categories: Array<{ id: string; name: string; count: number }>
    brands: Array<{ id: string; name: string; count: number }>
    total_products: number
    brandToCategories?: Record<string, string[]>
  }
  selected_categories?: string[]
  selected_brands?: string[]
  selected_product_ids?: string[]
  status: ImportSessionStatus
  created_at: Date
  updated_at: Date
}

export interface InnProImportConfig {
  id: string
  price_xml_url: string
  enabled: boolean
  update_inventory: boolean
  created_at: Date
  updated_at: Date
}

export interface ParsedProduct {
  id: string
  title?: string
  category?: { id: string; name: string }
  producer?: { id: string; name: string }
  price?: { net: string; gross: string }
  stock?: { quantity: string }
  raw: any // Full XML product data
}

export interface CategoryBrandSummary {
  categories: Array<{ id: string; name: string; count: number }>
  brands: Array<{ id: string; name: string; count: number }>
  total_products: number
  brandToCategories: Record<string, string[]> // Map of brand ID to array of category IDs
}

export interface SelectionFilters {
  categories?: string[]
  brands?: string[]
  productIds?: string[]
}

export interface MedusaProductData {
  title: string
  description?: string
  handle: string
  status?: 'draft' | 'published'
  external_id: string
  weight?: number
  length?: number
  width?: number
  height?: number
  hs_code?: string
  origin_country?: string
  mid_code?: string
  material?: string
  images?: Array<{ url: string }>
  variants: Array<{
    title: string
    sku?: string
    barcode?: string
    prices: Array<{
      amount: number
      currency_code: string
    }>
    inventory_quantity?: number
    weight?: number
    manage_inventory?: boolean
    allow_backorder?: boolean
    metadata?: Record<string, any>
  }>
  metadata?: Record<string, any>
  categories?: Array<{ id: string }>
  collection_id?: string
  shipping_profile_id?: string
  options?: Array<{
    title: string
    values: string[]
  }>
}

export interface PriceUpdateData {
  productId: string
  priceNet?: number      // Cost price (what we pay)
  priceGross?: number    // Cost price (gross)
  srpNet?: number        // SRP (price to consumer)
  srpGross?: number      // SRP (gross)
  stockQuantity?: number // Stock for first variant (fallback)
  variants?: Array<{     // Stock for all variants
    codeExternal: string // Barcode to match variant
    stockQuantity: number
    stockId?: string     // Stock location ID from XML
  }>
}
