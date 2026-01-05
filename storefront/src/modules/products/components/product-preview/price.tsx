import { Text, clx } from "@medusajs/ui"
import { VariantPrice } from "types/global"
import { PriceDisplayParts } from "@modules/common/components/price-display"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <>
      {price.price_type === "sale" && price.original_price_parts && (
        <Text
          className="line-through text-ui-fg-muted"
          data-testid="original-price"
        >
          <PriceDisplayParts
            parts={price.original_price_parts}
            bgnClassName="text-xs"
          />
        </Text>
      )}
      {price.calculated_price_parts && (
      <Text
        className={clx("text-ui-fg-muted", {
          "text-ui-fg-interactive": price.price_type === "sale",
        })}
        data-testid="price"
      >
          <PriceDisplayParts
            parts={price.calculated_price_parts}
            bgnClassName="text-xs"
          />
      </Text>
      )}
    </>
  )
}
