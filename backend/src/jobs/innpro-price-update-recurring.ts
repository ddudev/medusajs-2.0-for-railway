import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import innproPriceUpdateWorkflow from "../workflows/innpro-price-update"

// Hardcoded price XML URL - same pattern as the full import
const PRICE_XML_URL = "https://b2b.innpro.eu/edi/export-offer.php?client=deyan@merchsolution.net&language=eng&token=fd0fd61e12d58ccd6f43e6d&shop=7&type=light&format=xml&iof_3_0"

/**
 * Recurring job to update product prices and availability from InnPro price XML
 * Runs every 2 hours
 */
export default async function innproPriceUpdateRecurring(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    logger.info(`Starting scheduled InnPro price/inventory update for URL: ${PRICE_XML_URL}`)

    // Run the same workflow as manual import - ensures consistency
    const { result } = await innproPriceUpdateWorkflow(container).run({
      input: {
        priceXmlUrl: PRICE_XML_URL,
        updateInventory: true, // Always update inventory in scheduled job
      },
    })

    logger.info(
      `Scheduled price update completed: ` +
      `${result.updatedProducts}/${result.totalProducts} products updated, ` +
      `${result.failedProducts} failed. Status: ${result.status}`
    )
  } catch (error) {
    logger.error(
      `Scheduled InnPro price update job failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    )
    // Don't throw - allow job to complete and retry on next schedule
  }
}

export const config = {
  name: "innpro-price-update-recurring",
  schedule: "0 */2 * * *", // Every 2 hours
}
