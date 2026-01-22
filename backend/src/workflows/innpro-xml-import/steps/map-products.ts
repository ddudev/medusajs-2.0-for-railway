/**
 * Step: Map products to Medusa format
 * 
 * Converts InnPro XML product format to MedusaJS product format.
 * Handles field mapping, data transformation, and validation.
 */

import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { INNPRO_XML_IMPORTER_MODULE } from '../../../modules/innpro-xml-importer'
import InnProXmlImporterService from '../../../modules/innpro-xml-importer/service'
import { MedusaProductData } from '../../../modules/innpro-xml-importer/types'
import { MappedProductsResponse } from '../types'

export const mapProductsStep = createStep(
  'map-products',
  async (
    input: { products: any[] },
    { container }: { container: MedusaContainer }
  ): Promise<StepResponse<MappedProductsResponse>> => {
    const importerService: InnProXmlImporterService = container.resolve(INNPRO_XML_IMPORTER_MODULE)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const mappedProducts: MedusaProductData[] = []
    const errors: Array<{ index: number; error: string }> = []

    for (let i = 0; i < input.products.length; i++) {
      try {
        const xmlProduct = input.products[i]
        const mapped = importerService.mapToMedusaProduct(xmlProduct)
        mappedProducts.push(mapped)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.warn(`Failed to map product ${i + 1}: ${errorMessage}`)
        errors.push({ index: i, error: errorMessage })
      }
    }

    logger.info(`✅ Mapped ${mappedProducts.length}/${input.products.length} products`)

    return new StepResponse({
      products: mappedProducts,
      errors,
    } as any)
  }
)
