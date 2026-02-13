"use client"

import { Stripe, StripeElementsOptions } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { HttpTypes } from "@medusajs/types"

type StripeWrapperProps = {
  paymentSession: HttpTypes.StorePaymentSession | null
  stripeKey?: string | null
  stripePromise: Promise<Stripe | null> | null
  children: React.ReactNode
}

/**
 * Always renders the same tree (Elements → children) so Contact/Shipping/Payment/Review
 * never remount when the user selects Stripe. Options start as {} and update to
 * { clientSecret } when Stripe is selected; @stripe/react-stripe-js applies
 * options updates via elements.update(), so useStripe/useElements stay available.
 */
const StripeWrapper: React.FC<StripeWrapperProps> = ({
  paymentSession,
  stripeKey,
  stripePromise,
  children,
}) => {
  const clientSecret = paymentSession?.data?.client_secret as string | undefined
  const options: StripeElementsOptions = clientSecret ? { clientSecret } : {}

  if (!stripeKey || !stripePromise) {
    return <>{children}</>
  }

  return (
    <Elements options={options} stripe={stripePromise}>
      {children}
    </Elements>
  )
}

export default StripeWrapper
