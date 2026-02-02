import { getPricesForVariant } from "@lib/util/get-product-price"
import { getPercentageDiff } from "@lib/util/get-precentage-diff"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import PriceDisplay from "@modules/common/components/price-display"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  className?: string
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  className,
}: LineItemUnitPriceProps) => {
  // Try to get prices from variant first (for product pages)
  const variantPrices = getPricesForVariant(item.variant)
  
  // For cart line items, use the item's own price fields as fallback
  const unitPriceNumber = variantPrices?.calculated_price_number ?? 
    (item.unit_price ? Number(item.unit_price) : null)
  const originalUnitPriceNumber = variantPrices?.original_price_number ?? unitPriceNumber
  
  // Get currency
  const currency_code = variantPrices?.currency_code ?? item.currency_code ?? 'EUR'
  
  // Calculate percentage diff if we have both prices
  const percentage_diff = originalUnitPriceNumber && unitPriceNumber && originalUnitPriceNumber > unitPriceNumber
    ? getPercentageDiff(originalUnitPriceNumber, unitPriceNumber)
    : (variantPrices?.percentage_diff ?? 0)
  
  const hasReducedPrice = originalUnitPriceNumber && unitPriceNumber 
    ? unitPriceNumber < originalUnitPriceNumber 
    : false

  // Don't render if we don't have valid price data
  if (unitPriceNumber === null || unitPriceNumber === undefined || isNaN(unitPriceNumber)) {
    return null
  }

  return (
    <div className={clx("flex flex-col justify-center h-full", className)}>
      {hasReducedPrice && originalUnitPriceNumber && (
        <>
          <p>
            {style === "default" && (
              <span className="">Original: </span>
            )}
            <span
              className="line-through"
              data-testid="product-unit-original-price"
            >
              <PriceDisplay
                amount={originalUnitPriceNumber}
                currency_code={currency_code}
                bgnClassName="text-xs"
              />
            </span>
          </p>
          {style === "default" && (
            <span className="text-ui-fg-interactive">-{percentage_diff}%</span>
          )}
        </>
      )}
      <span
        className={clx("text-base-regular", {
          "text-ui-fg-interactive text-xs text-grey-300": hasReducedPrice,
          "text-ui-fg-base text-xs text-grey-300": !hasReducedPrice,
        })}
        data-testid="product-unit-price"
      >
        <PriceDisplay
          amount={unitPriceNumber}
          currency_code={currency_code}
          bgnClassName="text-xs"
        />
      </span>
    </div>
  )
}

export default LineItemUnitPrice
