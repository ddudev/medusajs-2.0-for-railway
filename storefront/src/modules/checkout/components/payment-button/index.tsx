"use client"

import { Button } from "@medusajs/ui"
import { OnApproveActions, OnApproveData } from "@paypal/paypal-js"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useState } from "react"
import dynamic from "next/dynamic"
import ErrorMessage from "../error-message"
import Spinner from "@modules/common/icons/spinner"
import { placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { isManual, isPaypal, isStripe } from "@lib/constants"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { isEcontOfficeShippingMethod } from "@modules/checkout/lib/is-econt-office"

// Lazy load Stripe payment request component (heavy)
const StripePaymentRequest = dynamic(
  () => import("./stripe-payment-request"),
  { ssr: false }
)

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const { t } = useTranslation()
  // Check if Econt Office is selected (doesn't require shipping address)
  // Use at(-1) for selected method; support Bulgarian "офис" and data.id "econt-office"
  const selectedShippingMethod = cart.shipping_methods?.at(-1)
  const isEcontOffice = isEcontOfficeShippingMethod(selectedShippingMethod)

  // Shipping address is optional for Econt Office, required for other methods
  // Billing address is always set to shipping address (Bulgaria requirement)
  // For Econt Office, we can complete without shipping_address
  const hasShippingMethod = (cart.shipping_methods?.length ?? 0) >= 1
  const hasEcontOfficeData = Boolean(cart?.metadata?.econt && (cart.metadata.econt as { office_code?: string })?.office_code)
  // When Econt Office is selected, accept either shipping_methods in cart OR econt metadata (in case context merge missed shipping_methods)
  const shippingSatisfied = hasShippingMethod || (isEcontOffice && hasEcontOfficeData)
  const addressSatisfied = isEcontOffice || (Boolean(cart?.shipping_address) && Boolean(cart?.billing_address))
  const notReady =
    !cart ||
    !cart.email ||
    !shippingSatisfied ||
    !addressSatisfied

  // TODO: Add this once gift cards are implemented
  // const paidByGiftcard =
  //   cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  // if (paidByGiftcard) {
  //   return <GiftCardPaymentButton />
  // }

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const notReadyMessages: string[] = []
  if (notReady && cart) {
    if (!cart.email) notReadyMessages.push(t("checkout.missingEmail"))
    if (!shippingSatisfied) notReadyMessages.push(t("checkout.missingShipping"))
    if (!addressSatisfied) notReadyMessages.push(t("checkout.missingAddress"))
  }

  switch (true) {
    case isStripe(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          notReadyMessages={notReadyMessages}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton
          notReady={notReady}
          notReadyMessages={notReadyMessages}
          data-testid={dataTestId}
        />
      )
    case isPaypal(paymentSession?.provider_id):
      return (
        <PayPalPaymentButton
          notReady={notReady}
          notReadyMessages={notReadyMessages}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>{t("checkout.selectPaymentMethod")}</Button>
  }
}

const GiftCardPaymentButton = () => {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const handleOrder = async () => {
    setSubmitting(true)
    await placeOrder()
  }

  return (
    <Button
      onClick={handleOrder}
      isLoading={submitting}
      className="w-full"
      data-testid="submit-order-button"
    >
      {t("checkout.placeOrder")}
    </Button>
  )
}

const StripePaymentButton = ({
  cart,
  notReady,
  notReadyMessages,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  notReadyMessages?: string[]
  "data-testid"?: string
}) => {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const stripe = useStripe()
  const elements = useElements()

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const disabled = !stripe || !elements
  const paymentFormReady = Boolean(stripe && elements)

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !cart || !session?.data.client_secret) {
      const errorMsg = !stripe || !elements 
        ? "Payment system not ready. Please refresh the page."
        : "Payment session not initialized. Please try again."
      
      setErrorMessage(errorMsg)
      setSubmitting(false)
      return
    }

    // Get the card element - it should be mounted by now
    const cardElement = elements.getElement("card")
    if (!cardElement) {
      setErrorMessage("Card input not ready. Please refresh the page.")
      setSubmitting(false)
      return
    }

    // Use shipping address for billing (Bulgaria requirement - billing always same as shipping)
    stripe
      .confirmCardPayment(session.data.client_secret as string, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name:
              (cart.shipping_address?.first_name || "Customer") +
              " " +
              (cart.shipping_address?.last_name || ""),
            address: {
              city: cart.shipping_address?.city ?? undefined,
              country: cart.shipping_address?.country_code ?? undefined,
              line1: cart.shipping_address?.address_1 ?? undefined,
              line2: cart.shipping_address?.address_2 ?? undefined,
              postal_code: cart.shipping_address?.postal_code ?? undefined,
              state: cart.shipping_address?.province ?? undefined,
            },
            email: cart.email,
            phone: cart.shipping_address?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
            return
          }

          setErrorMessage(error.message || null)
          setSubmitting(false)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        setSubmitting(false)
      })
      .catch((err) => {
        setErrorMessage(err?.message ?? "Payment failed. Please try again.")
        setSubmitting(false)
      })
  }

  return (
    <>
      {/* Google Pay / Apple Pay Button */}
      <div className="mb-4">
        <StripePaymentRequest
          cart={cart}
          notReady={notReady || disabled}
          onPaymentComplete={onPaymentCompleted}
        />
      </div>

      {/* Divider between payment methods */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-base"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-text-secondary">Or</span>
        </div>
      </div>

      {/* Card Payment Button */}
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        className="w-full"
        data-testid={dataTestId}
        data-place-order-disabled={disabled || notReady ? (disabled && !paymentFormReady ? "stripe-not-ready" : "steps-incomplete") : undefined}
        aria-describedby={disabled && !paymentFormReady ? "stripe-hint" : undefined}
      >
        {!paymentFormReady && !submitting
          ? t("checkout.preparingPayment")
          : t("checkout.placeOrder")}
      </Button>
      {disabled && !paymentFormReady && (
        <p id="stripe-hint" className="text-small-regular text-ui-fg-muted mt-2">
          {t("checkout.stripeNotConfiguredHint")}
        </p>
      )}
      {notReady && paymentFormReady && notReadyMessages && notReadyMessages.length > 0 && (
        <div className="mt-3 rounded-md border border-border-base bg-background-base p-3" role="status" aria-live="polite">
          <p className="text-small-regular text-ui-fg-base mb-2 font-medium">
            {t("checkout.completeStepsToPlaceOrder")}
          </p>
          <ul className="list-inside list-disc space-y-1 text-small-regular text-ui-fg-muted">
            {notReadyMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const PayPalPaymentButton = ({
  cart,
  notReady,
  notReadyMessages,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  notReadyMessages?: string[]
  "data-testid"?: string
}) => {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const handlePayment = async (
    _data: OnApproveData,
    actions: OnApproveActions
  ) => {
    actions?.order
      ?.authorize()
      .then((authorization) => {
        if (authorization.status !== "COMPLETED") {
          setErrorMessage(`An error occurred, status: ${authorization.status}`)
          return
        }
        onPaymentCompleted()
      })
      .catch(() => {
        setErrorMessage(`An unknown error occurred, please try again.`)
        setSubmitting(false)
      })
  }

  const [{ isPending, isResolved }] = usePayPalScriptReducer()

  if (isPending) {
    return (
      <div className="flex min-h-[42px] items-center justify-center">
        <Spinner size={24} />
      </div>
    )
  }

  if (isResolved) {
    return (
      <>
        <PayPalButtons
          style={{ layout: "horizontal" }}
          createOrder={async () => session?.data.id as string}
          onApprove={handlePayment}
          disabled={notReady || submitting || isPending}
          data-testid={dataTestId}
        />
        {notReady && notReadyMessages && notReadyMessages.length > 0 && (
          <div className="mt-3 rounded-md border border-border-base bg-background-base p-3" role="status" aria-live="polite">
            <p className="text-small-regular text-ui-fg-base mb-2 font-medium">
              {t("checkout.completeStepsToPlaceOrder")}
            </p>
            <ul className="list-inside list-disc space-y-1 text-small-regular text-ui-fg-muted">
              {notReadyMessages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        <ErrorMessage
          error={errorMessage}
          data-testid="paypal-payment-error-message"
        />
      </>
    )
  }
}

const ManualTestPaymentButton = ({
  notReady,
  notReadyMessages,
  "data-testid": dataTestId,
}: {
  notReady: boolean
  notReadyMessages?: string[]
  "data-testid"?: string
}) => {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handlePayment = () => {
    setSubmitting(true)

    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        className="w-full"
        data-testid={dataTestId ?? "submit-order-button"}
      >
        {t("checkout.placeOrder")}
      </Button>
      {notReady && notReadyMessages && notReadyMessages.length > 0 && (
        <div className="mt-3 rounded-md border border-border-base bg-background-base p-3" role="status" aria-live="polite">
          <p className="text-small-regular text-ui-fg-base mb-2 font-medium">
            {t("checkout.completeStepsToPlaceOrder")}
          </p>
          <ul className="list-inside list-disc space-y-1 text-small-regular text-ui-fg-muted">
            {notReadyMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
