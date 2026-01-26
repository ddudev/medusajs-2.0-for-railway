import { clx } from "@medusajs/ui"

import { getPercentageDiff } from "@lib/util/get-precentage-diff"
import { getPricesForVariant } from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import PriceDisplay from "@modules/common/components/price-display"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  className?: string
}

const LineItemPrice = ({ item, style = "default", className }: LineItemPriceProps) => {
  // Try to get prices from variant first (for product pages)
  const variantPrices = getPricesForVariant(item.variant)
  
  // For cart line items, use the item's own price fields as fallback
  // Cart line items have unit_price and total directly on the item
  const unitPrice = variantPrices?.calculated_price_number ?? 
    (item.unit_price ? Number(item.unit_price) : null)
  const originalUnitPrice = variantPrices?.original_price_number ?? unitPrice
  
  // Get currency from variant prices or item
  const currency_code = variantPrices?.currency_code ?? item.currency_code ?? 'EUR'

  // Adjustments are already in decimal format (e.g., 12.65, not 1265)
  const adjustmentsSum = (item.adjustments || []).reduce(
    (acc, adjustment) => acc + (adjustment.amount ? Number(adjustment.amount) : 0),
    0
  )

  // Calculate prices: use item.total if available (cart), otherwise calculate from unit price
  const itemTotal = item.total ? Number(item.total) : null
  const originalPrice = originalUnitPrice ? originalUnitPrice * item.quantity : null
  const currentPrice = itemTotal ?? (unitPrice ? unitPrice * item.quantity - adjustmentsSum : null)
  const hasReducedPrice = originalPrice && currentPrice ? currentPrice < originalPrice : false

  // Don't render if we don't have valid price data
  if (currentPrice === null || currentPrice === undefined || isNaN(currentPrice)) {
    return null
  }

  return (
    <div className={clx("flex flex-col gap-x-2 text-ui-fg-subtle items-end", className)}>
      <div className="text-left">
        {hasReducedPrice && originalPrice && (
          <>
            <p>
              {style === "default" && (
                <span className="text-ui-fg-subtle">Original: </span>
              )}
              <span
                className="line-through text-ui-fg-muted"
                data-testid="product-original-price"
              >
                <PriceDisplay
                  amount={originalPrice}
                  currency_code={currency_code}
                  bgnClassName="text-xs"
                />
              </span>
            </p>
            {style === "default" && (
              <span className="text-ui-fg-interactive">
                -{getPercentageDiff(originalPrice, currentPrice)}%
              </span>
            )}
          </>
        )}
        <span
          className={clx("text-base-regular", {
            "text-ui-fg-interactive": hasReducedPrice,
          })}
          data-testid="product-price"
        >
          <PriceDisplay
            amount={currentPrice}
            currency_code={currency_code}
            bgnClassName="text-xs"
          />
        </span>
      </div>
    </div>
  )
}

export default LineItemPrice
