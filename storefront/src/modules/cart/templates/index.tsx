import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import FreeShippingProgressWrapper from "../components/free-shipping-progress/free-shipping-progress-wrapper"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  return (
    <div className="py-6 md:py-12 bg-background-base">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
            {/* Cart Items Section */}
            <div className="flex flex-col gap-6">
              {!customer && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <SignInPrompt />
                </div>
              )}
              
              {/* Free Shipping Progress - Mobile Only (Above Products) */}
              {cart && cart.region && (
                <div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <FreeShippingProgressWrapper cartId={cart.id} variant="default" />
                </div>
              )}
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <ItemsTemplate items={cart?.items} />
              </div>
            </div>
            
            {/* Cart Summary Sidebar */}
            <div className="relative">
              <div className="flex flex-col gap-6 lg:sticky lg:top-24">
                {cart && cart.region && (
                  <>
                    {/* Free Shipping Progress - Desktop Only */}
                    <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <FreeShippingProgressWrapper cartId={cart.id} variant="default" />
                    </div>
                    
                    {/* Order Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <Summary cart={cart as any} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
