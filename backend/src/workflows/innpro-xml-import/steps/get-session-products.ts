/**
 * Step: Get session and extract products
 * 
 * Loads the import session and extracts products from either:
 * 1. XML file (streaming approach - preferred)
 * 2. Session parsed_data (fallback for old sessions)
 * 
 * Also applies any filters (categories, brands, product IDs) if specified.
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { INNPRO_XML_IMPORTER_MODULE } from '../../../modules/innpro-xml-importer'
import InnProXmlImporterService from '../../../modules/innpro-xml-importer/service'
import { SelectionFilters } from '../../../modules/innpro-xml-importer/types'
import { SessionProductsResponse } from '../types'
import { logError } from '../utils/error-handler'

export const getSessionProductsStep = createStep(
  'get-session-products',
  async (
    input: { sessionId: string },
    { container }: { container: MedusaContainer }
  ): Promise<StepResponse<SessionProductsResponse>> => {
    const importerService: InnProXmlImporterService = container.resolve(INNPRO_XML_IMPORTER_MODULE)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const session = await importerService.getSession(input.sessionId)

    if (!session || !session.parsed_data) {
      throw new Error(`Session ${input.sessionId} not found or not parsed`)
    }

    let products: any[] = []
    let totalProducts = 0

    // Try to load products from XML file (streaming approach)
    const xmlFilePath = (session as any).xml_file_path || session.xml_file_path
    if (xmlFilePath) {
      try {
        const fs = await import('fs/promises')
        const xmlContent = await fs.readFile(xmlFilePath, 'utf-8')
        const xmlData = importerService.parseXml(xmlContent)
        products = importerService.extractProducts(xmlData)
        totalProducts = products.length
        logger.info(`Loaded ${totalProducts} products from XML file`)
      } catch (fileError) {
        logError(logger, 'read XML file', fileError)
        // Fallback to parsed_data
        products = session.parsed_data.products || []
        totalProducts = products.length
        logger.warn(`Falling back to parsed_data: ${totalProducts} products`)
      }
    } else {
      // Fallback: Use products from parsed_data
      products = session.parsed_data.products || []
      totalProducts = products.length
      logger.info(`Using ${totalProducts} products from session parsed_data`)
    }

    // Apply filters if specified
    const hasCategoryFilter = session.selected_categories?.length > 0
    const hasBrandFilter = session.selected_brands?.length > 0
    const hasProductIdFilter = session.selected_product_ids?.length > 0

    if (hasCategoryFilter || hasBrandFilter || hasProductIdFilter) {
      const filters: SelectionFilters = {
        categories: hasCategoryFilter ? session.selected_categories : undefined,
        brands: hasBrandFilter ? session.selected_brands : undefined,
        productIds: hasProductIdFilter ? session.selected_product_ids : undefined,
      }

      products = importerService.filterProducts(products, filters)
      logger.info(`Applied filters: ${products.length}/${totalProducts} products selected`)
    }

    return new StepResponse({
      products,
      session,
    })
  }
)
