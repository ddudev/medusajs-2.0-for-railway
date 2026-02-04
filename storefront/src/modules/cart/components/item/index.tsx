"use client"

import { Text } from "@medusajs/ui"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useUpdateLineItem } from "@lib/hooks/use-cart"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
}

const Item = ({ item, type = "full" }: ItemProps) => {
  const updateLineItem = useUpdateLineItem()
  const { t } = useTranslation()

  const { handle } = item.variant?.product ?? {}

  const changeQuantity = (quantity: number) => {
    // Use TanStack Query mutation with optimistic updates
    updateLineItem.mutate({
      lineId: item.id,
      quantity,
    })
  }

  // Get updating state from mutation
  const updating = updateLineItem.isPending
  const error = updateLineItem.error?.message || null

  // TODO: Update this to grab the actual max inventory
  const maxQtyFromInventory = 10
  const maxQuantity = item.variant?.manage_inventory ? 10 : maxQtyFromInventory

  if (type === "preview") {
    return (
      <div className="flex gap-4 py-4 border-b border-gray-100" data-testid="product-row">
        <LocalizedClientLink
          href={`/products/${handle}`}
          className="flex-shrink-0"
        >
          <Thumbnail
            thumbnail={item.variant?.product?.thumbnail}
            images={item.variant?.product?.images}
            size="square"
            productName={item.product_title || item.variant?.product?.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
        </LocalizedClientLink>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full min-w-0">
          <div className="flex-1 flex flex-col gap-1 mr-auto min-w-0">
            <Text className="text-sm font-medium text-gray-900" data-testid="product-title">
              {item.product_title}
            </Text>
            <LineItemOptions variant={item.variant} data-testid="product-variant" />
          </div>
          <div className="flex-shrink-0 text-right ml-auto">
            <LineItemPrice item={item} style="tight" />
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Text className="text-gray-400 text-xs">{item.quantity}x</Text>
              <LineItemUnitPrice item={item} style="tight" className="text-xs" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 py-6 border-b border-gray-100 last:border-b-0" data-testid="product-row">
      {/* Product Image */}
      <LocalizedClientLink
        href={`/products/${handle}`}
        className="flex-shrink-0"
      >
        <Thumbnail
          thumbnail={item.variant?.product?.thumbnail}
          images={item.variant?.product?.images}
          size="square"
          productName={item.product_title || item.variant?.product?.title}
          className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg"
        />
      </LocalizedClientLink>
      
      {/* Product Details - Mobile: Stack vertically, Desktop: Side by side */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Title and Variant */}
        <div className="flex-1">
          <LocalizedClientLink href={`/products/${handle}`}>
            <Text
              className="text-sm md:text-base font-medium text-gray-900 hover:text-primary transition-colors mb-1"
              data-testid="product-title"
            >
              {item.product_title}
            </Text>
          </LocalizedClientLink>
          <LineItemOptions variant={item.variant} data-testid="product-variant" />
        </div>
        
        {/* Price - Show on mobile */}
        <div className="block md:hidden">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-baseline gap-1">
              <LineItemUnitPrice item={item} style="tight" className="text-xs text-gray-600" />
              <span className="text-xs text-gray-500">{t("cart.each")}</span>
            </div>
            <span className="text-gray-300">|</span>
            <LineItemPrice item={item} style="tight" className="text-base font-semibold text-gray-900" />
          </div>
        </div>
        
        {/* Quantity Controls */}
        <div className="flex items-center gap-3">
          <DeleteButton 
            id={item.id} 
            item={item} 
            data-testid="product-delete-button"
            className="text-gray-400 hover:text-red-600 transition-colors"
          />
          <div className="flex items-center gap-2">
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className="w-16 h-10"
              data-testid="product-select-button"
            >
              {/* TODO: Update this with the v2 way of managing inventory */}
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
            {updating && <Spinner size={20} className="shrink-0" />}
          </div>
        </div>
        
        {error && <ErrorMessage error={error} data-testid="product-error-message" />}
      </div>
      
      {/* Price - Desktop Only */}
      <div className="hidden md:flex flex-col items-end justify-start gap-1 flex-shrink-0 min-w-[120px]">
        <LineItemPrice item={item} style="tight" className="text-lg font-semibold text-gray-900" />
        <div className="flex items-baseline gap-1">
          <LineItemUnitPrice item={item} style="tight" className="text-xs text-gray-500" />
          <span className="text-xs text-gray-500">{t("cart.each")}</span>
        </div>
      </div>
    </div>
  )
}

export default Item
