"use client"

import { convertToLocale } from "@lib/util/money"
import { InformationCircleSolid } from "@medusajs/icons"
import { Tooltip } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import PriceDisplay from "@modules/common/components/price-display"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    shipping_total?: number | null
    discount_total?: number | null
    gift_card_total?: number | null
    currency_code: string
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const { t } = useTranslation()
  const {
    currency_code,
    total,
    subtotal,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
  } = totals

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle mt-4">
        <div className="flex items-center justify-between">
          <span className="flex gap-x-1 items-center">
            {t("checkout.subtotal")}
          </span>
          <span data-testid="cart-subtotal" className="text-right" data-value={subtotal || 0}>
            <PriceDisplay
              amount={subtotal ?? 0}
              currency_code={currency_code}
              bgnClassName="text-xs"
            />
          </span>
        </div>
        {!!discount_total && (
          <div className="flex items-center justify-between">
            <span>{t("checkout.discount")}</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_total || 0}
            >
              -{" "}
              <PriceDisplay
                amount={discount_total ?? 0}
                currency_code={currency_code}
                bgnClassName="text-xs"
              />
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>{t("checkout.shipping")}</span>
          <span data-testid="cart-shipping" data-value={shipping_total || 0}>
            <PriceDisplay
              amount={shipping_total ?? 0}
              currency_code={currency_code}
              bgnClassName="text-xs"
            />
          </span>
        </div>
        {/* <div className="flex justify-between">
          <span className="flex gap-x-1 items-center ">{t("checkout.taxes")}</span>
          <span data-testid="cart-taxes" data-value={tax_total || 0}>
            <PriceDisplay
              amount={tax_total ?? 0}
              currency_code={currency_code}
              bgnClassName="text-xs"
            />
          </span>
        </div> */}
        {!!gift_card_total && (
          <div className="flex items-center justify-between">
            <span>{t("checkout.giftCard")}</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-gift-card-amount"
              data-value={gift_card_total || 0}
            >
              -{" "}
              <PriceDisplay
                amount={gift_card_total ?? 0}
                currency_code={currency_code}
                bgnClassName="text-xs"
              />
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium mt-2">
        <span>{t("checkout.total")}</span>
        <span
          className="txt-xlarge-plus text-right"
          data-testid="cart-total"
          data-value={total || 0}
        >
          <PriceDisplay
            amount={total ?? 0}
            currency_code={currency_code}
            bgnClassName="text-sm"
          />
        </span>
      </div>
      <div className="h-px w-full border-b border-gray-200 mt-4" />
    </div>
  )
}

export default CartTotals
