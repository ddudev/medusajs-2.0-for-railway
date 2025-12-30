/**
 * Script to create a free shipping promotion with minimum cart total
 * Run with: pnpm medusa exec ./src/scripts/create-free-shipping-promotion.ts
 */

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/framework/types"

export default async function createFreeShippingPromotion({ container }: any) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModuleService: IPromotionModuleService = container.resolve(Modules.PROMOTION)

  try {
    logger.info("Creating free shipping promotion...")

    // Configuration - adjust these values as needed
    // IMPORTANT: Medusa promotion rules store values as currency units (not cents)
    // So $40.00 is stored as "40", not "4000"
    const MINIMUM_CART_TOTAL = 40 // Minimum cart total in currency units (e.g., 40 = $40.00 or €40.00)
    const PROMOTION_CODE = "free_shipping_progress" // Hardcoded code for progress bar
    const IS_AUTOMATIC = true // Always automatic for progress bar

    // Check if promotion already exists
    const existingPromotions = await promotionModuleService.listPromotions({
      code: PROMOTION_CODE || undefined,
    })

    if (existingPromotions && existingPromotions.length > 0) {
      logger.info(`Promotion with code "${PROMOTION_CODE}" already exists. Skipping creation.`)
      return
    }

    // Get all regions to create promotion for all currencies
    const storeModuleService = container.resolve(Modules.STORE)
    const [store] = await storeModuleService.listStores()
    const regions = store?.supported_currencies || []

    // Create promotion rules for minimum cart total
    // The rule checks if cart subtotal (before shipping) is >= minimum amount
    // Note: values must be strings in Medusa 2.0
    const rules = [
      {
        attribute: "subtotal",
        operator: "gte" as const,
        values: [MINIMUM_CART_TOTAL.toString()], // Value in cents as string
      },
    ]

    // Create the promotion
    // Note: createPromotions expects an array
    const [promotion] = await promotionModuleService.createPromotions([
      {
        code: PROMOTION_CODE || `FREESHIP${MINIMUM_CART_TOTAL}`,
        type: "standard",
        is_automatic: IS_AUTOMATIC,
        status: "active",
        rules,
        application_method: {
          allocation: "across",
          target_type: "shipping_methods",
          type: "percentage",
          value: 100, // 100% discount on shipping
          target_rules: [], // Apply to all shipping methods
        },
      },
    ])

    logger.info(`✅ Free shipping promotion created successfully!`)
    logger.info(`   Code: ${promotion.code}`)
    logger.info(`   Minimum cart total: ${MINIMUM_CART_TOTAL / 100} ${regions[0]?.currency_code || ""}`)
    logger.info(`   Type: ${IS_AUTOMATIC ? "Automatic" : "Promotion Code"}`)
    logger.info(`   Status: ${promotion.status}`)

    return promotion
  } catch (error: any) {
    logger.error("Error creating free shipping promotion:", error)
    throw error
  }
}

