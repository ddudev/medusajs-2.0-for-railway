/**
 * Type definitions for InnPro XML import workflow
 */

import { MedusaProductData, SelectionFilters } from '../../modules/innpro-xml-importer/types'

/**
 * Main workflow input
 */
export type WorkflowInput = {
  /** Session ID containing the import data */
  sessionId: string
  /** Optional shipping profile ID to assign to products */
  shippingProfileId?: string
  /** Optional filters to apply to products */
  filters?: SelectionFilters
  /** Ollama service URL for AI operations */
  ollamaUrl?: string
  /** Ollama model name to use */
  ollamaModel?: string
}

/**
 * Main workflow output
 */
export type WorkflowOutput = {
  /** Session ID that was processed */
  sessionId: string
  /** Total number of products attempted */
  totalProducts: number
  /** Number of successfully imported products */
  successfulProducts: number
  /** Number of failed products */
  failedProducts: number
  /** Overall import status */
  status: 'completed' | 'completed_with_errors' | 'failed'
}

/**
 * Step response for session products
 */
export type SessionProductsResponse = {
  /** Array of products from the session */
  products: any[]
  /** Session object */
  session: any
}

/**
 * Step response for mapped products
 */
export type MappedProductsResponse = {
  /** Array of mapped products */
  products: MedusaProductData[]
}

/**
 * Step response for translated products
 */
export type TranslatedProductsResponse = {
  /** Array of translated products */
  products: MedusaProductData[]
}

/**
 * Step response for optimized products
 */
export type OptimizedProductsResponse = {
  /** Array of products with optimized descriptions */
  products: MedusaProductData[]
}

/**
 * Step response for products with relations
 */
export type ProductsWithRelationsResponse = {
  /** Array of products with categories and brands assigned */
  products: MedusaProductData[]
}

/**
 * Step response for products with images
 */
export type ProductsWithImagesResponse = {
  /** Array of products with processed images */
  products: MedusaProductData[]
}

/**
 * Step response for shipping profile
 */
export type ShippingProfileResponse = {
  /** Shipping profile ID */
  shippingProfileId: string
}

/**
 * Step response for import results
 */
export type ImportResultsResponse = {
  /** Number of successful imports */
  successful: number
  /** Number of failed imports */
  failed: number
  /** Total number of products */
  total: number
  /** Array of error messages */
  errors: string[]
}

/**
 * Step response for final status
 */
export type FinalStatusResponse = {
  /** Session ID */
  sessionId: string
  /** Total products */
  totalProducts: number
  /** Successful products */
  successfulProducts: number
  /** Failed products */
  failedProducts: number
  /** Import status */
  status: 'completed' | 'completed_with_errors' | 'failed'
}
