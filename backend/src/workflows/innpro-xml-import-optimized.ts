import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'
import { MedusaContainer, ISalesChannelModuleService, IProductModuleService } from '@medusajs/framework/types'
import { createProductsWorkflow, createShippingProfilesWorkflow } from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { CATEGORY_EXTENSION_MODULE } from '../modules/category-extension'
import { ulid } from 'ulid'
import { INNPRO_XML_IMPORTER_MODULE } from '../modules/innpro-xml-importer'
import InnProXmlImporterService from '../modules/innpro-xml-importer/service'
import { BRAND_MODULE } from '../modules/brand'
import { IS_DEV, MINIO_ENDPOINT } from '../lib/constants'
import { MedusaProductData, SelectionFilters } from '../modules/innpro-xml-importer/types'
import { ChatGPTService } from '../modules/innpro-xml-importer/services/chatgpt'
// import { OllamaService } from '../modules/innpro-xml-importer/services/ollama' // Commented out: using GPT instead
import { extractSpecificationsTable, extractIncludedSection } from '../modules/innpro-xml-importer/utils/html-parser'

/** When true, run only session + map + processCategoriesAndBrands (no translate, no SEO, no images/product import). Category names stay in source language. Set DEBUG_CATEGORIES_ONLY=true to debug category logic quickly. */
const DEBUG_CATEGORIES_ONLY = process.env.DEBUG_CATEGORIES_ONLY === 'true'

/** Concurrency for product import loop: 0 = sequential (default until import verified); set to e.g. 5 in code to enable parallel. */
const PRODUCT_IMPORT_CONCURRENCY = 0

