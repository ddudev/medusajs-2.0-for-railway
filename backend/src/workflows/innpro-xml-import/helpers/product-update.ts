/**
 * Product update utilities for InnPro XML import
 */

/**
 * Builds an update payload from a product object, only including defined fields
 * 
 * @param product - Product data with potential updates
 * @param fields - Array of field names to include in update
 * @returns Update payload with only defined fields
 */
export function buildProductUpdatePayload(
  product: any,
  fields: string[] = [
    'title',
    'description',
    'subtitle',
    'material',
    'status',
    'shipping_profile_id',
    'metadata',
    'variants',
  ]
): Record<string, any> {
  return Object.fromEntries(
    fields
      .filter(field => product[field] !== undefined)
      .map(field => [field, product[field]])
  )
}
