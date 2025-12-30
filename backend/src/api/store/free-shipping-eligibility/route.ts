import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/framework/types"

// Get logger from container
const getLogger = (scope: any) => {
  try {
    return scope.resolve(ContainerRegistrationKeys.LOGGER)
  } catch {
    // Fallback logger if container is not available
    return {
      info: (...args: any[]) => console.log(...args),
      error: (...args: any[]) => console.error(...args),
      warn: (...args: any[]) => console.warn(...args),
    }
  }
}

/**
 * GET /store/free-shipping-eligibility
 * 
 * Returns information about free shipping promotion eligibility for the current cart
 * This endpoint helps display progress bars showing how much is left until free shipping
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const promotionModuleService: IPromotionModuleService = req.scope.resolve(Modules.PROMOTION)
    
    // Get cart ID from query or request
    const cartId = req.query.cart_id as string | undefined

    if (!cartId) {
      res.status(400).json({
        message: "cart_id is required",
      })
      return
    }

    // Get cart with calculated totals using Query
    // This is the recommended way to get cart totals in Medusa 2.0
    // See: https://docs.medusajs.com/resources/commerce-modules/cart/cart-totals
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "currency_code",
        "subtotal", // Cart subtotal excluding taxes, including items and shipping
        "item_subtotal", // Sum of line items subtotals (before discounts, excluding taxes)
      ],
      filters: {
        id: cartId,
      },
    })

    const cart = carts?.[0]

    if (!cart) {
      res.status(404).json({
        message: "Cart not found",
      })
      return
    }

    const logger = getLogger(req.scope)
    
    // Hardcoded promotion code for free shipping progress bar
    const FREE_SHIPPING_PROGRESS_CODE = "free_shipping_progress"

    // Find the promotion by code
    // Try with relations first to see if rules are included
    const promotions = await promotionModuleService.listPromotions(
      {
        code: FREE_SHIPPING_PROGRESS_CODE,
        status: ["active"],
      },
      {
        relations: ["rules"], // Try to include rules relation
      }
    )

    if (!promotions || promotions.length === 0) {
      logger.info(`Promotion with code "${FREE_SHIPPING_PROGRESS_CODE}" not found`)
      res.json({
        eligible: false,
        minimumTotal: null,
        currentTotal: cart.subtotal || 0,
        amountRemaining: null,
        percentage: 0,
        promotion: null,
      })
      return
    }

    let promotion = promotions[0]
    logger.info(`Found promotion: ${promotion.code} (ID: ${promotion.id})`)
    
    // Since rules are optional in PromotionDTO, use retrievePromotion with relations
    // to ensure we get the rules. This is more reliable than listPromotions.
    let subtotalRule: any = null
    
    try {
      // Use retrievePromotion with relations to explicitly load rules
      // This is the recommended approach when you need relations that are optional
      // Note: We need to load rules, and rules may have a values relation
      // Try with nested relations: "rules.values" to load rule values
      const promotionWithRules = await promotionModuleService.retrievePromotion(
        promotion.id,
        {
          relations: ["rules", "rules.values"], // Explicitly request rules and their values
        }
      )
      
      logger.info(`Retrieved promotion with relations. Has rules: ${!!promotionWithRules.rules}, rules count: ${promotionWithRules.rules?.length || 0}`)
      
      // Check if rules are now available in the promotion object
      if (promotionWithRules.rules && Array.isArray(promotionWithRules.rules) && promotionWithRules.rules.length > 0) {
        // Log full rule structure to see what we're getting
        logger.info(`Full rule structure (first rule): ${JSON.stringify(promotionWithRules.rules[0], null, 2)}`)
        logger.info(`Rule keys: ${Object.keys(promotionWithRules.rules[0]).join(", ")}`)
        logger.info(`Rule values type: ${typeof promotionWithRules.rules[0].values}, isArray: ${Array.isArray(promotionWithRules.rules[0].values)}`)
        if (promotionWithRules.rules[0].values) {
          logger.info(`Rule values structure: ${JSON.stringify(promotionWithRules.rules[0].values, null, 2)}`)
        }
        
        logger.info(`Rules from retrievePromotion: ${JSON.stringify(promotionWithRules.rules.map((r: any) => ({ 
          id: r.id, 
          attribute: r.attribute, 
          operator: r.operator, 
          values: r.values,
          valuesType: typeof r.values,
          valuesIsArray: Array.isArray(r.values),
        })))}`)
        
        // Find subtotal rule directly from promotion.rules
        subtotalRule = promotionWithRules.rules.find(
          (rule: any) => rule.attribute === "subtotal" && rule.operator === "gte"
        )
        
        if (subtotalRule) {
          logger.info(`Found subtotal rule in promotion.rules. Full rule: ${JSON.stringify(subtotalRule, null, 2)}`)
          logger.info(`Subtotal rule values: ${JSON.stringify(subtotalRule.values, null, 2)}`)
        }
      }
      
      // Fallback: If rules are still not available, use listPromotionRules
      // This is the approach recommended in Medusa docs for querying rules
      if (!subtotalRule) {
        logger.info(`Rules not found in promotion object, trying listPromotionRules as fallback...`)
        
        const allRules = await promotionModuleService.listPromotionRules(
          {}, // Empty filter - get all rules
          {
            relations: ["promotions"], // Include promotion relation to filter by promotion
          }
        )
        
        logger.info(`Retrieved ${allRules.length} total rules using listPromotionRules`)
        
        // Filter rules for this specific promotion
        const rules = allRules.filter((rule: any) => {
          // Check if rule belongs to this promotion through the promotions relation
          if (Array.isArray(rule.promotions)) {
            return rule.promotions.some((p: any) => p.id === promotion.id)
          }
          // Fallback: check direct promotion reference
          return rule.promotion?.id === promotion.id || rule.promotion_id === promotion.id
        })
        
        logger.info(`Filtered ${rules.length} rules for promotion ${promotion.id}`)
        
        if (rules.length > 0) {
          logger.info(`Rules from listPromotionRules: ${JSON.stringify(rules.map((r: any) => ({ 
            id: r.id, 
            attribute: r.attribute, 
            operator: r.operator, 
            values: r.values,
            rule_type: r.rule_type,
          })))}`)
        }
        
        // Find subtotal rule (filter by rule_type = "rules" and attribute = "subtotal")
        subtotalRule = rules.find(
          (rule: any) => rule.rule_type === "rules" && rule.attribute === "subtotal" && rule.operator === "gte"
        )
        
        if (subtotalRule) {
          logger.info(`Found subtotal rule using listPromotionRules: ${JSON.stringify({ 
            attribute: subtotalRule.attribute, 
            operator: subtotalRule.operator, 
            values: subtotalRule.values 
          })}`)
        } else {
          const attributes = rules.filter((r: any) => r.rule_type === "rules").map((r: any) => r.attribute).join(", ")
          logger.info(`Subtotal rule not found. Available rule attributes: ${attributes || "none"}`)
        }
      }
    } catch (error: any) {
      logger.info(`Error retrieving promotion rules: ${error.message}`)
      if (error.stack) {
        logger.info(`Stack: ${error.stack}`)
      }
    }

    if (!subtotalRule || !subtotalRule.values || subtotalRule.values.length === 0) {
      logger.info(`Promotion "${promotion.code}" does not have a subtotal rule`, {
        rulesFromPromotion: promotion.rules?.length || 0,
        allRules: promotion.rules?.map((r: any) => r.attribute) || [],
        promotionKeys: Object.keys(promotion),
      })
      res.json({
        eligible: false,
        minimumTotal: null,
        currentTotal: cart.subtotal || 0,
        amountRemaining: null,
        percentage: 0,
        promotion: null,
      })
      return
    }

    // Extract minimum total from rule values (in cents)
    // According to Medusa docs, values is an array of PromotionRuleValueDTO objects
    // Each object has { id: string, value: string }
    // Handle different value formats: string, number, or object with value property
    const parseValue = (v: any): number => {
      // If it's already a number, return it
      if (typeof v === 'number') return v
      
      // If it's a string, parse it
      if (typeof v === 'string') return parseInt(v) || 0
      
      // If it's an object with a 'value' property (PromotionRuleValueDTO structure)
      if (v && typeof v === 'object' && 'value' in v) {
        const val = v.value
        if (typeof val === 'number') return val
        if (typeof val === 'string') return parseInt(val) || 0
      }
      
      return 0
    }

    // Values can be:
    // 1. An array of objects: [{id: "...", value: "4000"}]
    // 2. An array of strings/numbers: ["4000"] or [4000]
    // 3. A single value: "4000" or 4000
    let values: any[] = []
    if (Array.isArray(subtotalRule.values)) {
      values = subtotalRule.values
    } else if (subtotalRule.values !== undefined && subtotalRule.values !== null) {
      values = [subtotalRule.values]
    }

    logger.info(`Parsing values. Raw values: ${JSON.stringify(values)}, count: ${values.length}`)
    
    const parsedValues = values.map(parseValue)
    logger.info(`Parsed values: ${JSON.stringify(parsedValues)}`)
    
    // Medusa stores promotion rule values as currency units (e.g., 40 for $40.00)
    // NOT in cents. So we extract the value as-is.
    const minimumTotalInCurrencyUnits = parsedValues.length > 0 ? Math.max(...parsedValues) : 0
    
    logger.info(`Extracted minimum total: ${minimumTotalInCurrencyUnits} (currency units) from values:`, values)

    logger.info(`Promotion "${promotion.code}" has minimum total: ${minimumTotalInCurrencyUnits} (currency units)`)

    // Get cart subtotal from Query result
    // Query returns totals in currency units (NOT cents)
    // Promotion rule values are also in currency units (e.g., 40 for €40.00)
    // So we can compare them directly without conversion
    
    // Use item_subtotal (line items only, excluding shipping) for free shipping calculation
    // This matches the "subtotal" promotion rule which refers to cart items subtotal
    const currentSubtotal = cart.item_subtotal || cart.subtotal || 0
    
    logger.info(`Cart item_subtotal: ${cart.item_subtotal}, cart.subtotal: ${cart.subtotal}, currency_code: ${cart.currency_code}`)

    // Both values are in currency units, compare directly
    const eligible = currentSubtotal >= minimumTotalInCurrencyUnits
    const amountRemaining = eligible ? 0 : Math.max(0, minimumTotalInCurrencyUnits - currentSubtotal)
    const percentage = minimumTotalInCurrencyUnits > 0 
      ? Math.min(100, Math.round((currentSubtotal / minimumTotalInCurrencyUnits) * 100))
      : 100

    logger.info(`Eligibility check: currentSubtotal=${currentSubtotal}, minimumTotal=${minimumTotalInCurrencyUnits}, eligible=${eligible}, amountRemaining=${amountRemaining}, percentage=${percentage}`)

    res.json({
      eligible,
      minimumTotal: minimumTotalInCurrencyUnits, // Return in currency units for frontend
      currentTotal: currentSubtotal, // Return in currency units for frontend
      amountRemaining: amountRemaining, // Return in currency units for frontend
      percentage,
      promotion: {
        code: promotion.code,
        is_automatic: promotion.is_automatic,
      },
      currencyCode: (cart as any).currency_code || (cart as any).region?.currency_code || "usd",
    })
  } catch (error: any) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
      "Error fetching free shipping eligibility:",
      error
    )
    res.status(500).json({
      message: "Failed to fetch free shipping eligibility",
      error: error.message,
    })
  }
}

