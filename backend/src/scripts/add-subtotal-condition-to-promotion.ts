/**
 * Script to add a subtotal condition to an existing promotion
 * Run with: pnpm medusa exec ./src/scripts/add-subtotal-condition-to-promotion.ts
 * 
 * Usage: Set PROMOTION_CODE and MINIMUM_CART_TOTAL environment variables or edit below
 */

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/framework/types"

export default async function addSubtotalConditionToPromotion({ container }: any) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModuleService: IPromotionModuleService = container.resolve(Modules.PROMOTION)

  try {
    // Configuration - adjust these values
    const PROMOTION_CODE = process.env.PROMOTION_CODE || "FREESHIP40" // Your promotion code
    const MINIMUM_CART_TOTAL = parseInt(process.env.MINIMUM_CART_TOTAL || "4000") // In cents

    logger.info(`Adding subtotal condition to promotion: ${PROMOTION_CODE}`)
    logger.info(`Minimum cart total: ${MINIMUM_CART_TOTAL} cents (${MINIMUM_CART_TOTAL / 100} ${process.env.CURRENCY_CODE || "USD"})`)

    // Find the promotion
    const promotions = await promotionModuleService.listPromotions({
      code: PROMOTION_CODE,
    })

    if (!promotions || promotions.length === 0) {
      throw new Error(`Promotion with code "${PROMOTION_CODE}" not found. Please create it first in the admin UI.`)
    }

    const promotion = promotions[0]
    logger.info(`Found promotion: ${promotion.code} (ID: ${promotion.id})`)

    // Check if condition already exists
    const existingSubtotalRule = promotion.rules?.find(
      (rule: any) => rule.attribute === "subtotal" || rule.attribute === "item_total"
    )

    if (existingSubtotalRule) {
      logger.info(`Promotion already has a subtotal condition. Updating...`)
      
      // Update existing rule
      await promotionModuleService.updatePromotionRules([
        {
          id: existingSubtotalRule.id,
          attribute: "subtotal",
          operator: "gte",
          values: [MINIMUM_CART_TOTAL.toString()],
        },
      ])
      
      logger.info(`✅ Updated subtotal condition successfully!`)
    } else {
      // Add new rule
      await promotionModuleService.addPromotionRules(promotion.id, [
        {
          attribute: "subtotal",
          operator: "gte",
          values: [MINIMUM_CART_TOTAL.toString()],
        },
      ])
      
      logger.info(`✅ Added subtotal condition successfully!`)
    }

    logger.info(`Promotion "${PROMOTION_CODE}" now requires minimum cart total of ${MINIMUM_CART_TOTAL / 100} ${process.env.CURRENCY_CODE || "USD"}`)
  } catch (error: any) {
    logger.error("Error adding subtotal condition:", error)
    throw error
  }
}



