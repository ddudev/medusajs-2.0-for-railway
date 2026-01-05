"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { updateLineItem } from "@lib/data/cart"
import Thumbnail from "@modules/products/components/thumbnail"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import DeleteButton from "@modules/common/components/delete-button"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ErrorMessage from "@modules/checkout/components/error-message"
import Spinner from "@modules/common/icons/spinner"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { retrieveCart } from "@lib/data/cart"

type CartItemProps = {
  item: HttpTypes.StoreCartLineItem
}

const CartItem = ({ item }: CartItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { trackCartUpdated, trackProductRemovedFromCart } = useAnalytics()

  const { handle } = item.variant?.product ?? {}

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    const oldQuantity = item.quantity

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .then(async () => {
        // Track cart updated after successful update
        // Note: Cart will be refreshed by parent component
        const price = item.unit_price ? Number(item.unit_price) / 100 : 0
        const currency = item.currency_code || 'EUR'
        
        trackCartUpdated({
          cart_value: 0, // Will be updated after cart refresh
          item_count: quantity,
          currency: currency,
          line_item_id: item.id,
          new_quantity: quantity,
        })
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  const maxQtyFromInventory = 10
  const maxQuantity = item.variant?.manage_inventory ? 10 : maxQtyFromInventory

  return (
    <div className="flex gap-4 py-4 border-b border-border-base">
      <LocalizedClientLink
        href={`/products/${handle}`}
        className="flex-shrink-0 w-16 h-16"
      >
        <Thumbnail
          thumbnail={item.variant?.product?.thumbnail}
          images={item.variant?.product?.images}
          size="square"
          productName={item.product_title || item.variant?.product?.title}
        />
      </LocalizedClientLink>

      <div className="flex-1 min-w-0">
        <LocalizedClientLink href={`/products/${handle}`}>
          <h3 className="text-base font-semibold text-text-primary truncate">
            {item.product_title}
          </h3>
        </LocalizedClientLink>
        <LineItemOptions variant={item.variant} />
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <DeleteButton id={item.id} item={item} />
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className="w-14 h-8 p-2 text-sm"
            >
              {Array.from(
                {
                  length: Math.min(maxQuantity, 10),
                },
                (_, i) => (
                  <option value={i + 1} key={i}>
                    {i + 1}
                  </option>
                )
              )}
            </CartItemSelect>
            {updating && <Spinner />}
          </div>
          <LineItemPrice item={item} style="tight" />
        </div>
        <ErrorMessage error={error} />
      </div>
    </div>
  )
}

export default CartItem

