import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import innproPriceUpdateWorkflow from "../../../../workflows/innpro-price-update"

// Hardcoded price XML URL - same pattern as the full import
const PRICE_XML_URL = "https://b2b.innpro.eu/edi/export-offer.php?client=deyan@merchsolution.net&language=eng&token=fd0fd61e12d58ccd6f43e6d&shop=7&type=light&format=xml&iof_3_0"

/**
 * POST /admin/innpro-importer/price-update
 * Manually trigger price and inventory update workflow
 * 
 * Body (optional):
 * - updateInventory: Whether to update inventory (default: true)
 */
export async function POST(
  req: MedusaRequest<{ updateInventory?: boolean }>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { updateInventory = true } = (req.body as { updateInventory?: boolean }) || {}
    const logger = req.scope.resolve("logger")

    logger.info(`Manual price/inventory update triggered for URL: ${PRICE_XML_URL}`)

    // Trigger the price update workflow directly with hardcoded URL
    const { result } = await innproPriceUpdateWorkflow(req.scope).run({
      input: {
        priceXmlUrl: PRICE_XML_URL,
        updateInventory,
      }
    })

    const summary = {
      success: result.status !== 'failed',
      totalProducts: result.totalProducts,
      updatedProducts: result.updatedProducts,
      failedProducts: result.failedProducts,
      status: result.status,
    }

    logger.info(`Manual price update completed: ${result.updatedProducts}/${result.totalProducts} products updated`)

    res.json(summary)
  } catch (error) {
    const logger = req.scope.resolve("logger")
    logger.error(`Failed to trigger manual price update: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to trigger price update"
    })
  }
}
