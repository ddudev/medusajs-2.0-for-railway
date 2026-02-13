import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Contact from "@modules/checkout/components/contact"
import Addresses from "@modules/checkout/components/addresses"
import Shipping from "@modules/checkout/components/shipping"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import { StripeElementsGate } from "@modules/checkout/components/payment-wrapper"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8 py-8 max-w-[600px] lg:ml-auto mx-auto">
      {/* Contact Section - First Name, Last Name, Email, Phone */}
      <div>
        <Contact cart={cart} customer={customer} />
      </div>

      {/* TODO: Uncomment when needed - Shipping Address Section
        Only show when Econt Address/Door is selected (not for Econt Office)
        For Econt Office, shipping address is not required
      */}
      {/* <div>
        <Addresses cart={cart} customer={customer} />
      </div> */}

      {/* Shipping Method Section - Econt integration */}
      <div>
        <Shipping cart={cart} availableShippingMethods={shippingMethods} />
      </div>

      {/* Payment + Review wrapped in Stripe Elements only — Contact/Shipping stay outside so they don't remount when Stripe is selected */}
      <StripeElementsGate>
        <div>
          <Payment cart={cart} availablePaymentMethods={paymentMethods} />
        </div>
        <div>
          <Review cart={cart} />
        </div>
      </StripeElementsGate>
    </div>
  )
}
