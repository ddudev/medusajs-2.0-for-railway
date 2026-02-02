"use client"

import React, { useState } from "react"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import ChevronDown from "@modules/common/icons/chevron-down"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import PriceDisplay from "@modules/common/components/price-display"
import Thumbnail from "@modules/products/components/thumbnail"
import { HttpTypes } from "@medusajs/types"

type CheckoutSummaryDropdownProps = {
  cart: HttpTypes.StoreCart | null
}

const CheckoutSummaryDropdown: React.FC<CheckoutSummaryDropdownProps> = ({
  cart,
}) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  if (!cart) {
    return null
  }

  const total = cart.total != null ? Number(cart.total) : 0
  const currencyCode = cart.currency_code ?? "EUR"
  const items = cart.items ?? []
  const itemCount = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0)
  const firstItem = items[0]
  const firstThumbnail =
    firstItem?.variant?.product?.thumbnail ||
    firstItem?.variant?.product?.images?.[0]?.url

  return (
    <div className="lg:hidden w-full border border-gray-200 rounded-lg bg-background-base overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-controls="checkout-summary-content"
        id="checkout-summary-trigger"
        data-testid="checkout-summary-dropdown-trigger"
      >
        {/* 1. Small product image with 2 square card blocks behind */}
        <div className="relative flex-shrink-0 w-12 h-12 overflow-visible">
          <div
            className="absolute left-[8px] z-0 w-12 h-12 rounded-md bg-gray-100 border border-gray-200 rotate-6"
            aria-hidden
          />
          <div
            className="absolute left-[4px] z-0 w-12 h-12 rounded-md bg-gray-100 border border-gray-200 rotate-3"
            aria-hidden
          />
          <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-ui-bg-subtle">
            <Thumbnail
              thumbnail={firstThumbnail}
              images={firstItem?.variant?.product?.images}
              size="square"
              className="!w-full !h-full !p-0 !min-w-0 !min-h-0 !rounded-md !shadow-none"
            />
          </div>
        </div>

        {/* 2. "Total amount" + "# items" */}
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-base font-medium text-ui-fg-base">
            {t("checkout.total")}
          </span>
          <span className="text-sm text-ui-fg-muted mt-0.5">
            {itemCount} {t("cartButton.items")}
          </span>
        </div>

        {/* 3. Total amount + dropdown arrow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="flex flex-col text-base font-semibold text-ui-fg-base"
            data-testid="checkout-summary-total"
          >
            <PriceDisplay
              amount={total}
              currency_code={currencyCode}
              className="flex flex-col items-end"
              bgnClassName="text-xs text-ui-fg-muted"
            />
          </span>
          <ChevronDown
            size={20}
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </div>
      </button>

      <div
        id="checkout-summary-content"
        role="region"
        aria-labelledby="checkout-summary-trigger"
        className={`border-t border-gray-200 overflow-hidden transition-[max-height] duration-200 ease-in-out ${
          isOpen ? "max-h-[2000px]" : "max-h-0"
        }`}
        data-testid="checkout-summary-content"
      >
        <div className="px-4 py-4 bg-white">
          <ItemsPreviewTemplate items={cart?.items ?? []} />
          <CartTotals totals={cart} />
          <div className="hidden lg:block my-6">
            <DiscountCode cart={cart as any} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummaryDropdown
