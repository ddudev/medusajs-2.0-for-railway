"use client"

import { Text } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

/**
 * Read-only line item for checkout summary and dropdowns.
 * Does not use useUpdateLineItem/useQueryClient so it is safe to render without QueryProvider (e.g. checkout SSR).
 */
export function ItemPreview({ item }: { item: HttpTypes.StoreCartLineItem }) {
  const { handle } = item.variant?.product ?? {}
  return (
    <div className="flex gap-4 py-4 border-b border-gray-100" data-testid="product-row">
      <LocalizedClientLink href={`/products/${handle}`} className="flex-shrink-0">
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
