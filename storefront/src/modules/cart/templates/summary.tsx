"use client"

import { Button, Heading } from "@medusajs/ui"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const { t } = useTranslation()
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-6">
      <Heading level="h2" className="text-xl md:text-2xl font-bold text-gray-900 pb-4 border-b border-gray-100">
        {t("cart.summary")}
      </Heading>
      <DiscountCode cart={cart} />
      <Divider className="my-2" />
      <CartTotals totals={cart} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
      >
        <Button className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors">
          {t("cart.goToCheckout")}
        </Button>
      </LocalizedClientLink>
    </div>
  )
}

export default Summary
