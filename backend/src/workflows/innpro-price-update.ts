import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { IProductModuleService } from '@medusajs/framework/types'
import { INNPRO_XML_IMPORTER_MODULE } from '../modules/innpro-xml-importer'
import InnProXmlImporterService from '../modules/innpro-xml-importer/service'
import { PriceUpdateData } from '../modules/innpro-xml-importer/types'

type PriceUpdateWorkflowInput = {
  priceXmlUrl: string
  updateInventory?: boolean
}

type PriceUpdateWorkflowOutput = {
  totalProducts: number
  updatedProducts: number
  failedProducts: number
  status: 'completed' | 'completed_with_errors' | 'failed'
}

/**
 * Step: Download and parse price XML
 */
const fetchAndParsePriceXmlStep = createStep(
  'fetch-parse-price-xml',
  async (input: { priceXmlUrl: string }, { container }: { container: MedusaContainer }) => {
    const importerService: InnProXmlImporterService = container.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )

    const xmlData = await importerService.downloadAndParseXml(input.priceXmlUrl)
    return new StepResponse(xmlData)
  }
)

/**
 * Step: Extract price data from XML
 */
const extractPriceDataStep = createStep(
  'extract-price-data',
  async (input: { priceXmlData: any }, { container }: { container: MedusaContainer }) => {
    const importerService: InnProXmlImporterService = container.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const priceDataMap = importerService.extractPriceData(input.priceXmlData)
    logger.info(`Extracted price data for ${priceDataMap.size} products`)

    return new StepResponse(priceDataMap)
  }
)

/**
 * Step: Update product prices and inventory
 */
const updateProductsStep = createStep(
  'update-products-prices',
  async (
    input: {
      priceDataMap: Map<string, PriceUpdateData>
      updateInventory: boolean
    },
    { container }: { container: MedusaContainer }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
    const storeModuleService = container.resolve(Modules.STORE)

    // Get default currency from store
    const [store] = await storeModuleService.listStores()
    const defaultCurrency = store?.supported_currencies?.find(
      (c: any) => c.is_default
    )?.currency_code || 'eur'

    let updatedCount = 0
    let failedCount = 0

    // Get all products with their metadata
    const allProducts = await productService.listProducts({})

    logger.info(`Found ${allProducts.length} products in database, matching against ${input.priceDataMap.size} price records`)

    // Create a map of external_id to products
    const productsByExternalId = new Map<string, any>()

    for (const product of allProducts) {
      // Check metadata for external_id
      const externalId = (product as any).metadata?.external_id ||
                        (product as any).external_id ||
                        product.handle // Fallback to handle

      if (externalId) {
        productsByExternalId.set(String(externalId), product)
      }
    }

    logger.info(`Mapped ${productsByExternalId.size} products by external_id`)

    // Update each product that has price data
    for (const [productId, priceData] of input.priceDataMap.entries()) {
      try {
        const product = productsByExternalId.get(productId)

        if (!product) {
          logger.debug(`Product with external_id ${productId} not found in database, skipping`)
          continue
        }

        // Get full product with variants
        const fullProduct = await productService.retrieveProduct(product.id, {
          relations: ['variants', 'variants.prices'],
        })

        if (!fullProduct.variants || fullProduct.variants.length === 0) {
          logger.warn(`Product ${product.id} has no variants, skipping`)
          continue
        }

        // Update customer price to SRP (if available), otherwise use cost price
        const customerPrice = priceData.srpNet || priceData.srpGross || priceData.priceNet || priceData.priceGross || 0

        if (customerPrice > 0) {
          // Update each variant's price to SRP
          const variantUpdates = fullProduct.variants.map((variant: any) => {
            const existingPrices = (variant.prices || []) as any[]
            const priceId = existingPrices.length > 0 ? existingPrices[0].id : undefined

            return {
              id: variant.id,
              prices: priceId
                ? [{ id: priceId, amount: customerPrice, currency_code: defaultCurrency }]
                : [{ amount: customerPrice, currency_code: defaultCurrency }],
            }
          })

          await productService.updateProducts(product.id, {
            variants: variantUpdates,
          })

          logger.debug(`Updated price for product ${product.id}: ${customerPrice} ${defaultCurrency} (${priceData.srpNet ? 'SRP' : 'cost price'})`)
        }

        // Store cost price in variant metadata for revenue tracking
        if (priceData.priceNet !== undefined || priceData.priceGross !== undefined) {
          const costPrice = priceData.priceNet || priceData.priceGross
          
          // Update variant metadata with cost price
          const variantMetadataUpdates = fullProduct.variants.map((variant: any) => ({
            id: variant.id,
            metadata: {
              ...(variant.metadata || {}),
              cost_price: costPrice,
              cost_price_net: priceData.priceNet,
              cost_price_gross: priceData.priceGross,
              srp_net: priceData.srpNet,
              srp_gross: priceData.srpGross,
            },
          }))

          await productService.updateProducts(product.id, {
            variants: variantMetadataUpdates,
          })

          logger.debug(`Updated cost price metadata for product ${product.id}: ${costPrice} ${defaultCurrency}`)
        }

        // Update inventory if enabled
        if (input.updateInventory && priceData.stockQuantity !== undefined) {
          // Note: Inventory updates require inventory module integration
          // For now, we'll log that inventory should be updated
          logger.debug(`Should update inventory for product ${product.id} to ${priceData.stockQuantity}`)
          // TODO: Implement inventory update when inventory module is available
        }

        updatedCount++
      } catch (error) {
        logger.error(`Failed to update product with external_id ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        failedCount++
      }
    }

    logger.info(`Price update completed: ${updatedCount} updated, ${failedCount} failed`)

    return new StepResponse({
      updated: updatedCount,
      failed: failedCount,
      total: input.priceDataMap.size,
    })
  }
)

/**
 * Step: Calculate final status
 */
const calculateFinalStatusStep = createStep(
  'calculate-final-status',
  async (input: {
    total: number
    updated: number
    failed: number
  }) => {
    const status: 'completed' | 'completed_with_errors' | 'failed' =
      input.failed > 0
        ? (input.updated > 0 ? 'completed_with_errors' : 'failed')
        : 'completed'

    return new StepResponse({
      totalProducts: input.total,
      updatedProducts: input.updated,
      failedProducts: input.failed,
      status,
    })
  }
)

/**
 * Main Price Update Workflow
 */
export const innproPriceUpdateWorkflow = createWorkflow<
  PriceUpdateWorkflowInput,
  PriceUpdateWorkflowOutput,
  []
>('innpro-price-update', function (input) {
  const { priceXmlUrl, updateInventory = false } = input

  // Step 1: Download and parse price XML
  const priceXmlData = fetchAndParsePriceXmlStep({ priceXmlUrl })

  // Step 2: Extract price data
  const priceDataMap = extractPriceDataStep({ priceXmlData })

  // Step 3: Update products
  const updateResult = updateProductsStep({
    priceDataMap,
    updateInventory,
  })

  // Step 4: Calculate final status
  const finalResult = calculateFinalStatusStep({
    total: updateResult.total,
    updated: updateResult.updated,
    failed: updateResult.failed,
  })

  return new WorkflowResponse(finalResult)
})

export default innproPriceUpdateWorkflow
