import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'
import { MedusaContainer, ISalesChannelModuleService, IProductModuleService } from '@medusajs/framework/types'
import { createProductsWorkflow, createShippingProfilesWorkflow } from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { ulid } from 'ulid'
import { INNPRO_XML_IMPORTER_MODULE } from '../modules/innpro-xml-importer'
import InnProXmlImporterService from '../modules/innpro-xml-importer/service'
import { BRAND_MODULE } from '../modules/brand'
import { IS_DEV, MINIO_ENDPOINT } from '../lib/constants'
import { MedusaProductData, SelectionFilters } from '../modules/innpro-xml-importer/types'
import { OllamaService } from '../modules/innpro-xml-importer/services/ollama'
import { extractSpecificationsTable, extractIncludedSection } from '../modules/innpro-xml-importer/utils/html-parser'

type WorkflowInput = {
  sessionId: string
  shippingProfileId?: string
  filters?: SelectionFilters
  ollamaUrl?: string
  ollamaModel?: string
}

type WorkflowOutput = {
  sessionId: string
  totalProducts: number
  successfulProducts: number
  failedProducts: number
  status: 'completed' | 'completed_with_errors' | 'failed'
}

/**
 * Step: Get session and extract products
 */
const getSessionProductsStep = createStep(
  'get-session-products',
  async (input: { sessionId: string }, { container }: { container: MedusaContainer }) => {
    const stepStartTime = Date.now()
    const importerService: InnProXmlImporterService = container.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const session = await importerService.getSession(input.sessionId)

    if (!session || !session.parsed_data) {
      throw new Error(`Session ${input.sessionId} not found or not parsed`)
    }

    let products: any[] = []
    let totalProducts = 0

    // STREAMING APPROACH: Read products from XML file if available
    const xmlFilePath = (session as any).xml_file_path || session.xml_file_path
    if (xmlFilePath) {
      logger.info(`Loading products from XML file: ${xmlFilePath}`)
      
      try {
        // Read and parse XML file
        const fs = await import('fs/promises')
        const xmlContent = await fs.readFile(xmlFilePath, 'utf-8')
        const xmlData = importerService.parseXml(xmlContent)
        products = importerService.extractProducts(xmlData)
        totalProducts = products.length
        
        logger.info(`Loaded ${totalProducts} products from XML file`)
      } catch (fileError) {
        logger.error(`Failed to read XML file ${xmlFilePath}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`)
        // Fallback to parsed_data if file read fails
        products = session.parsed_data.products || []
        totalProducts = products.length
        logger.warn(`Falling back to parsed_data: ${totalProducts} products`)
      }
    } else {
      // Fallback: Use products from parsed_data (old approach or if xml_file_path not set)
      products = session.parsed_data.products || []
      totalProducts = products.length
      logger.info(`No xml_file_path found, using products from session parsed_data: ${totalProducts} products`)
      logger.warn(`Session ${input.sessionId} does not have xml_file_path - this may indicate the migration hasn't run or the session was created before the streaming update`)
    }

    logger.info(`Session ${input.sessionId} has ${totalProducts} total products`)
    logger.info(`Session filters - categories: ${JSON.stringify(session.selected_categories)}, brands: ${JSON.stringify(session.selected_brands)}, productIds: ${JSON.stringify(session.selected_product_ids)}`)

    // Apply filters if provided
    // Check for non-empty arrays (empty arrays are falsy but we want to filter if they exist)
    const hasCategoryFilter = session.selected_categories && Array.isArray(session.selected_categories) && session.selected_categories.length > 0
    const hasBrandFilter = session.selected_brands && Array.isArray(session.selected_brands) && session.selected_brands.length > 0
    const hasProductIdFilter = session.selected_product_ids && Array.isArray(session.selected_product_ids) && session.selected_product_ids.length > 0

    if (hasCategoryFilter || hasBrandFilter || hasProductIdFilter) {
      const filters: SelectionFilters = {
        categories: hasCategoryFilter ? session.selected_categories : undefined,
        brands: hasBrandFilter ? session.selected_brands : undefined,
        productIds: hasProductIdFilter ? session.selected_product_ids : undefined,
      }
      
      logger.info(`Applying filters: categories=${filters.categories?.length || 0}, brands=${filters.brands?.length || 0}, productIds=${filters.productIds?.length || 0}`)
      
      products = importerService.filterProducts(products, filters)
      
      logger.info(`After filtering: ${products.length} products (from ${totalProducts} total)`)
    } else {
      logger.info(`No filters applied - importing all ${totalProducts} products`)
    }

    return new StepResponse({
      products,
      session,
    })
  }
)

/**
 * Step: Map products to Medusa format
 */
