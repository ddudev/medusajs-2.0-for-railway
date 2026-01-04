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

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const { t } = useTranslation()
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )

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
        } catch (err: any) {
          setError(err.message)
        } finally {
          setIsLoading(false)
        }
      }
    }

    initiateSession()
  }, [selectedPaymentMethod, activeSession, cart, isLoading])

  useEffect(() => {
    setError(null)
  }, [selectedPaymentMethod])

  return (
    <div className="bg-white">
      <Heading
        level="h2"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline mb-6"
      >
        {t("checkout.payment")}
        {paymentReady && <CheckCircleSolid />}
      </Heading>
      <div>
        {!paidByGiftcard && availablePaymentMethods?.length && (
          <>
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
