import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { INNPRO_XML_IMPORTER_MODULE } from "../modules/innpro-xml-importer"
import InnProXmlImporterService from "../modules/innpro-xml-importer/service"
import innproPriceUpdateWorkflow from "../workflows/innpro-price-update"

/**
 * Recurring job to update product prices and availability from InnPro price XML
 * Runs daily at 2 AM
 */
export default async function innproPriceUpdateRecurring(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    logger.info("Starting InnPro price update job")

    const importerService: InnProXmlImporterService = container.resolve(
      INNPRO_XML_IMPORTER_MODULE
    )

    // Get all active configs
    const { configs } = await importerService.listConfigs()

    if (configs.length === 0) {
      logger.info("No active InnPro price update configurations found")
      return
    }

    logger.info(`Found ${configs.length} active price update configuration(s)`)

    // Process each config
    for (const config of configs) {
      if (!config.price_xml_url) {
        logger.warn(`Config ${config.id} has no price_xml_url, skipping`)
        continue
      }

      try {
        logger.info(`Updating prices from: ${config.price_xml_url}`)

        // Run the price update workflow
        const { result } = await innproPriceUpdateWorkflow(container).run({
          input: {
            priceXmlUrl: config.price_xml_url,
            updateInventory: config.update_inventory !== false,
          },
        })

        logger.info(
          `Price update completed for config ${config.id}: ` +
          `${result.updatedProducts} updated, ${result.failedProducts} failed`
        )
      } catch (error) {
        logger.error(
          `Failed to update prices for config ${config.id}: ` +
          `${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    logger.info("InnPro price update job completed")
  } catch (error) {
    logger.error(
      `InnPro price update job failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
    throw error
  }
}

export const config = {
  name: "innpro-price-update-recurring",
  schedule: "0 2 * * *", // Daily at 2 AM
}