type WorkflowInput = {
  sessionId: string
  shippingProfileId?: string
  filters?: SelectionFilters
  openaiApiKey?: string
  openaiModel?: string
  // ollamaUrl?: string
  // ollamaModel?: string
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
    input: { products: MedusaProductData[]; openaiApiKey?: string; openaiModel?: string },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const openaiApiKey = input.openaiApiKey || process.env.OPENAI_API_KEY
    const openaiModel = input.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini'

    logger.info(`Translating ${input.products.length} products to Bulgarian using ChatGPT (model: ${openaiModel})`)

    try {
      const chatgptService = new ChatGPTService({ apiKey: openaiApiKey!, model: openaiModel })
      // Ollama: const ollamaService = new OllamaService({ baseUrl: ollamaUrl, model: ollamaModel })
      // Process products sequentially (one at a time) to avoid timeouts
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
              // Store temporarily for SEO step - will be removed after import
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
            // SKIP BRAND TRANSLATION - Keep producer/brand names as-is
            // if (product.metadata.producer?.name) {
            //   textsToTranslate.push({ field: 'producer_name', value: product.metadata.producer.name })
            // }
            if (product.metadata.category?.name) {
              textsToTranslate.push({ field: 'category_name', value: product.metadata.category.name })
            }
            // SKIP RESPONSIBLE PRODUCER - Usually same as brand, keep as-is
            // if (product.metadata.responsible_producer?.name) {
            //   textsToTranslate.push({ field: 'responsible_producer_name', value: product.metadata.responsible_producer.name })
            // }
          }

          // Translate title separately (preserves brand/model)
          let translatedTitle = product.title
          if (product.title && brandName) {
            try {
              translatedTitle = await chatgptService.translateTitle(product.title, brandName, 'bg')
            } catch (error) {
              logger.warn(`Failed to translate title for product ${index + 1}, using original`)
            }
          } else if (product.title) {
            // Fallback to regular translation if no brand
            try {
              translatedTitle = await chatgptService.translate(product.title, 'bg')
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
            const translations = await chatgptService.translateBatch(texts, 'bg')
            
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
              // SKIP BRAND TRANSLATION - Keep original
              // } else if (item.field === 'producer_name' && translatedProduct.metadata && (translatedProduct.metadata as any).producer) {
              //   (translatedProduct.metadata as any).producer.name = translation
              } else if (item.field === 'category_name' && translatedProduct.metadata && (translatedProduct.metadata as any).category) {
                const cat = (translatedProduct.metadata as any).category
                if (cat.original_name === undefined) cat.original_name = cat.name
                cat.name = translation
              // SKIP RESPONSIBLE PRODUCER - Keep original
              // } else if (item.field === 'responsible_producer_name' && translatedProduct.metadata && (translatedProduct.metadata as any).responsible_producer) {
              //   (translatedProduct.metadata as any).responsible_producer.name = translation
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
    input: { products: MedusaProductData[]; openaiApiKey?: string; openaiModel?: string },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const openaiApiKey = input.openaiApiKey || process.env.OPENAI_API_KEY
    const openaiModel = input.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini'

    logger.info(`Optimizing descriptions for ${input.products.length} products using ChatGPT (model: ${openaiModel})`)

    try {
      const chatgptService = new ChatGPTService({ apiKey: openaiApiKey!, model: openaiModel })
      // Ollama: const ollamaService = new OllamaService({ baseUrl: ollamaUrl, model: ollamaModel })
      // Process products sequentially (one at a time) to avoid timeouts
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
          const metaContent = await chatgptService.generateMetaDescription(product, originalDescriptionEn)
          
          // Step 1b: Optimize product description (150-400 words for on-page)
          logger.info(`Product ${index + 1}: Step 1b/4 - Optimizing product description (${originalDescriptionEn.length} chars)`)
          const descriptionContent = await chatgptService.optimizeDescription(product, originalDescriptionEn)

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
          const includedItems = await chatgptService.extractIncludedItems(originalDescriptionEn) || 
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
          const specificationsTable = await chatgptService.extractTechnicalData(originalDescriptionEn) ||
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
          
          // Remove temporary field before saving
          const { original_description_en, ...cleanMetadata } = product.metadata || {}
          
          optimizedProducts.push({
            ...product,
            description, // This is the on-page product description (150-400 words, Bulgarian, SEO-optimized)
            metadata: {
              ...cleanMetadata,
              // SEO meta tags (for <head>)
              seo_meta_title: metaTitle,
              seo_meta_description: metaDescription,
              // Additional structured content (for tabs/sections in product page)
              specifications_table: specificationsTable || undefined,
              included_items: includedItems || undefined,
              // REMOVED redundant fields:
              // - original_description_en (temporary, not needed in DB)
              // - seo_short_description (can be generated from main description)
              // - technical_safe_description (redundant with main description)
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


/** Source category info: untranslated name path and external id (for extension lookup and deduplication). */
type CategorySourceInfo = { sourcePath: string; externalId: string | null; seoTitle?: string | null; seoMetaDescription?: string | null }

/** Slug for handle: lowercase, spaces to hyphens, remove commas (matches Medusa-style handle). */
function slugifyForHandle(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/,/g, '')
    .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'category'
}

/**
 * Helper: Get or create category hierarchy.
 * Existence check uses original_name OR external_id (either match with correct parent is enough).
 * - When we have external_id for this segment (leaf): try external_id first; if no match, try original_name.
 * - When we have no external_id (e.g. parent segment): try original_name only.
 * If found we use that category and assign products to it; no model calls.
 * If not found we create the category and run the model for description/SEO.
 * When we find by original_name and have an external_id for this segment we update the extension to set external_id.
 */
async function getOrCreateCategoryHierarchy(
  categoryPath: string,
  container: MedusaContainer,
  categoryCache: Map<string, string>,
  logger: any,
  chatgptService?: ChatGPTService,
  sourceInfo?: CategorySourceInfo
): Promise<string | null> {
  if (!categoryPath || categoryPath.trim().length === 0) {
    return null
  }

  const normalizePath = (p: string) => p.trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ')
  const normalizedPath = normalizePath(categoryPath)
  if (categoryCache.has(normalizedPath)) {
    const existingId = categoryCache.get(normalizedPath)!
    logger.debug(`Found existing category by full path "${normalizedPath}" -> ${existingId}`)
    return existingId
  }
  if (sourceInfo?.sourcePath) {
    const normalizedSource = normalizePath(sourceInfo.sourcePath)
    if (categoryCache.has(normalizedSource)) {
      const existingId = categoryCache.get(normalizedSource)!
      logger.debug(`Found existing category by full source path "${normalizedSource}" -> ${existingId}`)
      return existingId
    }
  }

  const delimiter = '/'
  const categoryNames = categoryPath
    .split(delimiter)
    .map(name => name.trim())
    .filter(name => name.length > 0)
  const sourceSegmentNames = (sourceInfo?.sourcePath ?? categoryPath)
    .split(delimiter)
    .map(name => name.trim())
    .filter(name => name.length > 0)
  if (categoryNames.length === 0) {
    logger.warn(`Invalid category path: "${categoryPath}"`)
    return null
  }
  // Align segment counts (e.g. if source has fewer segments, pad with last; if more, trim)
  while (sourceSegmentNames.length < categoryNames.length) {
    sourceSegmentNames.push(sourceSegmentNames[sourceSegmentNames.length - 1] ?? categoryNames[categoryNames.length - 1]!)
  }
  if (sourceSegmentNames.length > categoryNames.length) {
    sourceSegmentNames.length = categoryNames.length
  }

  const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
  const categoryExtensionService = container.resolve(CATEGORY_EXTENSION_MODULE) as {
    listCategoryExtensions: (args: { original_name?: string; external_id?: string }) => Promise<{ id: string; external_id?: string | null; original_name?: string }[]>
    createCategoryExtensions: (data: { original_name: string; external_id?: string | null; description?: string | null; seo_title?: string | null; seo_meta_description?: string | null }[]) => Promise<{ id: string }[]>
    updateCategoryExtensions: (data: { id: string; external_id?: string | null }[]) => Promise<unknown>
  }
  const link = container.resolve(ContainerRegistrationKeys.LINK) as {
    create: (data: Record<string, Record<string, string>>) => Promise<unknown>
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: Array<Record<string, unknown>> }>
  }

  // Explicit exists check: XML id → our external_id, or XML leaf → our original_name (same as other cases)
  try {
    if (sourceInfo?.externalId) {
      const byExternalId = await categoryExtensionService.listCategoryExtensions({ external_id: sourceInfo.externalId })
      if (byExternalId?.length > 0) {
        const extensionIds = byExternalId.map((e: { id: string }) => e.id)
        const { data: categoriesWithExtension } = await query.graph({
          entity: 'product_category',
          fields: ['id', 'parent_category_id', 'category_extension.id', 'categoryExtension.id'],
        })
        const match = categoriesWithExtension?.find(
          (c: Record<string, unknown>) => {
            const ext = (c.category_extension ?? c.categoryExtension) as { id: string } | { id: string }[] | undefined
            const extId = Array.isArray(ext) ? ext[0]?.id : ext?.id
            return extId && extensionIds.includes(extId)
          }
        )
        if (match) {
          const categoryId = match.id as string
          categoryCache.set(normalizedPath, categoryId)
          if (sourceInfo?.sourcePath) categoryCache.set(normalizePath(sourceInfo.sourcePath), categoryId)
          logger.debug(`Found existing category by XML id (external_id) "${sourceInfo.externalId}" -> ${categoryId}`)
          return categoryId
        }
      }
    }
    const leafFromXml = sourceSegmentNames[sourceSegmentNames.length - 1]?.trim() || categoryNames[categoryNames.length - 1]?.trim()
    if (leafFromXml) {
      const byOriginalName = await categoryExtensionService.listCategoryExtensions({ original_name: leafFromXml })
      if (byOriginalName?.length > 0) {
        const extensionIds = byOriginalName.map((e: { id: string }) => e.id)
        const { data: categoriesWithExtension } = await query.graph({
          entity: 'product_category',
          fields: ['id', 'parent_category_id', 'category_extension.id', 'categoryExtension.id'],
        })
        const candidates = (categoriesWithExtension ?? []).filter(
          (c: Record<string, unknown>) => {
            const ext = (c.category_extension ?? c.categoryExtension) as { id: string } | { id: string }[] | undefined
            const extId = Array.isArray(ext) ? ext[0]?.id : ext?.id
            return extId && extensionIds.includes(extId)
          }
        ) as Array<Record<string, unknown>>
        if (candidates.length === 1) {
          const categoryId = candidates[0].id as string
          categoryCache.set(normalizedPath, categoryId)
          if (sourceInfo?.sourcePath) categoryCache.set(normalizePath(sourceInfo.sourcePath), categoryId)
          logger.debug(`Found existing category by XML leaf (original_name) "${leafFromXml}" -> ${categoryId}`)
          return categoryId
        }
        if (candidates.length > 1) {
          const allCategories = (categoriesWithExtension ?? []) as Array<Record<string, unknown>>
          const idToCat = new Map<string, { id: string; parent_category_id: string | null; extId: string }>()
          const allExtIds = new Set<string>()
          for (const c of allCategories) {
            const ext = (c.category_extension ?? c.categoryExtension) as { id: string } | { id: string }[] | undefined
            const extId = Array.isArray(ext) ? ext[0]?.id : ext?.id
            if (c.id && extId) {
              idToCat.set(c.id as string, { id: c.id as string, parent_category_id: (c.parent_category_id ?? null) as string | null, extId })
              allExtIds.add(extId)
            }
          }
          let extIdToOriginalName = new Map(byOriginalName.map((e) => [e.id, e.original_name ?? '']))
          if (allExtIds.size > byOriginalName.length) {
            try {
              const allExts = await categoryExtensionService.listCategoryExtensions({ id: [...allExtIds] } as { original_name?: string; external_id?: string; id?: string[] })
              if (allExts?.length) extIdToOriginalName = new Map((allExts as Array<{ id: string; original_name?: string }>).map((e) => [e.id, e.original_name ?? '']))
            } catch (_) { /* use only leaf extensions */ }
          }
          const buildPathFromLeaf = (leafCategoryId: string): string => {
            const pathSegments: string[] = []
            let currentId: string | null = leafCategoryId
            while (currentId) {
              const cat = idToCat.get(currentId)
              if (!cat) break
              const name = extIdToOriginalName.get(cat.extId) ?? ''
              pathSegments.unshift(name.trim())
              currentId = cat.parent_category_id
            }
            return normalizePath(pathSegments.join('/'))
          }
          const normalizedSource = sourceInfo?.sourcePath ? normalizePath(sourceInfo.sourcePath) : normalizedPath
          for (const c of candidates) {
            const categoryId = c.id as string
            const candidatePath = buildPathFromLeaf(categoryId)
            if (candidatePath === normalizedSource) {
              categoryCache.set(normalizedPath, categoryId)
              if (sourceInfo?.sourcePath) categoryCache.set(normalizePath(sourceInfo.sourcePath), categoryId)
              logger.debug(`Found existing category by XML leaf + path match "${leafFromXml}" -> ${categoryId}`)
              return categoryId
            }
          }
        }
      }
    }
  } catch (e) {
    logger.debug(`Exists check (external_id / original_name) failed: ${e instanceof Error ? e.message : 'Unknown'}`)
  }

  let parentCategoryId: string | null = null

  for (let i = 0; i < categoryNames.length; i++) {
    const translatedSegment = categoryNames[i]
    const originalCategoryName = sourceSegmentNames[i] ?? translatedSegment
    const isLeaf = i === categoryNames.length - 1
    const externalIdForSegment = isLeaf ? (sourceInfo?.externalId ?? null) : null
    const cacheKey = `${translatedSegment}|${parentCategoryId ?? 'null'}`

    if (categoryCache.has(cacheKey)) {
      parentCategoryId = categoryCache.get(cacheKey)!
      logger.debug(`Found category "${originalCategoryName}" in cache (parent: ${parentCategoryId ?? 'null'})`)
      continue
    }

    try {
      if (externalIdForSegment) {
        const byExternalId = await categoryExtensionService.listCategoryExtensions({ external_id: externalIdForSegment })
        if (byExternalId?.length > 0) {
          const extensionIds = byExternalId.map((e: { id: string }) => e.id)
          const { data: categoriesWithExtension } = await query.graph({
            entity: 'product_category',
            fields: ['id', 'parent_category_id', 'category_extension.id', 'categoryExtension.id'],
          })
          const match = categoriesWithExtension?.find(
            (c: Record<string, unknown>) => {
              const ext = (c.category_extension ?? c.categoryExtension) as { id: string } | { id: string }[] | undefined
              const extId = Array.isArray(ext) ? ext[0]?.id : ext?.id
              const hasMatch = extId && extensionIds.includes(extId)
              const parentMatch = (c.parent_category_id === null && parentCategoryId === null) || (c.parent_category_id === parentCategoryId)
              return hasMatch && parentMatch
            }
          )
          if (match) {
            const categoryId = match.id as string
            categoryCache.set(cacheKey, categoryId)
            parentCategoryId = categoryId
            logger.debug(`Found category by external_id "${externalIdForSegment}" with ID ${categoryId}`)
            continue
          }
        }
      }
      const extensions = await categoryExtensionService.listCategoryExtensions({ original_name: originalCategoryName })
      if (extensions?.length > 0) {
        const extensionIds = extensions.map((e: { id: string }) => e.id)
        const { data: categoriesWithExtension } = await query.graph({
          entity: 'product_category',
          fields: ['id', 'parent_category_id', 'category_extension.id', 'categoryExtension.id'],
        })
        const match = categoriesWithExtension?.find(
          (c: Record<string, unknown>) => {
            const ext = (c.category_extension ?? c.categoryExtension) as { id: string } | { id: string }[] | undefined
            const extId = Array.isArray(ext) ? ext[0]?.id : ext?.id
            const hasMatchingExtension = extId && extensionIds.includes(extId)
            const parentMatch = (c.parent_category_id === null && parentCategoryId === null) || (c.parent_category_id === parentCategoryId)
            return hasMatchingExtension && parentMatch
          }
        )
        if (match) {
          const categoryId = match.id as string
          const ext = (match.category_extension ?? match.categoryExtension) as { id: string } | { id: string }[] | undefined
          const extId = Array.isArray(ext) ? ext[0]?.id : ext?.id
          if (extId && externalIdForSegment) {
            const extRecord = extensions.find((e: { id: string; external_id?: string | null }) => e.id === extId)
            if (extRecord && extRecord.external_id == null) {
              await categoryExtensionService.updateCategoryExtensions([{ id: extId, external_id: externalIdForSegment }])
              logger.debug(`Set external_id "${externalIdForSegment}" on extension ${extId} (found by original_name)`)
            }
          }
          categoryCache.set(cacheKey, categoryId)
          parentCategoryId = categoryId
          logger.debug(`Found category by original_name "${originalCategoryName}" with ID ${categoryId}`)
          continue
        }
      }
    } catch (e) {
      logger.debug(`Extension lookup failed for "${originalCategoryName}": ${e instanceof Error ? e.message : 'Unknown'}`)
    }

    const categoryName = translatedSegment.trim().replace(/\s+/g, ' ')
    try {
      const createdCategories = await productService.createProductCategories([
        { name: categoryName, parent_category_id: parentCategoryId, is_active: true },
      ])
      if (!createdCategories?.length) throw new Error(`Failed to create category "${categoryName}"`)
      const categoryId = createdCategories[0].id

      const fullPath = categoryNames.slice(0, i + 1).join('/')
      let generatedDesc: string | null = null
      if (chatgptService) {
        try {
          generatedDesc = await chatgptService.generateCategoryDescription(fullPath) || null
        } catch (e) {
          logger.debug(`Category description generation failed for "${fullPath}": ${e instanceof Error ? e.message : 'Unknown'}`)
        }
      }
      // Ollama: if (ollamaService) { generatedDesc = await ollamaService.generateCategoryDescription(fullPath) || null }
      const extPayload = {
        original_name: originalCategoryName,
        external_id: externalIdForSegment,
        description: generatedDesc,
        seo_title: categoryName,
        seo_meta_description: generatedDesc,
      }
      const [createdExtension] = await categoryExtensionService.createCategoryExtensions([extPayload])
      if (createdExtension?.id) {
        await link.create({
          [Modules.PRODUCT]: { product_category_id: categoryId },
          [CATEGORY_EXTENSION_MODULE]: { category_extension_id: createdExtension.id },
        })
      }

      categoryCache.set(cacheKey, categoryId)
      parentCategoryId = categoryId
      logger.info(`Created category "${categoryName}" (original: "${originalCategoryName}", external_id: ${extPayload.external_id ?? 'null'}) with ID ${categoryId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('already exists') || errorMessage.includes('handle')) {
        try {
          const queryParams: any = { name: categoryName, parent_category_id: parentCategoryId !== null ? parentCategoryId : null }
          const existingCategories = await productService.listProductCategories(queryParams)
          if (existingCategories?.length) {
            const categoryId = existingCategories[0].id
            categoryCache.set(cacheKey, categoryId)
            parentCategoryId = categoryId
            continue
          }
        } catch (findError) {
          logger.warn(`Error finding existing category: ${findError instanceof Error ? findError.message : 'Unknown'}`)
        }
      }
      logger.error(`Error creating category "${categoryName}": ${errorMessage}`)
      return null
    }
  }

  return parentCategoryId
}

/**
 * Pre-load existing product categories (with extensions) into cache and lookups so we use them
 * instead of creating/translating again. Call at the start of processCategoriesAndBrandsStep.
 */
async function preLoadExistingCategories(
  container: MedusaContainer,
  categoryCache: Map<string, string>,
  categoryByExternalId: Record<string, string>,
  categoryByPath: Record<string, string>,
  categoryByOriginalNameLeaf: Record<string, string>,
  logger: { info: (msg: string) => void; debug: (msg: string) => void }
): Promise<void> {
  const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: Array<Record<string, unknown>> }>
  }
  const categoryExtensionService = container.resolve(CATEGORY_EXTENSION_MODULE) as {
    listCategoryExtensions: (args: { id?: string[] }) => Promise<Array<{ id: string; external_id?: string | null; original_name?: string }>>
  }

  let categories: Array<{ id: string; name?: string; parent_category_id?: string | null }> = []
  try {
    categories = await productService.listProductCategories({}, { take: 1000 })
  } catch (e) {
    logger.debug(`Pre-load listProductCategories failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    return
  }
  if (!categories?.length) return

  const categoryIds = categories.map((c) => c.id)
  let withExt: Array<Record<string, unknown>> = []
  try {
    const result = await query.graph({
      entity: 'product_category',
      fields: ['id', 'name', 'parent_category_id', 'category_extension.id', 'categoryExtension.id'],
      filters: { id: categoryIds },
    })
    withExt = result?.data ?? []
  } catch (e) {
    logger.debug(`Pre-load query.graph categories failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    return
  }

  const extIds = new Set<string>()
  const categoryIdToExtId = new Map<string, string>()
  for (const c of withExt) {
    const ext = (c.category_extension ?? c.categoryExtension) as { id: string } | { id: string }[] | undefined
    const extId = Array.isArray(ext) ? ext[0]?.id : ext?.id
    if (extId && c.id) {
      extIds.add(extId)
      categoryIdToExtId.set(c.id as string, extId)
    }
  }

  let extensions: Array<{ id: string; external_id?: string | null; original_name?: string }> = []
  if (extIds.size > 0) {
    try {
      extensions = await categoryExtensionService.listCategoryExtensions({ id: [...extIds] }) ?? []
    } catch (e) {
      logger.debug(`Pre-load listCategoryExtensions failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    }
  }
  const extIdToData = new Map(extensions.map((e) => [e.id, e]))

  const idToCategory = new Map<string, { id: string; name: string; parent_category_id: string | null; external_id: string | null; original_name: string }>()
  for (const c of withExt) {
    const id = c.id as string
    const name = (c.name as string) ?? ''
    const parentId = (c.parent_category_id ?? null) as string | null
    const extId = categoryIdToExtId.get(id)
    const ext = extId ? extIdToData.get(extId) : undefined
    idToCategory.set(id, {
      id,
      name,
      parent_category_id: parentId,
      external_id: ext?.external_id ?? null,
      original_name: ext?.original_name ?? name,
    })
  }

  function buildPath(categoryId: string): { pathNames: string[]; pathOriginalNames: string[]; pathIds: string[] } {
    const pathNames: string[] = []
    const pathOriginalNames: string[] = []
    const pathIds: string[] = []
    let currentId: string | null = categoryId
    while (currentId) {
      const cat = idToCategory.get(currentId)
      if (!cat) break
      pathIds.unshift(cat.id)
      pathNames.unshift(cat.name || cat.original_name || '')
      pathOriginalNames.unshift(cat.original_name || cat.name || '')
      currentId = cat.parent_category_id
    }
    return { pathNames, pathOriginalNames, pathIds }
  }

  const normalizePath = (p: string) => p.trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ')
  const EXTERNAL_ID_PREFIX = 'external_id:'
  for (const [categoryId, cat] of idToCategory) {
    const { pathNames, pathOriginalNames, pathIds } = buildPath(categoryId)
    if (pathIds.length === 0) continue
    const fullPath = normalizePath(pathNames.join('/'))
    const fullPathSource = normalizePath(pathNames.map((_, i) => idToCategory.get(pathIds[i])?.original_name ?? pathNames[i]).join('/'))
    let parentId: string | null = null
    for (let i = 0; i < pathIds.length; i++) {
      const segmentName = (pathNames[i] ?? '').trim() || pathIds[i]
      const segmentOriginal = (pathOriginalNames[i] ?? '').trim() || pathIds[i]
      const cacheKeyByName = `${segmentName}|${parentId ?? 'null'}`
      const cacheKeyByOriginal = `${segmentOriginal}|${parentId ?? 'null'}`
      if (!categoryCache.has(cacheKeyByName)) categoryCache.set(cacheKeyByName, pathIds[i])
      if (!categoryCache.has(cacheKeyByOriginal)) categoryCache.set(cacheKeyByOriginal, pathIds[i])
      parentId = pathIds[i]
    }
    categoryCache.set(fullPath, categoryId)
    categoryCache.set(fullPathSource, categoryId)
    if (cat.external_id) {
      categoryCache.set(`${EXTERNAL_ID_PREFIX}${cat.external_id}`, categoryId)
      categoryByExternalId[cat.external_id] = categoryId
    }
    categoryByPath[fullPath] = categoryId
    categoryByPath[fullPathSource] = categoryId
    const leaf = pathNames[pathNames.length - 1]?.trim()
    const leafSource = fullPathSource.split('/').map((s) => s.trim()).filter(Boolean).pop()
    if (leaf) categoryByOriginalNameLeaf[leaf] = categoryId
    if (leafSource) categoryByOriginalNameLeaf[leafSource] = categoryId
  }
  logger.info(`Pre-loaded ${idToCategory.size} existing categories into lookup (${Object.keys(categoryByExternalId).length} by external_id, ${Object.keys(categoryByPath).length} by path, ${Object.keys(categoryByOriginalNameLeaf).length} by leaf)`)
}

/**
 * Step: Process categories and brands
 */
const processCategoriesAndBrandsStep = createStep(
  'process-categories-brands',
  async (
    input: { products: MedusaProductData[]; openaiApiKey?: string; openaiModel?: string },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productService: IProductModuleService = container.resolve(Modules.PRODUCT)

    // Use ChatGPT for category path translation and category description/SEO
    const openaiApiKey = input.openaiApiKey || process.env.OPENAI_API_KEY
    const openaiModel = input.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const chatgptService = openaiApiKey ? new ChatGPTService({ apiKey: openaiApiKey, model: openaiModel }) : null
    // Ollama: const ollamaUrl = input.ollamaUrl || process.env.OLLAMA_URL; const ollamaModel = input.ollamaModel || process.env.OLLAMA_MODEL; const ollamaService = new OllamaService({ baseUrl: ollamaUrl, model: ollamaModel })

    // Cache for category lookups (key: "translatedSegment|parentId" -> categoryId). Extension uses original_name and external_id.
    const categoryCache = new Map<string, string>()
    const brandMap = new Map<string, string>() // brand name -> brand id

    // Pre-load existing categories so we use them instead of creating/translating again (fixes re-import and category assignment)
    const categoryByExternalId: Record<string, string> = {}
    const categoryByPath: Record<string, string> = {}
    const categoryByOriginalNameLeaf: Record<string, string> = {}
    await preLoadExistingCategories(container, categoryCache, categoryByExternalId, categoryByPath, categoryByOriginalNameLeaf, logger)

    // Build map: translated path -> { sourcePath, externalId }. Prefer longest path per external_id so we never
    // create a leaf as top-level when it should be a child (e.g. avoid creating "Инструменти..." top-level when
    // we also have "RC модели/Инструменти..." — process only the full path and attach the child to the parent).
    const categoryEntries = new Map<string, { sourcePath: string; externalId: string | null }>()
    const pathByExternalId = new Map<string, string>() // external_id -> path with most segments
    for (const product of input.products) {
      const cat = product.metadata?.category
      if (!cat?.name) continue
      const translatedPath = (cat.name as string).trim().replace(/\s*\/\s*/g, '/') // normalize slash
      const sourcePath = (cat.original_name ?? cat.name) as string
      const externalId = cat.id != null ? String(cat.id) : null
      const segments = translatedPath.split('/').filter(Boolean).length
      if (externalId) {
        const existing = pathByExternalId.get(externalId)
        const existingSegments = existing ? existing.split('/').filter(Boolean).length : 0
        if (segments > existingSegments) pathByExternalId.set(externalId, translatedPath)
      }
      if (!categoryEntries.has(translatedPath)) categoryEntries.set(translatedPath, { sourcePath, externalId })
    }
    // For each external_id, keep only the longest path in categoryEntries (drop shorter paths that share the same external_id)
    if (pathByExternalId.size) {
      for (const [path, entry] of categoryEntries.entries()) {
        if (entry.externalId && pathByExternalId.get(entry.externalId) !== path) {
          categoryEntries.delete(path)
        }
      }
    }

    // Translate category paths to target language (e.g. Bulgarian) so names and SEO are in the right language
    // even when product translation was skipped (e.g. DEBUG_CATEGORIES_ONLY).
    const pathsToTranslate = [...categoryEntries.keys()]
    const translatedCategoryEntries = new Map<string, { sourcePath: string; externalId: string | null }>()
    if (pathsToTranslate.length > 0 && chatgptService) {
      logger.info(`Translating ${pathsToTranslate.length} category paths to Bulgarian`)
      try {
        const translatedPaths = await chatgptService.translateBatch(pathsToTranslate, 'bg')
        for (let i = 0; i < pathsToTranslate.length; i++) {
          const originalPath = pathsToTranslate[i]
          let translatedPath = (translatedPaths[i] ?? originalPath).trim().replace(/\s*\/\s*/g, '/')
          if (!translatedPath) translatedPath = originalPath
          const entry = categoryEntries.get(originalPath)
          if (entry) translatedCategoryEntries.set(translatedPath, entry)
        }
      } catch (e) {
        logger.warn(`Category path translation failed, using source paths: ${e instanceof Error ? e.message : 'Unknown'}`)
        for (const [path, entry] of categoryEntries) translatedCategoryEntries.set(path, entry)
      }
    } else {
      for (const [path, entry] of categoryEntries) translatedCategoryEntries.set(path, entry)
    }

    const uniqueBrands = new Set<string>()
    for (const product of input.products) {
      const brandName = product.metadata?.producer?.name
      if (brandName) uniqueBrands.add(brandName)
    }

    logger.info(`Processing ${translatedCategoryEntries.size} unique categories and ${uniqueBrands.size} unique brands`)

    // Process all categories (create hierarchy; extension gets source original_name and external_id; SEO description generated on create)
    for (const [translatedPath, { sourcePath, externalId }] of translatedCategoryEntries) {
      try {
        const categoryId = await getOrCreateCategoryHierarchy(
          translatedPath,
          container,
          categoryCache,
          logger,
          chatgptService ?? undefined,
          { sourcePath, externalId }
        )

        if (categoryId) {
          categoryCache.set(translatedPath, categoryId)
          if (externalId) categoryCache.set(`external_id:${externalId}`, categoryId)
          logger.debug(`Mapped category path "${translatedPath}" (source: "${sourcePath}", external_id: ${externalId ?? 'null'}) to ID ${categoryId}`)
        } else {
          logger.warn(`Failed to get or create category: "${translatedPath}"`)
        }
      } catch (error) {
        logger.warn(`Error processing category "${translatedPath}": ${error instanceof Error ? error.message : 'Unknown'}`)
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

    // Merge newly created/resolved categories into lookup (pre-loaded ones already in categoryBy*)
    const EXTERNAL_ID_PREFIX = 'external_id:'
    for (const [key, categoryId] of categoryCache) {
      if (key.startsWith(EXTERNAL_ID_PREFIX)) {
        const k = key.slice(EXTERNAL_ID_PREFIX.length)
        if (!categoryByExternalId[k]) categoryByExternalId[k] = categoryId
      }
    }
    for (const [translatedPath, { sourcePath }] of translatedCategoryEntries) {
      const categoryId = categoryCache.get(translatedPath)
      if (categoryId) {
        categoryByPath[translatedPath] = categoryId
        const leaf = sourcePath.split('/').map((s) => s.trim()).filter(Boolean).pop()
        if (leaf) categoryByOriginalNameLeaf[leaf] = categoryId
      }
    }

    logger.info(`Processed categories and brands. ${categoryCache.size} categories cached, ${brandMap.size} brands cached. Lookup: ${Object.keys(categoryByExternalId).length} by external_id, ${Object.keys(categoryByPath).length} by path, ${Object.keys(categoryByOriginalNameLeaf).length} by leaf`)
    return new StepResponse({
      categoryByExternalId,
      categoryByPath,
      categoryByOriginalNameLeaf,
    })
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

/** Category lookup returned from processCategoriesAndBrandsStep (serializable). */
export type CategoryLookup = {
  categoryByExternalId: Record<string, string>
  categoryByPath: Record<string, string>
  categoryByOriginalNameLeaf: Record<string, string>
}

/**
 * Step: Process and import products one-by-one (skip by external_id, translate → SEO → images → create → assign categories).
 */
const processAndImportProductsStep = createStep(
  'process-and-import-products',
  async (
    input: {
      products: MedusaProductData[]
      categoryByExternalId: Record<string, string>
      categoryByPath: Record<string, string>
      categoryByOriginalNameLeaf: Record<string, string>
      shippingProfileId: string
      defaultSalesChannelId: string | null
      openaiApiKey?: string
      openaiModel?: string
    },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
    const openaiApiKey = input.openaiApiKey || process.env.OPENAI_API_KEY
    const openaiModel = input.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const chatgptService = openaiApiKey ? new ChatGPTService({ apiKey: openaiApiKey, model: openaiModel }) : null
    const shouldUploadToMinIO = !IS_DEV && MINIO_ENDPOINT
    const fileService = shouldUploadToMinIO ? container.resolve(Modules.FILE) : null

    let successful = 0
    let failed = 0
    const handleToProductIdMap = new Map<string, string>()
    const errors: string[] = []
    const total = input.products.length

    /** Resolve category IDs from product metadata using category lookups (shared for existing and new products). */
    function resolveCategoryIdsFromProduct(prod: MedusaProductData): Set<string> {
      const refs: Array<{ id?: string; name?: string; original_name?: string }> = Array.isArray(prod.metadata?.categories)
        ? prod.metadata.categories
        : prod.metadata?.category
          ? [prod.metadata.category]
          : []
      const resolvedIds = new Set<string>()
      for (const ref of refs) {
        let categoryId: string | undefined
        if (ref.id) categoryId = input.categoryByExternalId[String(ref.id)]
        const pathOrName = ((ref.original_name ?? ref.name) ?? '') as string
        if (!categoryId && ref.name) categoryId = input.categoryByPath[ref.name as string]
        if (!categoryId && ref.original_name) categoryId = input.categoryByPath[ref.original_name as string]
        if (!categoryId && pathOrName) categoryId = input.categoryByPath[pathOrName]
        if (!categoryId && pathOrName) {
          const leaf = pathOrName.split('/').map((s) => s.trim()).filter(Boolean).pop()
          if (leaf) categoryId = input.categoryByOriginalNameLeaf[leaf]
        }
        if (categoryId) resolvedIds.add(categoryId)
      }
      return resolvedIds
    }

    async function processOneProduct(
      product: MedusaProductData,
      index: number
    ): Promise<{ skipped: boolean; productId?: string; handle?: string; error?: string }> {
      // 1. If exists by external_id: fix category assignment if needed, then skip (no translation/SEO/images)
      try {
        const existing = await productService.listProducts({ external_id: product.external_id })
        if (existing && existing.length > 0) {
          const existingId = existing[0].id
          handleToProductIdMap.set(product.handle, existingId)

          const expectedCategoryIds = resolveCategoryIdsFromProduct(product)
          if (expectedCategoryIds.size > 0) {
            const existingProduct = await productService.retrieveProduct(existingId)
            const currentCategoryIds = new Set<string>(
          (existingProduct.categories as { id: string }[] | undefined)?.map((c) => c.id) ?? []
            )
            const needsUpdate =
              expectedCategoryIds.size !== currentCategoryIds.size ||
              [...expectedCategoryIds].some((id) => !currentCategoryIds.has(id))
            if (needsUpdate) {
              await productService.updateProducts(existingId, { category_ids: [...expectedCategoryIds] })
              logger.info(`Updated categories for existing product external_id ${product.external_id} (${existingId}): ${[...expectedCategoryIds].join(', ')}`)
            }
          }

          logger.info(`Skipping product external_id ${product.external_id} (already exists: ${existingId})`)
          return { skipped: true, productId: existingId, handle: product.handle }
        }
      } catch (e) {
        logger.debug(`listProducts by external_id failed: ${e instanceof Error ? e.message : 'Unknown'}`)
      }

      let current: MedusaProductData = { ...product, metadata: { ...product.metadata, original_description_en: product.description || '' } }

      // 2. Translate this product (match legacy: title + metadata only; do not translate variants/options)
      // Legacy: "Skip translating variants and options for default values. They need to stay as 'Default' to avoid mismatch errors."
      if (chatgptService) {
        try {
          const brandName = current.metadata?.producer?.name
          let translatedTitle = current.title
          if (current.title && brandName) {
            translatedTitle = await chatgptService.translateTitle(current.title, brandName, 'bg')
          } else if (current.title) {
            translatedTitle = await chatgptService.translate(current.title, 'bg')
          }
          current = { ...current, title: translatedTitle }
          const textsToTranslate: Array<{ field: string; value: string }> = []
          if (current.metadata?.unit_name) textsToTranslate.push({ field: 'unit_name', value: current.metadata.unit_name })
          if (current.metadata?.warranty_name) textsToTranslate.push({ field: 'warranty_name', value: current.metadata.warranty_name })
          if (current.metadata?.category?.name) textsToTranslate.push({ field: 'category_name', value: current.metadata.category.name })
          if (textsToTranslate.length > 0) {
            const translations = await chatgptService.translateBatch(textsToTranslate.map((t) => t.value), 'bg')
            const translatedProduct = { ...current }
            textsToTranslate.forEach((item, i) => {
              const translation = translations[i] ?? item.value
              if (item.field === 'unit_name' && translatedProduct.metadata) (translatedProduct.metadata as any).unit_name = translation
              else if (item.field === 'warranty_name' && translatedProduct.metadata) (translatedProduct.metadata as any).warranty_name = translation
              else if (item.field === 'category_name' && translatedProduct.metadata?.category) {
                const cat = (translatedProduct.metadata as any).category
                if (cat.original_name === undefined) cat.original_name = cat.name
                cat.name = translation
              }
            })
            current = translatedProduct
          }
        } catch (e) {
          logger.warn(`Translate product ${index + 1} failed: ${e instanceof Error ? e.message : 'Unknown'}`)
        }
      }

      // 3. SEO this product
      if (chatgptService) {
        const originalDescriptionEn = current.metadata?.original_description_en || current.description || ''
        if (originalDescriptionEn) {
          try {
            const metaContent = await chatgptService.generateMetaDescription(current, originalDescriptionEn)
            const descriptionContent = await chatgptService.optimizeDescription(current, originalDescriptionEn)
            const description = descriptionContent?.seoEnhancedDescription || descriptionContent?.technicalSafeDescription
            if (description) {
              const metaTitle = metaContent?.metaTitle || descriptionContent?.shortDescription?.substring(0, 60) || ''
              const metaDescription = metaContent?.metaDescription || descriptionContent?.shortDescription?.substring(0, 180) || ''
              const includedItems = await chatgptService.extractIncludedItems(originalDescriptionEn) || extractIncludedSection(originalDescriptionEn) || undefined
              const specificationsTable = await chatgptService.extractTechnicalData(originalDescriptionEn) || extractSpecificationsTable(originalDescriptionEn) || undefined
              const { original_description_en, ...cleanMetadata } = current.metadata || {}
              current = {
                ...current,
                description,
                metadata: {
                  ...cleanMetadata,
                  seo_meta_title: metaTitle,
                  seo_meta_description: metaDescription,
                  specifications_table: specificationsTable || undefined,
                  included_items: includedItems || undefined,
                },
              }
            }
          } catch (e) {
            logger.warn(`SEO product ${index + 1} failed: ${e instanceof Error ? e.message : 'Unknown'}`)
          }
        }
      }

      // 4. Process images for this product
      if (current.images && current.images.length > 0 && shouldUploadToMinIO && fileService) {
        const uploadedImages: Array<{ url: string }> = []
        for (let imgIndex = 0; imgIndex < current.images.length; imgIndex++) {
          const img = current.images[imgIndex]
          try {
            const response = await fetch(img.url)
            if (!response.ok) { uploadedImages.push(img); continue }
            const imageBuffer = await response.arrayBuffer()
            const contentType = response.headers.get('content-type') || 'image/jpeg'
            const urlPath = new URL(img.url).pathname
            const filename = urlPath.split('/').pop() || `product-${index + 1}-image-${imgIndex + 1}.jpg`
            const [uploadResult] = await fileService.createFiles([{ filename, content: Buffer.from(imageBuffer).toString('binary'), mimeType: contentType }])
            uploadedImages.push({ url: uploadResult.url })
          } catch {
            uploadedImages.push(img)
          }
        }
        current = { ...current, images: uploadedImages }
      }

      // 5. Persist this single product (create with external_id). Categories assigned after create via updateProducts.
      const productData: any = {
        ...current,
        external_id: product.external_id,
        shipping_profile_id: input.shippingProfileId,
        status: current.status || 'draft',
      }
      if (input.defaultSalesChannelId) productData.sales_channels = [{ id: input.defaultSalesChannelId }]
      delete productData.categories

      try {
        const { result } = await createProductsWorkflow(container).run({ input: { products: [productData] } })
        const created = Array.isArray(result) ? result[0] : (result as any)?.products?.[0]
        if (!created?.id) {
          return { skipped: false, error: 'Create returned no product id' }
        }
        if (created.handle) handleToProductIdMap.set(created.handle, created.id)

        // 6. Resolve categories and assign (use current so translated original_name is used)
        const resolvedIds = resolveCategoryIdsFromProduct(current)
        if (resolvedIds.size > 0) {
          await productService.updateProducts(created.id, { category_ids: [...resolvedIds] })
        } else {
          const refs = Array.isArray(current.metadata?.categories) ? current.metadata.categories : current.metadata?.category ? [current.metadata.category] : []
          if (refs.length > 0 && index < 5) {
            const externalIdKeys = Object.keys(input.categoryByExternalId)
            const leafKeys = Object.keys(input.categoryByOriginalNameLeaf)
            logger.warn(
              `Category not assigned for product "${product.handle}" (index ${index}): refs=${JSON.stringify(refs)}, ` +
              `categoryByExternalId keys (${externalIdKeys.length}): ${externalIdKeys.slice(0, 5).join(', ')}..., ` +
              `categoryByOriginalNameLeaf keys (${leafKeys.length}): ${leafKeys.slice(0, 5).join(', ')}...`
            )
          }
        }
        return { skipped: false, productId: created.id, handle: created.handle }
      } catch (e: unknown) {
        const errMsg =
          e instanceof Error
            ? e.message
            : typeof (e as { message?: string })?.message === 'string'
              ? (e as { message: string }).message
              : typeof e === 'object' && e !== null
                ? JSON.stringify(e)
                : String(e)
        logger.error(`Create/update product ${index + 1} (${product.handle}) failed: ${errMsg}`)
        if (e instanceof Error && e.stack) logger.debug(e.stack)
        return { skipped: false, error: errMsg }
      }
    }

    if (PRODUCT_IMPORT_CONCURRENCY === 0) {
      for (let i = 0; i < input.products.length; i++) {
        const result = await processOneProduct(input.products[i], i)
        if (result.skipped) successful++
        else if (result.error) { failed++; errors.push(result.error) }
        else { successful++ }
      }
    } else {
      const concurrency = PRODUCT_IMPORT_CONCURRENCY
      const results: Promise<{ skipped: boolean; error?: string }>[] = []
      for (let i = 0; i < input.products.length; i++) {
        const p = processOneProduct(input.products[i], i)
        results.push(p.then((r) => ({ skipped: r.skipped, error: r.error })))
        if (results.length >= concurrency) {
          const batch = await Promise.all(results.splice(0, concurrency))
          batch.forEach((r) => (r.skipped ? successful++ : r.error ? (failed++, errors.push(r.error)) : successful++))
        }
      }
      const remaining = await Promise.all(results)
      remaining.forEach((r) => (r.skipped ? successful++ : r.error ? (failed++, errors.push(r.error)) : successful++))
    }

    return new StepResponse({
      total,
      successful,
      failed,
      handleToProductIdMap: Object.fromEntries(handleToProductIdMap),
      errors,
    })
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
  const { sessionId, shippingProfileId, filters, openaiApiKey, openaiModel } = input
  // const { ollamaUrl, ollamaModel } = input // Ollama: commented out, using GPT

  // Step 1: Get session and extract products
  const sessionData = getSessionProductsStep({ sessionId })

  // Step 2: Map products to Medusa format
  const mappedData = mapProductsStep({ products: sessionData.products })

  // Step 3: Process categories and brands first (create/translate/SEO categories, persist; return category lookup)
  const categoryLookup = processCategoriesAndBrandsStep({
    products: mappedData.products,
    openaiApiKey,
    openaiModel,
  })

  // DEBUG: Run only categories (skip product import). Set env DEBUG_CATEGORIES_ONLY=true
  if (DEBUG_CATEGORIES_ONLY) {
    return new WorkflowResponse({
      sessionId,
      totalProducts: 0,
      successfulProducts: 0,
      failedProducts: 0,
      status: 'completed',
    })
  }

  // Step 4: Get or create shipping profile and default sales channel
  const resolvedShippingProfileId = getShippingProfileStep({ shippingProfileId })
  const defaultSalesChannelId = getDefaultSalesChannelStep()

  // Step 5: Per-product process and import (skip by external_id → translate → SEO → images → create → assign categories)
  const importResult = processAndImportProductsStep({
    products: mappedData.products,
    categoryByExternalId: categoryLookup.categoryByExternalId,
    categoryByPath: categoryLookup.categoryByPath,
    categoryByOriginalNameLeaf: categoryLookup.categoryByOriginalNameLeaf,
    shippingProfileId: resolvedShippingProfileId,
    defaultSalesChannelId,
    openaiApiKey,
    openaiModel,
  })

  // Step 6: Calculate final status
  const finalResult = calculateImportStatusStep({
    sessionId,
    total: importResult.total,
    successful: importResult.successful,
    failed: importResult.failed,
  })

  // Step 7: Clean up XML file from disk
  cleanupXmlFileStep({ sessionId })

  return new WorkflowResponse(finalResult)
})

export default innproXmlImportWorkflow
