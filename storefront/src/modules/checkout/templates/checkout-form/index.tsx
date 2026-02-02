import { Suspense } from "react"
import dynamic from "next/dynamic"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Contact from "@modules/checkout/components/contact"
import Addresses from "@modules/checkout/components/addresses"
import Shipping from "@modules/checkout/components/shipping"

// Lazy load payment and review components (heavy, client-side only)
const Payment = dynamic(() => import("@modules/checkout/components/payment"), {
  loading: () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  ),
})

const Review = dynamic(() => import("@modules/checkout/components/review"), {
  loading: () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4"></div>
      <div className="h-24 bg-gray-200 rounded"></div>
    </div>
  ),
})

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

      {/* Payment Section - Payment method selection and card input (conditional) */}
      <Suspense
        fallback={
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        }
      >
        <div>
          <Payment cart={cart} availablePaymentMethods={paymentMethods} />
        </div>
      </Suspense>

      {/* Review Section - Order summary and place order button */}
      <Suspense
        fallback={
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        }
      >
        <div>
          <Review cart={cart} />
        </div>
      </Suspense>
    </div>
  )
}
