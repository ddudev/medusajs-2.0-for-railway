"use client"

import { HttpTypes } from "@medusajs/types"
import Thumbnail from "@modules/products/components/thumbnail"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import DeleteButton from "@modules/common/components/delete-button"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ErrorMessage from "@modules/checkout/components/error-message"
import Spinner from "@modules/common/icons/spinner"
import { useUpdateLineItem } from "@lib/hooks/use-cart"

type CartItemProps = {
  item: HttpTypes.StoreCartLineItem
}

const CartItem = ({ item }: CartItemProps) => {
  const updateLineItem = useUpdateLineItem()

  const { handle } = item.variant?.product ?? {}

  const changeQuantity = (quantity: number) => {
    // Use TanStack Query mutation with optimistic updates
    updateLineItem.mutate({
      lineId: item.id,
      quantity,
    })
  }

  // Get loading and error states from mutation
  const updating = updateLineItem.isPending
  const error = updateLineItem.error?.message || null

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

