"use client"

import { Heading } from "@medusajs/ui"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import { useTranslation } from "@lib/i18n/hooks/use-translation"

const CheckoutSummary = ({ cart }: { cart: any }) => {
  const { t } = useTranslation()
  return (
    <div className="hidden lg:block w-[45%] px-16 py-8 bg-background-base">
      <div className="w-full flex flex-col max-w-[400px] py-8">
        <Divider className="my-6 small:hidden" />
        <Heading level="h2" className="checkout-heading">
          {t("checkout.inYourCart")}
        </Heading>
        <ItemsPreviewTemplate items={cart?.items} />
        <CartTotals totals={cart} />
        <div className="my-6">
          <DiscountCode cart={cart} />
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummary
