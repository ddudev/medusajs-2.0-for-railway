import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'
import { MedusaContainer, ISalesChannelModuleService, IProductModuleService } from '@medusajs/framework/types'
import { createProductsWorkflow, createShippingProfilesWorkflow } from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { INNPRO_XML_IMPORTER_MODULE } from '../modules/innpro-xml-importer'
import InnProXmlImporterService from '../modules/innpro-xml-importer/service'
import { BRAND_MODULE } from '../modules/brand'
import { CATEGORY_EXTENSION_MODULE } from '../modules/category-extension'
import { IS_DEV, MINIO_ENDPOINT } from '../lib/constants'
import { MedusaProductData, SelectionFilters } from '../modules/innpro-xml-importer/types'
import { ChatGPTService } from '../modules/innpro-xml-importer/services/chatgpt'
import { extractSpecificationsTable, extractIncludedSection } from '../modules/innpro-xml-importer/utils/html-parser'

type WorkflowInput = {
  sessionId: string
  shippingProfileId?: string
  filters?: SelectionFilters
  openaiApiKey?: string
  openaiModel?: string
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

    // Helper function to recursively remove '@_' prefix from all keys
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
    
    for (let i = 0; i < input.products.length; i++) {
      try {
        const xmlProductRaw = input.products[i]
        // Clean '@_' prefixes from all keys
        const xmlProduct = cleanXmlKeys(xmlProductRaw)
        const productId = xmlProduct.id || `unknown-${i}`
        
        // Debug title extraction for first few products or if title extraction fails
        const nameArray = xmlProduct.description?.name
        const extractedTitle = importerService.extractByLang(nameArray, 'eng') || importerService.extractByLang(nameArray, 'en')
        
        if (i < 3 || !extractedTitle) {
          logger.debug(`Product ${i + 1} (ID: ${productId}) title extraction debug: hasDescription=${!!xmlProduct.description}, hasName=${!!nameArray}, nameType=${typeof nameArray}, nameIsArray=${Array.isArray(nameArray)}, nameValue=${JSON.stringify(nameArray).substring(0, 500)}, extractedTitle=${extractedTitle}, extractedTitleEn=${importerService.extractByLang(nameArray, 'en')}`)
        }
        
        const mapped = importerService.mapToMedusaProduct(xmlProduct)
        
        // Debug: Check category and producer metadata
        if (i < 3) {
          logger.info(`🔍 Product ${i + 1} metadata: category=${JSON.stringify(mapped.metadata?.category)}, producer=${JSON.stringify(mapped.metadata?.producer)}`)
        }
        
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
    const openaiModel = input.openaiModel || process.env.OPENAI_MODEL || 'gpt-5-mini'

    logger.info(`Translating ${input.products.length} products to Bulgarian using ChatGPT with model ${openaiModel}`)

    try {
      const chatgptService = new ChatGPTService({ apiKey: openaiApiKey, model: openaiModel })
      
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
          
          // Skip translating variants and options for default values
          // They need to stay as "Default" to avoid mismatch errors
          // Variants and options are only used for simple products without real variations

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
    const openaiModel = input.openaiModel || process.env.OPENAI_MODEL || 'gpt-5-mini'

    logger.info(`Optimizing descriptions for ${input.products.length} products using ChatGPT with model ${openaiModel}`)

    try {
      const chatgptService = new ChatGPTService({ apiKey: openaiApiKey, model: openaiModel })
      
      // Process products sequentially (one at a time) to avoid rate limits
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

/**
 * Helper: Get or create category hierarchy.
 * Lookup relies only on external_id and original_name (no lookup by translated name).
 * If found by external_id or original_name we use that category; no model calls.
 * If not found we create and run the model for description/SEO.
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

  const delimiter = '/'
  const normalizedDelimiter = delimiter.replace(/\s+/g, '')
  const categoryNames = categoryPath
    .split(normalizedDelimiter)
    .map(name => name.trim())
    .filter(name => name.length > 0)
  const sourceSegmentNames = (sourceInfo?.sourcePath ?? categoryPath)
    .split(normalizedDelimiter)
    .map(name => name.trim())
    .filter(name => name.length > 0)
  if (categoryNames.length === 0) {
    logger.warn(`Invalid category path: "${categoryPath}"`)
    return null
  }

  const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
  const categoryExtensionService = container.resolve(CATEGORY_EXTENSION_MODULE) as {
    listCategoryExtensions: (args: { original_name?: string; external_id?: string }) => Promise<{ id: string; external_id?: string | null }[]>
    createCategoryExtensions: (data: { original_name: string; external_id?: string | null; description?: string | null; seo_title?: string | null; seo_meta_description?: string | null }[]) => Promise<{ id: string }[]>
    updateCategoryExtensions: (data: { id: string; external_id?: string | null }[]) => Promise<unknown>
  }
  const link = container.resolve(ContainerRegistrationKeys.LINK) as {
    create: (data: Record<string, Record<string, string>>) => Promise<unknown>
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (opts: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: { id: string; parent_category_id: string | null; category_extension?: { id: string } | { id: string }[] }[] }>
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
            fields: ['id', 'parent_category_id', 'category_extension.id'],
          })
          const match = categoriesWithExtension?.find(
            (c: Record<string, unknown>) => {
              const ext = c.category_extension as { id: string } | { id: string }[] | undefined
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
          fields: ['id', 'parent_category_id', 'category_extension.id'],
        })
        const match = categoriesWithExtension?.find(
          (c: Record<string, unknown>) => {
            const ext = c.category_extension as { id: string } | { id: string }[] | undefined
            const extId = Array.isArray(ext) ? ext[0]?.id : ext?.id
            const hasMatchingExtension = extId && extensionIds.includes(extId)
            const parentMatch = (c.parent_category_id === null && parentCategoryId === null) || (c.parent_category_id === parentCategoryId)
            return hasMatchingExtension && parentMatch
          }
        )
        if (match) {
          const categoryId = match.id as string
          const ext = match.category_extension as { id: string } | { id: string }[] | undefined
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

    let categoryName = translatedSegment.trim().replace(/\s+/g, ' ')
    if (chatgptService && !sourceInfo) {
      try {
        categoryName = await chatgptService.translate(originalCategoryName, 'bg')
        categoryName = categoryName?.trim() ?? categoryName
      } catch {
        categoryName = translatedSegment.trim().replace(/\s+/g, ' ')
      }
    }
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

    // Initialize ChatGPT service for category translation
    const openaiApiKey = input.openaiApiKey || process.env.OPENAI_API_KEY
    const openaiModel = input.openaiModel || process.env.OPENAI_MODEL || 'gpt-5-mini'
    const chatgptService = new ChatGPTService({ apiKey: openaiApiKey, model: openaiModel })

    // Cache for category lookups (key: "translatedSegment|parentId" -> categoryId). Extension uses original_name and external_id.
    const categoryCache = new Map<string, string>()
    const brandMap = new Map<string, string>() // brand name -> brand id

    // Build map: translated path -> { sourcePath, externalId }
    const categoryEntries = new Map<string, { sourcePath: string; externalId: string | null }>()
    for (const product of input.products) {
      const cat = product.metadata?.category
      if (!cat?.name) continue
      const translatedPath = cat.name
      if (categoryEntries.has(translatedPath)) continue
      const sourcePath = cat.original_name ?? cat.name
      const externalId = cat.id != null ? String(cat.id) : null
      categoryEntries.set(translatedPath, { sourcePath, externalId })
    }
    const uniqueBrands = new Set<string>()
    for (const product of input.products) {
      const brandName = product.metadata?.producer?.name
      if (brandName) uniqueBrands.add(brandName)
    }

    logger.info(`Processing ${categoryEntries.size} unique categories and ${uniqueBrands.size} unique brands`)
    logger.info(`Translating categories to Bulgarian using ChatGPT with model ${openaiModel}`)

    // Process all categories (create hierarchy; extension gets source original_name and external_id)
    for (const [translatedPath, { sourcePath, externalId }] of categoryEntries) {
      try {
        const categoryId = await getOrCreateCategoryHierarchy(
          translatedPath,
          container,
          categoryCache,
          logger,
          chatgptService,
          { sourcePath, externalId }
        )

        if (categoryId) {
          categoryCache.set(translatedPath, categoryId)
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
  const { sessionId, shippingProfileId, filters, openaiApiKey, openaiModel } = input

  // Step 1: Get session and extract products
  const sessionData = getSessionProductsStep({ sessionId })

  // Step 2: Map products to Medusa format
  const mappedData = mapProductsStep({ products: sessionData.products })

  // Step 3: Translate products to Bulgarian
  const translatedData = translateProductsStep({
    products: mappedData.products,
    openaiApiKey,
    openaiModel,
  })

  // Step 4: Optimize descriptions for SEO
  const optimizedData = optimizeDescriptionsStep({
    products: translatedData.products,
    openaiApiKey,
    openaiModel,
  })

  // Step 5: Process categories and brands (with translation)
  const productsWithRelations = processCategoriesAndBrandsStep({
    products: optimizedData.products,
    openaiApiKey,
    openaiModel,
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