const mapProductsStep = createStep(
  'map-products',
  async (
    input: { products: any[] },
    { container }: { container: MedusaContainer }
  ) => {
    const stepStartTime = Date.now()
    const importerService: InnProXmlImporterService = container.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const mappedProducts: MedusaProductData[] = []
    const errors: Array<{ index: number; error: string }> = []

    for (let i = 0; i < input.products.length; i++) {
      try {
        const xmlProduct = input.products[i]
        const productId = xmlProduct['@_id'] || xmlProduct.id || `unknown-${i}`
        
        // Debug title extraction for first few products or if title extraction fails
        const nameArray = xmlProduct.description?.name
        const extractedTitle = importerService.extractByLang(nameArray, 'eng') || importerService.extractByLang(nameArray, 'en')
        
        if (i < 3 || !extractedTitle) {
          logger.debug(`Product ${i + 1} (ID: ${productId}) title extraction debug: hasDescription=${!!xmlProduct.description}, hasName=${!!nameArray}, nameType=${typeof nameArray}, nameIsArray=${Array.isArray(nameArray)}, nameValue=${JSON.stringify(nameArray).substring(0, 500)}, extractedTitle=${extractedTitle}, extractedTitleEn=${importerService.extractByLang(nameArray, 'en')}`)
        }
        
        // Recursively remove '@_' prefix from all keys in the XML object
        const cleanXmlKeys = (obj: any): any => {
          if (obj === null || obj === undefined) return obj
          
          // Handle arrays
          if (Array.isArray(obj)) {
            return obj.map(item => cleanXmlKeys(item))
          }
          
          // Handle objects
          if (typeof obj === 'object') {
            const cleaned: any = {}
            for (const key of Object.keys(obj)) {
              // Remove '@_' prefix from key
              const cleanKey = key.startsWith('@_') ? key.substring(2) : key
              // Recursively clean nested objects
              cleaned[cleanKey] = cleanXmlKeys(obj[key])
            }
            return cleaned
          }
          
          // Return primitive values as-is
          return obj
        }
        
        const cleanedXmlProduct = cleanXmlKeys(xmlProduct)
        const mapped = importerService.mapToMedusaProduct(cleanedXmlProduct)
        
        // Log if title is still "Untitled Product" with full structure
        if (mapped.title === 'Untitled Product') {
          logger.warn(`Product ${i + 1} (ID: ${productId}) has "Untitled Product" title. Full XML structure: description=${JSON.stringify(xmlProduct.description).substring(0, 1000)}, name=${JSON.stringify(nameArray).substring(0, 500)}, extractedTitle=${extractedTitle}`)
        }
        
        
        mappedProducts.push(mapped)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.warn(`Failed to map product ${i + 1}: ${errorMessage}`)
        errors.push({ index: i, error: errorMessage })
      }
      
    }

    logger.info(`Mapped ${mappedProducts.length}/${input.products.length} products`)

    return new StepResponse({
      products: mappedProducts,
      errors,
    })
  }
)

/**
 * Step: Translate products to Bulgarian
 */
