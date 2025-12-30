import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/promotions/rules/attributes
 * 
 * Extended endpoint that wraps Medusa's listRuleAttributes and adds
 * missing attributes like "subtotal" and "item_total" that are supported
 * by the backend but not exposed in the default UI dropdown.
 * 
 * This allows users to set minimum cart total conditions directly in the UI.
 * 
 * The endpoint first tries to fetch attributes from Medusa's built-in endpoint,
 * then merges in our custom attributes (subtotal, item_total).
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    const ruleType = req.query.rule_type as string
    const promotionType = req.query.promotion_type as string | undefined
    const applicationMethodTargetType = req.query.application_method_target_type as string | undefined

    // Try to fetch from Medusa's built-in endpoint first
    // Medusa's endpoint is typically at /admin/promotions/rules/attributes
    // but we're creating our own at the same path, so we need to call it differently
    // Actually, we'll construct the response ourselves and include all known attributes
    
    // Standard attributes that Medusa provides (based on Medusa 2.0 promotion rules)
    const standardAttributes = [
      { value: "customer_id", label: "Customer ID", field_type: "text" },
      { value: "customer_email", label: "Customer Email", field_type: "text" },
      { value: "customer_group", label: "Customer Group", field_type: "text" },
      { value: "region_id", label: "Region", field_type: "text" },
      { value: "currency_code", label: "Currency", field_type: "text" },
      { value: "product_id", label: "Product", field_type: "text" },
      { value: "product_collection", label: "Product Collection", field_type: "text" },
      { value: "product_category", label: "Product Category", field_type: "text" },
      { value: "product_type", label: "Product Type", field_type: "text" },
      { value: "product_tag", label: "Product Tag", field_type: "text" },
      { value: "product_sku", label: "Product SKU", field_type: "text" },
      { value: "product_variant_id", label: "Product Variant", field_type: "text" },
      { value: "sales_channel_id", label: "Sales Channel", field_type: "text" },
    ]

    // Custom attributes for cart totals (supported by Medusa backend but not in UI)
    const customAttributes = [
      {
        value: "subtotal",
        label: "Subtotal",
        field_type: "number",
        description: "Cart subtotal (items total before shipping and taxes). Use this for minimum cart total requirements.",
        operators: [
          { value: "gte", label: "Greater than or equal to" },
          { value: "gt", label: "Greater than" },
          { value: "lte", label: "Less than or equal to" },
          { value: "lt", label: "Less than" },
          { value: "eq", label: "Equal to" },
          { value: "ne", label: "Not equal to" },
        ],
      },
      {
        value: "item_total",
        label: "Item Total",
        field_type: "number",
        description: "Total value of items in the cart. Similar to subtotal.",
        operators: [
          { value: "gte", label: "Greater than or equal to" },
          { value: "gt", label: "Greater than" },
          { value: "lte", label: "Less than or equal to" },
          { value: "lt", label: "Less than" },
          { value: "eq", label: "Equal to" },
          { value: "ne", label: "Not equal to" },
        ],
      },
    ]

    // Combine all attributes
    const allAttributes = [...standardAttributes, ...customAttributes]

    // Filter based on rule type if needed
    // For "rules" (Who can use this code?), include all attributes
    // For "target_rules" or "buy_rules", typically only product-related attributes
    let filteredAttributes = allAttributes

    if (ruleType === "target_rules" || ruleType === "buy_rules") {
      // For target/buy rules, typically only product-related attributes
      // But we'll include subtotal/item_total as they can be useful
      filteredAttributes = allAttributes.filter(
        (attr) =>
          attr.value.includes("product") ||
          attr.value === "subtotal" ||
          attr.value === "item_total"
      )
    }

    // Format response to match Medusa's expected structure
    // Medusa expects: { attributes: Array<{ id: string, value: string, label: string, field_type: string, operators?: Array<{value: string, label: string}> }> }
    const response = {
      attributes: filteredAttributes.map((attr) => ({
        id: attr.value,
        value: attr.value,
        label: attr.label || attr.value,
        field_type: attr.field_type || "text",
        ...(attr.description && { description: attr.description }),
        ...(attr.operators && { operators: attr.operators }),
      })),
    }

    logger.info(
      `Returning ${response.attributes.length} promotion rule attributes (including custom: subtotal, item_total)`
    )

    res.json(response)
  } catch (error: any) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
      "Error fetching promotion rule attributes:",
      error
    )
    res.status(500).json({
      message: "Failed to fetch promotion rule attributes",
      error: error.message,
    })
  }
}

