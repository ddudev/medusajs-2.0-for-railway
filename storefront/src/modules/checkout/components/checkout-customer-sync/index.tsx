"use client"

import { HttpTypes } from "@medusajs/types"
import { useEffect, useRef } from "react"
import { useCheckoutCart } from "@lib/context/checkout-cart-context"
import { updateContactInfo } from "@lib/data/cart"

/**
 * On checkout init: when the customer is logged in and the cart has no contact
 * (email / shipping_address first_name, last_name, phone), sync customer data
 * to the cart so the Place order button and steps see complete contact without
 * the user having to blur a field in the Contact section.
 */
export default function CheckoutCustomerSync({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) {
  const { cart, updateCartData } = useCheckoutCart()
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    if (!customer?.email || !cart?.id) return
    if (hasSyncedRef.current) return
    // Sync when cart is missing contact (email is the main gate for Place order)
    if (cart.email) return

    hasSyncedRef.current = true
    updateContactInfo({
      email: customer.email,
      first_name: customer.first_name ?? undefined,
      last_name: customer.last_name ?? undefined,
      phone: customer.phone ?? undefined,
    })
      .then((updatedCart) => {
        updateCartData(updatedCart)
      })
      .catch(() => {
        hasSyncedRef.current = false
      })
  }, [customer?.email, customer?.first_name, customer?.last_name, customer?.phone, cart?.id, cart?.email, updateCartData])

  return null
}