const translateProductsStep = createStep(
  'translate-products',
  async (
    input: { products: MedusaProductData[]; ollamaUrl?: string; ollamaModel?: string },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const ollamaUrl = input.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
    const ollamaModel = input.ollamaModel || process.env.OLLAMA_MODEL || 'gemma3:latest'

    logger.info(`Translating ${input.products.length} products to Bulgarian using Ollama at ${ollamaUrl} with model ${ollamaModel}`)

    try {
      const ollamaService = new OllamaService({ baseUrl: ollamaUrl, model: ollamaModel })
      
      // Process products sequentially (one at a time) to avoid timeouts and overwhelming Ollama
      const translatedProducts: MedusaProductData[] = []
      
      for (let index = 0; index < input.products.length; index++) {
        const product = input.products[index]
        
        try {
          logger.info(`Translating product ${index + 1}/${input.products.length}: ${product.title || 'Unknown'}`)
          
          // Preserve original English description before translating
          const originalDescriptionEn = product.description || ''
          const productWithMetadata = {
            ...product,
            metadata: {
              ...product.metadata,
              original_description_en: originalDescriptionEn,
            },
          }

          // Collect all texts to translate
          const textsToTranslate: Array<{ field: string; value: string; brandName?: string }> = []
          
          // Get brand name for title translation
          const brandName = product.metadata?.producer?.name
          
          if (product.title) {
            // Use special title translation that preserves brand and model
            textsToTranslate.push({ field: 'title', value: product.title, brandName })
          }
          // SKIP description translation - SEO optimization step will handle translation + optimization in one call
          // This saves significant time as we avoid redundant translation
          
          // Translate variants
          if (product.variants) {
            product.variants.forEach((variant, vIndex) => {
              if (variant.title) {
                textsToTranslate.push({ field: `variant_${vIndex}_title`, value: variant.title })
              }
            })
          }

          // Translate options
          if (product.options) {
            product.options.forEach((option, oIndex) => {
              if (option.title) {
                textsToTranslate.push({ field: `option_${oIndex}_title`, value: option.title })
              }
              if (option.values) {
                option.values.forEach((value, vIndex) => {
                  textsToTranslate.push({ field: `option_${oIndex}_value_${vIndex}`, value })
                })
              }
            })
          }

          // Translate metadata fields
          if (product.metadata) {
            if (product.metadata.unit_name) {
              textsToTranslate.push({ field: 'unit_name', value: product.metadata.unit_name })
            }
            if (product.metadata.warranty_name) {
              textsToTranslate.push({ field: 'warranty_name', value: product.metadata.warranty_name })
            }
            if (product.metadata.producer?.name) {
              textsToTranslate.push({ field: 'producer_name', value: product.metadata.producer.name })
            }
            if (product.metadata.category?.name) {
              textsToTranslate.push({ field: 'category_name', value: product.metadata.category.name })
            }
            if (product.metadata.responsible_producer?.name) {
              textsToTranslate.push({ field: 'responsible_producer_name', value: product.metadata.responsible_producer.name })
            }
          }

          // Translate title separately (preserves brand/model)
          let translatedTitle = product.title
          if (product.title && brandName) {
            try {
              translatedTitle = await ollamaService.translateTitle(product.title, brandName, 'bg')
            } catch (error) {
              logger.warn(`Failed to translate title for product ${index + 1}, using original`)
            }
          } else if (product.title) {
            // Fallback to regular translation if no brand
            try {
              translatedTitle = await ollamaService.translate(product.title, 'bg')
            } catch (error) {
              logger.warn(`Failed to translate title for product ${index + 1}, using original`)
            }
          }

          // Create translated product structure
          const translatedProduct = { ...productWithMetadata }
          
          // Set translated title
          translatedProduct.title = translatedTitle
          
          // Batch translate remaining texts (excluding title AND description)
          // Description will be translated + optimized in SEO step to avoid redundant translation
          const textsToTranslateWithoutTitle = textsToTranslate.filter(t => t.field !== 'title' && t.field !== 'description')
          const texts = textsToTranslateWithoutTitle.map(t => t.value)
          
          if (texts.length > 0) {
            logger.info(`Product ${index + 1}: Translating ${texts.length} fields (variants, options, metadata - description will be handled in SEO step)`)
            const translations = await ollamaService.translateBatch(texts, 'bg')
            
            // Apply translations (excluding description)
            textsToTranslateWithoutTitle.forEach((item, i) => {
              const translation = translations[i] || item.value
              
              // Skip description - it will be handled in SEO step
              if (item.field === 'description') {
                return // Skip
              } else if (item.field.startsWith('variant_')) {
                const match = item.field.match(/variant_(\d+)_title/)
                if (match) {
                  const vIndex = parseInt(match[1])
                  if (translatedProduct.variants && translatedProduct.variants[vIndex]) {
                    // Clean translation to remove any leaked prompt text
                    let cleanedTranslation = translation
                      .replace(/Обикновено ВАЖНО.*?обяснения\./gi, '')
                      .replace(/IMPORTANT.*?explanations\./gi, '')
                      .replace(/Return ONLY.*?explanations\./gi, '')
                      .replace(/Върнете САМО.*?обяснения\./gi, '')
                      .trim()
                    
                    // If cleaning removed everything, use original
                    translatedProduct.variants[vIndex].title = cleanedTranslation || translatedProduct.variants[vIndex].title
                  }
                }
              } else if (item.field.startsWith('option_')) {
                const match = item.field.match(/option_(\d+)_title/) || item.field.match(/option_(\d+)_value_(\d+)/)
                if (match) {
                  const oIndex = parseInt(match[1])
                  if (translatedProduct.options && translatedProduct.options[oIndex]) {
                    if (item.field.includes('_title')) {
                      translatedProduct.options[oIndex].title = translation
                    } else if (item.field.includes('_value_')) {
                      const vIndex = parseInt(match[2])
                      if (translatedProduct.options[oIndex].values) {
                        translatedProduct.options[oIndex].values[vIndex] = translation
                      }
                    }
                  }
                }
              } else if (item.field === 'unit_name' && translatedProduct.metadata) {
                (translatedProduct.metadata as any).unit_name = translation
              } else if (item.field === 'warranty_name' && translatedProduct.metadata) {
                (translatedProduct.metadata as any).warranty_name = translation
              } else if (item.field === 'producer_name' && translatedProduct.metadata && (translatedProduct.metadata as any).producer) {
                (translatedProduct.metadata as any).producer.name = translation
              } else if (item.field === 'category_name' && translatedProduct.metadata && (translatedProduct.metadata as any).category) {
                (translatedProduct.metadata as any).category.name = translation
              } else if (item.field === 'responsible_producer_name' && translatedProduct.metadata && (translatedProduct.metadata as any).responsible_producer) {
                (translatedProduct.metadata as any).responsible_producer.name = translation
              }
            })
          } else {
            logger.info(`Product ${index + 1}: No additional fields to translate (description will be handled in SEO step)`)
          }
          
          // Description stays as original English - will be translated + optimized in SEO step
          // This avoids redundant translation and saves significant time

          translatedProducts.push(translatedProduct)
          logger.info(`Successfully translated product ${index + 1}/${input.products.length} (description will be translated + optimized in SEO step)`)
        } catch (error) {
          logger.warn(`Failed to translate product ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          // Return original product with original description preserved
          translatedProducts.push({
            ...product,
            metadata: {
              ...product.metadata,
              original_description_en: product.description || '',
            },
          })
        }
      }

      logger.info(`Translated ${translatedProducts.length} products`)
      return new StepResponse({ products: translatedProducts })
    } catch (error) {
      logger.error(`Translation step failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Return original products if translation fails
      return new StepResponse({ products: input.products })
    }
  }
)

/**
 * Step: Optimize descriptions for SEO
 */
const optimizeDescriptionsStep = createStep(
  'optimize-descriptions',
  async (
    input: { products: MedusaProductData[]; ollamaUrl?: string; ollamaModel?: string },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const ollamaUrl = input.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
    const ollamaModel = input.ollamaModel || process.env.OLLAMA_MODEL || 'gemma3:latest'

    logger.info(`Optimizing descriptions for ${input.products.length} products using Ollama at ${ollamaUrl} with model ${ollamaModel}`)

    try {
      const ollamaService = new OllamaService({ baseUrl: ollamaUrl, model: ollamaModel })

      // Process products sequentially (one at a time) to avoid timeouts and overwhelming Ollama
      const optimizedProducts: MedusaProductData[] = []
      
      for (let index = 0; index < input.products.length; index++) {
        const product = input.products[index]
        
        try {
          logger.info(`Optimizing product ${index + 1}/${input.products.length}: ${product.title || 'Unknown'}`)
          
          const originalDescriptionEn = product.metadata?.original_description_en || product.description || ''
          
          if (!originalDescriptionEn) {
            logger.warn(`Product ${index + 1} has no original description, skipping SEO optimization`)
            optimizedProducts.push(product)
            continue
          }

          // Step 1a: Generate meta description (for search engine snippets)
          logger.info(`Product ${index + 1}: Step 1a/4 - Generating meta description`)
          const metaContent = await ollamaService.generateMetaDescription(product, originalDescriptionEn)
          
          // Step 1b: Optimize product description (150-400 words for on-page)
          logger.info(`Product ${index + 1}: Step 1b/4 - Optimizing product description (${originalDescriptionEn.length} chars)`)
          const descriptionContent = await ollamaService.optimizeDescription(product, originalDescriptionEn)

          if (!descriptionContent || (!descriptionContent.seoEnhancedDescription && !descriptionContent.technicalSafeDescription)) {
            logger.warn(`Product ${index + 1}: Failed to generate description, keeping original`)
            optimizedProducts.push(product)
            continue
          }

          // Use SEO-enhanced description for B2C, fallback to technical-safe if not available
          const description = descriptionContent.seoEnhancedDescription || descriptionContent.technicalSafeDescription
          
          // Use meta description from separate call, or fallback to short description
          const metaTitle = metaContent?.metaTitle || descriptionContent.shortDescription?.substring(0, 60) || ''
          const metaDescription = metaContent?.metaDescription || descriptionContent.shortDescription?.substring(0, 180) || ''

          // Step 2: Extract "What's Included" from the ORIGINAL description (not optimized)
          // The optimized description might not have this section, so extract from original
          logger.info(`Product ${index + 1}: Step 2/4 - Extracting included items from original description`)
          const includedItems = await ollamaService.extractIncludedItems(originalDescriptionEn) || 
                                extractIncludedSection(originalDescriptionEn) || 
                                undefined

          if (includedItems) {
            logger.info(`Product ${index + 1}: Successfully extracted included items (${includedItems.length} chars)`)
            logger.debug(`Product ${index + 1}: Included items preview: ${includedItems.substring(0, 100)}...`)
          } else {
            logger.warn(`Product ${index + 1}: No included items found - checking fallback extraction`)
          }

          // Step 3: Extract technical data/specifications from original description
          logger.info(`Product ${index + 1}: Step 3/4 - Extracting technical data`)
          const specificationsTable = await ollamaService.extractTechnicalData(originalDescriptionEn) ||
                                     extractSpecificationsTable(originalDescriptionEn) ||
                                     undefined

          if (specificationsTable) {
            logger.info(`Product ${index + 1}: Successfully extracted technical data (${specificationsTable.length} chars)`)
            logger.debug(`Product ${index + 1}: Technical data preview: ${specificationsTable.substring(0, 100)}...`)
          } else {
            logger.warn(`Product ${index + 1}: No technical data found - checking fallback extraction`)
          }
          
          // Log description length for debugging
          logger.info(`Product ${index + 1}: Final description length: ${description.length} chars (original: ${originalDescriptionEn.length} chars)`)
          
          optimizedProducts.push({
            ...product,
            description, // This is the on-page product description (150-400 words)
            metadata: {
              ...product.metadata,
              seo_meta_title: metaTitle, // From separate meta description generation
              seo_meta_description: metaDescription, // From separate meta description generation
              seo_short_description: descriptionContent.shortDescription,
              technical_safe_description: descriptionContent.technicalSafeDescription, // Store for B2B feeds
              specifications_table: specificationsTable || undefined, // Store specifications table in metadata
              included_items: includedItems || undefined, // Store "What's Included" section in metadata
            },
          })
          
          // Log what was stored in metadata
          logger.debug(`Product ${index + 1}: Stored metadata - included_items: ${includedItems ? `${includedItems.length} chars` : 'null'}, specifications_table: ${specificationsTable ? `${specificationsTable.length} chars` : 'null'}`)
          
          logger.info(`Successfully processed product ${index + 1}/${input.products.length} (description + included items + technical data)`)
        } catch (error) {
          logger.warn(`Failed to optimize product ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          // Return product with translated description if SEO optimization fails
          optimizedProducts.push(product)
        }
      }

      logger.info(`Optimized descriptions for ${optimizedProducts.length} products`)
      return new StepResponse({ products: optimizedProducts })
    } catch (error) {
      logger.error(`SEO optimization step failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Return products with translated descriptions if SEO optimization fails
      return new StepResponse({ products: input.products })
    }
  }
)


/**
 * Helper: Get or create category hierarchy
 * Categories in InnPro XML are hierarchical paths like "RC models/Charging/Chargers"
 * Translates each category name to Bulgarian before creating/looking up
 */
async function getOrCreateCategoryHierarchy(
  categoryPath: string,
  container: MedusaContainer,
  categoryCache: Map<string, string>,
  logger: any,
  ollamaService?: OllamaService
): Promise<string | null> {
  if (!categoryPath || categoryPath.trim().length === 0) {
    return null
  }

  // InnPro categories use "/" as delimiter
  const delimiter = '/'
  const normalizedDelimiter = delimiter.replace(/\s+/g, '')
  
  // Split category path by delimiter
  const categoryNames = categoryPath
    .split(normalizedDelimiter)
    .map(name => name.trim())
    .filter(name => name.length > 0)
  
  if (categoryNames.length === 0) {
    logger.warn(`Invalid category path: "${categoryPath}"`)
    return null
  }

  const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
  let parentCategoryId: string | null = null
  
  // Process each level of the hierarchy
  for (let i = 0; i < categoryNames.length; i++) {
    const originalCategoryName = categoryNames[i]
    
    // Translate category name to Bulgarian
    let categoryName = originalCategoryName
    if (ollamaService) {
      try {
        logger.debug(`Translating category name: "${originalCategoryName}"`)
        categoryName = originalCategoryName //await ollamaService.translate(originalCategoryName, 'bg')
        logger.debug(`Translated category name: "${originalCategoryName}" → "${categoryName}"`)
      } catch (error) {
        logger.warn(`Failed to translate category name "${originalCategoryName}": ${error instanceof Error ? error.message : 'Unknown'}. Using original name.`)
        categoryName = originalCategoryName
      }
    }
    
    const cacheKey = `${categoryName}|${parentCategoryId || 'null'}`
    
    // Check cache first
    if (categoryCache.has(cacheKey)) {
      parentCategoryId = categoryCache.get(cacheKey)!
      logger.debug(`Found category "${categoryName}" in cache with parent ${parentCategoryId || 'null'}`)
      continue
    }
    
    // Query existing category by name and parent
    try {
      const queryParams: any = { name: categoryName }
      if (parentCategoryId !== null) {
        queryParams.parent_category_id = parentCategoryId
      } else {
        // For root categories, explicitly set parent_category_id to null
        queryParams.parent_category_id = null
      }
      const existingCategories = await productService.listProductCategories(queryParams)
      
      if (existingCategories && existingCategories.length > 0) {
        // Category exists, use its ID
        const categoryId = existingCategories[0].id
        categoryCache.set(cacheKey, categoryId)
        parentCategoryId = categoryId
        logger.debug(`Found existing category "${categoryName}" with ID ${categoryId}`)
        continue
      }
    } catch (error) {
      logger.warn(`Error querying category "${categoryName}": ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      
      if (createdCategories && createdCategories.length > 0) {
        const categoryId = createdCategories[0].id
        categoryCache.set(cacheKey, categoryId)
        parentCategoryId = categoryId
        logger.info(`Created category "${categoryName}" with ID ${categoryId} (parent: ${parentCategoryId || 'null'})`)
      } else {
        throw new Error(`Failed to create category "${categoryName}"`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // If category already exists (handle conflict), try to find it and use it
      if (errorMessage.includes('already exists') || errorMessage.includes('handle')) {
        logger.debug(`Category "${categoryName}" already exists, attempting to find it`)
        
        try {
          // Try to find the existing category by name and parent
          const queryParams: any = { name: categoryName }
          if (parentCategoryId !== null) {
            queryParams.parent_category_id = parentCategoryId
          } else {
            queryParams.parent_category_id = null
          }
          
          const existingCategories = await productService.listProductCategories(queryParams)
          
          if (existingCategories && existingCategories.length > 0) {
            const categoryId = existingCategories[0].id
            categoryCache.set(cacheKey, categoryId)
            parentCategoryId = categoryId
            logger.info(`Found existing category "${categoryName}" with ID ${categoryId} (parent: ${parentCategoryId || 'null'})`)
            continue
          }
        } catch (findError) {
          logger.warn(`Error finding existing category "${categoryName}": ${findError instanceof Error ? findError.message : 'Unknown error'}`)
        }
      }
      
      // If we couldn't recover from the error, log and return null
      logger.error(`Error creating category "${categoryName}": ${errorMessage}`)
      return null
    }
  }
  
  return parentCategoryId
}

/**
 * Step: Process categories and brands
 */
const processCategoriesAndBrandsStep = createStep(
  'process-categories-brands',
  async (
    input: { products: MedusaProductData[]; ollamaUrl?: string; ollamaModel?: string },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productService: IProductModuleService = container.resolve(Modules.PRODUCT)

    // Initialize Ollama service for category translation
    const ollamaUrl = input.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
    const ollamaModel = input.ollamaModel || process.env.OLLAMA_MODEL || 'gemma3:latest'
    const ollamaService = new OllamaService({ baseUrl: ollamaUrl, model: ollamaModel })

    // Cache for category lookups (key: "categoryName|parentId" -> categoryId)
    const categoryCache = new Map<string, string>()
    const brandMap = new Map<string, string>() // brand name -> brand id
    
    // First pass: collect all unique categories and brands
    const uniqueCategories = new Set<string>()
    const uniqueBrands = new Set<string>()
    
    for (const product of input.products) {
      const categoryName = product.metadata?.category?.name
      const brandName = product.metadata?.producer?.name
      
      if (categoryName) {
        uniqueCategories.add(categoryName)
      }
      if (brandName) {
        uniqueBrands.add(brandName)
      }
    }
    
    logger.info(`Processing ${uniqueCategories.size} unique categories and ${uniqueBrands.size} unique brands`)
    logger.info(`Translating categories to Bulgarian using Ollama at ${ollamaUrl} with model ${ollamaModel}`)
    
    // Process all categories (create hierarchy if needed, with translation)
    for (const categoryPath of uniqueCategories) {
      try {
        const categoryId = await getOrCreateCategoryHierarchy(
          categoryPath,
          container,
          categoryCache,
          logger,
          ollamaService // Pass Ollama service
        )
        
        if (categoryId) {
          // Store in cache with full path as key for easy lookup
          categoryCache.set(categoryPath, categoryId)
          logger.debug(`Mapped category path "${categoryPath}" to ID ${categoryId}`)
        } else {
          logger.warn(`Failed to get or create category: "${categoryPath}"`)
        }
      } catch (error) {
        logger.warn(`Error processing category "${categoryPath}": ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }

    // Process all brands
    for (const brandName of uniqueBrands) {
      try {
        const brandModule = container.resolve(BRAND_MODULE)
        const brands = await (brandModule as any).listBrands({ name: brandName })
        
        if (brands && brands.length > 0) {
          brandMap.set(brandName, brands[0].id)
          logger.debug(`Found existing brand: ${brandName}`)
        } else {
          // Create new brand
          const newBrand = await (brandModule as any).createBrands([{ name: brandName }])
          if (newBrand && newBrand.length > 0) {
            brandMap.set(brandName, newBrand[0].id)
            logger.info(`Created brand: ${brandName}`)
          }
        }
      } catch (error) {
        logger.warn(`Error processing brand "${brandName}": ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }

    // Attach category and brand IDs to products
    const productsWithRelations = input.products.map((product) => {
      const categoryPath = product.metadata?.category?.name
      const brandName = product.metadata?.producer?.name

      // Get category ID from cache (using full path as key)
      const categoryId = categoryPath && categoryCache.has(categoryPath)
        ? categoryCache.get(categoryPath)!
        : null

      const categories = categoryId ? [{ id: categoryId }] : undefined

      // Brand will be handled separately via metadata for now
      // (Medusa doesn't have direct brand relation on products)

      return {
        ...product,
        categories,
      }
    })
    
    logger.info(`Processed categories and brands. ${categoryCache.size} categories cached, ${brandMap.size} brands cached`)
    return new StepResponse(productsWithRelations)
  }
)

/**
 * Step: Process images - download and upload to MinIO (production) or use URLs directly (development)
 */
const processImagesStep = createStep(
  'process-images',
  async (
    input: { products: MedusaProductData[] },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const shouldUploadToMinIO = !IS_DEV && MINIO_ENDPOINT
    const fileService = shouldUploadToMinIO ? container.resolve(Modules.FILE) : null

    logger.info(`Processing images for ${input.products.length} products (upload to MinIO: ${shouldUploadToMinIO ? 'YES' : 'NO - using URLs directly'})`)

    const processedProducts = await Promise.all(
      input.products.map(async (product, productIndex) => {
        const imageUrls = product.images || []
        
        if (imageUrls.length === 0) {
          logger.debug(`Product ${productIndex + 1} (${product.title || 'Unknown'}): No images to process`)
          return product
        }

        logger.debug(`Product ${productIndex + 1} (${product.title || 'Unknown'}): Processing ${imageUrls.length} image(s)`)

        if (!shouldUploadToMinIO || !fileService) {
          // Development mode: use original URLs directly
          logger.debug(`Product ${productIndex + 1}: Using original image URLs (development mode)`)
          return product
        }

        // Production mode: download and upload images to MinIO
        const uploadedImages: Array<{ url: string }> = []
        
        for (let imgIndex = 0; imgIndex < imageUrls.length; imgIndex++) {
          const img = imageUrls[imgIndex]
          try {
            // Fetch image from URL
            logger.debug(`Product ${productIndex + 1}, Image ${imgIndex + 1}: Fetching ${img.url}`)
            const response = await fetch(img.url)
            
            if (!response.ok) {
              logger.warn(`Product ${productIndex + 1}, Image ${imgIndex + 1}: Failed to fetch ${img.url}: ${response.statusText}`)
              uploadedImages.push(img) // Fallback to original URL
              continue
            }
            
            const imageBuffer = await response.arrayBuffer()
            const contentType = response.headers.get('content-type') || 'image/jpeg'
            
            // Extract filename from URL or generate one
            const urlPath = new URL(img.url).pathname
            const filename = urlPath.split('/').pop() || `product-${productIndex + 1}-image-${imgIndex + 1}.jpg`
            
            logger.debug(`Product ${productIndex + 1}, Image ${imgIndex + 1}: Uploading to MinIO as ${filename} (${contentType})`)
            
            // Upload to MinIO using File Module service
            const [uploadResult] = await fileService.createFiles([{
              filename,
              content: Buffer.from(imageBuffer).toString('binary'),
              mimeType: contentType,
            }])
            
            uploadedImages.push({ url: uploadResult.url })
            logger.info(`Product ${productIndex + 1}, Image ${imgIndex + 1}: Uploaded to MinIO: ${uploadResult.url}`)
          } catch (error) {
            logger.warn(`Product ${productIndex + 1}, Image ${imgIndex + 1}: Failed to upload ${img.url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            uploadedImages.push(img) // Fallback to original URL
          }
        }

        return {
          ...product,
          images: uploadedImages,
        }
      })
    )

    const productsWithImages = processedProducts.filter(p => p.images && p.images.length > 0)
    logger.info(`Processed images for ${processedProducts.length} products. ${productsWithImages.length} products have images.`)

    return new StepResponse(processedProducts)
  }
)

/**
 * Step: Get or create shipping profile
 */
const getShippingProfileStep = createStep(
  'get-shipping-profile',
  async (
    input: { shippingProfileId?: string },
    { container }: { container: MedusaContainer }
  ) => {
    if (input.shippingProfileId) {
      return new StepResponse(input.shippingProfileId)
    }

    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    try {
      // Try to find default shipping profile
      const profiles = await fulfillmentService.listShippingProfiles({})
      if (profiles && profiles.length > 0) {
        logger.info(`Using existing shipping profile: ${profiles[0].id}`)
        return new StepResponse(profiles[0].id)
      }
    } catch (error) {
      logger.warn(`Error fetching shipping profiles: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    // Create default shipping profile if none exists
    try {
      const { result } = await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: 'Default',
              type: 'default',
            },
          ],
        },
      })

      const profileId = (result as any)?.shipping_profiles?.[0]?.id || (result as any)?.[0]?.id
      if (profileId) {
        logger.info(`Created default shipping profile: ${profileId}`)
        return new StepResponse(profileId)
      }
    } catch (error) {
      logger.error(`Failed to create shipping profile: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    throw new Error('Could not get or create shipping profile')
  }
)

/**
 * Step: Get default sales channel
 */
const getDefaultSalesChannelStep = createStep(
  'get-default-sales-channel',
  async (
    input: {},
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const salesChannelService: ISalesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

    try {
      // Try to find default sales channel by name
      const salesChannels = await salesChannelService.listSalesChannels({
        name: 'Default Sales Channel',
      })

      if (salesChannels && salesChannels.length > 0) {
        logger.info(`Found default sales channel: ${salesChannels[0].id}`)
        return new StepResponse(salesChannels[0].id)
      }

      // If not found by name, try to get the first available sales channel
      const allSalesChannels = await salesChannelService.listSalesChannels({})
      if (allSalesChannels && allSalesChannels.length > 0) {
        logger.info(`Using first available sales channel: ${allSalesChannels[0].id}`)
        return new StepResponse(allSalesChannels[0].id)
      }

      logger.warn('No sales channels found - products will be imported without sales channel assignment')
      return new StepResponse(null)
    } catch (error) {
      logger.warn(`Error fetching sales channels: ${error instanceof Error ? error.message : 'Unknown'}`)
      return new StepResponse(null)
    }
  }
)

// Inventory management removed - variants will not have inventory tracking

/**
 * Step: Import products
 */
const importProductsStep = createStep(
  'import-products',
  async (
    input: {
      products: MedusaProductData[]
      shippingProfileId: string
      defaultSalesChannelId?: string | null
    },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productService: IProductModuleService = container.resolve(Modules.PRODUCT)

    let successful = 0
    let failed = 0
    const errors: string[] = []

    // Prepare products for import
    const productsToImport = input.products.map((product) => {
      const productData: any = {
        ...product,
        shipping_profile_id: input.shippingProfileId,
        status: product.status || 'draft',
      }

      // Add default sales channel if available
      if (input.defaultSalesChannelId) {
        productData.sales_channels = [{ id: input.defaultSalesChannelId }]
        logger.debug(`Adding product to sales channel: ${input.defaultSalesChannelId}`)
      }

      return productData
    })

    logger.info(`Importing ${productsToImport.length} products`)

    let handleToProductIdMap = new Map<string, string>()

    try {
      // First, check which products already exist by handle
      let productsToCreate: any[] = []
      const productsToUpdate: Array<{ product: any; existingId: string }> = []

      for (const product of productsToImport) {
        if (!product.handle) {
          // No handle, try to create (will fail if required)
          productsToCreate.push(product)
          continue
        }

        try {
          // Try to find existing product by handle
          const existingProducts = await productService.listProducts({
            handle: product.handle,
          })

          if (existingProducts && existingProducts.length > 0) {
            const existingProduct = existingProducts[0]
            productsToUpdate.push({ product, existingId: existingProduct.id })
            handleToProductIdMap.set(product.handle, existingProduct.id)
            logger.info(`Product with handle "${product.handle}" exists (ID: ${existingProduct.id}), will update`)
          } else {
            productsToCreate.push(product)
          }
        } catch (error) {
          // If lookup fails, try to create (might be a new product)
          logger.debug(`Could not check if product "${product.handle}" exists: ${error instanceof Error ? error.message : 'Unknown'}`)
          productsToCreate.push(product)
        }
      }

      logger.info(`Found ${productsToUpdate.length} existing products to update, ${productsToCreate.length} new products to create`)

      // Create new products
      let createdProducts: any[] = []
      if (productsToCreate.length > 0) {
        
        try {
          const { result } = await createProductsWorkflow(container).run({
            input: {
              products: productsToCreate,
            },
          })

          const products = Array.isArray(result) ? result : ((result as any)?.products || [])
          createdProducts = products

          // Add created products to the map and log variant info
          for (const createdProduct of products) {
            if (createdProduct.handle && createdProduct.id) {
              handleToProductIdMap.set(createdProduct.handle, createdProduct.id)
              logger.debug(`Created product "${createdProduct.handle}" with ID ${createdProduct.id}`)
              
              // Log variant info for debugging inventory
              if (createdProduct.variants && createdProduct.variants.length > 0) {
                for (const variant of createdProduct.variants) {
                  logger.debug(`  Variant: ${variant.id} (${variant.sku || variant.title}), manage_inventory: ${variant.manage_inventory}`)
                }
              }
            }
          }

          logger.info(`Successfully created ${products.length} new products`)
          
          // Small delay to ensure inventory items are created by MedusaJS
          await new Promise(resolve => setTimeout(resolve, 1000))
          logger.info('⏳ Waited 1s for inventory items to be created by MedusaJS')
        } catch (createError: any) {
          // Check if error is about existing products
          const errorMessage = createError?.message || String(createError)
          if (errorMessage.includes('already exists') && errorMessage.includes('handle')) {
            // Extract handle from error and try to update instead
            const handleMatch = errorMessage.match(/handle:\s*([^,]+)/i)
            if (handleMatch && handleMatch[1]) {
              const handle = handleMatch[1].trim()
              logger.info(`Product with handle "${handle}" already exists, will update instead`)
              
              // Find the product and move it to update list
              const productToMove = productsToCreate.find(p => p.handle === handle)
              if (productToMove) {
                try {
                  const existingProducts = await productService.listProducts({ handle })
                  if (existingProducts && existingProducts.length > 0) {
                    const existingProduct = existingProducts[0]
                    productsToUpdate.push({ product: productToMove, existingId: existingProduct.id })
                    handleToProductIdMap.set(handle, existingProduct.id)
                    productsToCreate = productsToCreate.filter(p => p.handle !== handle)
                    logger.info(`Moved product "${handle}" to update list`)
                  }
                } catch (lookupError) {
                  logger.warn(`Could not find existing product with handle "${handle}" for update`)
                }
              }
            }
          } else {
            // Re-throw if it's a different error
            throw createError
          }
        }
      }

      // Update existing products
      let updatedProducts: any[] = []
      if (productsToUpdate.length > 0) {
        logger.info(`Updating ${productsToUpdate.length} existing products`)
        
        updatedProducts = await Promise.all(
          productsToUpdate.map(async ({ product, existingId }) => {
            try {
              // Build update payload - only include fields that should be updated
              const updateData: any = {}

              if (product.title !== undefined) updateData.title = product.title
              if (product.description !== undefined) updateData.description = product.description
              if (product.subtitle !== undefined) updateData.subtitle = product.subtitle
              if (product.material !== undefined) updateData.material = product.material
              if (product.status !== undefined) updateData.status = product.status
              if (product.shipping_profile_id !== undefined) updateData.shipping_profile_id = product.shipping_profile_id
              if (product.metadata !== undefined) updateData.metadata = product.metadata

              // Handle variants - update existing or create new
              if (product.variants && Array.isArray(product.variants)) {
                updateData.variants = product.variants
              }

              // Update the product
              const updated = await productService.updateProducts(existingId, updateData)
              logger.info(`✅ Updated product "${product.handle}" (ID: ${existingId})`)
              return updated
            } catch (error) {
              logger.error(`❌ Failed to update product "${product.handle}": ${error instanceof Error ? error.message : 'Unknown error'}`)
              throw error
            }
          })
        )
      }

      // Combine created and updated products
      const products = [...createdProducts, ...updatedProducts]
      
      successful = products.length
      
      if (successful > 0) {
        logger.info(`Successfully processed ${successful} products (${createdProducts.length} created, ${updatedProducts.length} updated)`)
      } else {
        logger.warn('Import completed but no products returned')
      }
      
      logger.info(`Created handle-to-ID map with ${handleToProductIdMap.size} products`)

      // Assign categories to products after import (createProductsWorkflow doesn't always handle categories)
      const productsWithCategories = productsToImport.filter((p: any) => 
        p.categories && 
        Array.isArray(p.categories) && 
        p.categories.length > 0 &&
        p.handle && // Need handle to find the product
        handleToProductIdMap.has(p.handle) // Product was successfully imported
      )
    
    if (productsWithCategories.length > 0) {
      logger.info(`Assigning ${productsWithCategories.length} products to categories after import`)
      
      let categoriesAssigned = 0
      let categoriesFailed = 0
      
      // Assign categories to each product
      for (const product of productsWithCategories) {
        const productId = handleToProductIdMap.get(product.handle!)
        if (!productId) {
          logger.warn(`Could not find product ID for handle "${product.handle}" to assign categories`)
          categoriesFailed++
          continue
        }
        
        try {
          // Get existing product to check current categories
          const existingProduct = await productService.retrieveProduct(productId)
          const existingCategoryIds = existingProduct.categories?.map((c: any) => c.id) || []
          
          // Extract category IDs from product data
          const newCategoryIds = (product.categories || [])
            .map((cat: any) => typeof cat === 'object' && cat.id ? cat.id : cat)
            .filter((id: string) => id && !existingCategoryIds.includes(id))
          
          if (newCategoryIds.length > 0) {
            // Update product with all categories (existing + new)
            // Use category_ids instead of categories for UpdateProductDTO
            const allCategoryIds = [...existingCategoryIds, ...newCategoryIds]
            await productService.updateProducts(productId, {
              category_ids: allCategoryIds
            })
            logger.info(`✅ Assigned product "${product.handle}" (ID: ${productId}) to ${newCategoryIds.length} category/categories: ${newCategoryIds.join(', ')}`)
            categoriesAssigned++
          } else {
            logger.debug(`Product "${product.handle}" already has all categories assigned`)
            categoriesAssigned++
          }
        } catch (error) {
          logger.error(`❌ Failed to assign categories to product "${product.handle}": ${error instanceof Error ? error.message : 'Unknown error'}`)
          if (error instanceof Error && error.stack) {
            logger.error(`Category assignment error stack: ${error.stack}`)
          }
          categoriesFailed++
        }
      }
      
        logger.info(`Category assignment complete: ${categoriesAssigned} succeeded, ${categoriesFailed} failed`)
      } else {
        logger.debug(`No products with categories to assign (${productsToImport.length} products imported, ${handleToProductIdMap.size} in map)`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : String(error)
      logger.error(`Failed to import products: ${errorMessage}`)
      logger.error(`Error details: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
      logger.error(`Error stack: ${errorStack}`)
      failed = productsToImport.length
      errors.push(errorMessage)
    }

    return new StepResponse({
      successful,
      failed,
      total: productsToImport.length,
      errors,
    })
  }
)


/**
 * Step: Calculate final import status
 */
const calculateImportStatusStep = createStep(
  'calculate-import-status',
  async (input: {
    sessionId: string
    total: number
    successful: number
    failed: number
  }) => {
    const status: 'completed' | 'completed_with_errors' | 'failed' =
      input.failed > 0
        ? (input.successful > 0 ? 'completed_with_errors' : 'failed')
        : 'completed'

    return new StepResponse({
      sessionId: input.sessionId,
      totalProducts: input.total,
      successfulProducts: input.successful,
      failedProducts: input.failed,
      status,
    })
  }
)

/**
 * Step: Clean up XML file from disk
 */
const cleanupXmlFileStep = createStep(
  'cleanup-xml-file',
  async (
    input: { sessionId: string },
    { container }: { container: MedusaContainer }
  ) => {
    const importerService: InnProXmlImporterService = container.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    try {
      // Get XML file path from session
      const xmlFilePath = await importerService.getXmlFilePath(input.sessionId)
      
      if (xmlFilePath) {
        // Clean up XML file
        await importerService.cleanupXmlFile(xmlFilePath)
        logger.info(`Cleaned up XML file for session ${input.sessionId}`)
      } else {
        logger.debug(`No XML file path found for session ${input.sessionId}, skipping cleanup`)
      }

      return new StepResponse({ cleaned: !!xmlFilePath })
    } catch (error) {
      logger.warn(`Failed to clean up XML file for session ${input.sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Don't fail the workflow if cleanup fails
      return new StepResponse({ cleaned: false })
    }
  }
)

/**
 * Main InnPro XML Import Workflow
 */
export const innproXmlImportWorkflow = createWorkflow<
  WorkflowInput,
  WorkflowOutput,
  []
>('innpro-xml-import', function (input) {
  const { sessionId, shippingProfileId, filters, ollamaUrl, ollamaModel } = input

  // Step 1: Get session and extract products
  const sessionData = getSessionProductsStep({ sessionId })

  // Step 2: Map products to Medusa format
  const mappedData = mapProductsStep({ products: sessionData.products })

  // Step 3: Translate products to Bulgarian
  const translatedData = translateProductsStep({
    products: mappedData.products,
    ollamaUrl,
    ollamaModel,
  })

  // Step 4: Optimize descriptions for SEO
  const optimizedData = optimizeDescriptionsStep({
    products: translatedData.products,
    ollamaUrl,
    ollamaModel,
  })

  // Step 5: Process categories and brands (with translation)
  const productsWithRelations = processCategoriesAndBrandsStep({
    products: optimizedData.products,
    ollamaUrl,
    ollamaModel,
  })

  // Step 7: Process images
  const productsWithImages = processImagesStep({
    products: productsWithRelations,
  })

  // Step 8: Get or create shipping profile
  const resolvedShippingProfileId = getShippingProfileStep({ shippingProfileId })

  // Step 8.5: Get default sales channel
  const defaultSalesChannelId = getDefaultSalesChannelStep()

  // Step 9: Import products (without inventory tracking)
  const importResult = importProductsStep({
    products: productsWithImages,
    shippingProfileId: resolvedShippingProfileId,
    defaultSalesChannelId,
  })

  // Step 10: Calculate final status
  const finalResult = calculateImportStatusStep({
    sessionId,
    total: importResult.total,
    successful: importResult.successful,
    failed: importResult.failed,
  })

  // Step 11: Clean up XML file from disk
  cleanupXmlFileStep({ sessionId })

  return new WorkflowResponse(finalResult)
})

export default innproXmlImportWorkflow
