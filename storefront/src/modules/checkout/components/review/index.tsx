"use client"

import { Heading, Text } from "@medusajs/ui"

import PaymentButton from "../payment-button"
import CheckoutSummaryDropdown from "../checkout-summary-dropdown"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { useCheckoutCart } from "@lib/context/checkout-cart-context"
import DiscountCode from "../discount-code"

const Review = ({ cart: initialCart }: { cart: any }) => {
  const { t } = useTranslation()
  // Use updated cart from context
  const { cart: contextCart } = useCheckoutCart()
  const cart = contextCart || initialCart
  
  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  // Check if Econt Office is selected (doesn't require shipping address)
  const selectedShippingMethod = cart.shipping_methods?.[0]
  const isEcontOffice = selectedShippingMethod?.name?.toLowerCase().includes("econt") && 
                        selectedShippingMethod?.name?.toLowerCase().includes("office")
  
  // Shipping address is optional for Econt Office
  const previousStepsCompleted =
    cart.shipping_methods.length > 0 &&
    (cart.payment_collection || paidByGiftcard) &&
    (isEcontOffice || cart.shipping_address) // Shipping address only required for non-Econt Office methods

  return (
    <div className="">
      <Heading level="h2" className="checkout-heading">
        {t("checkout.review")}
      </Heading>
      <div className="mb-6">
        <CheckoutSummaryDropdown cart={cart} />
      </div>
      {previousStepsCompleted && (
        <>
          <div className="flex items-start gap-x-1 w-full mb-6">
            <div className="w-full">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("checkout.termsAndConditions")}
              </Text>
            </div>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
      <div className="lg:hidden block my-6">
        <DiscountCode cart={cart as any} />
      </div>
    </div>
  )
}

export default Review
