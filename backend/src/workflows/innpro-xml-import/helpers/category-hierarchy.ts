/**
 * Category hierarchy management for InnPro XML import
 * Handles creation and lookup of nested category structures
 */

import { MedusaContainer, IProductModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { OllamaService } from '../../../modules/innpro-xml-importer/services/ollama'
import { isAlreadyExistsError } from '../utils/error-handler'

/**
 * Finds an existing category by name and parent ID
 */
async function findCategoryByNameAndParent(
  productService: IProductModuleService,
  categoryName: string,
  parentCategoryId: string | null
): Promise<string | null> {
  const queryParams: any = { name: categoryName }
  queryParams.parent_category_id = parentCategoryId

  const existingCategories = await productService.listProductCategories(queryParams)
  return existingCategories?.[0]?.id || null
}

/**
 * Get or create category hierarchy from a path string
 * 
 * Categories in InnPro XML are hierarchical paths like "RC models/Charging/Chargers"
 * This function:
 * 1. Splits the path by delimiter (/)
 * 2. Translates each category name to Bulgarian
 * 3. Creates or finds each category level in the hierarchy
 * 4. Returns the ID of the deepest (leaf) category
 * 
 * @param categoryPath - Hierarchical category path (e.g., "RC models/Charging/Chargers")
 * @param container - Medusa dependency injection container
 * @param categoryCache - Cache map for category lookups (key: "name|parentId" -> categoryId)
 * @param logger - Logger instance
 * @param ollamaService - Optional Ollama service for translation
 * @returns ID of the leaf category, or null if creation failed
 */
export async function getOrCreateCategoryHierarchy(
  categoryPath: string,
  container: MedusaContainer,
  categoryCache: Map<string, string>,
  logger: any,
  ollamaService?: OllamaService
): Promise<string | null> {
  if (!categoryPath?.trim()) {
    return null
  }

  // Split category path by delimiter
  const categoryNames = categoryPath
    .split('/')
    .map(name => name.trim())
    .filter(name => name.length > 0)

  if (categoryNames.length === 0) {
    logger.warn(`Invalid category path: "${categoryPath}"`)
    return null
  }

  const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
  let parentCategoryId: string | null = null

  // Process each level of the hierarchy
  for (const originalCategoryName of categoryNames) {
    // Translate category name to Bulgarian
    let categoryName = originalCategoryName
    if (ollamaService) {
      try {
        categoryName = await ollamaService.translate(originalCategoryName, 'bg')
      } catch (error) {
        logger.warn(`Failed to translate category "${originalCategoryName}", using original`)
        categoryName = originalCategoryName
      }
    }

    const cacheKey = `${categoryName}|${parentCategoryId || 'null'}`

    // Check cache first
    if (categoryCache.has(cacheKey)) {
      parentCategoryId = categoryCache.get(cacheKey)!
      continue
    }

    // Try to find existing category
    try {
      const existingCategoryId = await findCategoryByNameAndParent(
        productService,
        categoryName,
        parentCategoryId
      )

      if (existingCategoryId) {
        categoryCache.set(cacheKey, existingCategoryId)
        parentCategoryId = existingCategoryId
        continue
      }
    } catch (error) {
      logger.warn(`Error querying category "${categoryName}": ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    // Category doesn't exist, create it
    try {
      const createdCategories = await productService.createProductCategories([
        {
          name: categoryName,
          parent_category_id: parentCategoryId,
          is_active: true,
        },
      ])

      if (createdCategories?.length > 0) {
        const categoryId = createdCategories[0].id
        categoryCache.set(cacheKey, categoryId)
        parentCategoryId = categoryId
      } else {
        throw new Error(`Failed to create category "${categoryName}"`)
      }
    } catch (error) {
      // If category already exists (race condition), try to find it
      if (isAlreadyExistsError(error)) {
        try {
          const existingCategoryId = await findCategoryByNameAndParent(
            productService,
            categoryName,
            parentCategoryId
          )

          if (existingCategoryId) {
            categoryCache.set(cacheKey, existingCategoryId)
            parentCategoryId = existingCategoryId
            continue
          }
        } catch (findError) {
          logger.warn(`Error finding existing category "${categoryName}": ${findError instanceof Error ? findError.message : 'Unknown'}`)
        }
      }

      // If we couldn't recover from the error, log and return null
      logger.error(`Error creating category "${categoryName}": ${error instanceof Error ? error.message : 'Unknown'}`)
      return null
    }
  }

  return parentCategoryId
}
