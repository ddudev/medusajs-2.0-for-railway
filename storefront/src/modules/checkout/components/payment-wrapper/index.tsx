"use client"

import { loadStripe } from "@stripe/stripe-js"
import React, { createContext, useMemo } from "react"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { HttpTypes } from "@medusajs/types"
import { isStripe } from "@lib/constants"
import { useCheckoutCart } from "@lib/context/checkout-cart-context"
import StripeWrapper from "./stripe-wrapper"

type WrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const StripeContext = createContext(false)

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
export const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

/**
 * Provides StripeContext (stripeReady) and PayPalScriptProvider for the whole checkout.
 * Does NOT wrap children in Elements; use StripeElementsGate around Payment + Review only.
 */
const Wrapper: React.FC<WrapperProps> = ({ cart: initialCart, children }) => {
  const { cart: contextCart } = useCheckoutCart()
  const cart = contextCart ?? initialCart
  const paymentSession = cart?.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
  const currencyCode = cart?.currency_code ?? "EUR"
  const isStripeSelected = Boolean(
    paymentSession &&
      stripePromise &&
      isStripe(paymentSession.provider_id)
  )
  const stripeContextValue = useMemo(
    () => isStripeSelected,
    [isStripeSelected]
  )
  const paypalOptions = useMemo(
    () => ({
      "client-id": paypalClientId || "test",
      currency: currencyCode.toUpperCase(),
      intent: "authorize" as const,
      components: "buttons" as const,
    }),
    [currencyCode]
  )

  const divClass =
    "w-full lg:w-[55%] lg:px-16 md:px-8 px-6 lg:py-8 py-4"

  return (
    <div className={divClass}>
      <StripeContext.Provider value={stripeContextValue}>
        <PayPalScriptProvider options={paypalOptions}>
          {children}
        </PayPalScriptProvider>
      </StripeContext.Provider>
    </div>
  )
}

/**
 * Wraps only Payment + Review in Stripe Elements so that when Elements is added
 * (Stripe selected), only these two sections remount — Contact and Shipping stay mounted.
 * Use this inside CheckoutForm around the Payment and Review sections only.
 */
export function StripeElementsGate({ children }: { children: React.ReactNode }) {
  const { cart } = useCheckoutCart()
  const paymentSession = cart?.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
  const isStripeSelected = Boolean(
    paymentSession &&
      stripePromise &&
      isStripe(paymentSession.provider_id)
  )

  if (!stripeKey || !stripePromise) {
    return <>{children}</>
  }

  return (
    <StripeWrapper
      paymentSession={isStripeSelected ? paymentSession ?? null : null}
      stripeKey={stripeKey}
      stripePromise={stripePromise}
    >
      {children}
    </StripeWrapper>
  )
}

export default Wrapper
export { stripeKey }
