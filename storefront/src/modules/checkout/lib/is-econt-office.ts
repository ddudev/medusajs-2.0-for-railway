/**
 * Cart shipping method item (from cart.shipping_methods) may have name and data.
 * Determines if the selected method is Econt Office (office pickup), so we don't
 * require a full shipping_address. Supports English "office", Bulgarian "офис",
 * and fulfillment option id "econt-office".
 */
export function isEcontOfficeShippingMethod(
  method: { name?: string; data?: Record<string, unknown> } | null | undefined
): boolean {
  if (!method) return false
  const name = (method.name ?? "").toLowerCase()
  if (!name.includes("econt")) return false
  // English
  if (name.includes("office")) return true
  // Bulgarian
  if (name.includes("офис")) return true
  // Fulfillment option id (from method.data)
  const data = method.data as Record<string, unknown> | undefined
  const id = [
    data?.id,
    data?.fulfillment_option_id,
    (data?.option_data as Record<string, unknown>)?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  if (id.includes("econt-office") || id.includes("office")) return true
  return false
}
