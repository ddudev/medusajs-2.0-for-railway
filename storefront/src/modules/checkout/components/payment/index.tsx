"use client"

import { useContext, useEffect, useMemo, useState } from "react"
// Removed step navigation imports - single-page checkout
import { RadioGroup } from "@headlessui/react"
import ErrorMessage from "@modules/checkout/components/error-message"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, Container, Heading, Text, Tooltip, clx } from "@medusajs/ui"
import { CardElement } from "@stripe/react-stripe-js"
import { StripeCardElementOptions } from "@stripe/stripe-js"

import Divider from "@modules/common/components/divider"
import PaymentContainer from "@modules/checkout/components/payment-container"
import { isStripe as isStripeFunc, paymentInfoMap } from "@lib/constants"
import { StripeContext } from "@modules/checkout/components/payment-wrapper"
import { initiatePaymentSession } from "@lib/data/cart"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { useCheckoutCart } from "@lib/context/checkout-cart-context"
import { sdk } from "@lib/config"

const Payment = ({
  cart: initialCart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const { t } = useTranslation()
  const { trackCheckoutPaymentMethodSelected, trackCheckoutStepCompleted } = useAnalytics()
  const { cart: contextCart, updateCartData } = useCheckoutCart()
  const cart = contextCart || initialCart
  
  // Memoize activeSession to prevent recalculation on every render
  const activeSession = useMemo(() => {
    return cart.payment_collection?.payment_sessions?.find(
      (paymentSession: any) => paymentSession.status === "pending"
    )
  }, [cart.payment_collection?.payment_sessions])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  // Removed step-based navigation - single-page checkout
  // Conditional visibility based on payment method selection instead

  const isStripe = isStripeFunc(activeSession?.provider_id) || isStripeFunc(selectedPaymentMethod)
  const stripeReady = useContext(StripeContext)

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const paymentReady =
    (activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard

  const useOptions: StripeCardElementOptions = useMemo(() => {
    return {
      hidePostalCode: true,
      style: {
        base: {
          fontFamily: "Inter, sans-serif",
          color: "#424270",
          "::placeholder": {
            color: "rgb(107 114 128)",
          },
        },
      },
      classes: {
        base: "pt-3 pb-1 block w-full h-11 px-4 mt-0 bg-ui-bg-field border rounded-md appearance-none focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active border-ui-border-base hover:bg-ui-bg-field-hover transition-all duration-300 ease-in-out",
      },
    }
  }, [])

  // Handle payment method selection - initiate session when method is selected
  useEffect(() => {
    const initiateSession = async () => {
      if (selectedPaymentMethod && !activeSession && !isLoading) {
    setIsLoading(true)
    try {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
        
        // Fetch updated cart to get the new payment session
        const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id, {
          fields: "+payment_collection.*,+payment_collection.payment_sessions.*"
        })
        
        // Update context with payment_collection
        // Smart update logic in context will prevent re-renders if data hasn't changed
        if (updatedCart?.payment_collection) {
          updateCartData({
            payment_collection: updatedCart.payment_collection
          })
        }
        
        // Track payment method selected
        const cartValue = cart.total ? Number(cart.total) : 0
        const paymentMethodName = paymentInfoMap[selectedPaymentMethod]?.title || selectedPaymentMethod
        
        trackCheckoutPaymentMethodSelected({
          cart_value: cartValue,
          item_count: cart.items?.length || 0,
          currency: cart.currency_code || 'EUR',
          payment_method: paymentMethodName,
          items: cart.items?.map((item) => ({
            product_id: item.product_id || '',
            variant_id: item.variant_id || '',
            quantity: item.quantity,
            price: item.unit_price ? Number(item.unit_price) : 0,
            product_name: item.product_title || '',
          })),
        })
        
        trackCheckoutStepCompleted({
          cart_value: cartValue,
          item_count: cart.items?.length || 0,
          currency: cart.currency_code || 'EUR',
          step_name: 'payment',
        })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }
    }

    initiateSession()
    // Use cart.id and activeSession?.id instead of full objects to prevent infinite loops
    // Note: updateCartData is stable (useCallback), no need to include in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPaymentMethod, activeSession?.id, cart.id])

  useEffect(() => {
    setError(null)
  }, [selectedPaymentMethod])

  return (
    <div className="bg-white">
        <Heading level="h2" className="checkout-heading">
        {t("checkout.payment")}
        {paymentReady && <CheckCircleSolid />}
        </Heading>
      <div>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <>
              {/* @ts-expect-error - Headless UI RadioGroup type incompatibility with React 19 */}
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(value: string) => setSelectedPaymentMethod(value)}
              >
                {availablePaymentMethods
                  .sort((a, b) => {
                    return a.provider_id > b.provider_id ? 1 : -1
                  })
                  .map((paymentMethod) => {
                    return (
                      <PaymentContainer
                        paymentInfoMap={paymentInfoMap}
                        paymentProviderId={paymentMethod.id}
                        key={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                      />
                    )
                  })}
              </RadioGroup>
            {/* Conditionally show Stripe card input only when Stripe payment method is selected */}
            {isStripeFunc(selectedPaymentMethod) && stripeReady && (
                <div className="mt-5 transition-all duration-150 ease-in-out">
                  <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  {t("checkout.enterCardDetails")}
                  </Text>

                  <CardElement
                    options={useOptions as StripeCardElementOptions}
                    onChange={(e) => {
                      setCardBrand(
                        e.brand &&
                          e.brand.charAt(0).toUpperCase() + e.brand.slice(1)
                      )
                      setError(e.error?.message || null)
                      setCardComplete(e.complete)
                    }}
                  />
                </div>
              )}
            </>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
              {t("checkout.paymentMethod")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                Gift card
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment
