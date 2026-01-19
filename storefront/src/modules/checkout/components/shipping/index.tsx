"use client"

import { RadioGroup } from "@headlessui/react"
import { CheckCircleSolid } from "@medusajs/icons"
import { Button, Heading, Text, clx } from "@medusajs/ui"

import Divider from "@modules/common/components/divider"
import Radio from "@modules/common/components/radio"
import ErrorMessage from "@modules/checkout/components/error-message"
import EcontShipping from "@modules/checkout/components/econt-shipping"
// Removed step navigation imports - single-page checkout
import { useEffect, useState, useRef, useMemo } from "react"
import { setShippingMethod } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { sdk } from "@lib/config"
import { useTranslation } from "@lib/i18n/hooks/use-translation"
import { useAnalytics } from "@lib/analytics/use-analytics"
import { useCheckoutCart } from "@lib/context/checkout-cart-context"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

const Shipping: React.FC<ShippingProps> = ({
  cart: initialCart,
  availableShippingMethods: initialShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableShippingMethods, setAvailableShippingMethods] = useState<HttpTypes.StoreCartShippingOption[] | null>(initialShippingMethods)
  const { t } = useTranslation()
  const { trackCheckoutShippingMethodSelected, trackCheckoutStepCompleted } = useAnalytics()
  const { cart: contextCart, updateCartData } = useCheckoutCart()
  const cart = contextCart || initialCart

  const selectedShippingMethod = availableShippingMethods?.find(
    // To do: remove the previously selected shipping method instead of using the last one
    (method) => method.id === cart.shipping_methods?.at(-1)?.shipping_option_id
  )
  
  // Get the calculated amount from cart's shipping method if available
  const selectedCartShippingMethod = cart.shipping_methods?.at(-1)
  const calculatedAmount = selectedCartShippingMethod?.amount ?? selectedCartShippingMethod?.total

  const set = async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    const selectedMethod = availableShippingMethods?.find(m => m.id === id)
    
    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .then(async () => {
        // Fetch updated cart to get the new shipping method
        const { cart: updatedCart } = await sdk.store.cart.retrieve(cart.id, {
          fields: "+items.*,+items.variant.*,+items.variant.calculated_price,+items.variant.product.*,+payment_collection.*,+payment_collection.payment_sessions.*"
        })
        
        // Update ONLY shipping_methods and totals to minimize re-renders
        if (updatedCart) {
          updateCartData({
            shipping_methods: updatedCart.shipping_methods,
            shipping_total: updatedCart.shipping_total,
            subtotal: updatedCart.subtotal,
            total: updatedCart.total,
            tax_total: updatedCart.tax_total,
          })
        }
        
        // Track shipping method selected
        if (selectedMethod) {
          const shippingPrice = selectedMethod.amount ? Number(selectedMethod.amount) / 100 : 0
          const cartValue = cart.total ? Number(cart.total) / 100 : 0
          
          trackCheckoutShippingMethodSelected({
            cart_value: cartValue,
            item_count: cart.items?.length || 0,
            currency: cart.currency_code || 'EUR',
            shipping_method: selectedMethod.name || selectedMethod.id,
            shipping_price: shippingPrice,
          })
          
          trackCheckoutStepCompleted({
            cart_value: cartValue,
            item_count: cart.items?.length || 0,
            currency: cart.currency_code || 'EUR',
            step_name: 'shipping',
          })
        }
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  // Fetch shipping methods client-side when cart changes to get updated prices
  // Use a ref to prevent fetching if we just fetched (debounce)
  const lastFetchRef = useRef<string | null>(null)
  
  // Memoize econt data as a stable string to prevent unnecessary effect re-runs
  const econtDataKey = useMemo(() => {
    return cart.metadata?.econt ? JSON.stringify(cart.metadata.econt) : null
  }, [cart.metadata?.econt])
  
  useEffect(() => {
    const fetchShippingMethods = async () => {
      // Create a key from cart state to prevent duplicate fetches
      const fetchKey = JSON.stringify({
        cartId: cart.id,
        econtData: econtDataKey,
        shippingMethodsCount: cart.shipping_methods?.length,
      })
      
      // Skip if we just fetched with the same key
      if (lastFetchRef.current === fetchKey) {
        return
      }
      
      try {
        const { shipping_options } = await sdk.store.fulfillment.listCartOptions(
          { cart_id: cart.id },
          {}
        )
        if (shipping_options) {
          setAvailableShippingMethods(shipping_options)
          lastFetchRef.current = fetchKey
        }
      } catch (err) {
        console.error("Error fetching shipping methods:", err)
        // Keep existing methods on error
      }
    }

    // Fetch when shipping methods are actually added/removed or econt data changes
    if (cart.id && cart.shipping_methods?.length !== availableShippingMethods?.length) {
      fetchShippingMethods()
    }
  }, [cart.id, econtDataKey, cart.shipping_methods?.length, availableShippingMethods?.length])

  return (
    <div className="bg-white">
        <Heading
          level="h2"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline mb-6"
      >
        {t("checkout.delivery")}
        {(cart.shipping_methods?.length ?? 0) > 0 && <CheckCircleSolid />}
        </Heading>
        <div data-testid="delivery-options-container">
          <div className="pb-8">
            <RadioGroup value={selectedShippingMethod?.id} onChange={set}>
              {availableShippingMethods?.map((option) => {
                return (
                  <RadioGroup.Option
                    key={option.id}
                    value={option.id}
                    data-testid="delivery-option-radio"
                    className={clx(
                      "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                      {
                        "border-ui-border-interactive":
                          option.id === selectedShippingMethod?.id,
                      }
                    )}
                  >
                    <div className="flex items-center gap-x-4">
                      <Radio
                        checked={option.id === selectedShippingMethod?.id}
                      />
                      <span className="text-base-regular">{option.name}</span>
                    </div>
                    <span className="justify-self-end text-ui-fg-base">
                      {(() => {
                        // Check if this option is selected and has a calculated amount in cart
                        const isSelected = option.id === selectedCartShippingMethod?.shipping_option_id
                        
                        // Use cart method amount if available (calculated price), otherwise use option amount
                        // Use != null to properly handle 0 (free shipping) vs null/undefined
                        const displayAmount = isSelected && calculatedAmount != null
                          ? calculatedAmount 
                          : option.amount
                        
                        if (displayAmount != null && !isNaN(displayAmount) && displayAmount > 0) {
                          return convertToLocale({
                            amount: displayAmount,
                        currency_code: cart?.currency_code,
                          })
                        } else {
                          return <span className="text-gray-400">{t("checkout.waitingForInput")}</span>
                        }
                      })()}
                    </span>
                  </RadioGroup.Option>
                )
              })}
            </RadioGroup>
          </div>

          {/* Show Econt shipping fields if Econt shipping method is selected */}
          {selectedShippingMethod?.name?.toLowerCase().includes("econt") && (
            <div className="mt-6">
              <EcontShipping cart={cart} shippingMethod={selectedShippingMethod} />
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="delivery-option-error-message"
          />
        </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
