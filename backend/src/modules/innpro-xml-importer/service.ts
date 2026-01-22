import { MedusaService } from "@medusajs/framework/utils"
import { Logger, MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { XMLParser } from "fast-xml-parser"
import { ulid } from "ulid"
import { InnProImportSession } from "./models/innpro-import-session"
import { InnProImportConfig } from "./models/innpro-import-config"
import {
  InnProImportSession as InnProImportSessionType,
  CategoryBrandSummary,
  SelectionFilters,
  MedusaProductData,
  PriceUpdateData,
} from "./types"
import { DAL } from "@medusajs/framework/types"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

type InjectedDependencies = {
  logger: Logger
  innproImportSessionRepository: DAL.RepositoryService<any>
  innproImportConfigRepository: DAL.RepositoryService<any>
}

/**
 * Service for importing products from InnPro XML files
 * Specialized for InnPro XML structure with two-step import process
 */
class InnProXmlImporterService extends MedusaService({
  InnProImportSession,
  InnProImportConfig,
}) {
  protected readonly logger_: Logger
  protected readonly xmlParser_: XMLParser
  protected readonly sessionRepository_: DAL.RepositoryService<any>
  protected readonly configRepository_: DAL.RepositoryService<any>

  constructor(deps: InjectedDependencies) {
    super(...arguments)
    this.logger_ = deps.logger
    this.sessionRepository_ = deps.innproImportSessionRepository
    this.configRepository_ = deps.innproImportConfigRepository
    this.xmlParser_ = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
    })
  }

  /**
   * Download XML file from URL and return content
   * Handles URLs that trigger file downloads in browsers
   */
  async downloadXml(xmlUrl: string): Promise<string> {
    try {
      this.logger_.info(`Downloading XML from: ${xmlUrl}`)
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout
      
      try {
        const response = await fetch(xmlUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, application/octet-stream, */*',
            'User-Agent': 'MedusaJS-InnPro-Importer/1.0',
          },
          redirect: 'follow', // Follow redirects
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          this.logger_.error(`HTTP ${response.status} ${response.statusText}: ${errorText.substring(0, 200)}`)
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Failed to download XML: HTTP ${response.status} ${response.statusText}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`
          )
        }

        // Check content type to ensure it's XML
        const contentType = response.headers.get('content-type') || ''
        this.logger_.info(`Response content-type: ${contentType}`)

        const content = await response.text()
        this.logger_.info(`Downloaded XML, size: ${content.length} bytes`)
        
        // Validate that we got actual content
        if (!content || content.trim().length === 0) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            'Downloaded XML file is empty'
          )
        }

        // Basic validation - check if it looks like XML
        if (!content.trim().startsWith('<') && !content.trim().startsWith('<?xml')) {
          this.logger_.warn(`Content doesn't start with '<' or '<?xml', might not be XML. First 200 chars: ${content.substring(0, 200)}`)
          // Don't throw here, let the parser handle it
        }
        
        return content
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            'Request timeout: XML download took longer than 5 minutes'
          )
        }
        
        // Re-throw MedusaError as-is
        if (fetchError instanceof MedusaError) {
          throw fetchError
        }
        
        // Handle network errors
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Network error: ${fetchError.message}. Check if the URL is accessible and there are no CORS/network issues.`
          )
        }
        
        throw fetchError
      }
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error
      }
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to download XML: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Parse XML content into JavaScript object
   */
  parseXml(xmlContent: string): any {
    try {
      return this.xmlParser_.parse(xmlContent)
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Download and parse XML in one step
   */
  async downloadAndParseXml(xmlUrl: string): Promise<any> {
    const content = await this.downloadXml(xmlUrl)
    return this.parseXml(content)
  }

  /**
   * Extract products from parsed InnPro XML
   * InnPro structure: { offer: { products: { product: [...] } } }
   */
  extractProducts(xmlData: any): any[] {
    // InnPro XML structure: offer -> products -> product (array)
    if (xmlData.offer?.products?.product) {
      const products = xmlData.offer.products.product
      return Array.isArray(products) ? products : [products]
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Could not find products in InnPro XML. Expected structure: { offer: { products: { product: [...] } } }'
    )
  }

  /**
   * Helper to extract string value from XML parsed field
   * Handles: string, object with @text, object with name, etc.
   */
  private extractStringValue(value: any): string {
    if (typeof value === 'string') {
      return value
    }
    if (value && typeof value === 'object') {
      // Try @text first (common in XML parsers)
      if (value['@text']) {
        return String(value['@text'])
      }
      // Try #text (alternative XML parser format)
      if (value['#text']) {
        return String(value['#text'])
      }
      // Try name property
      if (value.name && typeof value.name === 'string') {
        return value.name
      }
      // Try to stringify the whole object as fallback
      return JSON.stringify(value)
    }
    return String(value || '')
  }

  /**
   * Extract unique categories and brands from products
   * Also creates a mapping of which brands belong to which categories
   */
  getCategoriesAndBrands(products: any[]): CategoryBrandSummary {
    const categoryMap = new Map<string, { id: string; name: string; count: number }>()
    const brandMap = new Map<string, { id: string; name: string; count: number }>()
    const brandToCategoriesMap = new Map<string, Set<string>>() // Map brand ID to set of category IDs

    // Debug: log first product's category and producer structure
    if (products.length > 0) {
      const sampleProduct = products[0]
      this.logger_.debug(`Sample product category structure: ${JSON.stringify(sampleProduct.category, null, 2)}`)
      this.logger_.debug(`Sample product producer structure: ${JSON.stringify(sampleProduct.producer, null, 2)}`)
    }

    for (const product of products) {
      // Extract category
      let catId: string | null = null
      let catName: string | null = null
      
      if (product.category) {
        // Get category ID - XML parser prefixes attributes with @_
        catId = product.category['@_id'] 
          || product.category.id 
          || product.category['@attributes']?.id
          || null
        
        // Get category name - XML parser prefixes attributes with @_
        // Try @_name first (attribute), then name (element)
        if (product.category['@_name']) {
          // Name is an attribute
          catName = String(product.category['@_name']).trim()
        } else if (product.category.name) {
          // Name is an element
          if (typeof product.category.name === 'string') {
            catName = product.category.name.trim()
          } else {
            catName = this.extractStringValue(product.category.name)
            if (!catName || catName === '{}' || catName.startsWith('{')) {
              catName = null
            }
          }
        }
        
        // Only add if we have both ID and name
        if (catId && catName) {
          const existing = categoryMap.get(String(catId)) || { id: String(catId), name: catName, count: 0 }
          existing.count++
          categoryMap.set(String(catId), existing)
        } else if (catId) {
          // Log warning if we have ID but no name
          this.logger_.warn(`Category ID ${catId} found but name extraction failed. Structure: ${JSON.stringify(product.category).substring(0, 200)}`)
        }
      }

      // Extract brand/producer
      let brandId: string | null = null
      let brandName: string | null = null
      
      if (product.producer) {
        // Get producer ID - XML parser prefixes attributes with @_
        brandId = product.producer['@_id'] 
          || product.producer.id 
          || product.producer['@attributes']?.id
          || null
        
        // Get producer name - XML parser prefixes attributes with @_
        // Try @_name first (attribute), then name (element)
        if (product.producer['@_name']) {
          // Name is an attribute
          brandName = String(product.producer['@_name']).trim()
        } else if (product.producer.name) {
          // Name is an element
          if (typeof product.producer.name === 'string') {
            brandName = product.producer.name.trim()
          } else {
            brandName = this.extractStringValue(product.producer.name)
            if (!brandName || brandName === '{}' || brandName.startsWith('{')) {
              brandName = null
            }
          }
        }
        
        // Only add if we have both ID and name
        if (brandId && brandName) {
          const existing = brandMap.get(String(brandId)) || { id: String(brandId), name: brandName, count: 0 }
          existing.count++
          brandMap.set(String(brandId), existing)
        } else if (brandId) {
          // Log warning if we have ID but no name
          this.logger_.warn(`Producer ID ${brandId} found but name extraction failed. Structure: ${JSON.stringify(product.producer).substring(0, 200)}`)
        }
      }

      // Build brand-to-categories mapping
      if (catId && brandId) {
        const brandIdStr = String(brandId)
        const catIdStr = String(catId)
        
        if (!brandToCategoriesMap.has(brandIdStr)) {
          brandToCategoriesMap.set(brandIdStr, new Set())
        }
        brandToCategoriesMap.get(brandIdStr)!.add(catIdStr)
      }
    }

    // Convert Set to Array for JSON serialization
    const brandToCategories: Record<string, string[]> = {}
    for (const [brandId, categoryIds] of brandToCategoriesMap.entries()) {
      brandToCategories[brandId] = Array.from(categoryIds)
    }

    this.logger_.info(`Extracted ${categoryMap.size} categories and ${brandMap.size} brands from ${products.length} products`)
    this.logger_.debug(`Created brand-to-categories mapping for ${Object.keys(brandToCategories).length} brands`)

    return {
      categories: Array.from(categoryMap.values()).sort((a, b) => b.count - a.count),
      brands: Array.from(brandMap.values()).sort((a, b) => b.count - a.count),
      total_products: products.length,
      brandToCategories,
    }
  }

  /**
   * Filter products based on selection criteria
   * IMPORTANT: When both categories and brands are selected, products must match BOTH conditions (AND logic)
   * - If only categories selected: import products in those categories (any brand)
   * - If only brands selected: import products from those brands (any category)
   * - If both selected: import products that are in selected categories AND from selected brands
   * - If productIds selected: import only those specific products (overrides category/brand filters)
   */
  filterProducts(
    products: any[],
    filters: SelectionFilters
  ): any[] {
    let filtered = products

    this.logger_.info(`Filtering ${products.length} products with filters: categories=${filters.categories?.length || 0}, brands=${filters.brands?.length || 0}, productIds=${filters.productIds?.length || 0}`)

    // Filter by product IDs first (if provided, this overrides category/brand filters)
    if (filters.productIds && filters.productIds.length > 0) {
      filtered = filtered.filter((product) => {
        const productId = product['@_id'] || product.id
        return productId && filters.productIds!.includes(String(productId))
      })
      this.logger_.info(`After productIds filter: ${filtered.length} products`)
      // If product IDs are specified, return early (don't apply category/brand filters)
      return filtered
    }

    // Filter by categories (if provided)
    if (filters.categories && filters.categories.length > 0) {
      const beforeCategoryFilter = filtered.length
      this.logger_.info(`Filtering by categories: ${filters.categories.join(', ')}`)
      
      // Log sample category IDs from products for debugging
      const sampleCategoryIds = new Set<string>()
      filtered.slice(0, 10).forEach((p) => {
        const catId = p.category?.['@_id'] || p.category?.id
        if (catId) sampleCategoryIds.add(String(catId))
      })
      this.logger_.info(`Sample category IDs from products: ${Array.from(sampleCategoryIds).join(', ')}`)
      
      filtered = filtered.filter((product) => {
        const catId = product.category?.['@_id'] || product.category?.id
        const catIdStr = catId ? String(catId) : null
        const matches = catIdStr && filters.categories!.includes(catIdStr)
        return matches
      })
      this.logger_.info(`After category filter: ${filtered.length} products (from ${beforeCategoryFilter})`)
    }

    // Filter by brands (if provided) - applied to already category-filtered results
    // This ensures products must match BOTH category AND brand when both are selected
    if (filters.brands && filters.brands.length > 0) {
      const beforeBrandFilter = filtered.length
      this.logger_.info(`Filtering by brands: ${filters.brands.join(', ')}`)
      
      // Log sample brand IDs from products for debugging
      const sampleBrandIds = new Set<string>()
      filtered.slice(0, 10).forEach((p) => {
        const brandId = p.producer?.['@_id'] || p.producer?.id
        if (brandId) sampleBrandIds.add(String(brandId))
      })
      this.logger_.info(`Sample brand IDs from products: ${Array.from(sampleBrandIds).join(', ')}`)
      
      filtered = filtered.filter((product) => {
        const brandId = product.producer?.['@_id'] || product.producer?.id
        const brandIdStr = brandId ? String(brandId) : null
        const matches = brandIdStr && filters.brands!.includes(brandIdStr)
        
        // Log first few products for debugging
        if (beforeBrandFilter <= 20) {
          this.logger_.debug(`Product ${product['@_id']}: brandId=${brandIdStr}, matches=${matches}, selectedBrands=${filters.brands!.join(', ')}`)
        }
        
        return matches
      })
      this.logger_.info(`After brand filter: ${filtered.length} products (from ${beforeBrandFilter})`)
    }

    this.logger_.info(`Final filtered count: ${filtered.length} products`)
    return filtered
  }

  /**
   * Extract text by language from multilingual array
   */
  extractByLang(items: any[] | undefined, lang: string): string | undefined {
    if (!items) {
      return undefined
    }

    // Handle both array and single object
    const itemsArray = Array.isArray(items) ? items : [items]

    if (itemsArray.length === 0) {
      return undefined
    }

    const langMap: Record<string, string> = {
      eng: 'eng',
      en: 'eng',
      pol: 'pol',
      pl: 'pol',
      hun: 'hun',
      hu: 'hun',
    }

    const targetLang = langMap[lang] || lang

    // Try multiple ways to find the language attribute
    const item = itemsArray.find((i) => {
      // Try namespace format first
      const langAttr = i['@attributes']?.['{http://www.w3.org/XML/1998/namespace}lang'] ||
                      i['@attributes']?.['xml:lang'] ||
                      i['@attributes']?.['lang'] ||
                      i.lang
      return langAttr === targetLang || langAttr === lang
    })

    // If no match, try to get first item as fallback
    const fallbackItem = item || itemsArray[0]

    // Try multiple ways to extract text
    return fallbackItem?.['@text'] || 
           fallbackItem?.['#text'] || 
           fallbackItem?.text ||
           (typeof fallbackItem === 'string' ? fallbackItem : undefined)
  }

  /**
   * Extract images from product (use originals only, handle both single and array)
   * Handles namespace-prefixed keys (e.g., "iaiext:originals") and @_ prefixed attributes
   */
  public extractImages(images: any): Array<{ url: string }> {
    const imageList: Array<{ url: string }> = []

    if (!images) {
      return imageList
    }

    // Try to get originals - handle namespace-prefixed keys (e.g., "iaiext:originals")
    // The XML parser may preserve namespace prefixes in key names
    let originalImages = images.originals?.image
    
    // If originals not found, try namespace-prefixed version
    if (!originalImages) {
      // Check for "iaiext:originals" or any key ending with ":originals"
      const originalsKey = Object.keys(images).find(key => 
        key === 'iaiext:originals' || 
        key.endsWith(':originals') ||
        key === 'originals'
      )
      
      if (originalsKey) {
        originalImages = images[originalsKey]?.image
      }
    }
    
    // If still no originals, fallback to "large" images (as seen in the XML structure)
    if (!originalImages && images.large?.image) {
      originalImages = images.large.image
    }
    
    if (!originalImages) {
      return imageList
    }

    const imageArray = Array.isArray(originalImages) ? originalImages : [originalImages]
    
    // Sort by priority (handle multiple priority formats including namespace-prefixed)
    imageArray.sort((a, b) => {
      const priorityA = parseInt(
        a['@_iaiext:priority'] ||
        a['@_priority'] ||
        a['{http://www.iai-shop.com/developers/iof/extensions.phtml}priority'] || 
        a['@attributes']?.['{http://www.iai-shop.com/developers/iof/extensions.phtml}priority'] ||
        a.priority || 
        '0'
      )
      const priorityB = parseInt(
        b['@_iaiext:priority'] ||
        b['@_priority'] ||
        b['{http://www.iai-shop.com/developers/iof/extensions.phtml}priority'] || 
        b['@attributes']?.['{http://www.iai-shop.com/developers/iof/extensions.phtml}priority'] ||
        b.priority || 
        '0'
      )
      return priorityA - priorityB
    })
    
    imageArray.forEach((img) => {
      // Try multiple ways to get URL - XML parser uses @_ prefix for attributes
      const url = img['@_url'] ||  // Primary: XML parser format
                 img.url ||        // Fallback: direct property
                 img['@attributes']?.url  // Fallback: nested attributes
      
      if (url) {
        imageList.push({ url: String(url) })
      }
    })

    return imageList
  }

  /**
   * Extract parameter value by name (case-insensitive, handles prefixes)
   */
  private extractParameter(parameters: any[], name: string): string | undefined {
    if (!parameters || !Array.isArray(parameters)) {
      return undefined
    }

    // Normalize search name (lowercase, trim)
    const normalizedName = name.toLowerCase().trim()

    const param = parameters.find((p) => {
      // Try multiple ways to get parameter name
      const paramName = (p['@attributes']?.name || 
                        p['@_name'] || 
                        p.name || '').toLowerCase().trim()
      // Exact match or contains match (for prefixes)
      return paramName === normalizedName || paramName.includes(normalizedName) || normalizedName.includes(paramName)
    })

    if (!param) {
      return undefined
    }

    // Handle value (can be single object or array)
    const value = param.value
    if (!value) {
      return undefined
    }

    if (Array.isArray(value)) {
      // Return first value's name - try @_name first (XML parser format), then name, then text
      return value[0]?.['@_name']?.toString() || 
             value[0]?.['@attributes']?.['name']?.toString() ||
             value[0]?.name?.toString() || 
             value[0]?.['#text']?.toString() || 
             value[0]?.['@text']?.toString()
    }

    // Try @_name first (XML parser format), then name, then text
    return value['@_name']?.toString() ||
           value['@attributes']?.['name']?.toString() ||
           value.name?.toString() || 
           value['#text']?.toString() || 
           value['@text']?.toString()
  }

  /**
   * Extract dimensions from parameters
   */
  private extractDimensions(parameters: any[]): {
    length?: number
    width?: number
    height?: number
  } {
    const dimensions: { length?: number; width?: number; height?: number } = {}

    const lengthStr = this.extractParameter(parameters, 'Box length')
    const widthStr = this.extractParameter(parameters, 'Box width')
    const heightStr = this.extractParameter(parameters, 'Box height')

    if (lengthStr) {
      // Handle both string and number, and comma as decimal separator
      const lengthValue = typeof lengthStr === 'number' ? lengthStr : parseFloat(String(lengthStr).replace(',', '.'))
      if (!isNaN(lengthValue)) {
        dimensions.length = lengthValue
      }
    }

    if (widthStr) {
      const widthValue = typeof widthStr === 'number' ? widthStr : parseFloat(String(widthStr).replace(',', '.'))
      if (!isNaN(widthValue)) {
        dimensions.width = widthValue
      }
    }

    if (heightStr) {
      const heightValue = typeof heightStr === 'number' ? heightStr : parseFloat(String(heightStr).replace(',', '.'))
      if (!isNaN(heightValue)) {
        dimensions.height = heightValue
      }
    }

    return dimensions
  }

  /**
   * Map InnPro XML product to Medusa product format
   */
  mapToMedusaProduct(xmlProduct: any): MedusaProductData {
    const productId = xmlProduct['@_id'] || xmlProduct.id
    const productAttrs = xmlProduct['@attributes'] || {}

    // Extract title and description (multilingual)
    const nameArray = xmlProduct.description?.name
    const title = this.extractByLang(nameArray, 'eng') || this.extractByLang(nameArray, 'en') || 'Untitled Product'
    
    const longDescArray = xmlProduct.description?.long_desc
    const description = this.extractByLang(longDescArray, 'eng') || this.extractByLang(longDescArray, 'en')

    // Extract parameters first (needed for variant and product-level extractions)
    const parameters = xmlProduct.parameters?.parameter
    const paramArray = Array.isArray(parameters) ? parameters : (parameters ? [parameters] : [])

    // Extract sizes (can be single or array)
    const sizes = xmlProduct.sizes?.size
    const sizeArray = Array.isArray(sizes) ? sizes : (sizes ? [sizes] : [])

    // Extract SKU and barcode from first size (if available)
    let sku: string | undefined = undefined
    let barcode: string | undefined = undefined
    
    if (sizeArray.length > 0) {
      const firstSize = sizeArray[0]
      const sizeAttrs = firstSize['@attributes'] || {}
      sku = sizeAttrs.code_producer || sizeAttrs.code || undefined
      barcode = sizeAttrs['{http://www.iai-shop.com/developers/iof/extensions.phtml}code_external'] || 
                sizeAttrs.code_external
    }

    // Extract product-level weight (try multiple sources)
    let productWeight: number | undefined = undefined
    
    // Try from size attributes first
    const sizeWeight = sizeArray[0]?.['@attributes']?.weight
    if (sizeWeight) {
      const parsed = parseFloat(sizeWeight)
      if (!isNaN(parsed)) {
        productWeight = parsed
      }
    }
    
    // Fallback to parameters (e.g., "Net weight", "Weight", "Gross weight")
    if (!productWeight) {
      const weightStr = this.extractParameter(paramArray, 'net weight') ||
                       this.extractParameter(paramArray, 'weight') || 
                       this.extractParameter(paramArray, 'gross weight')
      if (weightStr) {
        // Handle both string and number values
        const weightValue = typeof weightStr === 'number' ? weightStr : parseFloat(String(weightStr).replace(',', '.').replace(/\s/g, ''))
        if (!isNaN(weightValue)) {
          productWeight = weightValue
        }
      }
    }

    // Extract dimensions from parameters (handle comma as decimal separator)
    const dimensions = this.extractDimensions(paramArray)

    // Extract HS code (try multiple variations)
    const hsCodeStr = this.extractParameter(paramArray, 'HS Code') ||
                     this.extractParameter(paramArray, 'HS code') ||
                     this.extractParameter(paramArray, 'hs code') ||
                     this.extractParameter(paramArray, 'HS')
    // Convert to string (HS codes can be numbers)
    const hsCode = hsCodeStr ? String(hsCodeStr) : undefined

    // Extract origin country (try multiple sources)
    const originCountry = xmlProduct.responsible_entity?.producer?.country ||
                         this.extractParameter(paramArray, 'country of origin') ||
                         this.extractParameter(paramArray, 'origin country')

    // Extract material from parameters or description HTML table
    let material = this.extractParameter(paramArray, 'material') ||
                   this.extractParameter(paramArray, 'Material')
    
    // If not in parameters, try to extract from description HTML table
    if (!material && description) {
      // Look for Material row in HTML table: <th>Material</th><td>...</td>
      const materialMatch = description.match(/<th[^>]*>Material\s*<\/th>\s*<td[^>]*>([^<]+)<\/td>/i)
      if (materialMatch && materialMatch[1]) {
        material = materialMatch[1].trim()
      }
    }

    // Extract MID code from parameters
    const midCode = this.extractParameter(paramArray, 'MID code') ||
                    this.extractParameter(paramArray, 'mid code') ||
                    this.extractParameter(paramArray, 'MID')

    // Extract images
    const images = this.extractImages(xmlProduct.images)

    // Extract unit fields separately
    const unitId = xmlProduct.unit?.id
    const unitName = xmlProduct.unit?.name

    // Extract warranty fields separately
    const warrantyId = xmlProduct.warranty?.id
    const warrantyType = xmlProduct.warranty?.type
    const warrantyPeriod = xmlProduct.warranty?.period
    const warrantyName = xmlProduct.warranty?.name

    // Extract sell_by quantities
    const minQuantityRetail = xmlProduct.sell_by?.retail?.quantity
    const minQuantityWholesale = xmlProduct.sell_by?.wholesale?.quantity

    // Extract inwrapper quantity
    const inwrapperQuantity = xmlProduct.inwrapper?.quantity

    // Extract price_retail_dynamic
    const priceRetailDynamic = xmlProduct.price_retail_dynamic

    // Extract responsible_entity details more comprehensively
    const responsibleEntity = xmlProduct.responsible_entity
    const producerData = responsibleEntity?.producer
    const responsibleProducer = producerData
      ? {
          id: producerData['@attributes']?.id || producerData.id,
          code: producerData.code,
          name: producerData.name,
          mail: producerData.mail,
          country: producerData.country,
          city: producerData.city,
          zipcode: producerData.zipcode,
          street: producerData.street,
          number: producerData.number,
        }
      : undefined

    // Build metadata with all non-core fields (comprehensive)
    const metadata: Record<string, any> = {
      external_id: productId,
      currency: productAttrs.currency,
      code_on_card: productAttrs.code_on_card,
      producer_code_standard: productAttrs.producer_code_standard,
      product_type: productAttrs.type,
      vat_rate: productAttrs.vat,
      site_id: productAttrs.site,
      producer: {
        id: xmlProduct.producer?.id || xmlProduct.producer?.['@_id'],
        name: xmlProduct.producer?.name,
      },
      category: {
        id: xmlProduct.category?.id || xmlProduct.category?.['@_id'],
        name: xmlProduct.category?.name,
      },
      // Unit fields (separate)
      unit_id: unitId,
      unit_name: unitName,
      // Warranty fields (separate)
      warranty_id: warrantyId,
      warranty_type: warrantyType,
      warranty_period: warrantyPeriod,
      warranty_name: warrantyName,
      // Keep full objects for backward compatibility
      unit: xmlProduct.unit,
      warranty: xmlProduct.warranty,
      card_url: xmlProduct.card?.url,
      parameters: paramArray,
      attachments: Array.isArray(xmlProduct.attachments?.file) 
        ? xmlProduct.attachments.file 
        : (xmlProduct.attachments?.file ? [xmlProduct.attachments.file] : []),
      omnibus_price_retail: xmlProduct.omnibus_price_retail,
      omnibus_price_wholesale: xmlProduct.omnibus_price_wholesale,
      // Sell by quantities (separate)
      min_quantity_retail: minQuantityRetail,
      min_quantity_wholesale: minQuantityWholesale,
      // Keep full object for backward compatibility
      sell_by: xmlProduct.sell_by,
      // Inwrapper quantity (separate)
      inwrapper_quantity: inwrapperQuantity,
      // Keep full object for backward compatibility
      inwrapper: xmlProduct.inwrapper,
      // Price retail dynamic
      price_retail_dynamic: priceRetailDynamic,
      subscriptions_settings: xmlProduct.subscriptions_settings,
      // Responsible entity (enhanced)
      responsible_entity: responsibleEntity,
      responsible_producer: responsibleProducer,
      services_descriptions: xmlProduct.services_descriptions,
    }

    // Sanitize handle from product ID
    const handle = this.sanitizeHandle(String(productId))

    // MedusaJS 2.x requires products to have variants and options
    // Create a simple default variant with a default option
    // IMPORTANT: Use "Default" (not translated) to avoid mismatch errors
    const defaultVariant = {
      title: 'Default',
      sku: sku,
      barcode: barcode,
      manage_inventory: false,
      prices: [],
      options: {
        Default: 'Default' // Option title -> Option value mapping
      }
    }

    const defaultOption = {
      title: 'Default',
      values: ['Default']
    }

    return {
      title,
      description,
      handle,
      status: 'draft',
      weight: productWeight,
      ...dimensions,
      hs_code: hsCode,
      origin_country: originCountry,
      mid_code: midCode,
      material: material,
      images,
      variants: [defaultVariant],
      options: [defaultOption],
      metadata: {
        ...metadata,
        // Store original SKU and barcode for reference
        original_sku: sku,
        original_barcode: barcode,
      },
    }
  }

  /**
   * Sanitize product handle to be URL-safe
   */
  private sanitizeHandle(handle: string): string {
    return handle
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * File Management Methods for Streaming Import
   */

  /**
   * Save XML content to disk and return file path
   * Downloads XML and saves to temp directory
   */
  async saveXmlToDisk(xmlUrl: string, sessionId: string): Promise<string> {
    try {
      this.logger_.info(`Downloading and saving XML from: ${xmlUrl}`)
      
      // Download XML content
      const xmlContent = await this.downloadXml(xmlUrl)
      
      // Create temp directory if it doesn't exist
      const tempDir = path.join(os.tmpdir(), 'innpro-imports')
      await fs.mkdir(tempDir, { recursive: true })
      
      // Generate file path
      const filePath = path.join(tempDir, `innpro-import-${sessionId}.xml`)
      
      // Save XML to disk
      await fs.writeFile(filePath, xmlContent, 'utf-8')
      
      this.logger_.info(`XML saved to disk: ${filePath} (${xmlContent.length} bytes)`)
      
      return filePath
    } catch (error) {
      this.logger_.error(`Failed to save XML to disk: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to save XML to disk: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get XML file path from session
   */
  async getXmlFilePath(sessionId: string): Promise<string | null> {
    const session = await this.getSession(sessionId)
    return session?.xml_file_path || null
  }

  /**
   * Clean up XML file from disk
   */
  async cleanupXmlFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
      this.logger_.info(`Cleaned up XML file: ${filePath}`)
    } catch (error) {
      this.logger_.warn(`Failed to clean up XML file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Don't throw - cleanup failure shouldn't break the import
    }
  }

  /**
   * Extract metadata only (categories, brands, counts) without storing products
   * Iterates through products to extract metadata but doesn't store product objects
   */
  extractMetadataOnly(xmlData: any): CategoryBrandSummary {
    this.logger_.info('Extracting metadata only (no products stored)')
    
    // Extract products temporarily to get metadata
    const products = this.extractProducts(xmlData)
    
    // Use existing method to get categories and brands
    const summary = this.getCategoriesAndBrands(products)
    
    this.logger_.info(`Extracted metadata: ${summary.categories.length} categories, ${summary.brands.length} brands, ${summary.total_products} total products`)
    
    return summary
  }

  /**
   * Stream products from XML file and process one-by-one
   * Reads XML from disk, parses it, and processes products individually
   */
  async streamProductsAndImport(
    xmlFilePath: string,
    filters: SelectionFilters,
    callback: (product: any) => Promise<void>
  ): Promise<{ imported: number; skipped: number }> {
    try {
      this.logger_.info(`Streaming products from: ${xmlFilePath}`)
      
      // Read XML file from disk
      const xmlContent = await fs.readFile(xmlFilePath, 'utf-8')
      
      // Parse XML
      const xmlData = this.parseXml(xmlContent)
      
      // Extract products
      const products = this.extractProducts(xmlData)
      
      this.logger_.info(`Streaming ${products.length} products for import`)
      
      // Filter products based on selection
      const filteredProducts = this.filterProducts(products, filters)
      
      this.logger_.info(`After filtering: ${filteredProducts.length} products will be imported`)
      
      let imported = 0
      let skipped = 0
      
      // Process products one by one
      for (let i = 0; i < filteredProducts.length; i++) {
        const product = filteredProducts[i]
        
        try {
          // Call callback to import product
          await callback(product)
          imported++
          
          // Log progress every 10 products
          if ((i + 1) % 10 === 0) {
            this.logger_.info(`Progress: ${i + 1}/${filteredProducts.length} products processed`)
          }
        } catch (error) {
          this.logger_.error(`Failed to import product ${product['@_id'] || product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          skipped++
        }
      }
      
      this.logger_.info(`Streaming complete: ${imported} imported, ${skipped} skipped`)
      
      return { imported, skipped }
    } catch (error) {
      this.logger_.error(`Failed to stream products: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  /**
   * Extract price data from price XML
   * Extracts both cost price (price.net) and SRP (srp.net) from price XML
   * Price XML structure:
   * <product id="52210">
   *   <price net="6.18"/>      // Cost price (what we pay)
   *   <srp net="11.79"/>        // SRP (price to consumer)
   *   <sizes><size><stock quantity="3"/></size></sizes>
   * </product>
   */
  extractPriceData(priceXmlData: any): Map<string, PriceUpdateData> {
    const priceDataMap = new Map<string, PriceUpdateData>()

    // Extract products from price XML (same structure as main XML)
    const products = this.extractProducts(priceXmlData)

    for (const priceProduct of products) {
      const productId = priceProduct['@_id'] || priceProduct.id
      if (!productId) {
        continue
      }

      // Extract sizes (can be single or array)
      const sizes = priceProduct.sizes?.size
      const sizeArray = Array.isArray(sizes) ? sizes : (sizes ? [sizes] : [])

      if (sizeArray.length === 0) {
        continue
      }

      // Use first size for price/stock (most products have single size)
      const firstSize = sizeArray[0]

      // Extract cost price (what we pay) - can be at product or size level
      const priceNet = priceProduct.price?.net || firstSize.price?.net || firstSize.price?.['#text']
      const priceGross = priceProduct.price?.gross || firstSize.price?.gross
      
      // Extract SRP (recommended selling price / price to consumer)
      const srpNet = priceProduct.srp?.net || firstSize.srp?.net
      const srpGross = priceProduct.srp?.gross || firstSize.srp?.gross
      
      const stockQuantity = firstSize.stock?.quantity || firstSize.stock?.['#text'] || '0'

      const priceData: PriceUpdateData = {
        productId: String(productId),
        priceNet: priceNet ? parseFloat(priceNet) : undefined,
        priceGross: priceGross ? parseFloat(priceGross) : undefined,
        srpNet: srpNet ? parseFloat(srpNet) : undefined,
        srpGross: srpGross ? parseFloat(srpGross) : undefined,
        stockQuantity: parseInt(stockQuantity, 10),
      }

      priceDataMap.set(String(productId), priceData)
    }

    return priceDataMap
  }

  /**
   * Session Management
   */
  async createSession(data: {
    xml_url: string
    xml_file_path?: string
    parsed_data?: any
    status?: string
  }): Promise<InnProImportSessionType> {
    try {
      const sessionData = {
        id: ulid(),
        xml_url: data.xml_url,
        xml_file_path: data.xml_file_path,
        parsed_data: data.parsed_data,
        status: data.status || 'parsing',
      }
      
      // Use MedusaService's auto-generated createInnProImportSessions method
      // @ts-ignore - Auto-generated method from MedusaService
      const result = await this.createInnProImportSessions([sessionData])
      const session = Array.isArray(result) && result.length > 0 ? result[0] : result
      
      if (!(session as any)?.id) {
        this.logger_.warn(`Session created but no ID returned. Result: ${JSON.stringify(session)}`)
      }
      
      return session as unknown as InnProImportSessionType
    } catch (error) {
      this.logger_.error(`Error creating session: ${error instanceof Error ? error.message : 'Unknown error'}. Stack: ${error instanceof Error ? error.stack : 'N/A'}`)
      throw error
    }
  }

  async getSession(id: string): Promise<InnProImportSessionType | null> {
    try {
      // Use MedusaService's auto-generated retrieveInnProImportSession method
      // This follows MedusaJS best practices for retrieving a single record
      // @ts-ignore - Auto-generated method from MedusaService
      const session = await this.retrieveInnProImportSession(id)
      
      if (!session) {
        return null
      }
      
      // Debug: Log xml_file_path if it exists
      const xmlFilePath = (session as any).xml_file_path
      if (xmlFilePath) {
        this.logger_.debug(`Session ${id} has xml_file_path: ${xmlFilePath}`)
      } else {
        this.logger_.debug(`Session ${id} does not have xml_file_path`)
      }
      
      if (!session.parsed_data) {
        this.logger_.warn(`Session ${id} found but has no parsed_data`)
        return session as unknown as InnProImportSessionType // Return session even without parsed_data, let the caller handle it
      }
      
      return session as unknown as InnProImportSessionType
    } catch (error) {
      // If retrieve method throws NOT_FOUND, return null
      if (error instanceof MedusaError && error.type === MedusaError.Types.NOT_FOUND) {
        return null
      }
      this.logger_.error(`Error retrieving session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}. Stack: ${error instanceof Error ? error.stack : 'N/A'}`)
      return null
    }
  }

  async updateSession(
    id: string,
    data: Partial<InnProImportSessionType>
  ): Promise<InnProImportSessionType> {
    try {
      // Build update payload following MedusaJS documentation pattern:
      // Pass id and data in the same object, with arrays directly (Medusa handles JSONB serialization)
      // Reference: https://docs.medusajs.com/resources/service-factory-reference/methods/update
      const updatePayload: any = {
        id, // id in the same object as data
      }
      
      // Pass arrays directly - Medusa will handle JSONB serialization automatically
      if ('selected_categories' in data) {
        updatePayload.selected_categories = data.selected_categories ?? null
      }
      if ('selected_brands' in data) {
        updatePayload.selected_brands = data.selected_brands ?? null
      }
      if ('selected_product_ids' in data) {
        updatePayload.selected_product_ids = data.selected_product_ids ?? null
      }
      if (data.status !== undefined) {
        updatePayload.status = data.status
      }
      if ('xml_file_path' in data) {
        updatePayload.xml_file_path = data.xml_file_path ?? null
      }
      if ('parsed_data' in data) {
        updatePayload.parsed_data = data.parsed_data ?? null
      }
      
      // Use MedusaService's auto-generated updateInnProImportSessions method
      // Following MedusaJS docs: pass single object with id + data together
      // Arrays are passed directly - Medusa handles JSONB serialization
      // @ts-ignore - Auto-generated method from MedusaService
      const result = await this.updateInnProImportSessions(updatePayload)
      const updated = Array.isArray(result) && result.length > 0 ? result[0] : result
      
      if (!updated) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Session ${id} not found after update`
        )
      }
      
      // Immediately verify the update worked by retrieving the session again
      const verifySession = await this.getSession(id)
      
      return verifySession as InnProImportSessionType
    } catch (error) {
      this.logger_.error(`Error updating session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}. Stack: ${error instanceof Error ? error.stack : 'N/A'}`)
      throw error
    }
  }

  /**
   * Config Management
   */
  async createConfig(data: {
    price_xml_url: string
    enabled?: boolean
    update_inventory?: boolean
  }): Promise<any> {
    // Medusa repository create expects an array
    const [config] = await this.configRepository_.create([{
      id: ulid(),
      price_xml_url: data.price_xml_url,
      enabled: data.enabled !== false,
      update_inventory: data.update_inventory !== false,
    }])
    return config
  }

  async listConfigs(): Promise<{ configs: any[]; count: number }> {
    const [configs, count] = await this.configRepository_.findAndCount({
      where: { enabled: true },
    })
    return { configs: Array.isArray(configs) ? configs : [], count }
  }
}

export default InnProXmlImporterService
